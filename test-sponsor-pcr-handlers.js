/**
 * Test Suite: Sponsor & PCR Handlers
 * Tests sponsor_details, pcr_response, and attendance_confirmation handlers
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
  log('cyan', '║    SPONSOR & PCR HANDLERS TEST SUITE              ║');
  log('cyan', '╚════════════════════════════════════════════════════╝\n');

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: Sponsor Details - Booth Info
  results.total++;
  if (await testHandler('Sponsor Details - Booth Info (2)', {
    phone: TEST_PHONE,
    message_content: '2',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 2: Sponsor Details - Natural Language
  results.total++;
  if (await testHandler('Sponsor Details - Natural Language', {
    phone: TEST_PHONE,
    message_content: 'Tell me about the sponsors',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 3: Attendance Confirmation - Yes with PCR
  results.total++;
  if (await testHandler('Attendance Confirmation - Yes + PCR', {
    phone: TEST_PHONE,
    message_content: 'Yes! It was amazing 9/10',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 4: Attendance Confirmation - Yes only
  results.total++;
  if (await testHandler('Attendance Confirmation - Yes only', {
    phone: TEST_PHONE,
    message_content: 'Yes I attended',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 5: Attendance Confirmation - No
  results.total++;
  if (await testHandler('Attendance Confirmation - No', {
    phone: TEST_PHONE,
    message_content: 'No I couldn\'t make it',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 6: PCR Response - Direct Rating
  results.total++;
  if (await testHandler('PCR Response - Direct Rating (4)', {
    phone: TEST_PHONE,
    message_content: '4',
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
