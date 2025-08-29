const { Pool } = require('pg');
require('dotenv').config();

async function addBook() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 5432,
    database: 'tpedb',
    user: 'postgres',
    password: 'TPXP0stgres!!'
  });

  try {
    const query = `
      INSERT INTO books (
        title,
        author,
        description,
        cover_image_url,
        amazon_url,
        publication_year,
        topics,
        focus_areas_covered,
        target_audience,
        key_takeaways,
        reading_time,
        difficulty_level,
        is_active
      ) VALUES (
        'Beyond the Hammer: A Fresh Approach to Leadership, Culture, and Building High Performance Teams',
        'Brian Gottlieb',
        'A comprehensive leadership guide that addresses common business challenges like employee burnout, high turnover, and departmental friction. The book is structured in two engaging sections: first, a fictional story following George, a struggling business owner, as he discovers five foundational pillars of leadership through his mentor Marty Gold; second, actionable strategies for implementing these principles to build high-performing, aligned teams. It focuses on creating a culture where employees find purpose and passion in their work, driving exceptional results.',
        'https://m.media-amazon.com/images/I/71kB9wHxSQL._SY466_.jpg',
        'https://www.amazon.com/Beyond-Hammer-Approach-Leadership-Performance/dp/B0D53GL23L',
        2024,
        '["Leadership", "Team Building", "Business Culture", "Management", "Employee Engagement", "Performance Management"]',
        '["hiring_sales_leadership", "operational_efficiency", "customer_retention", "installation_quality", "greenfield_growth"]',
        'Managers and leaders at all levels, business owners, entrepreneurs, and anyone seeking to elevate their team''s capabilities and create a thriving company culture. Particularly relevant for home improvement and construction industry professionals.',
        '["Five foundational pillars of leadership for high-performance teams", "How to create alignment and accountability in organizations", "Strategies for reducing employee turnover and burnout", "Building a culture where employees find purpose and passion", "Moving from crisis management to proactive leadership", "The power of belief in driving team performance"]',
        '4-5 hours',
        'Intermediate',
        true
      )
      RETURNING *
    `;
    
    const result = await pool.query(query);
    console.log('✅ "Beyond the Hammer" book added successfully!');
    console.log('Book details:', result.rows[0]);
  } catch (error) {
    console.error('Error adding book:', error.message);
  } finally {
    await pool.end();
  }
}

addBook();