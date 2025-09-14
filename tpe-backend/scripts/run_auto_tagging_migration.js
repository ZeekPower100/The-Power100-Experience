#!/usr/bin/env node

/**
 * Auto-Tagging Tables Migration Runner
 * Executes the SQL migration to create auto-tagging database tables
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
  database: process.env.DB_NAME || 'tpedb',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
  console.log('🚀 Starting Auto-Tagging Tables Migration...');
  console.log(`📦 Database: ${process.env.DB_NAME || 'tpedb'} on ${process.env.DB_HOST || 'localhost'}`);
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '004_create_auto_tagging_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Executing migration script...');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    // Verify tables were created
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('content_tags', 'tagged_content', 'ai_tagging_history', 'tag_rules', 'tag_synonyms')
      ORDER BY table_name;
    `);
    
    console.log('\n✅ Tables created successfully:');
    tableCheck.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Check tag counts
    const tagCount = await pool.query('SELECT COUNT(*) as count, tag_category FROM content_tags GROUP BY tag_category');
    console.log('\n📊 Default tags inserted:');
    tagCount.rows.forEach(row => {
      console.log(`   - ${row.tag_category}: ${row.count} tags`);
    });
    
    console.log('\n🎉 Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    if (error.detail) {
      console.error('   Details:', error.detail);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();