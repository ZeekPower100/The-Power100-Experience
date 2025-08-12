#!/usr/bin/env node
/**
 * Production Database Initialization Script
 * 
 * Initializes PostgreSQL database with schema and sample data
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Initializing production database...');

    // Read and execute schema
    const schemaPath = path.join(__dirname, '..', 'src', 'database', 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    await client.query(schema);
    console.log('✅ Database schema created successfully');

    // Create default admin user
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
  }
}

// Run if called directly
if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('🚀 Production database ready!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Initialization failed:', error);
      process.exit(1);
    });
}

module.exports = { initDatabase };