/**
 * Test Suite: Speaker Handlers
 * Tests speaker_details and speaker_feedback handlers
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000';
const N8N_API_KEY = 'tpx-n8n-automation-key-2025-power100-experience';

// Test data (using actual contractor ID 56)
const TEST_CONTRACTOR_ID = 56;
const TEST_EVENT_ID = 2;
const TEST_PHONE = '+18108934075';
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

async function runSpeakerTests() {
  log('cyan', '\n╔════════════════════════════════════════════════════╗');
  log('cyan', '║        SPEAKER HANDLERS TEST SUITE                 ║');
  log('cyan', '╚════════════════════════════════════════════════════╝\n');

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: Speaker Details - Numeric Reply
  results.total++;
  if (await testHandler('Speaker Details - Numeric Reply (1)', {
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

  // Test 3: Speaker Feedback - Rating with text
  results.total++;
  if (await testHandler('Speaker Feedback - Rating with text', {
    phone: TEST_PHONE,
    message_content: 'That session was amazing! 9/10',
    ghl_contact_id: GHL_CONTACT_ID,
    ghl_location_id: GHL_LOCATION_ID,
    event_id: TEST_EVENT_ID
  })) results.passed++; else results.failed++;

  // Test 4: Speaker Feedback - Just rating
  results.total++;
  if (await testHandler('Speaker Feedback - Just rating (8)', {
    phone: TEST_PHONE,
    message_content: '8',
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
    log('green', `\n🎉 Perfect Score: ${passRate}% - All speaker handlers working!`);
  } else if (passRate >= 75) {
    log('yellow', `\n⚠️  Pass Rate: ${passRate}% - Most handlers working, some issues`);
  } else {
    log('red', `\n❌ Pass Rate: ${passRate}% - Significant issues detected`);
  }

  log('cyan', '\n════════════════════════════════════════════════════\n');

  process.exit(passRate === 100 ? 0 : 1);
}

// Run tests
runSpeakerTests().catch(error => {
  log('red', `\n❌ Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
