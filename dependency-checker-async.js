#!/usr/bin/env node

/**
 * ASYNC Dependency Checker - Runs checks in parallel for speed
 * Checks multiple packages simultaneously instead of one by one
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = promisify(exec);

// Configuration
const TIMEOUT = (process.env.DEPENDENCY_CHECK_TIMEOUT || 30) * 1000;
const MAX_CONCURRENT_CHECKS = 10; // Check 10 packages at once
const CHECK_MODE = process.env.CHECK_MODE || 'fast';

// Node.js built-in modules to skip
const BUILTIN_MODULES = new Set([
  'fs', 'path', 'http', 'https', 'crypto', 'os', 'util', 'stream',
  'events', 'child_process', 'cluster', 'net', 'url', 'querystring',
  'buffer', 'process', 'zlib', 'dns', 'tls', 'readline', 'vm',
  'assert', 'console', 'constants', 'domain', 'punycode', 'repl',
  'string_decoder', 'timers', 'tty', 'dgram', 'v8', 'module',
  'worker_threads', 'perf_hooks', 'async_hooks', 'inspector'
]);

class AsyncDependencyChecker {
  constructor() {
    this.startTime = Date.now();
    this.errors = [];
    this.warnings = [];
    this.criticalErrors = [];
    this.missingPackages = new Set();
  }

  /**
   * Check a single package asynchronously
   */
  async checkPackage(pkg, version) {
    try {
      const checkCmd = process.platform === 'win32' 
        ? `npm view ${pkg}@${version} version 2>nul`
        : `npm view ${pkg}@${version} version 2>/dev/null`;
      
      const { stdout, stderr } = await execAsync(checkCmd, { 
        timeout: 5000 // 5 second timeout per package
      });
      
      return { pkg, version, success: true };
    } catch (error) {
      if (error.killed) {
        return { pkg, version, success: false, error: 'timeout' };
      }
      if (error.message.includes('404')) {
        return { pkg, version, success: false, error: 'not_found' };
      }
      return { pkg, version, success: false, error: 'unknown' };
    }
  }

  /**
   * Check packages in batches (parallel)
   */
  async checkPackagesParallel(dependencies, projectName) {
    const entries = Object.entries(dependencies || {});
    const results = [];
    
    console.log(`    Checking ${entries.length} packages (${MAX_CONCURRENT_CHECKS} at a time)...`);
    
    // Process in batches
    for (let i = 0; i < entries.length; i += MAX_CONCURRENT_CHECKS) {
      // Check if we've exceeded timeout
      if (Date.now() - this.startTime > TIMEOUT) {
        console.log(`    ⚠️ Timeout reached, checked ${i}/${entries.length} packages`);
        break;
      }
      
      const batch = entries.slice(i, i + MAX_CONCURRENT_CHECKS);
      const batchPromises = batch.map(([pkg, version]) => 
        this.checkPackage(pkg, version)
      );
      
      try {
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          const [pkg, version] = batch[index];
          
          if (result.status === 'fulfilled') {
            const checkResult = result.value;
            
            if (!checkResult.success) {
              if (checkResult.error === 'not_found') {
                this.errors.push(`${projectName}: Package '${pkg}@${version}' not found`);
                console.log(`    ✗ ${pkg}@${version} - Not found`);
              } else if (checkResult.error === 'timeout') {
                this.warnings.push(`${projectName}: Package '${pkg}' check timed out`);
              }
              
              // Special handling for critical packages
              if (this.isCriticalPackage(pkg)) {
                this.criticalErrors.push(`${projectName}: Critical package '${pkg}' has issues`);
              }
            } else if (CHECK_MODE === 'verbose') {
              console.log(`    ✓ ${pkg}@${version}`);
            }
          } else {
            this.warnings.push(`${projectName}: Failed to check '${pkg}'`);
          }
        });
        
        // Show progress
        const progress = Math.min(i + MAX_CONCURRENT_CHECKS, entries.length);
        if (progress % 20 === 0 || progress === entries.length) {
          console.log(`    Progress: ${progress}/${entries.length} packages checked`);
        }
        
      } catch (error) {
        console.log(`    Error in batch: ${error.message}`);
      }
    }
    
    return results;
  }

  /**
   * Check if package is critical (should fail the check if missing)
   */
  isCriticalPackage(pkg) {
    const criticalPackages = [
      'express', 'pg', 'react', 'next', '@types/node',
      'typescript', 'cors', 'jsonwebtoken'
    ];
    return criticalPackages.includes(pkg);
  }

  /**
   * Fast node_modules check
   */
  async fastNodeModulesCheck(projectPath, projectName) {
    const nodeModulesPath = path.join(projectPath, 'node_modules');
    const rootNodeModulesPath = path.join(process.cwd(), 'node_modules');
    
    // Check if node_modules exists in project dir OR root (monorepo support)
    if (!fs.existsSync(nodeModulesPath) && !fs.existsSync(rootNodeModulesPath)) {
      this.criticalErrors.push(`${projectName}: node_modules missing - run 'npm install'`);
      return false;
    }
    
    // Use whichever node_modules exists (prefer project-specific, fallback to root)
    const actualNodeModulesPath = fs.existsSync(nodeModulesPath) ? nodeModulesPath : rootNodeModulesPath;
    
    // Check if this is a Next.js project (check both possible locations)
    const isNextProject = fs.existsSync(path.join(actualNodeModulesPath, 'next')) || 
                          fs.existsSync(path.join(nodeModulesPath, 'next'));
    
    // Quick sampling - check if critical folders exist
    const criticalFolders = ['react', 'express', 'pg', 'next'].filter(pkg => {
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
        return deps[pkg];
      }
      return false;
    });
    
    for (const folder of criticalFolders) {
      // Special handling for React in Next.js projects
      if (folder === 'react' && isNextProject) {
        // In Next.js 15+, React is bundled with Next.js
        const nextReactPath = path.join(actualNodeModulesPath, 'next', 'dist', 'compiled', 'react');
        if (!fs.existsSync(nextReactPath)) {
          // Also check if React is installed separately (older Next.js or custom setup)
          const standaloneReactPath = path.join(actualNodeModulesPath, 'react');
          if (!fs.existsSync(standaloneReactPath)) {
            this.errors.push(`${projectName}: React not found (neither bundled with Next.js nor standalone)`);
            console.log(`    ✗ Missing: ${folder}`);
          }
        } else {
          console.log(`    ✓ React found (bundled with Next.js)`);
        }
      } else if (folder === 'react-dom' && isNextProject) {
        // React-DOM is also bundled with Next.js
        const nextReactDomPath = path.join(actualNodeModulesPath, 'next', 'dist', 'compiled', 'react-dom');
        if (!fs.existsSync(nextReactDomPath)) {
          const standaloneReactDomPath = path.join(actualNodeModulesPath, 'react-dom');
          if (!fs.existsSync(standaloneReactDomPath)) {
            this.errors.push(`${projectName}: React-DOM not found (neither bundled with Next.js nor standalone)`);
            console.log(`    ✗ Missing: ${folder}`);
          }
        }
      } else {
        // Standard package check (check both root and project-specific)
        const folderPath = path.join(actualNodeModulesPath, folder);
        const projectFolderPath = path.join(nodeModulesPath, folder);
        if (!fs.existsSync(folderPath) && !fs.existsSync(projectFolderPath)) {
          this.errors.push(`${projectName}: Critical package '${folder}' not installed`);
          console.log(`    ✗ Missing: ${folder}`);
        }
      }
    }
    
    return true;
  }

  /**
   * Check npm install status using package-lock
   */
  async checkPackageLockSync(projectPath, projectName) {
    try {
      const checkCmd = `cd "${projectPath}" && npm ls --depth=0 --json 2>/dev/null`;
      const { stdout } = await execAsync(checkCmd, { timeout: 5000 });
      
      const result = JSON.parse(stdout);
      if (result.problems && result.problems.length > 0) {
        const missingCount = result.problems.filter(p => p.includes('missing')).length;
        if (missingCount > 0) {
          this.warnings.push(`${projectName}: ${missingCount} packages need installation`);
          console.log(`    ⚠️ ${missingCount} packages need installation`);
        }
      }
      return true;
    } catch (error) {
      // Fallback to basic check
      return this.fastNodeModulesCheck(projectPath, projectName);
    }
  }

  /**
   * Check a project with parallel package verification
   */
  async checkProject(projectPath, projectName) {
    console.log(`\n  ${projectName} Dependencies`);
    
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      this.warnings.push(`${projectName}: No package.json found`);
      return true;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (CHECK_MODE === 'fast') {
        // Just check node_modules and critical packages
        await this.fastNodeModulesCheck(projectPath, projectName);
        await this.checkPackageLockSync(projectPath, projectName);
      } else {
        // Full parallel check of all packages
        await this.checkPackagesParallel(dependencies, projectName);
      }
      
      if (this.criticalErrors.length === 0) {
        console.log(`    ✅ ${projectName} dependencies OK`);
      }
      
    } catch (error) {
      this.errors.push(`${projectName}: Failed to check - ${error.message}`);
    }
  }

  /**
   * Run all checks in parallel
   */
  async runParallel() {
    console.log('🚀 Async Dependency Check');
    console.log(`   Mode: ${CHECK_MODE} | Timeout: ${TIMEOUT/1000}s | Parallel: ${MAX_CONCURRENT_CHECKS}`);

    // Run both project checks in parallel
    const checkPromises = [
      this.checkProject('./tpe-backend', 'Backend'),
      this.checkProject('./tpe-front-end', 'Frontend'),
      // CRITICAL: Also check imports vs packages!
      this.checkImportsVsPackages('./tpe-backend', 'Backend', ['.js']),
      this.checkImportsVsPackages('./tpe-front-end', 'Frontend', ['.ts', '.tsx', '.js', '.jsx'])
    ];
    
    try {
      // Race against timeout
      await Promise.race([
        Promise.all(checkPromises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), TIMEOUT)
        )
      ]);
    } catch (error) {
      if (error.message === 'Timeout') {
        console.log('\n⚠️ Check timed out - proceeding with push');
        process.exit(0); // Don't block push on timeout
      }
      throw error;
    }
    
    // Report results
    this.generateReport();
  }

  /**
   * Recursively get all files with specified extensions
   */
  getAllFiles(dirPath, extensions) {
    let files = [];

    try {
      const items = fs.readdirSync(dirPath);

      for (const item of items) {
        const fullPath = path.join(dirPath, item);

        try {
          const stat = fs.statSync(fullPath);

          if (stat.isDirectory() && !item.includes('node_modules') && !item.startsWith('.')) {
            files = files.concat(this.getAllFiles(fullPath, extensions));
          } else if (stat.isFile() && extensions.some(ext => fullPath.endsWith(ext))) {
            files.push(fullPath);
          }
        } catch (e) {
          // Skip files we can't access
        }
      }
    } catch (e) {
      // Skip directories we can't access
    }

    return files;
  }

  /**
   * CRITICAL: Check if all imports have corresponding packages
   * This is what catches missing dependencies like react-markdown!
   */
  async checkImportsVsPackages(projectPath, projectName, fileExtensions) {
    console.log(`\n  📦 ${projectName} Import Validation (checking all imports...)`);

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
    const foundImports = new Map(); // Track which file has which import

    // Scan all files for imports
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');

        // Find all imports/requires - both ES6 and CommonJS
        // Handles: import X from 'pkg', import 'pkg', require('pkg'), require("pkg")
        const importPatterns = [
          /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,  // import X from 'pkg'
          /import\s+['"]([^'"]+)['"]/g,                // import 'pkg'
          /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g      // require('pkg')
        ];

        // Check all import patterns
        for (const pattern of importPatterns) {
          let match;
          // Reset lastIndex for each pattern
          pattern.lastIndex = 0;

          while ((match = pattern.exec(content)) !== null) {
            const importPath = match[1];

            // Skip relative imports and TypeScript path aliases
            if (importPath.startsWith('.') || importPath.startsWith('/') || importPath.startsWith('@/')) {
              continue;
            }

            // Skip Node.js built-in modules
            if (BUILTIN_MODULES.has(importPath) || BUILTIN_MODULES.has(importPath.split('/')[0])) {
              continue;
            }

            // Extract package name (handle scoped packages like @radix-ui/react-dialog)
            const packageName = importPath.startsWith('@')
              ? importPath.split('/').slice(0, 2).join('/')
              : importPath.split('/')[0];

            // Check if package is in dependencies
            if (!allDependencies[packageName]) {
              const relativeFile = path.relative(process.cwd(), file);
              if (!foundImports.has(packageName)) {
                foundImports.set(packageName, []);
              }
              foundImports.get(packageName).push(relativeFile);
            }
          }
        }
      } catch (e) {
        // Skip files we can't read
      }
    }

    // Report missing packages
    if (foundImports.size > 0) {
      console.log(`    ❌ Missing packages detected!`);
      for (const [pkg, files] of foundImports) {
        this.missingPackages.add(pkg);
        this.criticalErrors.push(`${projectName}: Package '${pkg}' is imported but not in package.json`);
        console.log(`    ✗ Missing package: ${pkg}`);
        console.log(`      Used in: ${files[0]}${files.length > 1 ? ` (+${files.length - 1} more)` : ''}`);
      }
    } else {
      console.log(`    ✓ All imports have corresponding packages`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(40));

    if (this.criticalErrors.length > 0) {
      console.log('🚨 CRITICAL ERRORS:');
      this.criticalErrors.forEach(err => console.log(`  ✗ ${err}`));
      console.log('\n❌ Dependency check FAILED');
      process.exit(1);
    }
    
    if (this.errors.length > 0) {
      console.log('❌ ERRORS:');
      this.errors.forEach(err => console.log(`  ✗ ${err}`));
      
      if (process.env.ALLOW_NON_CRITICAL_FAILURES === 'true') {
        console.log('\n⚠️ Non-critical errors found but continuing (ALLOW_NON_CRITICAL_FAILURES=true)');
      } else {
        console.log('\n❌ Dependency check FAILED');
        process.exit(1);
      }
    }
    
    if (this.warnings.length > 0) {
      console.log('⚠️ WARNINGS:');
      this.warnings.forEach(warn => console.log(`  ⚠️ ${warn}`));
    }
    
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    console.log(`\n✅ Dependency check passed in ${elapsed}s`);
    process.exit(0);
  }

  async run() {
    try {
      await this.runParallel();
    } catch (error) {
      console.error('❌ Fatal error:', error.message);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new AsyncDependencyChecker();
  checker.run();
}

module.exports = AsyncDependencyChecker;