// Apply PCR Scoring System Migration
// Date: October 29, 2025

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration (local development)
const pool = new Pool({
  host: 'localhost',
  database: 'tpedb',
  user: 'postgres',
  password: 'TPXP0stgres!!',
  port: 5432
});

async function applyMigration() {
  const client = await pool.connect();

  try {
    console.log('🔄 Starting PCR migration...\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, '20251029_add_pcr_fields.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded: 20251029_add_pcr_fields.sql');
    console.log('=' .repeat(60));

    // Execute migration
    await client.query(migrationSQL);

    console.log('\n✅ Migration applied successfully!\n');
    console.log('=' .repeat(60));

    // Verify results
    console.log('\n📊 Verification Results:\n');

    const verifyQuery = await client.query(`
      SELECT
        COUNT(*) as total_partners,
        AVG(demo_videos_count) as avg_demos,
        AVG(customer_feedback_count) as avg_customer_feedback,
        COUNT(*) FILTER (WHERE engagement_tier = 'free') as free_tier,
        COUNT(*) FILTER (WHERE engagement_tier = 'verified') as verified_tier,
        COUNT(*) FILTER (WHERE engagement_tier = 'gold') as gold_tier
      FROM strategic_partners;
    `);

    console.log(verifyQuery.rows[0]);
    console.log('\n');

    // Check column count
    const columnCount = await client.query(`
      SELECT COUNT(*) as column_count
      FROM information_schema.columns
      WHERE table_name = 'strategic_partners';
    `);

    console.log(`Total columns in strategic_partners: ${columnCount.rows[0].column_count}`);
    console.log('Expected: 140 (124 + 16 new PCR fields)');
    console.log('\n' + '=' .repeat(60));

    // List new PCR fields
    const newFields = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'strategic_partners'
        AND column_name IN (
          'engagement_tier', 'payment_multiplier', 'subscription_start_date',
          'subscription_end_date', 'subscription_status', 'profile_completion_score',
          'demo_videos_count', 'employee_feedback_count', 'customer_feedback_count',
          'profile_last_updated', 'quarterly_feedback_score', 'has_quarterly_data',
          'quarterly_history', 'base_pcr_score', 'final_pcr_score', 'pcr_last_calculated'
        )
      ORDER BY column_name;
    `);

    console.log('\n✅ New PCR Fields Added:\n');
    newFields.rows.forEach(field => {
      console.log(`  - ${field.column_name} (${field.data_type})`);
    });

    console.log('\n🎉 PCR Migration Complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyMigration();
