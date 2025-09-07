const { Pool } = require('pg');
require('dotenv').config();

async function checkDeadlines() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tpedb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
  });

  try {
    const result = await pool.query('SELECT id, name, registration_deadline, date FROM events ORDER BY name');
    const today = new Date();
    
    console.log('Event registration deadlines:');
    console.log('Today is:', today.toDateString());
    console.log('');
    
    result.rows.forEach(event => {
      const regDeadline = event.registration_deadline ? new Date(event.registration_deadline) : null;
      const isPastDeadline = regDeadline && regDeadline < today;
      
      console.log(`${event.name}:`);
      console.log(`  Registration Deadline: ${event.registration_deadline || 'NULL'}`);
      console.log(`  Event Date: ${event.date}`);
      console.log(`  Past Deadline?: ${isPastDeadline ? 'YES' : 'NO'}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDeadlines();