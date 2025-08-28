// Check what columns exist in strategic_partners table
const { Pool } = require('pg');
require('dotenv').config({ path: './tpe-backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function checkColumns() {
  try {
    // First, try a simple query to see if we can connect
    const testResult = await pool.query('SELECT 1');
    console.log('✅ Connected to database');
    
    // Get column information
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'strategic_partners' 
      ORDER BY ordinal_position
    `);
    
    console.log('\n📋 Columns in strategic_partners table:\n');
    console.log('Column Name                    | Data Type           | Nullable');
    console.log('-------------------------------|---------------------|----------');
    
    result.rows.forEach(row => {
      const name = row.column_name.padEnd(30);
      const type = row.data_type.padEnd(20);
      const nullable = row.is_nullable;
      console.log(`${name} | ${type} | ${nullable}`);
    });
    
    // Check specifically for problem columns
    const problemColumns = ['website', 'description', 'company_description'];
    console.log('\n🔍 Checking for specific columns:');
    
    for (const col of problemColumns) {
      const exists = result.rows.some(row => row.column_name === col);
      console.log(`  ${col}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkColumns();