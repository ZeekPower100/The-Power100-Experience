const { Pool } = require('pg');
require('dotenv').config();

async function updateEvent() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 5432,
    database: 'tpedb',
    user: 'postgres',
    password: 'TPXP0stgres!!'
  });

  try {
    const query = `
      UPDATE events 
      SET 
        date = '2025-09-11',
        registration_deadline = '2025-09-04',
        location = 'Philadelphia, PA',
        description = 'Focuses on lead generation strategies - "Battle-Tested Playbook To Generate 200 to 500 Qualified Leads Every Single Month, Like Clockwork"',
        expected_attendees = '250+',
        website = 'https://operationleadsurge.com/'
      WHERE name = 'Operation Lead Surge'
      RETURNING *
    `;
    
    const result = await pool.query(query);
    if (result.rows.length > 0) {
      console.log('✅ Operation Lead Surge event updated successfully!');
      console.log('Updated event details:', result.rows[0]);
    } else {
      console.log('⚠️ No event found with name "Operation Lead Surge"');
    }
  } catch (error) {
    console.error('Error updating event:', error.message);
  } finally {
    await pool.end();
  }
}

updateEvent();