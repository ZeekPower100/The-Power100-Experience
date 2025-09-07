const { Pool } = require('pg');
require('dotenv').config();

async function updateEventDate() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tpedb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
  });

  try {
    // Update Operation Lead Surge to September 11, 2025
    const updateQuery = `
      UPDATE events 
      SET date = '2025-09-11',
          registration_deadline = '2025-09-04',
          description = COALESCE(description, '') || ' (September 11-12, 2025)'
      WHERE name = 'Operation Lead Surge'
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery);
    
    if (result.rowCount > 0) {
      console.log('Successfully updated Operation Lead Surge:');
      console.log('  Name:', result.rows[0].name);
      console.log('  New Date:', result.rows[0].date);
      console.log('  Duration:', result.rows[0].duration || '2 days');
      console.log('  Registration Deadline:', result.rows[0].registration_deadline);
    } else {
      console.log('No event found with name "Operation Lead Surge"');
    }
  } catch (error) {
    console.error('Error updating event:', error.message);
  } finally {
    await pool.end();
  }
}

updateEventDate();