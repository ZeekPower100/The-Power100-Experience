#!/usr/bin/env node

/**
 * Development Watcher with Automatic Error Prevention
 * Watches for file changes and automatically runs error checks
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const colors = require('colors');

// Configuration
const WATCH_DIRS = [
  path.join(process.cwd(), 'tpe-front-end', 'src'),
  path.join(process.cwd(), 'tpe-backend', 'src')
];

const WATCH_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx'];
const DEBOUNCE_DELAY = 2000; // Wait 2 seconds after last change
const CHECK_ON_STARTUP = true;

// State
let debounceTimer = null;
let lastCheckTime = 0;
let filesChanged = new Set();
let isChecking = false;

// ANSI escape codes for clearing
const CLEAR_SCREEN = '\x1b[2J\x1b[0f';

/**
 * Clear console and show header
 */
function showHeader() {
  console.clear();
  console.log(colors.cyan.bold('╔════════════════════════════════════════════════════════════════╗'));
  console.log(colors.cyan.bold('║         🛡️  ERROR PREVENTION WATCHER - ACTIVE                 ║'));
  console.log(colors.cyan.bold('╚════════════════════════════════════════════════════════════════╝'));
  console.log(colors.gray(`Watching: ${WATCH_DIRS.map(d => path.basename(d)).join(', ')}`));
  console.log(colors.gray(`Extensions: ${WATCH_EXTENSIONS.join(', ')}`));
  console.log('');
}

/**
 * Run error checks on changed files
 */
async function runErrorChecks(specificFiles = []) {
  if (isChecking) return;
  isChecking = true;
  
  const startTime = Date.now();
  
  console.log(colors.yellow.bold('\n🔍 Running Error Prevention Checks...\n'));
  
  // Prepare file list for targeted checking
  const fileArgs = specificFiles.length > 0 
    ? ['--files', ...specificFiles]
    : [];
  
  return new Promise((resolve) => {
    // Create enhanced checker that can target specific files
    const checkProcess = spawn('node', [
      '-e',
      `
      const colors = require('colors');
      const targetFiles = ${JSON.stringify(specificFiles)};
      
      let hasJsonErrors = false;
      let hasArrayErrors = false;
      let jsonIssues = [];
      let arrayIssues = [];
      
      // Quick JSON check
      const jsonPatterns = [
        /JSON\\.parse\\([^)]+\\)(?![^{]*catch)/g,
        /\\.json\\(\\)(?![^{]*catch)/g,
      ];
      
      // Quick Array check  
      const arrayPatterns = [
        /<[^>]*>\\{[\\s]*([a-zA-Z_$][a-zA-Z0-9_$]*)[\\s]*\\}/g,
        /\\.map\\([^)]*\\)(?!.*key=)/g,
      ];
      
      const fs = require('fs');
      const path = require('path');
      
      function checkFile(filePath) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const ext = path.extname(filePath);
          const relativePath = path.relative(process.cwd(), filePath);
          
          // Check JSON patterns
          if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
            jsonPatterns.forEach(pattern => {
              if (pattern.test(content)) {
                hasJsonErrors = true;
                jsonIssues.push(relativePath);
              }
            });
          }
          
          // Check Array patterns (React files only)
          if (['.jsx', '.tsx'].includes(ext)) {
            arrayPatterns.forEach(pattern => {
              if (pattern.test(content)) {
                hasArrayErrors = true;
                arrayIssues.push(relativePath);
              }
            });
          }
        } catch (e) {}
      }
      
      // Check files
      if (targetFiles.length > 0) {
        targetFiles.forEach(checkFile);
      } else {
        // Full scan if no specific files
        const scanDir = (dir) => {
          if (dir.includes('node_modules') || dir.includes('.next')) return;
          try {
            fs.readdirSync(dir).forEach(item => {
              const fullPath = path.join(dir, item);
              const stat = fs.statSync(fullPath);
              if (stat.isDirectory()) {
                scanDir(fullPath);
              } else if (stat.isFile()) {
                checkFile(fullPath);
              }
            });
          } catch (e) {}
        };
        
        ['tpe-front-end/src', 'tpe-backend/src'].forEach(dir => {
          if (fs.existsSync(dir)) scanDir(dir);
        });
      }
      
      // Report results
      console.log('\\n' + '─'.repeat(60));
      
      if (hasJsonErrors || hasArrayErrors) {
        console.log(colors.red.bold('\\n⚠️  ERRORS FOUND - Fix these before testing:\\n'));
        
        if (hasJsonErrors) {
          console.log(colors.yellow('📋 JSON Issues:'));
          [...new Set(jsonIssues)].slice(0, 5).forEach(file => {
            console.log(colors.gray('   • ') + file);
          });
          console.log(colors.cyan('   Fix: Use safeJsonParse() from utils/jsonHelpers'));
        }
        
        if (hasArrayErrors) {
          console.log(colors.yellow('\\n🔤 Array Rendering Issues:'));
          [...new Set(arrayIssues)].slice(0, 5).forEach(file => {
            console.log(colors.gray('   • ') + file);
          });
          console.log(colors.cyan('   Fix: Use Array.isArray() && map with key prop'));
        }
        
        console.log('\\n' + colors.yellow('📚 Quick Fix Guide:'));
        console.log(colors.gray('   1. Import helpers: ') + "import { safeJsonParse } from '@/utils/jsonHelpers'");
        console.log(colors.gray('   2. For arrays: ') + '{Array.isArray(data) && data.map(item => <div key={item.id}>...</div>)}');
        console.log(colors.gray('   3. Run full check: ') + 'node tools/combined-error-check.js');
        
        process.exit(1);
      } else {
        console.log(colors.green.bold('✅ No errors detected in changed files!'));
        console.log(colors.gray('\\nYou can safely test your changes.'));
        process.exit(0);
      }
      `
    ], {
      stdio: 'inherit',
      shell: true,
      cwd: process.cwd()
    });
    
    checkProcess.on('close', (code) => {
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      
      if (code === 0) {
        console.log(colors.green(`\n✨ Checks passed in ${duration}s - Safe to test!\n`));
      } else {
        console.log(colors.red(`\n❌ Issues found in ${duration}s - Fix before testing!\n`));
      }
      
      console.log(colors.gray('─'.repeat(60)));
      console.log(colors.cyan('👀 Watching for changes...'));
      
      isChecking = false;
      filesChanged.clear();
      resolve(code === 0);
    });
  });
}

