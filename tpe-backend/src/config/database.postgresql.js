const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to PostgreSQL:', err.stack);
  } else {
    console.log('✅ PostgreSQL database connected');
    release();
  }
});

// Query wrapper
async function query(text, params) {
  try {
    const result = await pool.query(text, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Connect function for compatibility
async function connectDB() {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL database connected');
    client.release();
    return pool;
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error);
    throw error;
  }
}

// Transaction wrapper for PostgreSQL
async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Wrap client to match expected interface
    const wrappedClient = {
      query: (text, params) => client.query(text, params)
    };
    const result = await callback(wrappedClient);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  query,
  connectDB,
  transaction,
  pool
};
