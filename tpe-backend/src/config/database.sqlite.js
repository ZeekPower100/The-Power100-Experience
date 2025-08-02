const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

let db = null;

// Initialize SQLite database
const connectDB = async () => {
  try {
    // Open database (in-memory for testing)
    db = await open({
      filename: process.env.NODE_ENV === 'test' ? ':memory:' : './power100.db',
      driver: sqlite3.Database
    });

    console.log('✅ SQLite database connected');

    // Initialize schema
    await initializeSchema();
    
    // Seed initial data
    await seedData();

  } catch (error) {
    console.error('❌ SQLite connection error:', error.message);
    process.exit(1);
  }
};

// Initialize database schema
const initializeSchema = async () => {
  // Create tables
  await db.exec(`
    -- Admin users table
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Strategic partners table
    CREATE TABLE IF NOT EXISTS strategic_partners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_name TEXT NOT NULL,
      description TEXT,
      logo_url TEXT,
      website TEXT,
      contact_email TEXT NOT NULL,
      contact_phone TEXT,
      focus_areas_served TEXT,
      target_revenue_range TEXT,
      power_confidence_score INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      key_differentiators TEXT,
      pricing_model TEXT,
      onboarding_url TEXT,
      demo_booking_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Contractors table
    CREATE TABLE IF NOT EXISTS contractors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      company_name TEXT NOT NULL,
      company_website TEXT,
      service_area TEXT,
      services_offered TEXT,
      focus_areas TEXT,
      primary_focus_area TEXT,
      annual_revenue TEXT,
      team_size INTEGER,
      increased_tools BOOLEAN DEFAULT 0,
      increased_people BOOLEAN DEFAULT 0,
      increased_activity BOOLEAN DEFAULT 0,
      opted_in_coaching BOOLEAN DEFAULT 0,
      verification_status TEXT DEFAULT 'pending',
      verification_code TEXT,
      verification_expires_at DATETIME,
      current_stage TEXT DEFAULT 'verification',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    -- Contractor-Partner matches table
    CREATE TABLE IF NOT EXISTS contractor_partner_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contractor_id INTEGER REFERENCES contractors(id),
      partner_id INTEGER REFERENCES strategic_partners(id),
      match_score INTEGER DEFAULT 0,
      match_reasons TEXT,
      is_primary_match BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(contractor_id, partner_id)
    );

    -- Demo bookings table
    CREATE TABLE IF NOT EXISTS demo_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contractor_id INTEGER REFERENCES contractors(id),
      partner_id INTEGER REFERENCES strategic_partners(id),
      scheduled_date DATETIME NOT NULL,
      status TEXT DEFAULT 'scheduled',
      notes TEXT,
      meeting_link TEXT,
      reminder_sent BOOLEAN DEFAULT 0,
      follow_up_sent BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('✅ Database schema created');
};

// Seed initial data
const seedData = async () => {
  // Check if data already exists
  const adminCount = await db.get('SELECT COUNT(*) as count FROM admin_users');
  if (adminCount.count > 0) {
    console.log('✅ Data already seeded');
    return;
  }

  // Create default admin
  const hashedPassword = await bcrypt.hash('admin123', 12);
  await db.run(
    'INSERT INTO admin_users (email, password_hash, full_name) VALUES (?, ?, ?)',
    ['admin@power100.io', hashedPassword, 'System Administrator']
  );

  // Insert sample partners
  const partners = [
    {
      name: 'Buildr',
      desc: 'Leading CRM for contractors',
      email: 'sales@buildr.com',
      areas: JSON.stringify(['closing_higher_percentage', 'operational_efficiency']),
      ranges: JSON.stringify(['1m_5m', '5m_10m']),
      score: 96
    },
    {
      name: 'MarketPro',
      desc: 'Lead generation platform',
      email: 'info@marketpro.com',
      areas: JSON.stringify(['controlling_lead_flow', 'marketing_automation']),
      ranges: JSON.stringify(['500k_1m', '1m_5m']),
      score: 92
    },
    {
      name: 'FieldForce',
      desc: 'Field service management',
      email: 'hello@fieldforce.com',
      areas: JSON.stringify(['operational_efficiency', 'recession_proofing']),
      ranges: JSON.stringify(['1m_5m', '5m_10m']),
      score: 88
    }
  ];

  for (const p of partners) {
    await db.run(`
      INSERT INTO strategic_partners 
      (company_name, description, contact_email, focus_areas_served, target_revenue_range, power_confidence_score)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [p.name, p.desc, p.email, p.areas, p.ranges, p.score]);
  }

  console.log('✅ Initial data seeded');
};

// Query wrapper for compatibility
const query = async (text, params = []) => {
  try {
    // Handle different query types
    if (text.toUpperCase().startsWith('SELECT')) {
      const rows = await db.all(text, params);
      return { rows, rowCount: rows.length };
    } else if (text.toUpperCase().includes('RETURNING')) {
      // SQLite doesn't support RETURNING, so we need to handle it differently
      const modifiedQuery = text.replace(/RETURNING .*/i, '');
      const result = await db.run(modifiedQuery, params);
      
      // Fetch the inserted/updated row
      if (result.lastID) {
        const tableName = text.match(/(?:INSERT INTO|UPDATE)\s+(\w+)/i)[1];
        const row = await db.get(`SELECT * FROM ${tableName} WHERE id = ?`, [result.lastID]);
        return { rows: [row], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    } else {
      const result = await db.run(text, params);
      return { rows: [], rowCount: result.changes };
    }
  } catch (error) {
    console.error('SQLite query error:', error);
    throw error;
  }
};

// Transaction wrapper
const transaction = async (callback) => {
  try {
    await db.run('BEGIN TRANSACTION');
    const result = await callback({
      query: (text, params) => query(text, params)
    });
    await db.run('COMMIT');
    return result;
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
};

// Helper to parse JSON fields
const parseJsonFields = (rows, fields) => {
  return rows.map(row => {
    const parsed = { ...row };
    fields.forEach(field => {
      if (parsed[field] && typeof parsed[field] === 'string') {
        try {
          parsed[field] = JSON.parse(parsed[field]);
        } catch (e) {
          // Keep as string if not valid JSON
        }
      }
    });
    return parsed;
  });
};

module.exports = {
  connectDB,
  query,
  transaction,
  parseJsonFields,
  db
};