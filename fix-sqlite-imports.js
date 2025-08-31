const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Find all JavaScript files in tpe-backend
const files = glob.sync('tpe-backend/**/*.js', { 
  ignore: ['**/node_modules/**', '**/database.sqlite.js']
});

let fixedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const originalContent = content;
  
  // Replace database.sqlite imports with database imports
  content = content.replace(/require\(['"]\.\.\/config\/database\.sqlite['"]\)/g, "require('../config/database')");
  content = content.replace(/require\(['"]\.\.\/\.\.\/config\/database\.sqlite['"]\)/g, "require('../../config/database')");
  content = content.replace(/require\(['"]\.\/config\/database\.sqlite['"]\)/g, "require('./config/database')");
  content = content.replace(/require\(['"]\.\.\/\.\.\/\.\.\/config\/database\.sqlite['"]\)/g, "require('../../../config/database')");
  
  if (content !== originalContent) {
    fs.writeFileSync(file, content);
    console.log(`Fixed: ${file}`);
    fixedCount++;
  }
});

console.log(`\n✅ Fixed ${fixedCount} files`);