// Temporary migration runner for content_approval_log table
const { Pool } = require('pg');

async function runMigration(isProduction = false) {
  const pool = new Pool(isProduction ? {
    host: 'tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com',
    database: 'tpedb',
    user: 'tpeadmin',
    password: 'dBP0wer100!!',
    port: 5432,
    ssl: { rejectUnauthorized: false }
  } : {
    host: 'localhost',
    database: 'tpedb',
    user: 'postgres',
    password: 'TPXP0stgres!!',
    port: 5432
  });

  try {
    console.log(`\n${isProduction ? 'PRODUCTION' : 'LOCAL DEV'} Database Migration:`);
    console.log('='.repeat(50));

    // 1. Add wp_post_id to video_content (if not exists)
    await pool.query(`ALTER TABLE video_content ADD COLUMN IF NOT EXISTS wp_post_id INTEGER`);
    console.log('  wp_post_id column ensured on video_content');

    // 2. Add approval_status to video_content (if not exists)
    await pool.query(`ALTER TABLE video_content ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'pending'`);
    console.log('  approval_status column ensured on video_content');

    // 3. Create content_approval_log table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS content_approval_log (
        id SERIAL PRIMARY KEY,
        video_content_id INTEGER REFERENCES video_content(id),
        wp_post_id INTEGER,
        action VARCHAR(20) NOT NULL,
        feedback TEXT,
        approver VARCHAR(50) DEFAULT 'telegram',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('  content_approval_log table created');

    // Verify
    const result = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'content_approval_log' ORDER BY ordinal_position"
    );
    console.log('\n  content_approval_log columns:');
    result.rows.forEach(row => {
      console.log(`    - ${row.column_name}: ${row.data_type}`);
    });

    // Verify video_content new columns
    const vcResult = await pool.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'video_content' AND column_name IN ('wp_post_id', 'approval_status') ORDER BY ordinal_position"
    );
    console.log('\n  video_content new columns:');
    vcResult.rows.forEach(row => {
      console.log(`    - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

async function main() {
  console.log('Running Content Approval Migrations');
  console.log('='.repeat(50));

  await runMigration(false);   // Local
  await runMigration(true);    // Production

  console.log('\nMigration complete for both databases!');
}

main();
