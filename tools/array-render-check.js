#!/usr/bin/env node

/**
 * Array Rendering Error Checker for React
 * Scans TSX/JSX files for unsafe array rendering patterns
 */

const fs = require('fs');
const path = require('path');
const colors = require('colors');

// Patterns that indicate unsafe array rendering
const UNSAFE_PATTERNS = [
  {
    pattern: /<[^>]*>\{[\s]*([a-zA-Z_$][a-zA-Z0-9_$]*)[\s]*\}/g,
    test: (match, varName, fileContent) => {
      // Check if this variable might be an array/object
      const isLikelyArray = 
        fileContent.includes(`${varName}.map`) ||
        fileContent.includes(`${varName}:`) ||
        fileContent.includes(`Array.isArray(${varName})`) ||
        varName.endsWith('s') || // plural names often indicate arrays
        varName.includes('List') ||
        varName.includes('Array') ||
        varName.includes('items') ||
        varName.includes('data');
      return isLikelyArray;
    },
    message: 'Possible direct array/object rendering',
    fix: 'Use .map() or access specific properties'
  },
  {
    pattern: /\.map\([^)]*\)\s*(?!\))/g,
    test: (match, _, fileContent) => {
      // Check if map has a key prop
      const mapBlock = match + fileContent.substring(fileContent.indexOf(match) + match.length, 
                                                     fileContent.indexOf(match) + match.length + 200);
      return !mapBlock.includes('key=');
    },
    message: '.map() without key prop',
    fix: 'Add key={item.id || index} to mapped elements'
  },
  {
    pattern: /([a-zA-Z_$][a-zA-Z0-9_$]*)\.map\(/g,
    test: (match, varName, fileContent) => {
      // Check if there's an Array.isArray check before the map
      const beforeMap = fileContent.substring(Math.max(0, fileContent.indexOf(match) - 200), 
                                              fileContent.indexOf(match));
      const hasCheck = 
        beforeMap.includes(`Array.isArray(${varName})`) ||
        beforeMap.includes(`${varName}?.length`) ||
        beforeMap.includes(`${varName} &&`);
      return !hasCheck;
    },
    message: '.map() without Array.isArray() check',
    fix: 'Add Array.isArray() check before mapping'
  },
  {
    pattern: /\{JSON\.parse\([^)]+\)\}/g,
    message: 'Direct rendering of JSON.parse result',
    fix: 'Parse first, then map over the result'
  },
  {
    pattern: /<[^>]*>\{[^}]*\[[^\]]+\][^}]*\}/g,
    test: (match) => {
      // Check if it's array access being rendered directly
      return !match.includes('.map') && !match.includes('?.');
    },
    message: 'Direct array element rendering without null check',
    fix: 'Use optional chaining: array?.[index]'
  }
];

// Common array variable names to check
const ARRAY_INDICATORS = [
  'items', 'data', 'list', 'array', 'collection',
  'contractors', 'partners', 'bookings', 'matches',
  'focus_areas', 'challenges', 'goals', 'events',
  'recommendations', 'users', 'options', 'values'
];

// Files/directories to skip
const SKIP_PATHS = [
  'node_modules',
  '.git',
  '.next',
  'build',
  'dist',
  'coverage',
  'arrayHelpers' // Skip the helper file itself
];

let totalIssues = 0;
const findings = [];

/**
 * Check if path should be skipped
 */
function shouldSkip(filePath) {
  return SKIP_PATHS.some(skip => filePath.includes(skip));
}

/**
 * Check for missing empty state handling
 */
function checkEmptyStates(content, filePath) {
  const issues = [];
  
  // Find all .map() calls
  const mapPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\.map\([^)]*\)/g;
  let match;
  
  while ((match = mapPattern.exec(content)) !== null) {
    const varName = match[1];
    const mapIndex = match.index;
    
    // Check if there's a length check or empty state nearby
    const beforeMap = content.substring(Math.max(0, mapIndex - 300), mapIndex);
    const afterMap = content.substring(mapIndex, Math.min(content.length, mapIndex + 300));
    
    const hasEmptyCheck = 
      beforeMap.includes(`${varName}.length`) ||
      beforeMap.includes(`${varName}?.length`) ||
      afterMap.includes('No items') ||
      afterMap.includes('Empty') ||
      afterMap.includes('no data') ||
      beforeMap.includes('?') || // ternary operator
      afterMap.includes(':'); // ternary else clause
    
    if (!hasEmptyCheck) {
      const line = content.substring(0, mapIndex).split('\n').length;
      issues.push({
        line,
        code: match[0],
        message: 'No empty state handling for array',
        fix: 'Add: items.length > 0 ? items.map(...) : <EmptyState />'
      });
      totalIssues++;
    }
  }
  
  return issues;
}

