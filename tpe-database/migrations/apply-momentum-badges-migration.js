// Apply Phase 2: Momentum & Badges Migration
// Date: October 30, 2025

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
    console.log('🔄 Starting Phase 2 (Momentum & Badges) migration...\n');

    // Read migration SQL file
    const migrationPath = path.join(__dirname, '20251030_add_momentum_badges.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration file loaded: 20251030_add_momentum_badges.sql');
    console.log('='.repeat(60));

    // Execute migration
    await client.query(migrationSQL);

    console.log('\n✅ Migration applied successfully!\n');
    console.log('='.repeat(60));

    // Verify results
    console.log('\n📊 Verification Results:\n');

    // Check column count (should be 145)
    const columnCount = await client.query(`
      SELECT COUNT(*) as column_count
      FROM information_schema.columns
      WHERE table_name = 'strategic_partners';
    `);

    console.log(`Total columns in strategic_partners: ${columnCount.rows[0].column_count}`);
    console.log('Expected: 145 (140 from Phase 1 + 5 new Phase 2 fields)');
    console.log('');

    // Verify new Phase 2 fields
    const newFields = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'strategic_partners'
        AND column_name IN (
          'momentum_modifier', 'performance_trend', 'quarters_tracked',
          'earned_badges', 'badge_last_updated'
        )
      ORDER BY column_name;
    `);

    console.log('✅ New Phase 2 Fields Added:\n');
    newFields.rows.forEach(field => {
      console.log(`  - ${field.column_name} (${field.data_type}) default: ${field.column_default || 'NULL'}`);
    });
    console.log('');

    // Verify CHECK constraints
    const constraints = await client.query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'strategic_partners'::regclass
        AND contype = 'c'
        AND (conname LIKE '%momentum%' OR conname LIKE '%trend%' OR conname LIKE '%quarters%')
      ORDER BY conname;
    `);

    console.log('✅ CHECK Constraints Created:\n');
    constraints.rows.forEach(constraint => {
      console.log(`  - ${constraint.conname}`);
      console.log(`    ${constraint.pg_get_constraintdef}`);
    });
    console.log('');

    // Verify indexes
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'strategic_partners'
        AND (indexname LIKE '%momentum%' OR indexname LIKE '%trend%' OR indexname LIKE '%badge%')
      ORDER BY indexname;
    `);

    console.log('✅ Indexes Created:\n');
    indexes.rows.forEach(index => {
      console.log(`  - ${index.indexname}`);
    });
    console.log('');

    // Verify data distribution
    const distribution = await client.query(`
      SELECT
        COUNT(*) as total_partners,
        COUNT(*) FILTER (WHERE momentum_modifier = 5) as hot_streak_partners,
        COUNT(*) FILTER (WHERE momentum_modifier = 0) as stable_partners,
        COUNT(*) FILTER (WHERE momentum_modifier = -3) as declining_partners,
        COUNT(*) FILTER (WHERE performance_trend = 'improving') as improving_trend,
        COUNT(*) FILTER (WHERE performance_trend = 'stable') as stable_trend,
        COUNT(*) FILTER (WHERE performance_trend = 'declining') as declining_trend,
        COUNT(*) FILTER (WHERE performance_trend = 'new') as new_partners,
        AVG(quarters_tracked) as avg_quarters_tracked,
        COUNT(*) FILTER (WHERE jsonb_array_length(earned_badges) > 0) as partners_with_badges
      FROM strategic_partners;
    `);

    console.log('✅ Initial Data Distribution:\n');
    console.log(distribution.rows[0]);
    console.log('');

    console.log('='.repeat(60));
    console.log('🎉 Phase 2 (Momentum & Badges) Migration Complete!');
    console.log('='.repeat(60));
    console.log('\nNext Steps:');
    console.log('1. Implement momentum calculation service');
    console.log('2. Implement badge eligibility service');
    console.log('3. Integrate momentum into PCR calculation');
    console.log('4. Create Phase 2 API endpoints');
    console.log('5. Test end-to-end');

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
