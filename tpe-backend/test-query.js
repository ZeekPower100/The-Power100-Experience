// Test query directly
const { connectDB, query } = require('./src/config/database.sqlite');

async function test() {
  await connectDB();
  
  console.log('Testing direct query...');
  
  const result = await query(`
    SELECT id, name, email, phone 
    FROM contractors 
    WHERE email IS NOT NULL 
    LIMIT 5
  `);
  
  console.log('Query result:', result);
  console.log('Rows:', result.rows);
  console.log('Row count:', result.rowCount);
  
  // Also test with sqlite3 directly
  const sqlite3 = require('sqlite3').verbose();
  const db = new sqlite3.Database('./power100.db');
  
  db.all(`SELECT id, name, email FROM contractors WHERE email IS NOT NULL LIMIT 5`, (err, rows) => {
    console.log('\nDirect sqlite3 result:');
    console.log('Error:', err);
    console.log('Rows:', rows);
    db.close();
    process.exit(0);
  });
}

test().catch(console.error);