/**
 * Test Suite: Peer Matching & Check-In Handlers
 * Tests peer_match_response and event_checkin handlers
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000';
const N8N_API_KEY = 'tpx-n8n-automation-key-2025-power100-experience';

const TEST_PHONE = '+18108934075';
const TEST_EVENT_ID = 2;
const GHL_CONTACT_ID = 'test-ghl-contact-56';
const GHL_LOCATION_ID = 'test-ghl-location-456';

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

async function runTests() {
  log('cyan', '\n╔════════════════════════════════════════════════════╗');
  log('cyan', '║  PEER MATCHING & CHECK-IN HANDLERS TEST SUITE     ║');
  log('cyan', '╚════════════════════════════════════════════════════╝\n');

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: Peer Match - Interested
  results.total++;
  if (await testHandler('Peer Match - Interested', {
    phone: TEST_PHONE,
    message_content: 'Yes! I\'d love to connect',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 2: Peer Match - Not Interested
  results.total++;
  if (await testHandler('Peer Match - Not Interested', {
    phone: TEST_PHONE,
    message_content: 'Not interested, thanks',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 3: Peer Match - Asking More Info
  results.total++;
  if (await testHandler('Peer Match - Asking More Info', {
    phone: TEST_PHONE,
    message_content: 'Tell me more about this person',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 4: Event Check-in - Status Query
  results.total++;
  if (await testHandler('Event Check-in - Status Query', {
    phone: TEST_PHONE,
    message_content: 'Am I checked in?',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 5: Event Check-in - Event Info
  results.total++;
  if (await testHandler('Event Check-in - Event Info', {
    phone: TEST_PHONE,
    message_content: 'What event am I at?',
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
  } else if (passRate >= 75) {
    log('yellow', `\n⚠️  Pass Rate: ${passRate}% - Most handlers working, some issues`);
  } else {
    log('red', `\n❌ Pass Rate: ${passRate}% - Significant issues detected`);
  }

  log('cyan', '\n════════════════════════════════════════════════════\n');

  process.exit(passRate === 100 ? 0 : 1);
}

runTests().catch(error => {
  log('red', `\n❌ Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
