const { pool } = require('./src/config/database');

async function testBulkInsert() {
  try {
    console.log('Testing bulk insert...');
    
    // Test direct insert
    const result = await pool.query(
      `INSERT INTO contractor_engagement_events 
       (contractor_id, event_type, event_data, channel, session_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [1, 'test_event', '{}', 'web', null]
    );
    
    console.log('Direct insert worked:', result.rows[0]);
    
    // Test transaction
    await pool.query('BEGIN');
    console.log('Transaction started');
    
    const result2 = await pool.query(
      `INSERT INTO contractor_engagement_events 
       (contractor_id, event_type, event_data, channel, session_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [1, 'test_event_2', '{}', 'web', null]
    );
    
    console.log('Insert in transaction worked:', result2.rows[0]);
    
    await pool.query('COMMIT');
    console.log('Transaction committed');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testBulkInsert();