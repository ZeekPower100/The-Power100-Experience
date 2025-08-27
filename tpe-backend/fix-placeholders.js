const fs = require('fs');
const path = require('path');

function fixPlaceholders(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.includes('node_modules')) {
      fixPlaceholders(filePath);
    } else if (file.endsWith('.js')) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Only fix SQL queries, not other uses of ?
      // Look for patterns like 'SELECT ... WHERE ... = ?'
      content = content.replace(/(\bSELECT\b[\s\S]*?\bWHERE\b[\s\S]*?=\s*)\?/gi, '$1$1');
      content = content.replace(/(\bINSERT INTO\b[\s\S]*?\bVALUES\b[\s\S]*?\([\s\S]*?)\?/gi, '$1$1');
      content = content.replace(/(\bUPDATE\b[\s\S]*?\bSET\b[\s\S]*?=\s*)\?/gi, '$1$1');
      content = content.replace(/(\bDELETE FROM\b[\s\S]*?\bWHERE\b[\s\S]*?=\s*)\?/gi, '$1$1');
      
      // More specific: Replace ? with numbered placeholders
      let queryMatches = content.match(/(query|get|all|run)\s*\(\s*['"`][\s\S]*?['"`]/g);
      if (queryMatches) {
        queryMatches.forEach(match => {
          let placeholderCount = 1;
          let fixed = match.replace(/\?/g, () => `$${placeholderCount++}`);
          content = content.replace(match, fixed);
        });
      }
      
      fs.writeFileSync(filePath, content);
    }
  });
}

// Fix all controllers and middleware
fixPlaceholders('./src/controllers');
fixPlaceholders('./src/middleware');
console.log('Fixed placeholders');
