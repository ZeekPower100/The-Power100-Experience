#!/usr/bin/env node

/**
 * Dependency Checker for The Power100 Experience
 * Validates ALL dependencies before deployment to prevent build failures
 * 
 * This checker ensures:
 * 1. All packages in package.json can be installed
 * 2. No missing dependencies for imported/required modules
 * 3. package-lock.json is in sync
 * 4. Production build will succeed
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m'
};

class DependencyChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.criticalErrors = [];
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  logSection(title) {
    console.log(`\n${colors.cyan}${colors.bold}${'='.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}${title}${colors.reset}`);
    console.log(`${colors.cyan}${colors.bold}${'='.repeat(60)}${colors.reset}\n`);
  }

  /**
   * Check if npm packages can be installed
   */
  checkNpmInstall(projectPath, projectName) {
    this.log(`\n  ${colors.bold}${colors.magenta}${projectName} Dependencies${colors.reset}`);
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      this.warnings.push(`${projectName}: No package.json found`);
      return true;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      // Check each dependency can be resolved
      for (const [pkg, version] of Object.entries(dependencies || {})) {
        try {
          // Try to resolve the package
          const checkCmd = process.platform === 'win32' 
            ? `npm view ${pkg}@${version} version 2>nul`
            : `npm view ${pkg}@${version} version 2>/dev/null`;
          
          execSync(checkCmd, { stdio: 'pipe' });
          this.log(`    ${colors.green}✓${colors.reset} ${pkg}@${version}`);
        } catch (error) {
          // Special handling for known problematic packages
          if (pkg === 'openai' && !this.isPhase2Enabled()) {
            this.criticalErrors.push(`${projectName}: Package '${pkg}' is listed but Phase 2 is not enabled`);
            this.log(`    ${colors.red}✗ ${pkg}@${version} - Phase 2 dependency in Phase 1 build!${colors.reset}`);
          } else if (error.message.includes('404')) {
            this.errors.push(`${projectName}: Package '${pkg}@${version}' not found in npm registry`);
            this.log(`    ${colors.red}✗ ${pkg}@${version} - Not found in registry${colors.reset}`);
          } else {
            this.warnings.push(`${projectName}: Could not verify '${pkg}@${version}'`);
            this.log(`    ${colors.yellow}⚠ ${pkg}@${version} - Could not verify${colors.reset}`);
          }
        }
      }

      // Simulate production install
      this.log(`\n    ${colors.dim}Simulating production install...${colors.reset}`);
      const tempDir = path.join(process.cwd(), '.dep-check-temp', projectName);
      
      try {
        // Create temp directory
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
        fs.mkdirSync(tempDir, { recursive: true });
        
        // Copy package.json
        fs.copyFileSync(packageJsonPath, path.join(tempDir, 'package.json'));
        
        // Try production install (dry run)
        const installCmd = `cd "${tempDir}" && npm install --production --dry-run --silent`;
        execSync(installCmd, { stdio: 'pipe' });
        
        this.log(`    ${colors.green}✓${colors.reset} Production install simulation passed`);
        
        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (error) {
        this.errors.push(`${projectName}: Production install would fail - ${error.message}`);
        this.log(`    ${colors.red}✗ Production install would fail${colors.reset}`);
        
        // Cleanup on error
        if (fs.existsSync(tempDir)) {
          fs.rmSync(tempDir, { recursive: true, force: true });
        }
      }

    } catch (error) {
      this.errors.push(`${projectName}: Failed to check dependencies - ${error.message}`);
    }
  }

  /**
   * Check for imports/requires that don't have corresponding packages
   */
  checkImportsVsPackages(projectPath, projectName, fileExtensions) {
    this.log(`\n  ${colors.bold}${colors.magenta}${projectName} Import Validation${colors.reset}`);
    
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const allDependencies = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies
    };

    // Find all source files
    const srcPath = path.join(projectPath, 'src');
    if (!fs.existsSync(srcPath)) {
      return;
    }

    const files = this.getAllFiles(srcPath, fileExtensions);
    const missingPackages = new Set();
    const phase2Imports = new Set();

    files.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      
      // Find all imports/requires
      const importRegex = /(?:import|require)\s*\(?['"]([^'"]+)['"]\)?/g;
      let match;
      
      while ((match = importRegex.exec(content)) !== null) {
        const importPath = match[1];
        
        // Skip relative imports
        if (importPath.startsWith('.') || importPath.startsWith('/')) {
          continue;
        }
        
        // Skip Node.js built-in modules
        if (this.isBuiltinModule(importPath)) {
          continue;
        }
        
        // Extract package name (handle scoped packages)
        const packageName = importPath.startsWith('@') 
          ? importPath.split('/').slice(0, 2).join('/')
          : importPath.split('/')[0];
        
        // Check if package is in dependencies
        if (!allDependencies[packageName]) {
          // Check for Phase 2 imports
          if (packageName === 'openai' || importPath.includes('aiTracking') || 
              importPath.includes('autoTagging') || importPath.includes('AIEvent')) {
            phase2Imports.add(`${path.relative(process.cwd(), file)}: ${importPath}`);
          } else {
            missingPackages.add(packageName);
          }
        }
      }
    });

    if (missingPackages.size > 0) {
      this.errors.push(`${projectName}: Missing packages for imports: ${Array.from(missingPackages).join(', ')}`);
      missingPackages.forEach(pkg => {
        this.log(`    ${colors.red}✗ Missing package: ${pkg}${colors.reset}`);
      });
    }

    if (phase2Imports.size > 0 && !this.isPhase2Enabled()) {
      this.criticalErrors.push(`${projectName}: Phase 2 imports found in Phase 1 build`);
      phase2Imports.forEach(imp => {
        this.log(`    ${colors.red}✗ Phase 2 import: ${imp}${colors.reset}`);
      });
    }

    if (missingPackages.size === 0 && phase2Imports.size === 0) {
      this.log(`    ${colors.green}✓${colors.reset} All imports have corresponding packages`);
    }
  }

  /**
   * Check if package-lock.json is in sync
   */
  checkPackageLockSync(projectPath, projectName) {
    this.log(`\n  ${colors.bold}${colors.magenta}${projectName} package-lock.json Sync${colors.reset}`);
    
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageLockPath = path.join(projectPath, 'package-lock.json');
    
    if (!fs.existsSync(packageLockPath)) {
      this.warnings.push(`${projectName}: No package-lock.json found`);
      this.log(`    ${colors.yellow}⚠ No package-lock.json found${colors.reset}`);
      return;
    }

    try {
      // Check if package-lock would change
      const checkCmd = `cd "${projectPath}" && npm install --package-lock-only --dry-run 2>&1`;
      const output = execSync(checkCmd, { encoding: 'utf8' });
      
      if (output.includes('up to date')) {
        this.log(`    ${colors.green}✓${colors.reset} package-lock.json is in sync`);
      } else {
        this.warnings.push(`${projectName}: package-lock.json may be out of sync`);
        this.log(`    ${colors.yellow}⚠ package-lock.json may need updating${colors.reset}`);
      }
    } catch (error) {
      this.warnings.push(`${projectName}: Could not verify package-lock.json sync`);
    }
  }

  /**
   * Check for common dependency issues
   */
  checkCommonIssues(projectPath, projectName) {
    this.log(`\n  ${colors.bold}${colors.magenta}${projectName} Common Issues${colors.reset}`);
    
    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return;
    }

    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    let issuesFound = false;

    // Check for duplicate dependencies
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};
    
    Object.keys(deps).forEach(pkg => {
      if (devDeps[pkg]) {
        this.warnings.push(`${projectName}: '${pkg}' is in both dependencies and devDependencies`);
        this.log(`    ${colors.yellow}⚠ Duplicate: ${pkg} in both deps and devDeps${colors.reset}`);
        issuesFound = true;
      }
    });

    // Check for incompatible versions
    if (deps['react'] && deps['react-dom']) {
      if (deps['react'] !== deps['react-dom']) {
        this.warnings.push(`${projectName}: react and react-dom versions don't match`);
        this.log(`    ${colors.yellow}⚠ react (${deps['react']}) != react-dom (${deps['react-dom']})${colors.reset}`);
        issuesFound = true;
      }
    }

    if (!issuesFound) {
      this.log(`    ${colors.green}✓${colors.reset} No common issues detected`);
    }
  }

  /**
   * Helper: Get all files recursively
   */
  getAllFiles(dirPath, extensions) {
    let files = [];
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.includes('node_modules') && !item.startsWith('.')) {
        files = files.concat(this.getAllFiles(fullPath, extensions));
      } else if (stat.isFile() && extensions.some(ext => fullPath.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Helper: Check if module is Node.js built-in
   */
  isBuiltinModule(moduleName) {
    const builtins = [
      'fs', 'path', 'http', 'https', 'crypto', 'os', 'util', 'stream',
      'child_process', 'cluster', 'dgram', 'dns', 'events', 'net',
      'querystring', 'readline', 'tls', 'url', 'zlib', 'buffer'
    ];
    return builtins.includes(moduleName);
  }

  /**
   * Helper: Check if Phase 2 is enabled
   */
  isPhase2Enabled() {
    return process.env.ENABLE_PHASE2_AI === 'true';
  }

  /**
   * Run all checks
   */
  async run() {
    this.logSection('DEPENDENCY VALIDATION CHECK');
    
    // Check backend
    this.log(`${colors.bold}Checking Backend Dependencies...${colors.reset}`);
    this.checkNpmInstall('./tpe-backend', 'Backend');
    this.checkImportsVsPackages('./tpe-backend', 'Backend', ['.js']);
    this.checkPackageLockSync('./tpe-backend', 'Backend');
    this.checkCommonIssues('./tpe-backend', 'Backend');
    
    // Check frontend
    this.log(`\n${colors.bold}Checking Frontend Dependencies...${colors.reset}`);
    this.checkNpmInstall('./tpe-front-end', 'Frontend');
    this.checkImportsVsPackages('./tpe-front-end', 'Frontend', ['.ts', '.tsx', '.js', '.jsx']);
    this.checkPackageLockSync('./tpe-front-end', 'Frontend');
    this.checkCommonIssues('./tpe-front-end', 'Frontend');
    
    // Generate report
    this.generateReport();
  }

  /**
   * Generate final report
   */
  generateReport() {
    this.logSection('DEPENDENCY VALIDATION REPORT');
    
    console.log(`${colors.bold}Summary:${colors.reset}`);
    console.log(`  ${colors.red}Critical:${colors.reset} ${this.criticalErrors.length}`);
    console.log(`  ${colors.red}Errors:${colors.reset} ${this.errors.length}`);
    console.log(`  ${colors.yellow}Warnings:${colors.reset} ${this.warnings.length}`);
    
    if (this.criticalErrors.length > 0) {
      console.log(`\n${colors.red}${colors.bold}🚨 CRITICAL ERRORS:${colors.reset}`);
      this.criticalErrors.forEach(error => {
        console.log(`  ${colors.red}✗ ${error}${colors.reset}`);
      });
      
      console.log(`\n${colors.red}${colors.bold}❌ DEPLOYMENT WILL FAIL!${colors.reset}`);
      console.log(`${colors.red}Fix critical errors before pushing to production.${colors.reset}`);
      process.exit(1);
    }
    
    if (this.errors.length > 0) {
      console.log(`\n${colors.red}${colors.bold}❌ ERRORS:${colors.reset}`);
      this.errors.forEach(error => {
        console.log(`  ${colors.red}✗ ${error}${colors.reset}`);
      });
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bold}⚠ WARNINGS:${colors.reset}`);
      this.warnings.forEach(warning => {
        console.log(`  ${colors.yellow}⚠ ${warning}${colors.reset}`);
      });
    }
    
    if (this.criticalErrors.length === 0 && this.errors.length === 0) {
      console.log(`\n${colors.green}${colors.bold}✅ All dependency checks passed!${colors.reset}`);
      console.log(`${colors.green}Safe to deploy.${colors.reset}`);
      process.exit(0);
    } else {
      console.log(`\n${colors.red}${colors.bold}❌ Dependency validation failed${colors.reset}`);
      console.log(`Fix errors before deploying to production.`);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new DependencyChecker();
  checker.run().catch(error => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = DependencyChecker;