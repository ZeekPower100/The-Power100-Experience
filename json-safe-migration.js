#!/usr/bin/env node

/**
 * JSON Safe Migration Script - Batch Processing
 * Migrates unsafe JSON operations to safe helpers in controlled batches
 * 
 * FEATURES:
 * - Processes 10 files at a time
 * - Shows preview before changes
 * - Creates backup of each file
 * - Allows skipping files
 * - Generates report after each batch
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const BATCH_SIZE = 10;
const BACKUP_DIR = '.json-migration-backup';
const REPORT_FILE = 'json-migration-report.md';

class JsonSafeMigration {
  constructor() {
    this.filesProcessed = 0;
    this.filesSkipped = 0;
    this.changesApplied = 0;
    this.errors = [];
    this.currentBatch = 1;
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  /**
   * Find all files with unsafe JSON operations
   */
  findUnsafeFiles(directory) {
    const files = [];
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    
    const scanDir = (dir) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.includes('node_modules') && !item.startsWith('.')) {
          scanDir(fullPath);
        } else if (stat.isFile() && extensions.some(ext => fullPath.endsWith(ext))) {
          const content = fs.readFileSync(fullPath, 'utf8');
          
          // Check for unsafe patterns
          if (this.hasUnsafeOperations(content)) {
            files.push(fullPath);
          }
        }
      }
    };
    
    scanDir(directory);
    return files;
  }

  /**
   * Check if content has unsafe JSON operations
   */
  hasUnsafeOperations(content) {
    const unsafePatterns = [
      /JSON\.parse\s*\(/,
      /JSON\.stringify\s*\(/,
      /\.json\s*\(\)/,
      /localStorage\.getItem\s*\(/,
      /localStorage\.setItem\s*\(/,
      /sessionStorage\.getItem\s*\(/,
      /sessionStorage\.setItem\s*\(/
    ];
    
    return unsafePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Create backup of a file
   */
  createBackup(filePath) {
    const backupPath = path.join(BACKUP_DIR, path.relative(process.cwd(), filePath));
    const backupDir = path.dirname(backupPath);
    
    // Create backup directory if needed
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Copy file to backup
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  }

  /**
   * Apply safe migrations to file content
   */
  migrateContent(content, filePath) {
    let modified = content;
    let changeCount = 0;
    const changes = [];
    
    // Determine if TypeScript or JavaScript
    const isTypeScript = filePath.endsWith('.ts') || filePath.endsWith('.tsx');
    
    // Check if jsonHelpers is already imported
    const hasJsonHelpers = /from ['"].*jsonHelpers['"]/.test(content);
    
    // 1. Replace JSON.parse with safeJsonParse
    const jsonParseRegex = /JSON\.parse\s*\(([^)]+)\)/g;
    modified = modified.replace(jsonParseRegex, (match, args) => {
      changeCount++;
      changes.push(`JSON.parse(${args}) → safeJsonParse(${args})`);
      return `safeJsonParse(${args})`;
    });
    
    // 2. Replace JSON.stringify with safeJsonStringify
    const jsonStringifyRegex = /JSON\.stringify\s*\(([^)]+)\)/g;
    modified = modified.replace(jsonStringifyRegex, (match, args) => {
      changeCount++;
      changes.push(`JSON.stringify(${args}) → safeJsonStringify(${args})`);
      return `safeJsonStringify(${args})`;
    });
    
    // 3. Replace response.json() with handleApiResponse
    const responseJsonRegex = /const\s+(\w+)\s*=\s*await\s+(\w+)\.json\(\)/g;
    modified = modified.replace(responseJsonRegex, (match, varName, responseName) => {
      changeCount++;
      changes.push(`await ${responseName}.json() → handleApiResponse(${responseName})`);
      return `const ${varName} = await handleApiResponse(${responseName})`;
    });
    
    // 4. Replace localStorage.getItem with getFromStorage
    const getItemRegex = /localStorage\.getItem\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    modified = modified.replace(getItemRegex, (match, key) => {
      changeCount++;
      changes.push(`localStorage.getItem('${key}') → getFromStorage('${key}')`);
      return `getFromStorage('${key}')`;
    });
    
    // 5. Replace localStorage.setItem with setToStorage
    const setItemRegex = /localStorage\.setItem\s*\(\s*['"]([^'"]+)['"]\s*,\s*([^)]+)\)/g;
    modified = modified.replace(setItemRegex, (match, key, value) => {
      changeCount++;
      changes.push(`localStorage.setItem('${key}', ${value}) → setToStorage('${key}', ${value})`);
      return `setToStorage('${key}', ${value})`;
    });
    
    // Add import if changes were made and import doesn't exist
    if (changeCount > 0 && !hasJsonHelpers) {
      const importStatement = this.getImportStatement(filePath, isTypeScript);
      
      // Find where to insert import (after other imports or at top)
      const lastImportMatch = modified.match(/^import[^;]+;$/gm);
      if (lastImportMatch) {
        const lastImport = lastImportMatch[lastImportMatch.length - 1];
        const insertPos = modified.indexOf(lastImport) + lastImport.length;
        modified = modified.slice(0, insertPos) + '\n' + importStatement + modified.slice(insertPos);
      } else {
        modified = importStatement + '\n\n' + modified;
      }
      
      changes.unshift(`Added import: ${importStatement}`);
    }
    
    return {
      content: modified,
      changeCount,
      changes
    };
  }

  /**
   * Get appropriate import statement based on file location
   * CRITICAL: Backend uses CommonJS, Frontend uses ES6 modules
   */
  getImportStatement(filePath, isTypeScript) {
    // Determine if this is backend or frontend
    const isBackend = filePath.includes('tpe-backend');
    const isFrontend = filePath.includes('tpe-front-end');
    
    // Calculate relative path to utils/jsonHelpers
    const fromPath = path.dirname(filePath);
    let relativePath;
    
    if (isBackend) {
      // Backend path to jsonHelpers
      relativePath = '../utils/jsonHelpers';
    } else if (isFrontend) {
      // Frontend path to jsonHelpers
      const toPath = path.join(process.cwd(), 'tpe-front-end/src/utils/jsonHelpers');
      relativePath = path.relative(fromPath, toPath).replace(/\\/g, '/');
      
      // Remove file extension
      relativePath = relativePath.replace(/\.(ts|js)$/, '');
      
      // Ensure it starts with ./ or ../
      if (!relativePath.startsWith('.')) {
        relativePath = './' + relativePath;
      }
    }
    
    // CRITICAL: Use correct syntax based on environment
    if (isBackend) {
      // CommonJS for backend - ALWAYS use require()
      console.log('  🔧 Using CommonJS require() for backend file');
      return `const { safeJsonParse, safeJsonStringify } = require('${relativePath}');`;
    } else {
      // ES6 modules for frontend - use import
      console.log('  🎨 Using ES6 import for frontend file');
      return `import { safeJsonParse, safeJsonStringify, handleApiResponse, getFromStorage, setToStorage } from '${relativePath}';`;
    }
  }

  /**
   * Process a single batch of files
   */
  async processBatch(files) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`BATCH ${this.currentBatch} - Processing ${files.length} files`);
    console.log('='.repeat(60));
    
    const batchReport = [];
    
    for (const file of files) {
      const relativePath = path.relative(process.cwd(), file);
      console.log(`\n📄 File: ${relativePath}`);
      
      try {
        const content = fs.readFileSync(file, 'utf8');
        const result = this.migrateContent(content, file);
        
        if (result.changeCount === 0) {
          console.log('   ✓ No unsafe operations found');
          this.filesSkipped++;
          continue;
        }
        
        // Show changes
        console.log(`   Found ${result.changeCount} unsafe operations:`);
        result.changes.forEach(change => {
          console.log(`     • ${change}`);
        });
        
        // Ask for confirmation
        const answer = await this.askQuestion('\n   Apply these changes? (y/n/s=skip/q=quit): ');
        
        if (answer.toLowerCase() === 'q') {
          console.log('Quitting migration...');
          return false;
        }
        
        if (answer.toLowerCase() === 's' || answer.toLowerCase() === 'n') {
          console.log('   Skipped');
          this.filesSkipped++;
          batchReport.push(`- [ ] ${relativePath} - Skipped`);
          continue;
        }
        
        if (answer.toLowerCase() === 'y') {
          // Create backup
          const backupPath = this.createBackup(file);
          console.log(`   Backup created: ${backupPath}`);
          
          // Apply changes
          fs.writeFileSync(file, result.content, 'utf8');
          console.log(`   ✅ Changes applied (${result.changeCount} replacements)`);
          
          this.filesProcessed++;
          this.changesApplied += result.changeCount;
          batchReport.push(`- [x] ${relativePath} - ${result.changeCount} changes applied`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
        this.errors.push(`${relativePath}: ${error.message}`);
        batchReport.push(`- [ ] ${relativePath} - ERROR: ${error.message}`);
      }
    }
    
    // Show batch summary
    this.showBatchSummary(batchReport);
    
    // Ask to continue
    if (files.length === BATCH_SIZE) {
      const answer = await this.askQuestion('\nContinue with next batch? (y/n): ');
      return answer.toLowerCase() === 'y';
    }
    
    return false;
  }

  /**
   * Show summary for current batch
   */
  showBatchSummary(batchReport) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`BATCH ${this.currentBatch} SUMMARY`);
    console.log('='.repeat(60));
    console.log(`Files processed: ${this.filesProcessed}`);
    console.log(`Files skipped: ${this.filesSkipped}`);
    console.log(`Changes applied: ${this.changesApplied}`);
    console.log(`Errors: ${this.errors.length}`);
    
    // Append to report file
    const reportContent = `
## Batch ${this.currentBatch} - ${new Date().toISOString()}

${batchReport.join('\n')}

**Summary:**
- Files processed: ${this.filesProcessed}
- Files skipped: ${this.filesSkipped}
- Changes applied: ${this.changesApplied}
- Errors: ${this.errors.length}

---
`;
    
    fs.appendFileSync(REPORT_FILE, reportContent);
    console.log(`\nReport updated: ${REPORT_FILE}`);
  }

  /**
   * Helper to ask questions
   */
  askQuestion(question) {
    return new Promise(resolve => {
      this.rl.question(question, answer => {
        resolve(answer);
      });
    });
  }

  /**
   * Run the migration
   */
  async run() {
    console.log('🔄 JSON Safe Migration Tool');
    console.log('============================');
    console.log(`Batch size: ${BATCH_SIZE} files`);
    console.log(`Backup directory: ${BACKUP_DIR}`);
    console.log(`Report file: ${REPORT_FILE}\n`);
    
    // Initialize report file
    fs.writeFileSync(REPORT_FILE, '# JSON Safe Migration Report\n\n');
    
    // Find all unsafe files
    console.log('Scanning for files with unsafe JSON operations...');
    const frontendFiles = this.findUnsafeFiles('./tpe-front-end/src');
    const backendFiles = this.findUnsafeFiles('./tpe-backend/src');
    
    // PRIORITIZE BACKEND FILES FIRST (they cause 500 errors)
    const allFiles = [...backendFiles, ...frontendFiles];
    
    console.log(`Found ${allFiles.length} files with unsafe operations`);
    console.log(`- Frontend: ${frontendFiles.length} files`);
    console.log(`- Backend: ${backendFiles.length} files`);
    
    if (allFiles.length === 0) {
      console.log('\n✅ No unsafe JSON operations found!');
      this.rl.close();
      return;
    }
    
    // Process in batches
    let continueProcessing = true;
    for (let i = 0; i < allFiles.length && continueProcessing; i += BATCH_SIZE) {
      const batch = allFiles.slice(i, i + BATCH_SIZE);
      continueProcessing = await this.processBatch(batch);
      this.currentBatch++;
    }
    
    // Final summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('FINAL MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total files processed: ${this.filesProcessed}`);
    console.log(`Total files skipped: ${this.filesSkipped}`);
    console.log(`Total changes applied: ${this.changesApplied}`);
    console.log(`Total errors: ${this.errors.length}`);
    
    if (this.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      this.errors.forEach(err => console.log(`  - ${err}`));
    }
    
    console.log(`\n📄 Full report saved to: ${REPORT_FILE}`);
    console.log(`💾 Backups saved to: ${BACKUP_DIR}`);
    
    this.rl.close();
  }
}

// Run if called directly
if (require.main === module) {
  const migration = new JsonSafeMigration();
  migration.run().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = JsonSafeMigration;