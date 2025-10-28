// Test Partner Event Registration Full Flow
const axios = require('axios');

async function testPartnerEventFlow() {
  console.log('🧪 Testing Partner Event Registration Full Flow\n');
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
    console.log(`Token: ${token.substring(0, 20)}...`);

    // Test data: Event with MarketPro (ID 2) as sponsor
    const eventData = {
      name: 'Better Event',
      date: '2025-12-01',
      location: 'Virtual',
      description: 'Test event for partner profile completion',
      sponsors: [
        {
          name: 'MarketPro',
          partner_id: 2,
          tier: 'Gold',
          booth_number: 'A1',
          booth_location: 'Main Hall'
        }
      ]
    };

    // Step 2: Update event with partner sponsor
    console.log(`\n📤 Updating event ${TEST_EVENT_ID} with incomplete partner sponsor...`);
    console.log(`Partner: MarketPro (ID: 2)`);
    console.log(`Expected: Email should be triggered for incomplete profile\n`);

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

    // Wait a moment for async email processing
    console.log('\n⏳ Waiting 2 seconds for email processing...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if email was logged to event_messages table
    console.log('📧 Checking event_messages table for partner email...\n');

    const { query } = require('./src/config/database');
    const result = await query(`
      SELECT
        id,
        event_id,
        contractor_id,
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
      console.log('✅ EMAIL MESSAGE FOUND IN DATABASE!');
      console.log('-'.repeat(70));
      console.log(`Message ID: ${message.id}`);
      console.log(`Event ID: ${message.event_id}`);
      console.log(`Contractor ID: ${message.contractor_id} (should be NULL for partners)`);
      console.log(`Message Type: ${message.message_type}`);
      console.log(`Channel: ${message.channel}`);
      console.log(`Status: ${message.status}`);
      console.log(`Created: ${message.created_at}`);

      const personalizationData = typeof message.personalization_data === 'string'
        ? JSON.parse(message.personalization_data)
        : message.personalization_data;
      console.log(`\nPersonalization Data:`);
      console.log(`  - Partner ID: ${personalizationData.partner_id}`);
      console.log(`  - Company: ${personalizationData.company_name}`);
      console.log(`  - Subject: ${personalizationData.email_subject}`);
      console.log(`  - Event: ${personalizationData.event_name}`);

      console.log('\n🎉 SUCCESS! Partner profile completion email was triggered correctly!');
    } else {
      console.log('❌ NO EMAIL FOUND - Email may not have been triggered');
      console.log('Check backend logs for errors');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Test complete!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  } finally {
    process.exit(0);
  }
}

testPartnerEventFlow().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
