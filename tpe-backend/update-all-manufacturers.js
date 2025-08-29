const { Pool } = require('pg');
require('dotenv').config();

async function updateAllManufacturers() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 5432,
    database: 'tpedb',
    user: 'postgres',
    password: 'TPXP0stgres!!'
  });

  try {
    // Update 1: GAF Roofing Systems (replacing HVAC)
    const query1 = `
      UPDATE manufacturers 
      SET 
        name = 'GAF Roofing Systems',
        description = 'North America''s largest roofing manufacturer, offering comprehensive roofing solutions including shingles, commercial roofing systems, and solar roofing. Known for industry-leading warranties and contractor support programs.',
        product_categories = '["Asphalt Shingles", "Commercial Roofing", "Solar Roofing", "Roof Deck Protection", "Ventilation Systems", "Ridge Caps"]',
        price_range = 'Mid to Premium',
        lead_time = '1-2 weeks',
        brands_carried = '["Timberline HDZ", "Timberline Solar", "Grand Sequoia", "Camelot", "Liberty SBS"]',
        website = 'https://www.gaf.com',
        logo_url = 'https://www.gaf.com/sites/default/files/2022-05/GAF_logo.png',
        contractor_rating = 4.7,
        power_confidence_score = 96
      WHERE id = 1
      RETURNING name
    `;
    
    // Update 2: Andersen Windows (replacing ProTools)
    const query2 = `
      UPDATE manufacturers 
      SET 
        name = 'Andersen Windows & Doors',
        description = 'Leading manufacturer of high-performance windows and doors, offering energy-efficient solutions for residential and commercial projects. Known for quality craftsmanship, innovation, and sustainable practices since 1903.',
        product_categories = '["Replacement Windows", "Patio Doors", "Entry Doors", "Storm Doors", "Specialty Windows", "Window Hardware"]',
        price_range = 'Premium',
        lead_time = '3-6 weeks',
        brands_carried = '["400 Series", "A-Series", "E-Series", "100 Series Fibrex", "Renewal by Andersen"]',
        website = 'https://www.andersenwindows.com',
        logo_url = 'https://www.andersenwindows.com/-/media/aw/images/logos/andersen-logo.svg',
        contractor_rating = 4.8,
        power_confidence_score = 94
      WHERE id = 2
      RETURNING name
    `;
    
    // Update 3: Kohler (replacing TechConnect)
    const query3 = `
      UPDATE manufacturers 
      SET 
        name = 'Kohler Bathroom Solutions',
        description = 'Premium bathroom manufacturer offering complete bathroom solutions including fixtures, faucets, showers, bathtubs, toilets, and smart home technology. Recognized for innovative design and water-saving technology.',
        product_categories = '["Toilets", "Bathroom Sinks", "Bathtubs", "Shower Systems", "Faucets", "Smart Toilets", "Vanities", "Medicine Cabinets"]',
        price_range = 'Mid to Luxury',
        lead_time = '2-4 weeks',
        brands_carried = '["Kohler", "Sterling", "Kallista", "Ann Sacks", "Robern"]',
        website = 'https://www.kohler.com',
        logo_url = 'https://www.kohler.com/content/dam/kohler/common/logos/kohler-logo.png',
        contractor_rating = 4.6,
        power_confidence_score = 93
      WHERE id = 3
      RETURNING name
    `;
    
    const result1 = await pool.query(query1);
    console.log('✅ Updated:', result1.rows[0].name);
    
    const result2 = await pool.query(query2);
    console.log('✅ Updated:', result2.rows[0].name);
    
    const result3 = await pool.query(query3);
    console.log('✅ Updated:', result3.rows[0].name);
    
    // Show all manufacturers
    const checkQuery = `SELECT id, name, description, product_categories FROM manufacturers ORDER BY id`;
    const checkResult = await pool.query(checkQuery);
    console.log('\n📋 All manufacturers in database now:');
    checkResult.rows.forEach(mfr => {
      console.log(`\n${mfr.id}. ${mfr.name}`);
      console.log(`   Description: ${mfr.description.substring(0, 80)}...`);
      const categories = JSON.parse(mfr.product_categories);
      console.log(`   Product Categories: ${categories.slice(0, 3).join(', ')}...`);
    });
    
  } catch (error) {
    console.error('Error updating manufacturers:', error.message);
  } finally {
    await pool.end();
  }
}

updateAllManufacturers();