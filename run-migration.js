// Run migration on local PostgreSQL database
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './tpe-backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

async function runMigration() {
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'tpe-database', 'migrations', '003_add_missing_partner_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Running migration: 003_add_missing_partner_columns.sql');
    console.log('📍 Database:', process.env.DB_HOST);
    
    // Run migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify columns exist
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'strategic_partners' 
      AND column_name IN ('description', 'website', 'company_description', 'power100_subdomain')
      ORDER BY column_name
    `);
    
    console.log('\n📋 Verified columns:');
    result.rows.forEach(row => {
      console.log(`  ✅ ${row.column_name}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await pool.end();
  }
}

runMigration();