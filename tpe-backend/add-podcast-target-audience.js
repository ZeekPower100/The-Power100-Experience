const { Pool } = require('pg');
require('dotenv').config();

async function addTargetAudienceField() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tpedb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
  });

  try {
    // Check if column already exists
    const checkQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'podcasts' 
      AND column_name = 'target_audience'
    `;
    
    const checkResult = await pool.query(checkQuery);
    
    if (checkResult.rows.length > 0) {
      console.log('target_audience column already exists in podcasts table');
    } else {
      // Add the column
      const alterQuery = `
        ALTER TABLE podcasts 
        ADD COLUMN target_audience TEXT
      `;
      
      await pool.query(alterQuery);
      console.log('Successfully added target_audience column to podcasts table');
      
      // Update existing podcasts with a default target audience based on their description
      const updateQuery = `
        UPDATE podcasts 
        SET target_audience = 'Contractors looking to grow their business'
        WHERE target_audience IS NULL
      `;
      
      const updateResult = await pool.query(updateQuery);
      console.log(`Updated ${updateResult.rowCount} existing podcasts with default target_audience`);
    }
    
    // Show current schema
    const schemaQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'podcasts' 
      ORDER BY ordinal_position
    `;
    
    const schemaResult = await pool.query(schemaQuery);
    console.log('\nCurrent podcasts table schema:');
    schemaResult.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
  } catch (error) {
    console.error('Error adding target_audience field:', error.message);
  } finally {
    await pool.end();
  }
}

addTargetAudienceField();