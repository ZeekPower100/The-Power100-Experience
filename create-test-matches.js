const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tpedb',
  user: 'postgres',
  password: 'TPXP0stgres!!'
});

async function createTestMatches() {
  const client = await pool.connect();

  try {
    console.log('Creating test matches for demo partner (ID 94)...');

    const insertQuery = `
      INSERT INTO contractor_partner_matches
        (partner_id, contractor_id, match_score, match_reasons, is_primary_match, engagement_stage, status)
      VALUES
        (94, 12, 85.5, '["Strong fit for growth services", "Geographic alignment", "Revenue tier match"]', true, 'new', 'active'),
        (94, 50, 78.0, '["Service capability alignment", "Industry match"]', false, 'contacted', 'active'),
        (94, 6, 92.0, '["Excellent fit for digital transformation", "Strategic alignment", "High revenue potential"]', true, 'meeting_scheduled', 'active')
      RETURNING id, partner_id, contractor_id, engagement_stage;
    `;

    const result = await client.query(insertQuery);

    console.log(`✅ Successfully created ${result.rows.length} test matches:`);
    result.rows.forEach(row => {
      console.log(`   - Match ID ${row.id}: Partner ${row.partner_id} → Contractor ${row.contractor_id} (${row.engagement_stage})`);
    });

  } catch (error) {
    console.error('❌ Error creating test matches:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTestMatches()
  .then(() => {
    console.log('\n✅ Test data creation complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed to create test data:', error);
    process.exit(1);
  });
