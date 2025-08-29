const { Pool } = require('pg');
require('dotenv').config();

async function replaceLevel10Event() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 5432,
    database: 'tpedb',
    user: 'postgres',
    password: 'TPXP0stgres!!'
  });

  try {
    // First, update Operation Lead Surge to include all Level10 focus areas
    const updateQuery = `
      UPDATE events 
      SET 
        focus_areas_covered = '["controlling_lead_flow", "marketing_automation", "closing_higher_percentage", "customer_retention", "greenfield_growth", "operational_efficiency", "business_development"]',
        logo_url = 'https://tpe-assets-production-492267598792.s3.us-east-1.amazonaws.com/logos/Level10+Operation+Lead+Surge+Logo+1.webp'
      WHERE name = 'Operation Lead Surge'
      RETURNING *
    `;
    
    const updateResult = await pool.query(updateQuery);
    console.log('✅ Operation Lead Surge updated with merged focus areas and Level10 logo!');
    console.log('Updated event:', updateResult.rows[0]);
    
    // Then delete the old Level10 Contractor Summit
    const deleteQuery = `
      DELETE FROM events 
      WHERE name = 'Level10 Contractor Summit'
      RETURNING name
    `;
    
    const deleteResult = await pool.query(deleteQuery);
    if (deleteResult.rows.length > 0) {
      console.log('✅ Deleted old Level10 Contractor Summit record');
    }
    
    // Show all remaining events
    const checkQuery = `SELECT id, name, location FROM events ORDER BY id`;
    const checkResult = await pool.query(checkQuery);
    console.log('\nAll events in database now:');
    checkResult.rows.forEach(event => {
      console.log(`  - ${event.name} (${event.location})`);
    });
    
  } catch (error) {
    console.error('Error replacing event:', error.message);
  } finally {
    await pool.end();
  }
}

replaceLevel10Event();