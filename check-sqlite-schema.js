// Check what columns exist in SQLite partners table
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'tpe-backend', 'power100.db');
console.log('Checking SQLite database at:', dbPath);

const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    return;
  }
  
  console.log('✅ Connected to SQLite database');
  
  // Get table info for partners table
  db.all("PRAGMA table_info(partners)", (err, rows) => {
    if (err) {
      console.error('Error getting table info:', err);
      return;
    }
    
    console.log('\n📋 Columns in SQLite partners table:\n');
    console.log('Column Name                    | Type           | Not Null | Default');
    console.log('-------------------------------|----------------|----------|--------');
    
    const columnNames = [];
    rows.forEach(row => {
      const name = row.name.padEnd(30);
      const type = row.type.padEnd(15);
      const notNull = row.notnull ? 'NOT NULL' : 'NULL    ';
      const defaultVal = row.dflt_value || '';
      console.log(`${name} | ${type} | ${notNull} | ${defaultVal}`);
      columnNames.push(row.name);
    });
    
    // Check for specific columns we're interested in
    console.log('\n🔍 Checking for specific columns:');
    const importantColumns = ['website', 'description', 'company_description', 'power100_subdomain', 'focus_areas_served', 'target_revenue_range'];
    
    importantColumns.forEach(col => {
      const exists = columnNames.includes(col);
      console.log(`  ${col}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    });
    
    db.close();
  });
});