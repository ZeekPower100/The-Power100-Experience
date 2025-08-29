const { Pool } = require('pg');
require('dotenv').config();

async function addEvent() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 5432,
    database: 'tpedb',
    user: 'postgres',
    password: 'TPXP0stgres!!'
  });

  try {
    const query = `
      INSERT INTO events (
        name, 
        date, 
        registration_deadline,
        location, 
        format, 
        description,
        expected_attendees,
        website,
        logo_url,
        focus_areas_covered,
        is_active
      ) VALUES (
        'Operation Lead Surge',
        '2025-10-23',
        '2025-10-15',
        'Phoenix, AZ',
        'In-Person Intensive',
        'A 3-day intensive bootcamp designed to transform your lead generation system. Learn the exact strategies top contractors use to generate 100+ qualified leads per month without expensive advertising. Includes hands-on workshops, one-on-one coaching, and exclusive access to Level10''s proven lead generation playbooks.',
        '150 Growth-Minded Contractors',
        'https://level10contractor.com/operation-lead-surge',
        'https://level10contractor.com/assets/lead-surge-logo.png',
        '["controlling_lead_flow", "marketing_automation", "closing_higher_percentage", "customer_retention"]',
        true
      )
      RETURNING *
    `;
    
    const result = await pool.query(query);
    console.log('✅ Operation Lead Surge event added successfully!');
    console.log('Event details:', result.rows[0]);
  } catch (error) {
    console.error('Error adding event:', error.message);
  } finally {
    await pool.end();
  }
}

addEvent();