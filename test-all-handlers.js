/**
 * Comprehensive Test Suite for All Event Message Handlers
 * Tests all 8 inbound handlers + AI Concierge
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000';
const N8N_API_KEY = 'tpx-n8n-automation-key-2025-power100-experience';

// Test data (using actual contractor ID 56)
const TEST_CONTRACTOR_ID = 56; // Your contractor ID
const TEST_EVENT_ID = 2; // Power100 Annual Conference
const TEST_PHONE = '+18108934075'; // Your phone number
const GHL_CONTACT_ID = 'test-ghl-contact-56';
const GHL_LOCATION_ID = 'test-ghl-location-456';

// Color codes for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  cyan: '\x1b[36m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testHandler(testName, payload) {
  log('cyan', `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  log('blue', `Testing: ${testName}`);
  log('cyan', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(`${API_BASE}/api/sms/inbound`, payload, {
      headers: {
        'x-api-key': N8N_API_KEY
      }
    });

    if (response.data.success) {
      log('green', `✅ PASSED: ${testName}`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      return true;
    } else {
      log('yellow', `⚠️  PARTIAL: ${testName}`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
      return false;
    }
  } catch (error) {
    log('red', `❌ FAILED: ${testName}`);
    console.error('Error:', error.response?.data || error.message);
    return false;
  }
}

async function runAllTests() {
  log('cyan', '\n╔════════════════════════════════════════════════════╗');
  log('cyan', '║   EVENT MESSAGE HANDLER TEST SUITE                 ║');
  log('cyan', '╚════════════════════════════════════════════════════╝\n');

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: Speaker Details (reply with number 1-3)
  results.total++;
  if (await testHandler('Speaker Details - Numeric Reply', {
    phone: TEST_PHONE,
    message_content: '1',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 2: Speaker Details - Natural Language
  results.total++;
  if (await testHandler('Speaker Details - Natural Language', {
    phone: TEST_PHONE,
    message_content: 'Tell me about speaker 2',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 3: Speaker Feedback (rating 1-10)
  results.total++;
  if (await testHandler('Speaker Feedback - Rating', {
    phone: TEST_PHONE,
    message_content: 'That session was amazing! 9/10',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 4: Sponsor Details
  results.total++;
  if (await testHandler('Sponsor Details - Booth Info', {
    phone: TEST_PHONE,
    message_content: '2',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 5: Attendance Confirmation - Yes with PCR
  results.total++;
  if (await testHandler('Attendance Confirmation - Yes + PCR', {
    phone: TEST_PHONE,
    message_content: 'Yes! It was amazing 9/10',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 6: Attendance Confirmation - Yes without PCR
  results.total++;
  if (await testHandler('Attendance Confirmation - Yes only', {
    phone: TEST_PHONE,
    message_content: 'Yes I attended',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 7: Attendance Confirmation - No
  results.total++;
  if (await testHandler('Attendance Confirmation - No', {
    phone: TEST_PHONE,
    message_content: 'No I couldn\'t make it',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 8: PCR Response (direct rating)
  results.total++;
  if (await testHandler('PCR Response - Direct Rating', {
    phone: TEST_PHONE,
    message_content: '4',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 9: Peer Match Response - Interested
  results.total++;
  if (await testHandler('Peer Match - Interested', {
    phone: TEST_PHONE,
    message_content: 'Yes! I\'d love to connect',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 10: Peer Match Response - Not Interested
  results.total++;
  if (await testHandler('Peer Match - Not Interested', {
    phone: TEST_PHONE,
    message_content: 'Not interested, thanks',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 11: Peer Match Response - Tell Me More
  results.total++;
  if (await testHandler('Peer Match - Asking More Info', {
    phone: TEST_PHONE,
    message_content: 'Tell me more about this person',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 12: Event Check-in - Status Query
  results.total++;
  if (await testHandler('Event Check-in - Status Query', {
    phone: TEST_PHONE,
    message_content: 'Am I checked in?',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 13: Event Check-in - Event Info
  results.total++;
  if (await testHandler('Event Check-in - Event Info', {
    phone: TEST_PHONE,
    message_content: 'What event am I at?',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 14: Admin Command - DELAY (need admin phone)
  results.total++;
  if (await testHandler('Admin Command - DELAY', {
    phone: '+15559999999', // Admin phone (would need to be in database)
    message_content: 'DELAY 30 TPE2025',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 15: Admin Command - STATUS
  results.total++;
  if (await testHandler('Admin Command - STATUS', {
    phone: '+15559999999',
    message_content: 'STATUS TPE2025',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 16: Admin Command - HELP
  results.total++;
  if (await testHandler('Admin Command - HELP', {
    phone: '+15559999999',
    message_content: 'HELP',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 17: General Question - AI Concierge
  results.total++;
  if (await testHandler('General Question - AI Concierge', {
    phone: TEST_PHONE,
    message_content: 'What sessions are recommended for someone interested in AI automation?',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 18: General Question - Business Help
  results.total++;
  if (await testHandler('General Question - Business Help', {
    phone: TEST_PHONE,
    message_content: 'How can I improve my team\'s productivity?',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Print summary
  log('cyan', '\n\n╔════════════════════════════════════════════════════╗');
  log('cyan', '║              TEST SUMMARY                          ║');
  log('cyan', '╚════════════════════════════════════════════════════╝');
  log('blue', `\nTotal Tests: ${results.total}`);
  log('green', `Passed: ${results.passed}`);
  log('red', `Failed: ${results.failed}`);

  const passRate = Math.round((results.passed / results.total) * 100);

  if (passRate === 100) {
    log('green', `\n🎉 Perfect Score: ${passRate}% - All handlers working!`);
  } else if (passRate >= 80) {
    log('yellow', `\n⚠️  Pass Rate: ${passRate}% - Most handlers working, some issues`);
  } else {
    log('red', `\n❌ Pass Rate: ${passRate}% - Significant issues detected`);
  }

  log('cyan', '\n════════════════════════════════════════════════════\n');
}

// Run tests
runAllTests().catch(error => {
  log('red', `\n❌ Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
