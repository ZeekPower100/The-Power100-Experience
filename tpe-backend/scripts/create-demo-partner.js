const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { connectDB, query } = require('../src/config/database.sqlite');

async function createDemoPartner() {
  try {
    console.log('🔧 Connecting to database...');
    await connectDB();
    console.log('🔧 Creating demo partner user...');

    // Check if demo partner already exists
    const existingPartner = await query(
      'SELECT * FROM strategic_partners WHERE contact_email = ?',
      ['demo@techflow.com']
    );

    let partnerId;
    if (existingPartner.rows.length === 0) {
      // Create a demo partner in strategic_partners table
      const partnerInsert = await query(`
        INSERT INTO strategic_partners (
          company_name, 
          contact_email, 
          contact_phone,
          website,
          focus_areas_served,
          target_revenue_range,
          geographic_regions,
          is_active,
          power_confidence_score,
          score_trend
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'TechFlow Solutions Demo',
        'demo@techflow.com',
        '555-DEMO-001',
        'https://techflow-demo.com',
        JSON.stringify(['Technology', 'Software', 'Digital Marketing']),
        '100k_500k',
        JSON.stringify(['California', 'Oregon', 'Washington']),
        1,
        87,
        'up'
      ]);
      
      partnerId = partnerInsert.lastInsertRowid;
      console.log(`✅ Created demo strategic partner with ID: ${partnerId}`);
    } else {
      partnerId = existingPartner.rows[0].id;
      console.log(`✅ Demo strategic partner already exists with ID: ${partnerId}`);
    }

    // Check if demo partner user already exists
    const existingUser = await query(
      'SELECT * FROM partner_users WHERE email = ?',
      ['demo@techflow.com']
    );

    if (existingUser.rows.length > 0) {
      console.log('✅ Demo partner user already exists');
      console.log('📋 Demo login credentials:');
      console.log('   Email: demo@techflow.com');
      console.log('   Password: Demo123!');
      return;
    }

    // Hash the password
    const password = 'Demo123!';
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create partner user
    const userInsert = await query(`
      INSERT INTO partner_users (
        partner_id,
        email,
        password,
        first_name,
        last_name,
        role,
        is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      partnerId,
      'demo@techflow.com',
      hashedPassword,
      'Demo',
      'Partner',
      'owner',
      1
    ]);

    console.log(`✅ Created demo partner user with ID: ${userInsert.lastInsertRowid}`);
    console.log('📋 Demo login credentials:');
    console.log('   Email: demo@techflow.com');
    console.log('   Password: Demo123!');
    console.log('🚀 You can now test the partner portal at http://localhost:3002/partner/login');

  } catch (error) {
    console.error('❌ Error creating demo partner:', error);
    process.exit(1);
  }
}

// Run the script
createDemoPartner()
  .then(() => {
    console.log('✅ Demo partner setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });