const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tpedb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
  });

  try {
    console.log('🔄 Running partner columns migration...');
    
    const migrationPath = path.join(__dirname, 'migrations', 'add_missing_partner_columns.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('Added columns:');
    console.log('  - description');
    console.log('  - logo_url');
    console.log('  - power100_subdomain');
    console.log('  - key_differentiators');
    console.log('  - previous_powerconfidence_score');
    console.log('  - score_trend');
    console.log('  - industry_rank');
    console.log('  - category_rank');
    console.log('  - last_feedback_update');
    console.log('  - total_feedback_responses');
    console.log('  - average_satisfaction');
    console.log('  - feedback_trend');
    console.log('  - next_quarterly_review');
    console.log('  - avg_contractor_satisfaction');
    console.log('  - total_contractor_engagements');
    console.log('  - website');
    console.log('  - contact_email');
    console.log('  - contact_phone');
    console.log('  - focus_areas_served');
    console.log('  - target_revenue_range');
    console.log('  - geographic_regions');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.detail) {
      console.error('Detail:', error.detail);
    }
  } finally {
    await pool.end();
  }
}

runMigration();