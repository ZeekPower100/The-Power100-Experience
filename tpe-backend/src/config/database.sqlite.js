const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

let db = null;

// Initialize SQLite database
const connectDB = async () => {
  // Check if already connected
  if (db) {
    console.log('✅ SQLite database already connected');
    return;
  }
  
  try {
    // Open database (in-memory for testing)
    const dbPath = process.env.NODE_ENV === 'test' ? ':memory:' : './power100.db';
    const absolutePath = require('path').resolve(dbPath);
    console.log('🔍 Connecting to database at:', absolutePath, 'CWD:', process.cwd());
    
    // Debug: Check if file exists and log file size
    const fs = require('fs');
    try {
      const stats = fs.statSync(absolutePath);
      console.log('🔍 Database file exists, size:', stats.size, 'bytes');
    } catch (e) {
      console.log('🔍 Database file does not exist:', e.message);
    }
    
    db = await open({
      filename: dbPath,
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
      last_feedback_update DATETIME,
      total_feedback_responses INTEGER DEFAULT 0,
      average_satisfaction REAL,
      feedback_trend TEXT DEFAULT 'stable',
      next_quarterly_review DATE,
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
      
      -- Tech Stack Fields
      tech_stack_sales TEXT DEFAULT '[]',
      tech_stack_operations TEXT DEFAULT '[]',
      tech_stack_marketing TEXT DEFAULT '[]',
      tech_stack_customer_experience TEXT DEFAULT '[]',
      tech_stack_project_management TEXT DEFAULT '[]',
      tech_stack_accounting_finance TEXT DEFAULT '[]',
      
      -- Tech Stack Other Fields
      tech_stack_sales_other TEXT,
      tech_stack_operations_other TEXT,
      tech_stack_marketing_other TEXT,
      tech_stack_customer_experience_other TEXT,
      tech_stack_project_management_other TEXT,
      tech_stack_accounting_finance_other TEXT,
      
      -- Contact Tagging Fields
      contact_type TEXT DEFAULT 'contractor' CHECK (contact_type IN ('contractor', 'employee', 'admin')),
      onboarding_source TEXT DEFAULT 'contractor_flow',
      associated_partner_id INTEGER REFERENCES strategic_partners(id),
      email_domain TEXT,
      tags TEXT DEFAULT '[]',
      
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

    -- PowerConfidence SMS subscriptions table
    CREATE TABLE IF NOT EXISTS sms_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contractor_id INTEGER REFERENCES contractors(id),
      phone_number TEXT NOT NULL,
      opted_in BOOLEAN DEFAULT 1,
      opted_in_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      opted_out_at DATETIME,
      subscription_source TEXT DEFAULT 'contractor_flow',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(contractor_id, phone_number)
    );

    -- SMS campaigns table
    CREATE TABLE IF NOT EXISTS sms_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_name TEXT NOT NULL,
      message_template TEXT NOT NULL,
      partner_id INTEGER REFERENCES strategic_partners(id),
      target_audience TEXT DEFAULT 'all_partners',
      status TEXT DEFAULT 'pending',
      scheduled_at DATETIME,
      sent_at DATETIME,
      total_recipients INTEGER DEFAULT 0,
      total_delivered INTEGER DEFAULT 0,
      total_responses INTEGER DEFAULT 0,
      created_by INTEGER REFERENCES admin_users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Feedback surveys table
    CREATE TABLE IF NOT EXISTS feedback_surveys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER REFERENCES strategic_partners(id),
      contractor_id INTEGER REFERENCES contractors(id),
      survey_type TEXT NOT NULL,
      quarter TEXT,
      status TEXT DEFAULT 'pending',
      survey_url TEXT,
      sent_at DATETIME,
      responded_at DATETIME,
      expires_at DATETIME,
      reminder_count INTEGER DEFAULT 0,
      last_reminder_sent DATETIME,
      sms_campaign_id INTEGER REFERENCES sms_campaigns(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Feedback responses table
    CREATE TABLE IF NOT EXISTS feedback_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      survey_id INTEGER REFERENCES feedback_surveys(id),
      partner_id INTEGER REFERENCES strategic_partners(id),
      contractor_id INTEGER REFERENCES contractors(id),
      overall_satisfaction INTEGER CHECK (overall_satisfaction >= 1 AND overall_satisfaction <= 10),
      communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 10),
      service_quality_rating INTEGER CHECK (service_quality_rating >= 1 AND service_quality_rating <= 10),
      value_for_money_rating INTEGER CHECK (value_for_money_rating >= 1 AND value_for_money_rating <= 10),
      likelihood_to_recommend INTEGER CHECK (likelihood_to_recommend >= 1 AND likelihood_to_recommend <= 10),
      positive_feedback TEXT,
      improvement_areas TEXT,
      additional_comments TEXT,
      would_use_again BOOLEAN,
      meeting_expectations BOOLEAN,
      response_time_acceptable BOOLEAN,
      response_source TEXT DEFAULT 'web',
      response_time_minutes INTEGER,
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- PowerConfidence score history table
    CREATE TABLE IF NOT EXISTS powerconfidence_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER REFERENCES strategic_partners(id),
      old_score INTEGER,
      new_score INTEGER,
      score_change INTEGER,
      calculation_method TEXT DEFAULT 'quarterly_feedback',
      feedback_count INTEGER DEFAULT 0,
      average_satisfaction REAL,
      total_responses INTEGER DEFAULT 0,
      quarter TEXT,
      calculation_details TEXT, -- JSON string for SQLite
      calculated_by INTEGER REFERENCES admin_users(id),
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Power Card Templates (Defines survey structure for each partner)
    CREATE TABLE IF NOT EXISTS power_card_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL,
      partner_type TEXT NOT NULL CHECK(partner_type IN ('strategic_partner', 'manufacturer', 'podcast', 'event')),
      metric_1_name TEXT NOT NULL,
      metric_1_question TEXT NOT NULL,
      metric_1_type TEXT DEFAULT 'rating' CHECK(metric_1_type IN ('rating', 'text', 'boolean', 'multiple_choice')),
      metric_2_name TEXT NOT NULL,
      metric_2_question TEXT NOT NULL,
      metric_2_type TEXT DEFAULT 'rating' CHECK(metric_2_type IN ('rating', 'text', 'boolean', 'multiple_choice')),
      metric_3_name TEXT NOT NULL,
      metric_3_question TEXT NOT NULL,
      metric_3_type TEXT DEFAULT 'rating' CHECK(metric_3_type IN ('rating', 'text', 'boolean', 'multiple_choice')),
      include_satisfaction_score BOOLEAN DEFAULT 1,
      include_recommendation_score BOOLEAN DEFAULT 1,
      include_culture_questions BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (partner_id) REFERENCES strategic_partners(id)
    );

    -- Power Card Campaigns (Quarterly survey distributions)
    CREATE TABLE IF NOT EXISTS power_card_campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_name TEXT NOT NULL,
      quarter TEXT NOT NULL,
      year INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      reminder_date DATE,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'scheduled', 'active', 'completed', 'cancelled')),
      total_sent INTEGER DEFAULT 0,
      total_responses INTEGER DEFAULT 0,
      response_rate DECIMAL(5,2) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Power Card Recipients (Who gets each survey)
    CREATE TABLE IF NOT EXISTS power_card_recipients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      template_id INTEGER NOT NULL,
      recipient_type TEXT NOT NULL CHECK(recipient_type IN ('contractor_client', 'partner_employee')),
      recipient_id INTEGER NOT NULL,
      recipient_email TEXT NOT NULL,
      recipient_name TEXT NOT NULL,
      company_id INTEGER NOT NULL,
      company_type TEXT NOT NULL,
      revenue_tier TEXT,
      survey_link TEXT UNIQUE,
      sent_at DATETIME,
      opened_at DATETIME,
      started_at DATETIME,
      completed_at DATETIME,
      reminder_sent_at DATETIME,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'opened', 'started', 'completed', 'opted_out')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES power_card_campaigns(id),
      FOREIGN KEY (template_id) REFERENCES power_card_templates(id)
    );

    -- Power Card Responses (Anonymous survey responses)
    CREATE TABLE IF NOT EXISTS power_card_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_id INTEGER NOT NULL,
      campaign_id INTEGER NOT NULL,
      template_id INTEGER NOT NULL,
      metric_1_response TEXT,
      metric_1_score INTEGER CHECK(metric_1_score >= 1 AND metric_1_score <= 10),
      metric_2_response TEXT,
      metric_2_score INTEGER CHECK(metric_2_score >= 1 AND metric_2_score <= 10),
      metric_3_response TEXT,
      metric_3_score INTEGER CHECK(metric_3_score >= 1 AND metric_3_score <= 10),
      satisfaction_score INTEGER CHECK(satisfaction_score >= 1 AND satisfaction_score <= 10),
      recommendation_score INTEGER CHECK(recommendation_score >= 0 AND recommendation_score <= 10),
      culture_score INTEGER CHECK(culture_score >= 1 AND culture_score <= 10),
      leadership_score INTEGER CHECK(leadership_score >= 1 AND leadership_score <= 10),
      growth_opportunity_score INTEGER CHECK(growth_opportunity_score >= 1 AND growth_opportunity_score <= 10),
      additional_feedback TEXT,
      improvement_suggestions TEXT,
      time_to_complete INTEGER,
      device_type TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (recipient_id) REFERENCES power_card_recipients(id),
      FOREIGN KEY (campaign_id) REFERENCES power_card_campaigns(id),
      FOREIGN KEY (template_id) REFERENCES power_card_templates(id)
    );

    -- Power Confidence Score History V2 (Tracks score changes over time)
    CREATE TABLE IF NOT EXISTS power_confidence_history_v2 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      partner_id INTEGER NOT NULL,
      partner_type TEXT NOT NULL,
      campaign_id INTEGER NOT NULL,
      previous_score INTEGER,
      new_score INTEGER NOT NULL,
      score_change INTEGER,
      customer_satisfaction_avg DECIMAL(3,2),
      nps_score INTEGER,
      metric_1_avg DECIMAL(3,2),
      metric_2_avg DECIMAL(3,2),
      metric_3_avg DECIMAL(3,2),
      employee_satisfaction_avg DECIMAL(3,2),
      response_count INTEGER NOT NULL,
      response_rate DECIMAL(5,2),
      revenue_tier TEXT,
      variance_from_peer_avg DECIMAL(5,2),
      calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (partner_id) REFERENCES strategic_partners(id),
      FOREIGN KEY (campaign_id) REFERENCES power_card_campaigns(id)
    );

    -- Power Card Analytics (Aggregated anonymous data)
    CREATE TABLE IF NOT EXISTS power_card_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      revenue_tier TEXT NOT NULL,
      industry_segment TEXT,
      geographic_region TEXT,
      total_responses INTEGER NOT NULL CHECK(total_responses >= 5),
      avg_satisfaction DECIMAL(3,2),
      avg_nps INTEGER,
      avg_metric_1 DECIMAL(3,2),
      avg_metric_2 DECIMAL(3,2),
      avg_metric_3 DECIMAL(3,2),
      variance_from_last_quarter DECIMAL(5,2),
      trend_direction TEXT CHECK(trend_direction IN ('up', 'down', 'stable')),
      percentile_25 DECIMAL(3,2),
      percentile_50 DECIMAL(3,2),
      percentile_75 DECIMAL(3,2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campaign_id) REFERENCES power_card_campaigns(id)
    );
  `);

  // Create indexes for Power Cards performance
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_power_card_recipients_campaign ON power_card_recipients(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_power_card_recipients_status ON power_card_recipients(status);
    CREATE INDEX IF NOT EXISTS idx_power_card_responses_campaign ON power_card_responses(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_power_confidence_history_v2_partner ON power_confidence_history_v2(partner_id, partner_type);
    CREATE INDEX IF NOT EXISTS idx_power_card_analytics_tier ON power_card_analytics(revenue_tier, campaign_id);
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
  if (!db) {
    throw new Error('Database not connected. Call connectDB() first.');
  }
  
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