/**
 * Scan a file for unsafe array rendering
 */
function scanFile(filePath) {
  if (shouldSkip(filePath)) return;
  
  const ext = path.extname(filePath);
  if (!['.tsx', '.jsx'].includes(ext)) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const fileIssues = [];
    
    // Check each pattern
    UNSAFE_PATTERNS.forEach(({ pattern, test, message, fix }) => {
      const regex = new RegExp(pattern);
      let match;
      
      while ((match = regex.exec(content)) !== null) {
        // If there's a test function, use it
        if (!test || test(match[0], match[1], content)) {
          const line = content.substring(0, match.index).split('\n').length;
          const codeSnippet = lines[line - 1]?.trim() || match[0];
          
          fileIssues.push({
            line,
            code: codeSnippet.substring(0, 80),
            message,
            fix
          });
          totalIssues++;
        }
      }
    });
    
    // Check for missing empty states
    const emptyStateIssues = checkEmptyStates(content, filePath);
    fileIssues.push(...emptyStateIssues);
    
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
  console.log(colors.cyan.bold('ARRAY RENDERING - Quick Fix Guide'));
  console.log('='.repeat(80) + '\n');
  
  console.log(colors.green.bold('The Universal Pattern:\n'));
  console.log(colors.white(`{Array.isArray(items) && items.length > 0 ? (
  items.map(item => (
    <div key={item.id || index}>
      {item.name}
    </div>
  ))
) : (
  <EmptyState />
)}`));
  
  console.log('\n' + colors.green.bold('Import the helpers:\n'));
  console.log("import { SafeList, ensureArray, renderBadgeArray } from '@/utils/arrayHelpers';");
  
  console.log('\n' + colors.green.bold('Common Fixes:\n'));
  
  console.log(colors.yellow('Issue:') + ' Direct array rendering');
  console.log(colors.red('  <div>{items}</div>'));
  console.log(colors.green('  <div>{items.map(item => <span key={item.id}>{item}</span>)}</div>\n'));
  
  console.log(colors.yellow('Issue:') + ' Missing key prop');
  console.log(colors.red('  items.map(item => <div>{item}</div>)'));
  console.log(colors.green('  items.map(item => <div key={item.id}>{item}</div>)\n'));
  
  console.log(colors.yellow('Issue:') + ' No Array.isArray check');
  console.log(colors.red('  data.map(...)'));
  console.log(colors.green('  Array.isArray(data) && data.map(...)\n'));
  
  console.log(colors.yellow('Issue:') + ' No empty state');
  console.log(colors.red('  {items.map(...)}'));
  console.log(colors.green('  {items.length > 0 ? items.map(...) : <Empty />}\n'));
}

/**
 * Main execution
 */
function main() {
  console.log(colors.cyan.bold('\n🔍 Scanning for unsafe array rendering patterns...\n'));
  
  // Scan frontend directory
  const frontendDir = path.join(process.cwd(), 'tpe-front-end');
  
  if (fs.existsSync(frontendDir)) {
    console.log(colors.gray('Scanning frontend components...'));
    scanDirectory(frontendDir);
  }
  
  // Report findings
  if (findings.length === 0) {
    console.log(colors.green.bold('\n✅ No unsafe array rendering patterns found!\n'));
    return;
  }
  
  console.log(colors.red.bold(`\n⚠️  Found ${totalIssues} potential array rendering issues:\n`));
  
  findings.forEach(({ file, issues }) => {
    const relativePath = path.relative(process.cwd(), file);
    console.log(colors.yellow.bold(`\n📄 ${relativePath}`));
    
    issues.forEach(({ line, code, message, fix }) => {
      console.log(colors.gray(`   Line ${line}: `) + colors.red(message));
      if (code) {
        console.log(colors.gray(`   Code: ${code}${code.length >= 80 ? '...' : ''}`));
      }
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
  console.log(colors.yellow('💡 Use SafeList component for automatic safety:'));
  console.log(colors.gray(`  <SafeList 
    data={items} 
    renderItem={(item) => <Card>{item.name}</Card>}
    emptyState={<Empty />}
  />`));
  console.log('='.repeat(80) + '\n');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { scanFile, scanDirectory };