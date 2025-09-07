const { Pool } = require('pg');
require('dotenv').config();

async function checkEvents() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tpedb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
  });

  try {
    const result = await pool.query('SELECT * FROM events ORDER BY name');
    console.log('All events in database:');
    console.log('Total events:', result.rows.length);
    console.log('');
    
    result.rows.forEach(event => {
      console.log(`Event: ${event.name}`);
      console.log(`  ID: ${event.id}`);
      console.log(`  Date: ${event.date}`);
      console.log(`  Location: ${event.location}`);
      console.log(`  Active: ${event.is_active}`);
      console.log('---');
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkEvents();