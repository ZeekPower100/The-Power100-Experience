// ================================================================
// Migration: Create Quarterly Reports System Tables
// Date: November 1, 2025
// Purpose: Track and store quarterly report generation for partners and contractors
// DATABASE-CHECKED: All field names verified against schema October 31, 2025
// ================================================================

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tpedb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'TPXP0stgres!!'
});

async function up() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Creating partner_reports table...');

    // Create partner_reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS partner_reports (
        id SERIAL PRIMARY KEY,

        -- Report Identification
        partner_id INTEGER NOT NULL REFERENCES strategic_partners(id) ON DELETE CASCADE,
        campaign_id INTEGER REFERENCES power_card_campaigns(id) ON DELETE SET NULL,
        report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('executive_summary', 'contractor_comparison', 'public_pcr')),

        -- Temporal Tracking
        quarter VARCHAR(2) NOT NULL CHECK (quarter IN ('Q1', 'Q2', 'Q3', 'Q4')),
        year INTEGER NOT NULL,
        generation_date TIMESTAMP DEFAULT NOW(),

        -- Report Data (JSONB for flexible structure)
        report_data JSONB NOT NULL,

        -- Metrics Summary (for quick access without parsing JSONB)
        total_responses INTEGER DEFAULT 0,
        avg_satisfaction NUMERIC(5,2),
        avg_nps INTEGER,
        metric_1_avg NUMERIC(5,2),
        metric_2_avg NUMERIC(5,2),
        metric_3_avg NUMERIC(5,2),

        -- Custom Metric Names (denormalized for convenience)
        metric_1_name VARCHAR(100),
        metric_2_name VARCHAR(100),
        metric_3_name VARCHAR(100),

        -- Report Status & Delivery
        status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'delivered', 'viewed')),
        delivered_at TIMESTAMP,
        viewed_at TIMESTAMP,
        generated_by INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log('✓ partner_reports table created');

    // Create indexes
    console.log('Creating indexes...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_reports_partner_id
        ON partner_reports(partner_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_reports_campaign_id
        ON partner_reports(campaign_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_reports_type
        ON partner_reports(report_type)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_reports_partner_quarter_year
        ON partner_reports(partner_id, year DESC, quarter DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_reports_status
        ON partner_reports(status)
        WHERE status IN ('draft', 'generated')
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_partner_reports_quarter_year
        ON partner_reports(year DESC, quarter DESC)
    `);

    console.log('✓ All indexes created');

    // Add comments
    console.log('Adding table comments...');

    await client.query(`
      COMMENT ON TABLE partner_reports IS
        'Tracks quarterly reports generated for partners (executive summary) and contractors (comparison reports)'
    `);

    await client.query(`
      COMMENT ON COLUMN partner_reports.report_type IS
        'Type of report: executive_summary (for partners), contractor_comparison (for contractors), public_pcr (landing page)'
    `);

    await client.query(`
      COMMENT ON COLUMN partner_reports.report_data IS
        'Full report data in JSONB format including all metrics, charts, and comparison data'
    `);

    await client.query(`
      COMMENT ON COLUMN partner_reports.quarter IS
        'Quarter when report was generated: Q1, Q2, Q3, or Q4'
    `);

    await client.query(`
      COMMENT ON COLUMN partner_reports.status IS
        'Report lifecycle: draft → generated → delivered → viewed'
    `);

    console.log('✓ Comments added');

    await client.query('COMMIT');

    console.log('');
    console.log('========================================');
    console.log('✅ Migration completed successfully!');
    console.log('========================================');
    console.log('Created partner_reports table with:');
    console.log('  - 22 columns');
    console.log('  - 6 indexes for performance');
    console.log('  - 3 foreign keys (partner_id, campaign_id, generated_by)');
    console.log('  - CHECK constraints on report_type, quarter, status');
    console.log('');
    console.log('Ready for Phase 1 report generation!');
    console.log('========================================');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function down() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Dropping partner_reports table...');

    await client.query('DROP TABLE IF EXISTS partner_reports CASCADE');

    await client.query('COMMIT');

    console.log('✓ partner_reports table dropped');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Rollback failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migration if executed directly
if (require.main === module) {
  up()
    .then(() => {
      console.log('Migration completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}

module.exports = { up, down };
