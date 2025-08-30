#!/usr/bin/env node

/**
 * Health Check Script for Production Backend
 * Ensures all critical dependencies are available
 */

const fs = require('fs');
const path = require('path');

console.log('🏥 Running backend health check...\n');

const criticalDependencies = [
  'express',
  'pg',
  'jsonwebtoken',
  'bcryptjs',
  'cors',
  'dotenv'
];

let hasErrors = false;

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.error('❌ ERROR: node_modules directory not found!');
  console.log('   Creating symlink to parent node_modules...');
  
  try {
    const parentModules = path.join(__dirname, '..', 'node_modules');
    if (fs.existsSync(parentModules)) {
      fs.symlinkSync(parentModules, nodeModulesPath, 'dir');
      console.log('   ✅ Symlink created successfully');
    } else {
      console.error('   ❌ Parent node_modules not found either!');
      hasErrors = true;
    }
  } catch (err) {
    console.error('   ❌ Failed to create symlink:', err.message);
    hasErrors = true;
  }
}

// Check each critical dependency
console.log('\nChecking critical dependencies:');
for (const dep of criticalDependencies) {
  try {
    require.resolve(dep);
    console.log(`  ✅ ${dep} - OK`);
  } catch (err) {
    console.error(`  ❌ ${dep} - NOT FOUND`);
    hasErrors = true;
  }
}

// Check database connection
console.log('\nChecking database connection:');
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST || 'tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com',
  database: process.env.DB_NAME || 'tpedb',
  user: process.env.DB_USER || 'tpeadmin',
  password: process.env.DB_PASSWORD || 'dBP0wer100!!',
  ssl: { rejectUnauthorized: false }
});

pool.query('SELECT NOW()')
  .then(() => {
    console.log('  ✅ Database connection - OK');
    pool.end();
    
    if (hasErrors) {
      console.log('\n❌ Health check FAILED - Backend may not start properly');
      process.exit(1);
    } else {
      console.log('\n✅ Health check PASSED - Backend is ready');
      process.exit(0);
    }
  })
  .catch(err => {
    console.error('  ❌ Database connection - FAILED:', err.message);
    pool.end();
    process.exit(1);
  });