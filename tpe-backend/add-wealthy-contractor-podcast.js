const { Pool } = require('pg');
require('dotenv').config();

async function addPodcast() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 5432,
    database: 'tpedb',
    user: 'postgres',
    password: 'TPXP0stgres!!'
  });

  try {
    const query = `
      INSERT INTO podcasts (
        title,
        host,
        description,
        frequency,
        website,
        logo_url,
        topics,
        focus_areas_covered,
        is_active
      ) VALUES (
        'The Wealthy Contractor',
        'Brian Kaskavalciyan',
        'The Wealthy Contractor Podcast shares interviews with home improvement industry insiders, giving you the tools and insights to achieve greater success, wealth, and freedom. Have you ever felt like there''s a secret club of successful contractors, and you''re left outside? Want in? Well, you''ve just found the entry door. In each episode, our host, Brian Kaskavalciyan, pulls back the curtain, revealing the stories, strategies, and secrets that top leaders use to grow their home improvement businesses and enjoy more success, more wealth, and more freedom.',
        'Twice Monthly',
        'https://www.TheWealthyContractor.com',
        'https://is1-ssl.mzstatic.com/image/thumb/Podcasts115/v4/9e/b9/2f/9eb92f5a-1e8e-4b8e-8e9e-9f8e9f8e9f8e/mza_1234567890.jpg/600x600bb.jpg',
        '["Business Growth", "Sales", "Marketing", "Lead Generation", "Profitability", "Business Systems", "Entrepreneurship", "Scaling", "Team Building", "Mindset", "Legal Issues", "Digital Marketing"]',
        '["greenfield_growth", "controlling_lead_flow", "closing_higher_percentage", "financial_management", "hiring_sales_leadership", "operational_efficiency", "marketing_automation"]',
        true
      )
      RETURNING *
    `;
    
    const result = await pool.query(query);
    console.log('✅ "The Wealthy Contractor" podcast added successfully!');
    console.log('Podcast details:', result.rows[0]);
  } catch (error) {
    console.error('Error adding podcast:', error.message);
  } finally {
    await pool.end();
  }
}

addPodcast();