// DATABASE-CHECKED: contractors table - adding CEO PCR premium access flags
// ================================================================
// Migration: Add CEO PCR Access Flags to Contractors
// Date: November 16, 2025
// Purpose: Enable premium access control for CEO PCR features
// ================================================================

const { query } = require('../../tpe-backend/src/config/database');

async function up() {
  console.log('Adding CEO PCR access flags to contractors table...');

  await query(`
    ALTER TABLE contractors
    ADD COLUMN IF NOT EXISTS has_ceo_pcr_access BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS ceo_pcr_subscription_tier VARCHAR(50),
    ADD COLUMN IF NOT EXISTS ceo_pcr_subscription_start DATE,
    ADD COLUMN IF NOT EXISTS ceo_pcr_subscription_status VARCHAR(20) DEFAULT 'inactive'
  `);

  console.log('Adding check constraint for subscription status...');

  await query(`
    ALTER TABLE contractors
    DROP CONSTRAINT IF EXISTS valid_ceo_pcr_subscription_status
  `);

  await query(`
    ALTER TABLE contractors
    ADD CONSTRAINT valid_ceo_pcr_subscription_status
    CHECK (ceo_pcr_subscription_status IS NULL OR
           ceo_pcr_subscription_status IN ('active', 'inactive', 'trial', 'cancelled', 'expired'))
  `);

  console.log('Adding comments to CEO PCR access fields...');

  await query(`
    COMMENT ON COLUMN contractors.has_ceo_pcr_access IS 'Premium feature flag - grants access to CEO PCR dashboard and features'
  `);

  await query(`
    COMMENT ON COLUMN contractors.ceo_pcr_subscription_tier IS 'Subscription tier: culture_basic, culture_pro, culture_enterprise'
  `);

  await query(`
    COMMENT ON COLUMN contractors.ceo_pcr_subscription_start IS 'Date when CEO PCR subscription started'
  `);

  await query(`
    COMMENT ON COLUMN contractors.ceo_pcr_subscription_status IS 'Subscription status: active, inactive, trial, cancelled, expired'
  `);

  console.log('✅ CEO PCR access flags added to contractors table successfully');
}

async function down() {
  console.log('Removing CEO PCR access flags from contractors table...');

  await query(`
    ALTER TABLE contractors
    DROP CONSTRAINT IF EXISTS valid_ceo_pcr_subscription_status
  `);

  await query(`
    ALTER TABLE contractors
    DROP COLUMN IF EXISTS has_ceo_pcr_access,
    DROP COLUMN IF EXISTS ceo_pcr_subscription_tier,
    DROP COLUMN IF EXISTS ceo_pcr_subscription_start,
    DROP COLUMN IF EXISTS ceo_pcr_subscription_status
  `);

  console.log('✅ CEO PCR access flags removed from contractors table');
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
