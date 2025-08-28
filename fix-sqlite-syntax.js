#!/usr/bin/env node
/**
 * Script to find and fix SQLite syntax in all JavaScript files
 * Converts ? placeholders to PostgreSQL $1, $2, etc. syntax
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Patterns to find SQLite syntax
const sqlitePatterns = [
  /(\bWHERE\s+[^$]*?)\?/gi,
  /(\bVALUES\s*\([^$)]*?)\?/gi,
  /(\bSET\s+[^$]*?=\s*)\?/gi,
  /(=\s*)\?(?=\s*(?:,|\s|AND|OR|$))/gi,
  /(\bIN\s*\([^$)]*?)\?/gi,
  /(\bLIKE\s+)\?/gi,
];

// Files to check
const filesToCheck = glob.sync('tpe-backend/src/**/*.js', {
  ignore: ['**/node_modules/**', '**/database.sqlite.js']
});

console.log(`🔍 Checking ${filesToCheck.length} files for SQLite syntax...`);

let totalFixed = 0;
const filesWithIssues = [];

filesToCheck.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;
  let fileFixed = 0;
  
  // Find all SQL queries in the file
  const queryMatches = content.matchAll(/query\s*\(\s*[`'"]([\s\S]*?)[`'"]\s*,\s*\[([\s\S]*?)\]/g);
  
  for (const match of queryMatches) {
    const query = match[1];
    const params = match[2];
    
    // Count ? placeholders in the query
    const placeholders = (query.match(/\?/g) || []).length;
    
    if (placeholders > 0) {
      // Replace ? with $1, $2, etc.
      let counter = 1;
      let newQuery = query.replace(/\?/g, () => `$${counter++}`);
      
      // Replace in the original content
      const oldQueryString = match[0];
      const newQueryString = oldQueryString.replace(query, newQuery);
      content = content.replace(oldQueryString, newQueryString);
      
      fileFixed += placeholders;
    }
  }
  
  if (fileFixed > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Fixed ${fileFixed} SQLite placeholders in ${path.relative(process.cwd(), filePath)}`);
    filesWithIssues.push({ file: filePath, fixes: fileFixed });
    totalFixed += fileFixed;
  }
});

console.log('\n📊 Summary:');
console.log(`Total files checked: ${filesToCheck.length}`);
console.log(`Files with SQLite syntax: ${filesWithIssues.length}`);
console.log(`Total placeholders fixed: ${totalFixed}`);

if (filesWithIssues.length > 0) {
  console.log('\n📝 Files that were fixed:');
  filesWithIssues.forEach(({ file, fixes }) => {
    console.log(`  - ${path.relative(process.cwd(), file)}: ${fixes} fixes`);
  });
}

console.log('\n✨ Done! All SQLite syntax has been converted to PostgreSQL syntax.');