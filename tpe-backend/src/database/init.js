const { pool } = require('../config/database');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');

const initDatabase = async () => {
  try {
    console.log('🔧 Initializing database...');

    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('✅ Database schema created successfully');

    // Create default admin user
    const defaultEmail = 'admin@power100.io';
    const defaultPassword = 'Power100Admin!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 12);

    await pool.query(`
      INSERT INTO admin_users (email, password_hash, full_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO NOTHING
    `, [defaultEmail, hashedPassword, 'System Administrator']);

    console.log('✅ Default admin user created');
    console.log(`📧 Email: ${defaultEmail}`);
    console.log(`🔑 Password: ${defaultPassword}`);
    console.log('⚠️  Please change this password after first login!');

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
        focus_areas_served: ['greenfield_growth', 'controlling_lead_flow', 'marketing_automation'],
        target_revenue_range: ['under_500k', '500k_1m', '1m_5m'],
        power_confidence_score: 92,
        key_differentiators: ['Exclusive leads', 'Automated follow-up', 'Flexible pricing'],
        pricing_model: 'Pay-per-lead and subscription models available'
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
      await pool.query(`
        INSERT INTO strategic_partners (
          company_name, description, website, contact_email,
          focus_areas_served, target_revenue_range,
          power_confidence_score, key_differentiators, pricing_model
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT DO NOTHING
      `, [
        partner.company_name,
        partner.description,
        partner.website,
        partner.contact_email,
        partner.focus_areas_served,
        partner.target_revenue_range,
        partner.power_confidence_score,
        partner.key_differentiators,
        partner.pricing_model
      ]);
    }

    console.log('✅ Sample partners created');

    console.log('\n🎉 Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  initDatabase();
}

module.exports = { initDatabase };