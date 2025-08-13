#!/usr/bin/env node
/**
 * Direct Database Initialization for Production
 */

require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = "postgresql://tpe_database_user:mhpBnBzVKV6xhCJe29b1eKTBa5fxHNqH@dpg-crntvdbtq21c739f1ur0-a/tpe_database";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Initializing production database...');

    // SQL Schema
    const schema = `
-- Drop existing tables if they exist
DROP TABLE IF EXISTS demo_bookings CASCADE;
DROP TABLE IF EXISTS contractor_partner_matches CASCADE;
DROP TABLE IF EXISTS contractors CASCADE;
DROP TABLE IF EXISTS strategic_partners CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;

-- Create enum types
DROP TYPE IF EXISTS verification_status CASCADE;
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'failed');

DROP TYPE IF EXISTS contractor_stage CASCADE;
CREATE TYPE contractor_stage AS ENUM ('verification', 'focus_selection', 'profiling', 'matching', 'completed');

DROP TYPE IF EXISTS booking_status CASCADE;
CREATE TYPE booking_status AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');

-- Admin users table
CREATE TABLE admin_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Strategic partners table
CREATE TABLE strategic_partners (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    website VARCHAR(255),
    contact_email VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(20),
    focus_areas_served TEXT[], -- Array of focus areas
    target_revenue_range TEXT[], -- Array of revenue ranges
    power_confidence_score INTEGER DEFAULT 0 CHECK (power_confidence_score >= 0 AND power_confidence_score <= 100),
    is_active BOOLEAN DEFAULT true,
    key_differentiators TEXT[],
    pricing_model TEXT,
    onboarding_url VARCHAR(500),
    demo_booking_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contractors table
CREATE TABLE contractors (
    id SERIAL PRIMARY KEY,
    -- Basic info
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    company_website VARCHAR(255),
    
    -- Business info
    service_area VARCHAR(255),
    services_offered TEXT[],
    focus_areas TEXT[],
    primary_focus_area VARCHAR(100),
    annual_revenue VARCHAR(50),
    team_size INTEGER,
    
    -- Readiness indicators
    increased_tools BOOLEAN DEFAULT false,
    increased_people BOOLEAN DEFAULT false,
    increased_activity BOOLEAN DEFAULT false,
    
    -- Status tracking
    opted_in_coaching BOOLEAN DEFAULT false,
    verification_status verification_status DEFAULT 'pending',
    verification_code VARCHAR(6),
    verification_expires_at TIMESTAMP,
    current_stage contractor_stage DEFAULT 'verification',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Contractor-Partner matches table
CREATE TABLE contractor_partner_matches (
    id SERIAL PRIMARY KEY,
    contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
    partner_id INTEGER REFERENCES strategic_partners(id) ON DELETE CASCADE,
    match_score INTEGER DEFAULT 0 CHECK (match_score >= 0 AND match_score <= 100),
    match_reasons TEXT[],
    is_primary_match BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(contractor_id, partner_id)
);

-- Demo bookings table
CREATE TABLE demo_bookings (
    id SERIAL PRIMARY KEY,
    contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
    partner_id INTEGER REFERENCES strategic_partners(id) ON DELETE CASCADE,
    scheduled_date TIMESTAMP NOT NULL,
    status booking_status DEFAULT 'scheduled',
    notes TEXT,
    meeting_link VARCHAR(500),
    reminder_sent BOOLEAN DEFAULT false,
    follow_up_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_contractors_email ON contractors(email);
CREATE INDEX idx_contractors_phone ON contractors(phone);
CREATE INDEX idx_contractors_stage ON contractors(current_stage);
CREATE INDEX idx_contractors_created ON contractors(created_at);
CREATE INDEX idx_partners_active ON strategic_partners(is_active);
CREATE INDEX idx_partners_score ON strategic_partners(power_confidence_score);
CREATE INDEX idx_bookings_contractor ON demo_bookings(contractor_id);
CREATE INDEX idx_bookings_partner ON demo_bookings(partner_id);
CREATE INDEX idx_bookings_date ON demo_bookings(scheduled_date);
CREATE INDEX idx_bookings_status ON demo_bookings(status);

-- Create update timestamp trigger function
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update timestamp triggers
CREATE TRIGGER update_admin_users_timestamp BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_strategic_partners_timestamp BEFORE UPDATE ON strategic_partners
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_contractors_timestamp BEFORE UPDATE ON contractors
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_demo_bookings_timestamp BEFORE UPDATE ON demo_bookings
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();
    `;
    
    await client.query(schema);
    console.log('✅ Database schema created successfully');

    // Create default admin user
    const bcrypt = require('bcryptjs');
    const defaultEmail = 'admin@power100.io';
    const defaultPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    await client.query(`
      INSERT INTO admin_users (email, password_hash, full_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO NOTHING
    `, [defaultEmail, hashedPassword, 'System Administrator']);

    console.log('✅ Default admin user created');
    console.log(`📧 Email: ${defaultEmail}`);
    console.log(`🔑 Password: ${defaultPassword}`);

    // Insert sample partners
    const samplePartners = [
      {
        company_name: 'Buildr',
        description: 'Leading CRM and project management platform for contractors',
        website: 'https://www.buildr.com',
        contact_email: 'sales@buildr.com',
        focus_areas_served: ['closing_higher_percentage', 'controlling_lead_flow', 'operational_efficiency'],
        target_revenue_range: ['1m_5m', '5m_10m', 'over_10m'],
        power_confidence_score: 96,
        key_differentiators: ['All-in-one platform', 'Advanced automation', 'Real-time tracking'],
        pricing_model: 'Per-seat subscription starting at $99/user/month'
      },
      {
        company_name: 'MarketPro',
        description: 'Hyper-targeted lead generation and marketing automation',
        website: 'https://www.marketpro.com',
        contact_email: 'info@marketpro.com',
        focus_areas_served: ['marketing_people_trust', 'controlling_lead_flow'],
        target_revenue_range: ['500k_1m', '1m_5m'],
        power_confidence_score: 89,
        key_differentiators: ['AI-powered targeting', 'Custom landing pages', 'ROI tracking'],
        pricing_model: 'Monthly retainer starting at $2,500/month'
      },
      {
        company_name: 'FieldForce',
        description: 'Field service management and scheduling optimization',
        website: 'https://www.fieldforce.com',
        contact_email: 'hello@fieldforce.com',
        focus_areas_served: ['operational_efficiency', 'automating_recruiting', 'recession_proofing'],
        target_revenue_range: ['1m_5m', '5m_10m'],
        power_confidence_score: 88,
        key_differentiators: ['GPS tracking', 'Route optimization', 'Mobile workforce management'],
        pricing_model: 'Per technician pricing'
      }
    ];

    for (const partner of samplePartners) {
      await client.query(`
        INSERT INTO strategic_partners (
          company_name, description, website, contact_email,
          focus_areas_served, target_revenue_range, power_confidence_score,
          key_differentiators, pricing_model, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (company_name) DO NOTHING
      `, [
        partner.company_name,
        partner.description,
        partner.website,
        partner.contact_email,
        partner.focus_areas_served,
        partner.target_revenue_range,
        partner.power_confidence_score,
        partner.key_differentiators,
        partner.pricing_model,
        true
      ]);
    }

    console.log('✅ Sample partners inserted');
    console.log('🎉 Database initialization complete!');

  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run initialization
initDatabase()
  .then(() => {
    console.log('🚀 Production database ready!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Initialization failed:', error);
    process.exit(1);
  });