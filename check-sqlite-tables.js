// Check what tables exist in SQLite database
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
  
  // Get all tables
  db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
      console.error('Error getting tables:', err);
      return;
    }
    
    console.log('\n📋 Tables in SQLite database:');
    tables.forEach(table => {
      console.log(`  - ${table.name}`);
    });
    
    // Check if strategic_partners exists
    const hasStrategicPartners = tables.some(t => t.name === 'strategic_partners');
    const hasPartners = tables.some(t => t.name === 'partners');
    
    console.log('\n🔍 Partner tables:');
    console.log(`  partners: ${hasPartners ? '✅ EXISTS' : '❌ MISSING'}`);
    console.log(`  strategic_partners: ${hasStrategicPartners ? '✅ EXISTS' : '❌ MISSING'}`);
    
    // If strategic_partners exists, check its columns
    if (hasStrategicPartners) {
      db.all("PRAGMA table_info(strategic_partners)", (err, rows) => {
        if (!err && rows) {
          console.log('\n📋 Columns in SQLite strategic_partners table:');
          rows.forEach(row => {
            console.log(`  - ${row.name} (${row.type})`);
          });
        }
        db.close();
      });
    } else {
      db.close();
    }
  });
});