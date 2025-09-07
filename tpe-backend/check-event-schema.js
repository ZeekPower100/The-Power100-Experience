const { Pool } = require('pg');
require('dotenv').config();

async function checkEventSchema() {
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
      WHERE table_name = 'events'
      ORDER BY ordinal_position
    `);
    
    console.log('Events table schema:');
    result.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : ''}`);
    });
    
    console.log('\nExisting columns:', result.rows.map(r => r.column_name));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkEventSchema();