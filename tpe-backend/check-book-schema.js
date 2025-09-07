const { Pool } = require('pg');
require('dotenv').config();

async function checkBookSchema() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tpedb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
  });

  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'books'
      ORDER BY ordinal_position
    `);
    
    console.log('Books table schema:');
    result.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
    });
    
    // Check if we need to add columns
    const columns = result.rows.map(r => r.column_name);
    console.log('\nExisting columns:', columns);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkBookSchema();