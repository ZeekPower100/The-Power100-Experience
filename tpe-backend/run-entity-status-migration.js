const { Pool } = require('pg');
require('dotenv').config({ path: '.env.development' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tpedb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'TPXP0stgres!!'
});

async function runMigration() {
  try {
    console.log('🔄 Adding status field to entities...');
    
    // Add status to books
    await pool.query(`
      ALTER TABLE books 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published'
    `);
    console.log('✅ Added status to books table');
    
    // Update existing books to published
    await pool.query(`
      UPDATE books SET status = 'published' WHERE status IS NULL
    `);
    
    // Add status to events
    await pool.query(`
      ALTER TABLE events
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published'
    `);
    console.log('✅ Added status to events table');
    
    // Update existing events to published
    await pool.query(`
      UPDATE events SET status = 'published' WHERE status IS NULL
    `);
    
    // Add status to podcasts
    await pool.query(`
      ALTER TABLE podcasts
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'published'
    `);
    console.log('✅ Added status to podcasts table');
    
    // Update existing podcasts to published
    await pool.query(`
      UPDATE podcasts SET status = 'published' WHERE status IS NULL
    `);
    
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

runMigration();