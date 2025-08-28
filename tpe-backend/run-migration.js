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
    console.log('🔄 Running database migration...');
    
    const migrationPath = path.join(__dirname, 'migrations', 'add_missing_contractor_columns.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully!');
    console.log('Added columns:');
    console.log('  - tech_stack_sales_other');
    console.log('  - tech_stack_operations_other');
    console.log('  - tech_stack_marketing_other');
    console.log('  - tech_stack_customer_experience_other');
    console.log('  - tech_stack_project_management_other');
    console.log('  - tech_stack_accounting_finance_other');
    console.log('  - contact_type');
    console.log('  - onboarding_source');
    console.log('  - associated_partner_id');
    console.log('  - email_domain');
    console.log('  - opted_in_coaching');
    console.log('  - feedback_completion_status');
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