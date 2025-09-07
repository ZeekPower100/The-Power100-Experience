const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

// Database configuration for production
const pool = new Pool({
  host: process.env.DB_HOST || 'tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tpedb',
  user: process.env.DB_USER || 'tpeadmin',
  password: process.env.DB_PASSWORD || 'dBP0wer100!!',
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrateServiceCategories() {
  const client = await pool.connect();
  
  try {
    console.log('Starting service_categories migration...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Check if service_categories column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'strategic_partners' 
      AND column_name = 'service_categories'
    `);
    
    if (checkColumn.rows.length === 0) {
      // Add new service_categories column as JSONB
      console.log('Adding service_categories column...');
      await client.query(`
        ALTER TABLE strategic_partners 
        ADD COLUMN service_categories JSONB
      `);
      
      // Migrate data from service_category to service_categories
      console.log('Migrating existing data...');
      await client.query(`
        UPDATE strategic_partners 
        SET service_categories = 
          CASE 
            WHEN service_category IS NOT NULL AND service_category != '' 
            THEN jsonb_build_array(service_category)
            ELSE '[]'::jsonb
          END
        WHERE service_categories IS NULL
      `);
      
      console.log('Migration completed successfully!');
      
      // Optional: Drop old column after verification
      // await client.query('ALTER TABLE strategic_partners DROP COLUMN service_category');
      // console.log('Old service_category column removed');
    } else {
      console.log('service_categories column already exists, checking for unmigrated data...');
      
      // Check if there are any null service_categories that need migration
      const nullCheck = await client.query(`
        SELECT COUNT(*) as count 
        FROM strategic_partners 
        WHERE service_categories IS NULL 
        AND service_category IS NOT NULL
      `);
      
      if (nullCheck.rows[0].count > 0) {
        console.log(`Found ${nullCheck.rows[0].count} records to migrate...`);
        await client.query(`
          UPDATE strategic_partners 
          SET service_categories = jsonb_build_array(service_category)
          WHERE service_categories IS NULL 
          AND service_category IS NOT NULL
        `);
        console.log('Additional records migrated successfully!');
      } else {
        console.log('All records already migrated!');
      }
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('Transaction committed successfully!');
    
  } catch (error) {
    // Rollback on error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    pool.end();
  }
}

// Run migration
migrateServiceCategories()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });