#!/usr/bin/env node

/**
 * JSON Error Prevention Checker
 * Scans codebase for unsafe JSON operations and suggests fixes
 */

const fs = require('fs');
const path = require('path');
const colors = require('colors');

// Patterns to detect unsafe JSON operations
const UNSAFE_PATTERNS = [
  {
    pattern: /JSON\.parse\([^)]+\)(?![^{]*catch)/g,
    message: 'JSON.parse without try/catch',
    fix: 'Use safeJsonParse() from utils/jsonHelpers'
  },
  {
    pattern: /\.json\(\)(?![^{]*catch)/g,
    message: '.json() without error handling',
    fix: 'Use handleApiResponse() from utils/jsonHelpers'
  },
  {
    pattern: /localStorage\.getItem\([^)]+\)(?![^{]*\?)/g,
    message: 'localStorage.getItem without null check',
    fix: 'Use getFromStorage() from utils/jsonHelpers'
  },
  {
    pattern: /JSON\.stringify\([^)]+\)(?![^{]*catch)/g,
    message: 'JSON.stringify without try/catch',
    fix: 'Use safeJsonStringify() from utils/jsonHelpers'
  },
  {
    pattern: /= JSON\.parse\(/g,
    message: 'Direct assignment of JSON.parse result',
    fix: 'Use safeJsonParse() with fallback value'
  }
];

// Files/directories to skip
const SKIP_PATHS = [
  'node_modules',
  '.git',
  '.next',
  'build',
  'dist',
  'coverage',
  '.md',
  'package-lock.json',
  'jsonHelpers'
];

// Track findings
let totalIssues = 0;
const findings = [];

/**
 * Check if path should be skipped
 */
function shouldSkip(filePath) {
  return SKIP_PATHS.some(skip => filePath.includes(skip));
}

/**
 * Scan a file for unsafe JSON operations
 */
function scanFile(filePath) {
  if (shouldSkip(filePath)) return;
  
  const ext = path.extname(filePath);
  if (!['.js', '.jsx', '.ts', '.tsx'].includes(ext)) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const fileIssues = [];
    
    UNSAFE_PATTERNS.forEach(({ pattern, message, fix }) => {
      let match;
      const regex = new RegExp(pattern);
      
      lines.forEach((line, index) => {
        if (regex.test(line)) {
          fileIssues.push({
            line: index + 1,
            code: line.trim(),
            message,
            fix
          });
          totalIssues++;
        }
      });
    });
    
    if (fileIssues.length > 0) {
      findings.push({
        file: filePath,
        issues: fileIssues
      });
    }
  } catch (error) {
    // Skip files that can't be read
  }
}

/**
 * Recursively scan directory
 */
function scanDirectory(dir) {
  if (shouldSkip(dir)) return;
  
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (stat.isFile()) {
        scanFile(fullPath);
      }
    });
  } catch (error) {
    // Skip directories that can't be read
  }
}

/**
 * Generate fix suggestions
 */
function generateFixSuggestions() {
  console.log('\n' + '='.repeat(80));
  console.log(colors.cyan.bold('JSON ERROR PREVENTION - Quick Fix Guide'));
  console.log('='.repeat(80) + '\n');
  
  console.log(colors.green.bold('Step 1: Import the helpers\n'));
  console.log(colors.gray('// Frontend (TypeScript)'));
  console.log("import { safeJsonParse, safeJsonStringify, handleApiResponse } from '@/utils/jsonHelpers';");
  console.log('');
  console.log(colors.gray('// Backend (JavaScript)'));
  console.log("const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');");
  
  console.log('\n' + colors.green.bold('Step 2: Replace unsafe operations\n'));
  
  console.log(colors.yellow('Before:') + ' JSON.parse(data)');
  console.log(colors.green('After:') + '  safeJsonParse(data, defaultValue)\n');
  
  console.log(colors.yellow('Before:') + ' response.json()');
  console.log(colors.green('After:') + '  handleApiResponse(response)\n');
  
  console.log(colors.yellow('Before:') + ' JSON.stringify(data)');
  console.log(colors.green('After:') + '  safeJsonStringify(data)\n');
  
  console.log(colors.yellow('Before:') + ' JSON.parse(localStorage.getItem("key"))');
  console.log(colors.green('After:') + '  getFromStorage("key", defaultValue)\n');
}

/**
 * Main execution
 */
function main() {
  console.log(colors.cyan.bold('\n🔍 Scanning for unsafe JSON operations...\n'));
  
  // Scan both frontend and backend
  const dirs = [
    path.join(process.cwd(), 'tpe-front-end'),
    path.join(process.cwd(), 'tpe-backend')
  ];
  
  dirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(colors.gray(`Scanning ${path.basename(dir)}...`));
      scanDirectory(dir);
    }
  });
  
  // Report findings
  if (findings.length === 0) {
    console.log(colors.green.bold('\n✅ No unsafe JSON operations found!\n'));
    return;
  }
  
  console.log(colors.red.bold(`\n⚠️  Found ${totalIssues} unsafe JSON operations:\n`));
  
  findings.forEach(({ file, issues }) => {
    const relativePath = path.relative(process.cwd(), file);
    console.log(colors.yellow.bold(`\n📄 ${relativePath}`));
    
    issues.forEach(({ line, code, message, fix }) => {
      console.log(colors.gray(`   Line ${line}: `) + colors.red(message));
      console.log(colors.gray(`   Code: ${code.substring(0, 80)}${code.length > 80 ? '...' : ''}`));
      console.log(colors.green(`   Fix: ${fix}\n`));
    });
  });
  
  // Show fix suggestions
  generateFixSuggestions();
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log(colors.cyan.bold('Summary:'));
  console.log(`  Files with issues: ${findings.length}`);
  console.log(`  Total issues: ${totalIssues}`);
  console.log('');
  console.log(colors.yellow('Run this check before committing:'));
  console.log(colors.gray('  node tools/json-error-check.js'));
  console.log('='.repeat(80) + '\n');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { scanFile, scanDirectory };