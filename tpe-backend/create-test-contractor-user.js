require('dotenv').config({ path: './.env' });
const bcrypt = require('bcryptjs');
const { query } = require('./src/config/database');

async function createTestUser() {
  try {
    console.log('\n🧪 Creating test contractor user...\n');

    // Hash password 'Test123!'
    const password = await bcrypt.hash('Test123!', 12);

    // Create test contractor if doesn't exist
    let contractorResult = await query(`
      SELECT id FROM contractors WHERE email = 'test@contractor.com'
    `);

    let contractorId;
    if (contractorResult.rows.length === 0) {
      const insertResult = await query(`
        INSERT INTO contractors (
          first_name, last_name, email, phone, company_name,
          focus_areas, revenue_tier, team_size, lifecycle_stage,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id
      `, [
        'Test',
        'Contractor',
        'test@contractor.com',
        '555-1234',
        'Test Company',
        '["Sales & Marketing", "Operations"]',
        '$1M-$5M',
        '11-50',
        'active'
      ]);
      contractorId = insertResult.rows[0].id;
      console.log('✅ Test contractor created, ID:', contractorId);
    } else {
      contractorId = contractorResult.rows[0].id;
      console.log('✅ Test contractor already exists, ID:', contractorId);
    }

    // Create contractor user
    const userCheck = await query(`
      SELECT id FROM contractor_users WHERE email = 'test@contractor.com'
    `);

    if (userCheck.rows.length === 0) {
      await query(`
        INSERT INTO contractor_users (
          contractor_id, email, password, first_name, last_name, is_active, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      `, [contractorId, 'test@contractor.com', password, 'Test', 'Contractor', true]);

      console.log('✅ Test contractor user created successfully!\n');
    } else {
      console.log('✅ Test contractor user already exists\n');
    }

    console.log('📋 Test Credentials:');
    console.log('   📧 Email: test@contractor.com');
    console.log('   🔐 Password: Test123!');
    console.log('   🌐 Login URL: http://localhost:3002/contractor/login\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createTestUser();
