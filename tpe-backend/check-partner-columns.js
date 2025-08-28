const { Pool } = require('pg');
require('dotenv').config();

async function checkPartnerColumns() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tpedb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
  });

  try {
    console.log('🔍 Checking strategic_partners table columns...\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'strategic_partners'
      ORDER BY ordinal_position
    `);
    
    console.log('Existing columns in strategic_partners table:');
    console.log('=' .repeat(60));
    result.rows.forEach(col => {
      const type = col.character_maximum_length 
        ? `${col.data_type}(${col.character_maximum_length})`
        : col.data_type;
      console.log(`  ${col.column_name.padEnd(35)} ${type}`);
    });
    
    console.log('\n' + '=' .repeat(60));
    console.log(`Total columns: ${result.rows.length}`);
    
    // List of expected columns based on partner form
    const expectedColumns = [
      'description', 'logo_url', 'power100_subdomain',
      'key_differentiators', 'previous_powerconfidence_score', 
      'score_trend', 'industry_rank', 'category_rank',
      'last_feedback_update', 'total_feedback_responses',
      'average_satisfaction', 'feedback_trend', 
      'next_quarterly_review', 'avg_contractor_satisfaction',
      'total_contractor_engagements', 'testimonials',
      'success_stories', 'unique_value', 'ideal_customer',
      'onboarding_process', 'integration_requirements',
      'support_options', 'contract_terms', 
      'compliance_certifications', 'geographical_coverage'
    ];
    
    const existingColumns = result.rows.map(r => r.column_name);
    const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('\n⚠️  Missing columns that need to be added:');
      missingColumns.forEach(col => console.log(`  - ${col}`));
    } else {
      console.log('\n✅ All expected columns exist!');
    }
    
  } catch (error) {
    console.error('❌ Error checking columns:', error.message);
  } finally {
    await pool.end();
  }
}

checkPartnerColumns();