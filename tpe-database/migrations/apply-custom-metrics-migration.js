/**
 * Apply Custom Metrics Migration
 * Adds custom metric fields to PowerCard campaigns and responses
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

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
    console.log('\n🔧 Starting Custom Metrics Migration...\n');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '20251031_add_custom_metrics.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the migration
    await client.query(sql);

    console.log('✅ Migration executed successfully!\n');

    // Verify the changes
    console.log('📊 Verifying migration results:\n');

    const verifyQuery = `
      SELECT
        'custom_metric_question' as field,
        CASE WHEN column_name IS NOT NULL THEN '✓ Added' ELSE '✗ Missing' END as status
      FROM information_schema.columns
      WHERE table_name = 'power_card_campaigns' AND column_name = 'custom_metric_question'
      UNION ALL
      SELECT
        'custom_metric_label' as field,
        CASE WHEN column_name IS NOT NULL THEN '✓ Added' ELSE '✗ Missing' END as status
      FROM information_schema.columns
      WHERE table_name = 'power_card_campaigns' AND column_name = 'custom_metric_label'
      UNION ALL
      SELECT
        'custom_metric_description' as field,
        CASE WHEN column_name IS NOT NULL THEN '✓ Added' ELSE '✗ Missing' END as status
      FROM information_schema.columns
      WHERE table_name = 'power_card_campaigns' AND column_name = 'custom_metric_description'
      UNION ALL
      SELECT
        'custom_metric_score' as field,
        CASE WHEN column_name IS NOT NULL THEN '✓ Added' ELSE '✗ Missing' END as status
      FROM information_schema.columns
      WHERE table_name = 'power_card_responses' AND column_name = 'custom_metric_score'
      UNION ALL
      SELECT
        'partner_id (campaigns)' as field,
        CASE WHEN column_name IS NOT NULL THEN '✓ Added' ELSE '✗ Missing' END as status
      FROM information_schema.columns
      WHERE table_name = 'power_card_campaigns' AND column_name = 'partner_id';
    `;

    const verifyResult = await client.query(verifyQuery);

    console.log('Field Status:');
    console.log('─────────────────────────────────────────');
    verifyResult.rows.forEach(row => {
      console.log(`${row.field.padEnd(30)} ${row.status}`);
    });
    console.log('─────────────────────────────────────────\n');

    // Show power_card_campaigns schema
    const campaignsSchema = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'power_card_campaigns'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Updated power_card_campaigns schema:');
    console.log('─────────────────────────────────────────');
    campaignsSchema.rows.forEach(row => {
      const length = row.character_maximum_length ? `(${row.character_maximum_length})` : '';
      console.log(`  ${row.column_name.padEnd(30)} ${row.data_type}${length}`);
    });
    console.log('─────────────────────────────────────────\n');

    // Show power_card_responses schema
    const responsesSchema = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'power_card_responses'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Updated power_card_responses schema:');
    console.log('─────────────────────────────────────────');
    responsesSchema.rows.forEach(row => {
      console.log(`  ${row.column_name.padEnd(30)} ${row.data_type}`);
    });
    console.log('─────────────────────────────────────────\n');

    console.log('✅ Custom Metrics Migration Complete!\n');

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
