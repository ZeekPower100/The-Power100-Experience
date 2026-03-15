// DATABASE-CHECKED: power_rankings_db (companies, communications, account_notes, account_tasks, company_intel, users) verified 2026-03-15
// ================================================================
// Rankings Database Connection Layer
// ================================================================
// Purpose: Second pg Pool for power_rankings_db on same RDS instance
// Used by: rankingsDbService.js, rankings agent tools
// Note: Reuses DB_HOST, DB_USER, DB_PASSWORD from main .env
// ================================================================

const { Pool } = require('pg');
require('dotenv').config();

const rankingsPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.RANKINGS_DB_NAME || 'home_improvement_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  // Keep pool small — this is secondary DB, not primary
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Test connection on startup
rankingsPool.connect((err, client, release) => {
  if (err) {
    console.error('[Rankings DB] ❌ Error connecting to power_rankings_db:', err.message);
    console.error('[Rankings DB] Ensure RANKINGS_DB_NAME is set in .env');
  } else {
    console.log(`✅ Rankings database (${process.env.RANKINGS_DB_NAME || 'home_improvement_db'}) connected`);
    release();
  }
});

/**
 * Query wrapper for rankings database
 * Mirrors the main database query() pattern
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @returns {Promise<object>} Query result
 */
async function rankingsQuery(text, params) {
  try {
    const result = await rankingsPool.query(text, params);
    return result;
  } catch (error) {
    console.error('[Rankings DB] Query error:', error.message);
    throw error;
  }
}

module.exports = {
  rankingsQuery,
  rankingsPool
};
