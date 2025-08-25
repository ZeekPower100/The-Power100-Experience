const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');

async function migrateAllTables() {
  const pgClient = new Client({
    host: 'tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com',
    port: 5432,
    database: 'tpedb',
    user: 'tpeadmin',
    password: 'dBP0wer100!!',
    ssl: { rejectUnauthorized: false }
  });

  const sqliteDb = new sqlite3.Database('./power100.db');

  try {
    await pgClient.connect();
    console.log('Connected to PostgreSQL');

    // Get SQLite schema and recreate in PostgreSQL
    console.log('Creating missing tables...');
    
    // Create all tables that don't exist yet
    const createTableQueries = [
      `CREATE TABLE IF NOT EXISTS contractor_partner_matches (
        id SERIAL PRIMARY KEY,
        contractor_id INTEGER,
        partner_id INTEGER,
        score DECIMAL(5,2),
        reasons TEXT,
        is_primary BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS demo_bookings (
        id SERIAL PRIMARY KEY,
        contractor_id INTEGER,
        partner_id INTEGER,
        scheduled_date TIMESTAMP,
        status VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS strategic_partners (
        id SERIAL PRIMARY KEY,
        company_name VARCHAR(255),
        primary_contact VARCHAR(255),
        primary_email VARCHAR(255),
        primary_phone VARCHAR(50),
        secondary_contact VARCHAR(255),
        secondary_email VARCHAR(255),
        secondary_phone VARCHAR(50),
        focus_areas TEXT,
        revenue_tiers TEXT,
        powerconfidence_score INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        testimonials TEXT,
        success_stories TEXT,
        unique_value TEXT,
        ideal_customer TEXT,
        onboarding_process TEXT,
        pricing_model TEXT,
        integration_requirements TEXT,
        support_options TEXT,
        contract_terms TEXT,
        compliance_certifications TEXT,
        geographical_coverage TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS feedback_surveys (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER,
        survey_link VARCHAR(255) UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS feedback_responses (
        id SERIAL PRIMARY KEY,
        survey_id INTEGER,
        contractor_name VARCHAR(255),
        contractor_email VARCHAR(255),
        rating INTEGER,
        comments TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS sms_campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255),
        message TEXT,
        recipient_count INTEGER,
        status VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS sms_subscriptions (
        id SERIAL PRIMARY KEY,
        contractor_id INTEGER,
        phone VARCHAR(50),
        is_subscribed BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS powerconfidence_history (
        id SERIAL PRIMARY KEY,
        partner_id INTEGER,
        score INTEGER,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const query of createTableQueries) {
      await pgClient.query(query);
    }
    console.log('Tables created');

    // Migrate data from each table
    const tables = [
      'contractor_partner_matches',
      'demo_bookings', 
      'strategic_partners',
      'feedback_surveys',
      'feedback_responses',
      'sms_campaigns',
      'sms_subscriptions',
      'powerconfidence_history'
    ];

    for (const table of tables) {
      console.log(`Migrating ${table}...`);
      
      const rows = await new Promise((resolve, reject) => {
        sqliteDb.all(`SELECT * FROM ${table}`, (err, rows) => {
          if (err) {
            console.log(`Table ${table} doesn't exist or has no data`);
            resolve([]);
          } else {
            resolve(rows);
          }
        });
      });

      if (rows.length > 0) {
        // Clear existing data to avoid duplicates
        await pgClient.query(`DELETE FROM ${table}`);
        
        for (const row of rows) {
          // Build dynamic insert query
          const columns = Object.keys(row).filter(col => col !== 'id');
          const values = columns.map((col, idx) => `$${idx + 1}`);
          const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')})`;
          const params = columns.map(col => row[col]);
          
          try {
            await pgClient.query(query, params);
          } catch (err) {
            console.log(`Error inserting into ${table}:`, err.message);
          }
        }
        console.log(`Migrated ${rows.length} rows to ${table}`);
      }
    }

    console.log('Migration complete!');
    
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await pgClient.end();
    sqliteDb.close();
  }
}

migrateAllTables();
