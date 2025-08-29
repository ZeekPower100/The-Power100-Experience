const { Pool } = require('pg');
require('dotenv').config();

async function checkTables() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tpedb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
  });

  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('books', 'podcasts', 'events')
      ORDER BY table_name
    `);
    
    console.log('Existing tables:');
    result.rows.forEach(row => console.log('  -', row.table_name));
    
    // Check columns for each table
    for (const table of result.rows) {
      const colResult = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = '${table.table_name}'
        ORDER BY ordinal_position
        LIMIT 5
      `);
      console.log(`\n${table.table_name} columns:`);
      colResult.rows.forEach(col => console.log(`  - ${col.column_name}: ${col.data_type}`));
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();