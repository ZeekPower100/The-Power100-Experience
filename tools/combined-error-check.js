#!/usr/bin/env node

/**
 * Combined Error Prevention Checker
 * Runs both JSON and Array rendering checks
 */

const colors = require('colors');
const { spawn } = require('child_process');

console.log(colors.cyan.bold('\n🛡️  Running Combined Error Prevention Checks\n'));
console.log('='.repeat(80));

let hasErrors = false;

// Run JSON error check
console.log(colors.yellow.bold('\n📋 Checking JSON Operations...\n'));
const jsonCheck = spawn('node', ['tools/json-error-check.js'], { 
  stdio: 'inherit',
  shell: true 
});

jsonCheck.on('close', (code) => {
  if (code !== 0) hasErrors = true;
  
  // Run Array rendering check
  console.log(colors.yellow.bold('\n📋 Checking Array Rendering...\n'));
  const arrayCheck = spawn('node', ['tools/array-render-check.js'], { 
    stdio: 'inherit',
    shell: true 
  });
  
  arrayCheck.on('close', (code2) => {
    if (code2 !== 0) hasErrors = true;
    
    // Run Import/Require syntax check
    console.log(colors.yellow.bold('\n📋 Checking Import/Require Syntax...\n'));
    const syntaxCheck = spawn('node', ['tools/import-require-checker.js'], { 
      stdio: 'inherit',
      shell: true 
    });
    
    syntaxCheck.on('close', (code3) => {
      if (code3 !== 0) hasErrors = true;
      
      // Final summary
      console.log('\n' + '='.repeat(80));
      if (hasErrors) {
        console.log(colors.red.bold('❌ Issues found! Please fix before committing.\n'));
        console.log(colors.yellow('📚 References:'));
        console.log('   • JSON Errors: docs/JSON-ERROR-PREVENTION.md');
        console.log('   • Array Errors: docs/ARRAY-RENDERING-PREVENTION.md');
        console.log('   • Module Syntax: JSON-MIGRATION-SYNTAX-GUIDE.md');
        process.exit(1);
      } else {
        console.log(colors.green.bold('✅ All checks passed! Code is error-proof.\n'));
        process.exit(0);
      }
    });
  });
});