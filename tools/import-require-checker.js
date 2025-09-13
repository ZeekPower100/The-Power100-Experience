#!/usr/bin/env node

/**
 * Import/Require Syntax Checker
 * Detects and reports mismatched module syntax (ES6 import vs CommonJS require)
 * Prevents "Cannot use import statement outside a module" errors
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class ImportRequireChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.filesChecked = 0;
    this.issuesFound = 0;
  }

  /**
   * Check if a file is in backend (should use require)
   */
  isBackendFile(filePath) {
    return filePath.includes('tpe-backend');
  }

  /**
   * Check if a file is in frontend (should use import)
   */
  isFrontendFile(filePath) {
    return filePath.includes('tpe-front-end');
  }

  /**
   * Scan a file for module syntax issues
   */
  checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    const issues = [];

    // Patterns to check
    const importPattern = /^import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+['"][^'"]+['"]/gm;
    const requirePattern = /(?:const|let|var)\s+(?:{[^}]+}|\w+)\s*=\s*require\s*\(['"]/gm;
    const exportPattern = /^export\s+(?:default|{|const|function|class)/gm;
    const moduleExportsPattern = /module\.exports\s*=/gm;

    // Check for ES6 imports
    const imports = content.match(importPattern) || [];
    
    // Check for CommonJS requires
    const requires = content.match(requirePattern) || [];
    
    // Check for ES6 exports
    const es6Exports = content.match(exportPattern) || [];
    
    // Check for CommonJS exports
    const commonjsExports = content.match(moduleExportsPattern) || [];

    // Backend file checks
    if (this.isBackendFile(filePath)) {
      if (imports.length > 0) {
        issues.push({
          type: 'error',
          message: `Backend file uses ES6 import (should use require)`,
          file: relativePath,
          found: imports.slice(0, 3).join('\n  '),
          fix: 'Replace with CommonJS require():',
          example: this.getRequireExample(imports[0])
        });
        this.errors.push(relativePath);
      }
      
      if (es6Exports.length > 0) {
        issues.push({
          type: 'error',
          message: `Backend file uses ES6 export (should use module.exports)`,
          file: relativePath,
          found: es6Exports[0],
          fix: 'Replace with module.exports'
        });
        this.errors.push(relativePath);
      }
    }

    // Frontend file checks  
    if (this.isFrontendFile(filePath)) {
      // Skip .js config files in frontend (they might legitimately use require)
      const isConfigFile = filePath.endsWith('.config.js') || 
                          filePath.endsWith('.config.mjs') ||
                          filePath.includes('next.config') ||
                          filePath.includes('tailwind.config') ||
                          filePath.includes('postcss.config');
      
      if (!isConfigFile) {
        if (requires.length > 0) {
          issues.push({
            type: 'warning',
            message: `Frontend file uses CommonJS require (should use import)`,
            file: relativePath,
            found: requires.slice(0, 3).join('\n  '),
            fix: 'Replace with ES6 import:',
            example: this.getImportExample(requires[0])
          });
          this.warnings.push(relativePath);
        }
        
        if (commonjsExports.length > 0) {
          issues.push({
            type: 'warning',
            message: `Frontend file uses module.exports (should use ES6 export)`,
            file: relativePath,
            found: commonjsExports[0],
            fix: 'Replace with ES6 export'
          });
          this.warnings.push(relativePath);
        }
      }
    }

    // Mixed syntax check (problematic in any file)
    if (imports.length > 0 && requires.length > 0) {
      issues.push({
        type: 'error',
        message: `File mixes import and require syntax!`,
        file: relativePath,
        found: `${imports.length} imports and ${requires.length} requires`,
        fix: 'Use consistent module syntax throughout the file'
      });
      this.errors.push(relativePath);
    }

    this.filesChecked++;
    if (issues.length > 0) {
      this.issuesFound += issues.length;
    }

    return issues;
  }

  /**
   * Convert import statement to require example
   */
  getRequireExample(importStatement) {
    // Simple conversion examples
    if (importStatement.includes('{')) {
      const match = importStatement.match(/import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/);
      if (match) {
        return `const {${match[1]}} = require('${match[2]}');`;
      }
    } else {
      const match = importStatement.match(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
      if (match) {
        return `const ${match[1]} = require('${match[2]}');`;
      }
    }
    return 'const { ... } = require(...);';
  }

  /**
   * Convert require statement to import example
   */
  getImportExample(requireStatement) {
    const match = requireStatement.match(/(?:const|let|var)\s+{([^}]+)}\s*=\s*require\s*\(['"]([^'"]+)['"]\)/);
    if (match) {
      return `import {${match[1]}} from '${match[2]}';`;
    }
    
    const simpleMatch = requireStatement.match(/(?:const|let|var)\s+(\w+)\s*=\s*require\s*\(['"]([^'"]+)['"]\)/);
    if (simpleMatch) {
      return `import ${simpleMatch[1]} from '${simpleMatch[2]}';`;
    }
    
    return 'import { ... } from ...;';
  }

  /**
   * Scan directory recursively
   */
  scanDirectory(directory) {
    const results = [];
    
    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        // Skip directories
        if (stat.isDirectory()) {
          if (!item.includes('node_modules') && !item.startsWith('.')) {
            scanDir(fullPath);
          }
          continue;
        }
        
        // Only check JS/TS files
        if (!/\.(js|jsx|ts|tsx)$/.test(item)) continue;
        
        // Skip test files and migrations
        if (item.includes('.test.') || item.includes('.spec.') || 
            fullPath.includes('migrations') || fullPath.includes('__tests__')) {
          continue;
        }
        
        const issues = this.checkFile(fullPath);
        if (issues.length > 0) {
          results.push(...issues);
        }
      }
    };
    
    scanDir(directory);
    return results;
  }

  /**
   * Print results
   */
  printResults(issues) {
    console.log('\n' + '='.repeat(70));
    console.log(chalk.bold('🔍 Import/Require Syntax Check Results'));
    console.log('='.repeat(70));
    
    if (issues.length === 0) {
      console.log(chalk.green('\n✅ No syntax issues found!'));
      console.log(`Checked ${this.filesChecked} files\n`);
      return;
    }
    
    // Group by error vs warning
    const errors = issues.filter(i => i.type === 'error');
    const warnings = issues.filter(i => i.type === 'warning');
    
    // Print errors first
    if (errors.length > 0) {
      console.log(chalk.red.bold(`\n❌ ERRORS (${errors.length}):`));
      errors.forEach(issue => {
        console.log(chalk.red(`\n📁 ${issue.file}`));
        console.log(chalk.red(`   ${issue.message}`));
        console.log(chalk.gray('   Found:'));
        console.log(chalk.gray(`   ${issue.found}`));
        if (issue.fix) {
          console.log(chalk.green(`   ${issue.fix}`));
          if (issue.example) {
            console.log(chalk.green(`   ${issue.example}`));
          }
        }
      });
    }
    
    // Print warnings
    if (warnings.length > 0) {
      console.log(chalk.yellow.bold(`\n⚠️  WARNINGS (${warnings.length}):`));
      warnings.forEach(issue => {
        console.log(chalk.yellow(`\n📁 ${issue.file}`));
        console.log(chalk.yellow(`   ${issue.message}`));
        console.log(chalk.gray('   Found:'));
        console.log(chalk.gray(`   ${issue.found}`));
        if (issue.fix) {
          console.log(chalk.cyan(`   ${issue.fix}`));
          if (issue.example) {
            console.log(chalk.cyan(`   ${issue.example}`));
          }
        }
      });
    }
    
    // Summary
    console.log('\n' + '='.repeat(70));
    console.log(chalk.bold('Summary:'));
    console.log(`Files checked: ${this.filesChecked}`);
    console.log(chalk.red(`Errors: ${errors.length}`));
    console.log(chalk.yellow(`Warnings: ${warnings.length}`));
    
    if (errors.length > 0) {
      console.log(chalk.red.bold('\n🚨 Critical issues found that will cause runtime errors!'));
      console.log(chalk.red('Fix these before deploying to production.\n'));
      process.exit(1);
    } else if (warnings.length > 0) {
      console.log(chalk.yellow('\n⚠️  Non-critical issues found.'));
      console.log(chalk.yellow('Consider fixing these for consistency.\n'));
    }
  }

  /**
   * Run the checker
   */
  run() {
    console.log(chalk.bold('🔍 Checking for import/require syntax issues...\n'));
    
    const issues = [];
    
    // Check backend
    if (fs.existsSync('./tpe-backend/src')) {
      console.log('Scanning backend files...');
      issues.push(...this.scanDirectory('./tpe-backend/src'));
    }
    
    // Check frontend
    if (fs.existsSync('./tpe-front-end/src')) {
      console.log('Scanning frontend files...');
      issues.push(...this.scanDirectory('./tpe-front-end/src'));
    }
    
    this.printResults(issues);
  }
}

// Watch mode support
if (process.argv.includes('--watch') || process.argv.includes('-w')) {
  const chokidar = require('chokidar');
  const checker = new ImportRequireChecker();
  
  console.log(chalk.bold('👁️  Watching for import/require syntax issues...\n'));
  
  const watcher = chokidar.watch(['tpe-backend/src/**/*.js', 'tpe-front-end/src/**/*.{ts,tsx,js,jsx}'], {
    ignored: /(node_modules|\.git)/,
    persistent: true
  });
  
  watcher.on('change', (filePath) => {
    console.clear();
    console.log(chalk.gray(`File changed: ${filePath}\n`));
    
    const tempChecker = new ImportRequireChecker();
    const issues = tempChecker.checkFile(filePath);
    
    if (issues.length > 0) {
      tempChecker.printResults(issues);
    } else {
      console.log(chalk.green('✅ No syntax issues in this file'));
    }
  });
  
} else {
  // Run once
  const checker = new ImportRequireChecker();
  checker.run();
}

module.exports = ImportRequireChecker;