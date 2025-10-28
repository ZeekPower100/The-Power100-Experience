// Test Partner Profile Completion Email to User's Email
const axios = require('axios');

async function testPartnerEmailToUser() {
  console.log('🧪 Testing Partner Profile Completion Email to zeekbee50@gmail.com\n');
  console.log('='.repeat(70));

  const API_BASE = 'http://localhost:5000';
  const TEST_EVENT_ID = 6; // "Better Event"

  try {
    // Step 1: Login as admin
    console.log('\n🔐 Logging in as admin...');
    const loginResponse = await axios.post(
      `${API_BASE}/api/auth/login`,
      {
        email: 'admin@power100.io',
        password: 'admin123'
      }
    );

    const token = loginResponse.data.token;
    console.log('✅ Admin login successful!');

    // Test data: Event with FieldForce (ID 3, email: zeekbee50@gmail.com) as sponsor
    const eventData = {
      name: 'Better Event',
      date: '2025-12-01',
      location: 'Virtual',
      description: 'Test event for partner profile completion',
      sponsors: [
        {
          name: 'FieldForce',
          partner_id: 3,  // FieldForce with zeekbee50@gmail.com
          tier: 'Platinum',
          booth_number: 'B5',
          booth_location: 'East Wing'
        }
      ]
    };

    // Step 2: Update event with partner sponsor
    console.log(`\n📤 Updating event ${TEST_EVENT_ID} with FieldForce as sponsor...`);
    console.log(`Partner: FieldForce (ID: 3)`);
    console.log(`Email: zeekbee50@gmail.com`);
    console.log(`Expected: Email should be sent to zeekbee50@gmail.com\n`);

    const response = await axios.put(
      `${API_BASE}/api/events/${TEST_EVENT_ID}`,
      eventData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Event updated successfully!');
    console.log(`Response status: ${response.status}`);

    // Wait for email processing
    console.log('\n⏳ Waiting 2 seconds for email processing...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if email was logged
    const { query } = require('./src/config/database');
    const result = await query(`
      SELECT
        id,
        event_id,
        message_type,
        channel,
        status,
        personalization_data,
        created_at
      FROM event_messages
      WHERE event_id = $1
        AND message_type = 'partner_profile_completion_request'
      ORDER BY created_at DESC
      LIMIT 1
    `, [TEST_EVENT_ID]);

    if (result.rows.length > 0) {
      const message = result.rows[0];
      const personalizationData = typeof message.personalization_data === 'string'
        ? JSON.parse(message.personalization_data)
        : message.personalization_data;

      console.log('✅ EMAIL SENT SUCCESSFULLY!');
      console.log('-'.repeat(70));
      console.log(`Message ID: ${message.id}`);
      console.log(`Partner ID: ${personalizationData.partner_id}`);
      console.log(`Company: ${personalizationData.company_name}`);
      console.log(`To Email: zeekbee50@gmail.com`);
      console.log(`Subject: ${personalizationData.email_subject}`);
      console.log(`Status: ${message.status}`);

      console.log('\n🎉 SUCCESS! Check your email at zeekbee50@gmail.com!');
      console.log('📧 Subject: "Hello, maximize your exposure at Better Event!"');
    } else {
      console.log('❌ NO EMAIL FOUND - Check backend logs');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Test complete!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    process.exit(0);
  }
}

testPartnerEmailToUser().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
