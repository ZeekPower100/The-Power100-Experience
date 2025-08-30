const { Pool } = require('pg');
require('dotenv').config();

async function applyProductionMigrations() {
  // Production database connection
  const pool = new Pool({
    host: 'tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com',
    port: 5432,
    database: 'tpedb',
    user: 'tpeadmin',
    password: process.env.DB_PASSWORD_PROD || 'TPEprod2025!!' // You'll need to set the actual password
  });

  try {
    console.log('🚀 Applying migrations to production database...\n');

    // 1. Create books table if it doesn't exist
    console.log('📚 Creating books table...');
    const createBooksTable = `
      CREATE TABLE IF NOT EXISTS books (
        id SERIAL PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        author VARCHAR(255) NOT NULL,
        description TEXT,
        cover_image_url VARCHAR(500),
        amazon_url VARCHAR(500),
        publication_year INTEGER,
        topics TEXT,
        focus_areas_covered TEXT,
        target_audience TEXT,
        key_takeaways TEXT,
        reading_time VARCHAR(100),
        difficulty_level VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pool.query(createBooksTable);
    console.log('✅ Books table ready');

    // 2. Create podcasts table if it doesn't exist  
    console.log('🎙️ Creating podcasts table...');
    const createPodcastsTable = `
      CREATE TABLE IF NOT EXISTS podcasts (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255),
        name VARCHAR(255),
        host VARCHAR(255) NOT NULL,
        description TEXT,
        logo_url VARCHAR(500),
        website VARCHAR(500),
        frequency VARCHAR(100),
        topics TEXT,
        focus_areas_covered TEXT,
        target_audience TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pool.query(createPodcastsTable);
    
    // Add title column if only name exists (for compatibility)
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='podcasts' AND column_name='title') 
        THEN 
          ALTER TABLE podcasts ADD COLUMN title VARCHAR(255);
          UPDATE podcasts SET title = name WHERE title IS NULL;
        END IF;
      END $$;
    `);
    console.log('✅ Podcasts table ready');

    // 3. Create events table if it doesn't exist
    console.log('📅 Creating events table...');
    const createEventsTable = `
      CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        logo_url VARCHAR(500),
        website VARCHAR(500),
        date VARCHAR(255),
        location VARCHAR(255),
        format VARCHAR(100),
        expected_attendees VARCHAR(255),
        attendees TEXT,
        focus_areas_covered TEXT,
        target_audience TEXT,
        registration_deadline DATE,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pool.query(createEventsTable);
    
    // Add expected_attendees column if only attendees exists
    await pool.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name='events' AND column_name='expected_attendees') 
        THEN 
          ALTER TABLE events ADD COLUMN expected_attendees VARCHAR(255);
          UPDATE events SET expected_attendees = attendees WHERE expected_attendees IS NULL;
        END IF;
      END $$;
    `);
    console.log('✅ Events table ready');

    // 4. Create manufacturers table if it doesn't exist
    console.log('🏭 Creating manufacturers table...');
    const createManufacturersTable = `
      CREATE TABLE IF NOT EXISTS manufacturers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        product_categories TEXT,
        price_range VARCHAR(100),
        lead_time VARCHAR(100),
        brands_carried TEXT,
        website VARCHAR(500),
        logo_url VARCHAR(500),
        contractor_rating DECIMAL(2,1),
        power_confidence_score INTEGER,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pool.query(createManufacturersTable);
    console.log('✅ Manufacturers table ready');

    // 5. Check if we need to add our new content
    console.log('\n📝 Checking for existing content...');
    
    // Check for "Beyond the Hammer" book
    const bookCheck = await pool.query(`SELECT id FROM books WHERE title LIKE '%Beyond the Hammer%'`);
    if (bookCheck.rows.length === 0) {
      console.log('Adding "Beyond the Hammer" book...');
      const addBook = `
        INSERT INTO books (
          title, author, description, cover_image_url, amazon_url,
          publication_year, topics, focus_areas_covered, target_audience,
          key_takeaways, reading_time, difficulty_level, is_active
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
      `;
      await pool.query(addBook);
      console.log('✅ Added "Beyond the Hammer" book');
    }

    // Check for "The Wealthy Contractor" podcast
    const podcastCheck = await pool.query(`SELECT id FROM podcasts WHERE title LIKE '%Wealthy Contractor%' OR name LIKE '%Wealthy Contractor%'`);
    if (podcastCheck.rows.length === 0) {
      console.log('Adding "The Wealthy Contractor" podcast...');
      const addPodcast = `
        INSERT INTO podcasts (
          title, name, host, description, frequency, website, logo_url,
          topics, focus_areas_covered, is_active
        ) VALUES (
          'The Wealthy Contractor',
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
      `;
      await pool.query(addPodcast);
      console.log('✅ Added "The Wealthy Contractor" podcast');
    }

    // Check for Operation Lead Surge event
    const eventCheck = await pool.query(`SELECT id FROM events WHERE name = 'Operation Lead Surge'`);
    if (eventCheck.rows.length === 0) {
      console.log('Adding Operation Lead Surge event...');
      const addEvent = `
        INSERT INTO events (
          name, description, date, location, format, expected_attendees,
          website, logo_url, focus_areas_covered, registration_deadline, is_active
        ) VALUES (
          'Operation Lead Surge',
          'Focuses on lead generation strategies - "Battle-Tested Playbook To Generate 200 to 500 Qualified Leads Every Single Month, Like Clockwork"',
          '2025-09-11',
          'Philadelphia, PA',
          'In-Person',
          '250+',
          'https://operationleadsurge.com/',
          'https://tpe-assets-production-492267598792.s3.us-east-1.amazonaws.com/logos/Level10+Operation+Lead+Surge+Logo+1.webp',
          '["controlling_lead_flow", "marketing_automation", "closing_higher_percentage", "customer_retention", "greenfield_growth", "operational_efficiency", "business_development"]',
          '2025-09-04',
          true
        )
      `;
      await pool.query(addEvent);
      console.log('✅ Added Operation Lead Surge event');
    } else {
      // Update existing Operation Lead Surge
      console.log('Updating Operation Lead Surge event...');
      const updateEvent = `
        UPDATE events 
        SET 
          date = '2025-09-11',
          registration_deadline = '2025-09-04',
          location = 'Philadelphia, PA',
          description = 'Focuses on lead generation strategies - "Battle-Tested Playbook To Generate 200 to 500 Qualified Leads Every Single Month, Like Clockwork"',
          expected_attendees = '250+',
          website = 'https://operationleadsurge.com/',
          logo_url = 'https://tpe-assets-production-492267598792.s3.us-east-1.amazonaws.com/logos/Level10+Operation+Lead+Surge+Logo+1.webp',
          focus_areas_covered = '["controlling_lead_flow", "marketing_automation", "closing_higher_percentage", "customer_retention", "greenfield_growth", "operational_efficiency", "business_development"]'
        WHERE name = 'Operation Lead Surge'
      `;
      await pool.query(updateEvent);
      console.log('✅ Updated Operation Lead Surge event');
    }

    // Update manufacturers
    console.log('\n🏭 Updating manufacturer records...');
    
    // Check if we have the old demo manufacturers
    const mfrCheck = await pool.query(`SELECT id, name FROM manufacturers WHERE id IN (1, 2, 3)`);
    
    if (mfrCheck.rows.length > 0) {
      // Update manufacturer 1 to GAF
      await pool.query(`
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
      `);
      console.log('✅ Updated manufacturer 1 to GAF Roofing Systems');

      // Update manufacturer 2 to Andersen
      await pool.query(`
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
      `);
      console.log('✅ Updated manufacturer 2 to Andersen Windows & Doors');

      // Update manufacturer 3 to Kohler
      await pool.query(`
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
      `);
      console.log('✅ Updated manufacturer 3 to Kohler Bathroom Solutions');
    }

    // Delete Level10 Contractor Summit if it exists
    await pool.query(`DELETE FROM events WHERE name = 'Level10 Contractor Summit'`);
    
    console.log('\n✅ All production migrations and content updates completed successfully!');
    
    // Show summary
    const bookCount = await pool.query('SELECT COUNT(*) FROM books');
    const podcastCount = await pool.query('SELECT COUNT(*) FROM podcasts');
    const eventCount = await pool.query('SELECT COUNT(*) FROM events');
    const mfrCount = await pool.query('SELECT COUNT(*) FROM manufacturers');
    
    console.log('\n📊 Production Database Summary:');
    console.log(`   Books: ${bookCount.rows[0].count} records`);
    console.log(`   Podcasts: ${podcastCount.rows[0].count} records`);
    console.log(`   Events: ${eventCount.rows[0].count} records`);
    console.log(`   Manufacturers: ${mfrCount.rows[0].count} records`);
    
  } catch (error) {
    console.error('❌ Error applying migrations:', error.message);
    console.error('Details:', error);
  } finally {
    await pool.end();
  }
}

// Run the migrations
applyProductionMigrations();