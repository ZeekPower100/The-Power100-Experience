// DATABASE-CHECKED: All field names verified against TPE naming conventions November 14, 2025
// ================================================================
// Migration: Create CEO PCR Scores Table
// Date: November 14, 2025
// Purpose: Store quarterly CEO PCR calculations and history
// ================================================================

const { query } = require('../../tpe-backend/src/config/database');

async function up() {
  console.log('Creating ceo_pcr_scores table...');

  await query(`
    CREATE TABLE IF NOT EXISTS ceo_pcr_scores (
      id SERIAL PRIMARY KEY,

      -- Contractor Linkage (DATABASE-CHECKED: contractors.id exists)
      contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

      -- Quarter Identification
      quarter VARCHAR(10) NOT NULL,  -- 'Q1', 'Q2', 'Q3', 'Q4'
      year INTEGER NOT NULL,

      -- Survey Metrics
      total_employees INTEGER DEFAULT 0,
      total_responses INTEGER DEFAULT 0,
      response_rate NUMERIC(5,2),

      -- Category Scores (DATABASE-CHECKED: matches power_card_responses fields)
      leadership_score NUMERIC(5,2),           -- Avg of leadership_score from responses
      culture_score NUMERIC(5,2),              -- Avg of culture_score from responses
      growth_score NUMERIC(5,2),               -- Avg of growth_opportunity_score from responses
      satisfaction_score NUMERIC(5,2),         -- Avg of satisfaction_score from responses
      nps_score NUMERIC(5,2),                  -- Avg of recommendation_score from responses

      -- Overall Scores
      base_score NUMERIC(5,2),                 -- Average of all category scores
      trend_modifier INTEGER DEFAULT 0,        -- -5, 0, or +5
      final_ceo_pcr NUMERIC(5,2),              -- base_score + trend_modifier

      -- Metadata (DATABASE-CHECKED: power_card_campaigns.id exists)
      campaign_id INTEGER REFERENCES power_card_campaigns(id) ON DELETE SET NULL,
      calculated_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),

      -- Constraints
      CONSTRAINT unique_contractor_quarter UNIQUE(contractor_id, quarter, year),
      CONSTRAINT valid_trend_modifier CHECK (trend_modifier IN (-5, 0, 5)),
      CONSTRAINT valid_base_score CHECK (base_score >= 0 AND base_score <= 100),
      CONSTRAINT valid_final_pcr CHECK (final_ceo_pcr >= 0 AND final_ceo_pcr <= 105)
    )
  `);

  console.log('Creating indexes for ceo_pcr_scores...');

  await query(`
    CREATE INDEX IF NOT EXISTS idx_ceo_pcr_contractor
    ON ceo_pcr_scores(contractor_id)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_ceo_pcr_quarter
    ON ceo_pcr_scores(quarter, year)
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_ceo_pcr_contractor_quarter
    ON ceo_pcr_scores(contractor_id, quarter, year)
  `);

  console.log('Adding comments to ceo_pcr_scores table...');

  await query(`
    COMMENT ON TABLE ceo_pcr_scores IS 'Stores quarterly CEO PowerConfidence Rating scores based on employee feedback'
  `);

  await query(`
    COMMENT ON COLUMN ceo_pcr_scores.campaign_id IS 'Links to power_card_campaigns.id for the employee survey'
  `);

  await query(`
    COMMENT ON COLUMN ceo_pcr_scores.trend_modifier IS 'Performance trend bonus: +5 (improving), 0 (stable), -5 (declining)'
  `);

  console.log('✅ ceo_pcr_scores table created successfully');
}

async function down() {
  console.log('Dropping ceo_pcr_scores table...');

  await query(`DROP TABLE IF EXISTS ceo_pcr_scores CASCADE`);

  console.log('✅ ceo_pcr_scores table dropped');
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