/**
 * Handle file change
 */
function handleFileChange(event, filePath) {
  const ext = path.extname(filePath);
  
  // Skip if not a watched extension
  if (!WATCH_EXTENSIONS.includes(ext)) return;
  
  // Skip if file doesn't exist (deleted)
  if (!fs.existsSync(filePath)) return;
  
  const relativePath = path.relative(process.cwd(), filePath);
  
  // Skip node_modules, build directories, etc.
  if (relativePath.includes('node_modules') || 
      relativePath.includes('.next') ||
      relativePath.includes('build') ||
      relativePath.includes('dist')) {
    return;
  }
  
  filesChanged.add(filePath);
  
  // Show what changed
  console.log(colors.gray(`\n📝 Changed: ${relativePath}`));
  
  // Debounce the check
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  debounceTimer = setTimeout(() => {
    if (filesChanged.size > 0) {
      console.log(colors.yellow(`\n🔄 ${filesChanged.size} file(s) changed, checking...`));
      runErrorChecks(Array.from(filesChanged));
    }
  }, DEBOUNCE_DELAY);
}

/**
 * Start watching directories
 */
function startWatching() {
  showHeader();
  
  WATCH_DIRS.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(colors.yellow(`⚠️  Directory not found: ${dir}`));
      return;
    }
    
    console.log(colors.green(`✅ Watching: ${path.relative(process.cwd(), dir)}`));
    
    // Recursive watch
    fs.watch(dir, { recursive: true }, (event, filename) => {
      if (filename) {
        const fullPath = path.join(dir, filename);
        handleFileChange(event, fullPath);
      }
    });
  });
  
  console.log('');
  console.log(colors.cyan.bold('─'.repeat(60)));
  
  if (CHECK_ON_STARTUP) {
    console.log(colors.yellow('\n🚀 Running initial check...\n'));
    runErrorChecks();
  } else {
    console.log(colors.cyan('\n👀 Watching for changes...\n'));
  }
  
  // Instructions
  console.log(colors.gray('\nPress Ctrl+C to stop watching'));
  console.log(colors.gray('Changes are checked automatically after 2 seconds'));
}

/**
 * Graceful shutdown
 */
process.on('SIGINT', () => {
  console.log(colors.yellow('\n\n👋 Stopping error prevention watcher...'));
  process.exit(0);
});

// Start watching
startWatching();