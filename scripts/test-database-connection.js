#!/usr/bin/env node
/**
 * Database Connection Test Script
 * Tests both local development and production database connections
 */

const { Pool } = require('pg');
require('dotenv').config();

// Database configurations
const configs = {
  development: {
    name: 'LOCAL DEVELOPMENT',
    host: 'localhost',
    port: 5432,
    database: 'tpedb',
    user: 'postgres',
    password: 'TPXP0stgres!!',
    ssl: false
  },
  production: {
    name: 'PRODUCTION (AWS RDS)',
    host: 'tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com',
    port: 5432,
    database: 'tpedb',
    user: 'tpeadmin',
    password: 'dBP0wer100!!',
    ssl: {
      rejectUnauthorized: false,
      require: true
    }
  }
};

async function testConnection(config) {
  console.log(`\n🔍 Testing ${config.name} database connection...`);
  console.log(`   Host: ${config.host}`);
  console.log(`   User: ${config.user}`);
  console.log(`   Database: ${config.database}`);
  
  const pool = new Pool(config);
  
  try {
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Connection successful!');
    
    // Test query
    const result = await client.query('SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = $1', ['public']);
    console.log(`   Tables in database: ${result.rows[0].count}`);
    
    // Check for key tables
    const tables = ['contractors', 'partners', 'admin_users', 'strategic_partners'];
    for (const table of tables) {
      const tableCheck = await client.query(
        'SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = $1 AND table_name = $2',
        ['public', table]
      );
      if (tableCheck.rows[0].count > 0) {
        const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`   ✓ ${table}: ${countResult.rows[0].count} records`);
      }
    }
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error(`❌ Connection failed: ${error.message}`);
    await pool.end();
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('DATABASE CONNECTION TEST');
  console.log('='.repeat(60));
  
  // Determine which environment to test
  const env = process.argv[2] || 'both';
  
  if (env === 'dev' || env === 'both') {
    await testConnection(configs.development);
  }
  
  if (env === 'prod' || env === 'both') {
    await testConnection(configs.production);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('IMPORTANT REMINDERS:');
  console.log('- Production password: dBP0wer100!!');
  console.log('- Development password: TPXP0stgres!!');
  console.log('- NEVER mix these passwords between environments');
  console.log('='.repeat(60));
}

// Run the test
main().catch(console.error);

// Usage:
// node test-database-connection.js       # Test both
// node test-database-connection.js dev   # Test development only
// node test-database-connection.js prod  # Test production only