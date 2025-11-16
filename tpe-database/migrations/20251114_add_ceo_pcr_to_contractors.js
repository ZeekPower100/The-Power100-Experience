// DATABASE-CHECKED: contractors table verified with 72 existing columns November 14, 2025
// ================================================================
// Migration: Add CEO PCR Fields to Contractors Table
// Date: November 14, 2025
// Purpose: Track current CEO PCR scores and employee counts
// ================================================================

const { query } = require('../../tpe-backend/src/config/database');

async function up() {
  console.log('Adding CEO PCR fields to contractors table...');

  await query(`
    ALTER TABLE contractors
    ADD COLUMN IF NOT EXISTS current_ceo_pcr NUMERIC(5,2)
      CHECK (current_ceo_pcr IS NULL OR (current_ceo_pcr >= 0 AND current_ceo_pcr <= 105)),
    ADD COLUMN IF NOT EXISTS previous_ceo_pcr NUMERIC(5,2)
      CHECK (previous_ceo_pcr IS NULL OR (previous_ceo_pcr >= 0 AND previous_ceo_pcr <= 105)),
    ADD COLUMN IF NOT EXISTS ceo_pcr_trend VARCHAR(20)
      CHECK (ceo_pcr_trend IS NULL OR ceo_pcr_trend IN ('improving', 'stable', 'declining', 'new')),
    ADD COLUMN IF NOT EXISTS total_employees INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_employee_survey DATE,
    ADD COLUMN IF NOT EXISTS ceo_pcr_last_calculated TIMESTAMP
  `);

  console.log('Adding comments to CEO PCR fields...');

  await query(`
    COMMENT ON COLUMN contractors.current_ceo_pcr IS 'Most recent CEO PowerConfidence Rating (0-105)'
  `);

  await query(`
    COMMENT ON COLUMN contractors.previous_ceo_pcr IS 'Previous quarter CEO PCR for trend calculation'
  `);

  await query(`
    COMMENT ON COLUMN contractors.ceo_pcr_trend IS 'Performance trend: improving, stable, declining, new'
  `);

  await query(`
    COMMENT ON COLUMN contractors.total_employees IS 'Count of active employees for this contractor'
  `);

  await query(`
    COMMENT ON COLUMN contractors.last_employee_survey IS 'Date of most recent employee survey campaign'
  `);

  await query(`
    COMMENT ON COLUMN contractors.ceo_pcr_last_calculated IS 'Timestamp of last CEO PCR calculation'
  `);

  console.log('✅ CEO PCR fields added to contractors table successfully');
}

async function down() {
  console.log('Removing CEO PCR fields from contractors table...');

  await query(`
    ALTER TABLE contractors
    DROP COLUMN IF EXISTS current_ceo_pcr,
    DROP COLUMN IF EXISTS previous_ceo_pcr,
    DROP COLUMN IF EXISTS ceo_pcr_trend,
    DROP COLUMN IF EXISTS total_employees,
    DROP COLUMN IF EXISTS last_employee_survey,
    DROP COLUMN IF EXISTS ceo_pcr_last_calculated
  `);

  console.log('✅ CEO PCR fields removed from contractors table');
}

module.exports = { up, down };

// Run migration if executed directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
