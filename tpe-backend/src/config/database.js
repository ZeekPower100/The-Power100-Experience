// Check if we should use SQLite instead of PostgreSQL
if (process.env.USE_SQLITE === 'true') {
  module.exports = require('./database.sqlite');
} else {
  // PostgreSQL configuration
  const { Pool } = require('pg');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  // Test database connection
  const connectDB = async () => {
    try {
      const client = await pool.connect();
      console.log('✅ PostgreSQL connected successfully');
      await client.query('SELECT NOW()');
      client.release();
    } catch (error) {
      console.error('❌ PostgreSQL connection error:', error.message);
      console.log('⚠️  Server starting without database connection. Database operations may fail.');
      // Don't exit in production - let the server start
      if (process.env.NODE_ENV !== 'production') {
        process.exit(1);
      }
    }
  };

  // Query helper with error handling
  const query = async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development') {
        console.log('Executed query', { text, duration, rows: res.rowCount });
      }
      return res;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  };

  // Transaction helper
  const transaction = async (callback) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  module.exports = {
    connectDB,
    query,
    transaction,
    pool
  };
}