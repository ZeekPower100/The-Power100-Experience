#!/usr/bin/env node

/**
 * INFINITE RECURSION CHECKER
 * Detects functions that call themselves without proper base cases
 * Prevents stack overflow errors in production
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(__dirname, '../tpe-front-end/src');
const BACKEND_DIR = path.join(__dirname, '../tpe-backend/src');

let issuesFound = 0;
const recursionIssues = [];

console.log('\x1b[36m\x1b[1m\x1b[22m\x1b[39m');
console.log('\x1b[36m\x1b[1m🔄 Scanning for infinite recursion patterns...\x1b[22m\x1b[39m');
console.log('\x1b[36m\x1b[1m\x1b[22m\x1b[39m');

/**
 * Recursively get all JS/TS files in a directory
 */
function getFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Skip node_modules, .next, dist, build directories
      if (!file.match(/node_modules|\.next|dist|build|\.git/)) {
        getFiles(filePath, fileList);
      }
    } else if (file.match(/\.(js|jsx|ts|tsx)$/)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Check if a function has a recursive call without proper base case
 * FOCUS: Specifically detect function shadowing patterns that cause infinite recursion
 */
function checkForInfiniteRecursion(content, filePath) {
  // CRITICAL PATTERN: Local function shadows imported helper (like safeJsonParse)
  // This is the exact bug that caused production issues

  // Get all imports in this file
  const importMatches = content.match(/import\s*{[^}]+}\s*from\s*['"]/g) || [];
  const importedFunctions = new Set();

  importMatches.forEach(importLine => {
    const functionsMatch = importLine.match(/import\s*{([^}]+)}/);
    if (functionsMatch) {
      const functions = functionsMatch[1].split(',').map(f => f.trim());
      functions.forEach(func => {
        // Handle renamed imports: safeJsonParse as parse
        const actualName = func.includes(' as ') ? func.split(' as ')[1].trim() : func;
        importedFunctions.add(actualName);
      });
    }
  });

  // Now check for local functions with the same name as imported functions
  // Pattern: const functionName = (args) => { ... return functionName(...) ... }
  const localFunctionPattern = /const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{([\s\S]*?)\n(?:const|\/\/|export)/g;

  let match;
  while ((match = localFunctionPattern.exec(content)) !== null) {
    const functionName = match[1];
    const functionBody = match[2];

    // Only flag if this function name is imported AND calls itself
    if (importedFunctions.has(functionName)) {
      const selfCallPattern = new RegExp(`return\\s+${functionName}\\s*\\(`, 'g');
      if (selfCallPattern.test(functionBody)) {
        const lineNumber = content.substring(0, match.index).split('\n').length;

        recursionIssues.push({
          file: filePath,
          function: functionName,
          line: lineNumber,
          issue: `Local function "${functionName}" shadows imported helper - creates infinite recursion loop`,
          severity: 'CRITICAL'
        });
        issuesFound++;
      }
    }
  }

  // Also check for simple function declarations that shadow imports
  const functionDeclPattern = /(?:function|const)\s+(\w+)\s*=?\s*(?:async\s*)?\([^)]*\)\s*(?:=>)?\s*\{([^}]{1,500}return\s+\1\s*\([^}]*)\}/g;

  while ((match = functionDeclPattern.exec(content)) !== null) {
    const functionName = match[1];
    const functionBody = match[2];

    // Only flag if this function name is imported
    if (importedFunctions.has(functionName)) {
      // Check if it directly calls itself in a return statement (classic shadow pattern)
      const directSelfCall = new RegExp(`return\\s+${functionName}\\s*\\(`);
      if (directSelfCall.test(functionBody)) {
        const lineNumber = content.substring(0, match.index).split('\n').length;

        recursionIssues.push({
          file: filePath,
          function: functionName,
          line: lineNumber,
          issue: `Local function "${functionName}" shadows imported helper - creates infinite recursion loop`,
          severity: 'CRITICAL'
        });
        issuesFound++;
      }
    }
  }
}

// Scan frontend
console.log('\x1b[90mScanning tpe-front-end...\x1b[39m');
const frontendFiles = getFiles(FRONTEND_DIR);
frontendFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  checkForInfiniteRecursion(content, path.relative(process.cwd(), file));
});

// Scan backend
console.log('\x1b[90mScanning tpe-backend...\x1b[39m');
const backendFiles = getFiles(BACKEND_DIR);
backendFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  checkForInfiniteRecursion(content, path.relative(process.cwd(), file));
});

// Report results
if (issuesFound > 0) {
  console.log('\x1b[31m\x1b[1m\x1b[22m\x1b[39m');
  console.log(`\x1b[31m\x1b[1m⚠️  Found ${issuesFound} potential infinite recursion issue${issuesFound > 1 ? 's' : ''}:\x1b[22m\x1b[39m`);
  console.log('\x1b[31m\x1b[1m\x1b[22m\x1b[39m');

  recursionIssues.forEach(issue => {
    console.log('\x1b[33m\x1b[1m\x1b[22m\x1b[39m');
    console.log(`\x1b[33m\x1b[1m📄 ${issue.file}\x1b[22m\x1b[39m`);
    console.log(`\x1b[90m   Line ${issue.line}: \x1b[39m\x1b[31m${issue.issue}\x1b[39m`);
    console.log(`\x1b[90m   Function: ${issue.function}\x1b[39m`);
    console.log(`\x1b[32m   Fix: Ensure function has a base case or use the imported helper instead\x1b[39m`);
    console.log('\x1b[32m\x1b[39m');
  });

  console.log('\x1b[31m\x1b[1m\x1b[22m\x1b[39m');
  console.log('\x1b[31m\x1b[1m❌ INFINITE RECURSION CHECK FAILED\x1b[22m\x1b[39m');
  console.log('\x1b[31m\x1b[1m\x1b[22m\x1b[39m');
  console.log('\x1b[33mInfinite recursion will cause:\x1b[39m');
  console.log('\x1b[33m  • RangeError: Maximum call stack size exceeded\x1b[39m');
  console.log('\x1b[33m  • Browser freeze and page crashes\x1b[39m');
  console.log('\x1b[33m  • Severe performance degradation\x1b[39m');
  console.log('\x1b[33m\x1b[39m');
  console.log('\x1b[33mCommon causes:\x1b[39m');
  console.log('\x1b[33m  1. Local function shadows imported helper (e.g., local safeJsonParse calling itself)\x1b[39m');
  console.log('\x1b[33m  2. Recursive function missing base case or termination condition\x1b[39m');
  console.log('\x1b[33m  3. Function calls itself without proper exit strategy\x1b[39m');
  console.log('\x1b[33m\x1b[39m');
  console.log('\x1b[32mHow to fix:\x1b[39m');
  console.log('\x1b[32m  1. Use imported helpers instead of local functions with same name\x1b[39m');
  console.log('\x1b[32m  2. Add proper base case: if (condition) return fallback;\x1b[39m');
  console.log('\x1b[32m  3. Ensure recursive calls approach the base case\x1b[39m');
  console.log('\x1b[32m\x1b[39m');

  process.exit(1);
} else {
  console.log('\x1b[32m\x1b[1m✅ No infinite recursion patterns detected\x1b[22m\x1b[39m');
  process.exit(0);
}
