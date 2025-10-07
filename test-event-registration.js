/**
 * Test Suite: Event Registration & Onboarding Workflow
 * Tests contractor registration for events (alternative TPX entry point)
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzU5NzkzOTk4LCJleHAiOjE3NjIzODU5OTh9.KRHKInNtOke7tso6P1bQO5Tmbynjb_ixHQZKVSiflgE';

const TEST_EVENT_ID = 2; // Assuming event ID 2 exists
const TEST_CONTRACTOR_ID = 56; // Existing contractor with complete profile

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

async function testEndpoint(testName, endpoint, method, payload) {
  log('cyan', `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  log('blue', `Testing: ${testName}`);
  log('cyan', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log('Endpoint:', endpoint);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`,
        'Content-Type': 'application/json'
      }
    };

    if (payload) {
      config.data = payload;
    }

    const response = await axios(config);

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
  log('cyan', '║   EVENT REGISTRATION & ONBOARDING TEST SUITE      ║');
  log('cyan', '╚════════════════════════════════════════════════════╝\n');

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: Register existing contractor with complete profile (should send agenda)
  results.total++;
  if (await testEndpoint(
    'Register Existing Contractor (Complete Profile)',
    `/api/event-messaging/event/${TEST_EVENT_ID}/register`,
    'POST',
    {
      email: 'test@power100.io', // Use existing contractor email
      phone: '+18108934075', // Test contractor phone
      first_name: 'Test',
      last_name: 'Contractor'
    }
  )) results.passed++; else results.failed++;

  // Test 2: Register new contractor (should send profile completion request)
  results.total++;
  const newEmail = `newcontractor${Date.now()}@test.com`;
  if (await testEndpoint(
    'Register New Contractor (Triggers Profile Completion)',
    `/api/event-messaging/event/${TEST_EVENT_ID}/register`,
    'POST',
    {
      email: newEmail,
      phone: `+1555${Math.floor(Math.random() * 10000000)}`,
      first_name: 'New',
      last_name: 'Contractor',
      company_name: 'Test Company'
    }
  )) results.passed++; else results.failed++;

  // Test 3: Bulk registration (array of contractors)
  results.total++;
  if (await testEndpoint(
    'Bulk Registration (2 contractors)',
    `/api/event-messaging/event/${TEST_EVENT_ID}/register`,
    'POST',
    [
      {
        email: `bulk1${Date.now()}@test.com`,
        phone: `+1555${Math.floor(Math.random() * 10000000)}`,
        first_name: 'Bulk',
        last_name: 'One'
      },
      {
        email: `bulk2${Date.now()}@test.com`,
        phone: `+1555${Math.floor(Math.random() * 10000000)}`,
        first_name: 'Bulk',
        last_name: 'Two'
      }
    ]
  )) results.passed++; else results.failed++;

  // Test 4: Resend personalized agenda
  results.total++;
  if (await testEndpoint(
    'Resend Personalized Agenda',
    `/api/event-messaging/event/${TEST_EVENT_ID}/contractor/${TEST_CONTRACTOR_ID}/resend-agenda`,
    'POST',
    null
  )) results.passed++; else results.failed++;

  // Test 5: Duplicate registration (should detect already registered)
  results.total++;
  if (await testEndpoint(
    'Duplicate Registration Detection',
    `/api/event-messaging/event/${TEST_EVENT_ID}/register`,
    'POST',
    {
      email: 'test@power100.io',
      phone: '+18108934075'
    }
  )) results.passed++; else results.failed++;

  // Test 6: Missing required fields (should fail)
  results.total++;
  if (await testEndpoint(
    'Missing Email (Should Fail)',
    `/api/event-messaging/event/${TEST_EVENT_ID}/register`,
    'POST',
    {
      phone: '+15551234567',
      first_name: 'Invalid'
    }
  )) results.failed++; else results.passed++; // Reversed - we expect failure

  // Print summary
  log('cyan', '\n\n╔════════════════════════════════════════════════════╗');
  log('cyan', '║              TEST SUMMARY                          ║');
  log('cyan', '╚════════════════════════════════════════════════════╝');
  log('blue', `\nTotal Tests: ${results.total}`);
  log('green', `Passed: ${results.passed}`);
  log('red', `Failed: ${results.failed}`);

  const passRate = Math.round((results.passed / results.total) * 100);

  if (passRate === 100) {
    log('green', `\n🎉 Perfect Score: ${passRate}% - Event registration working!`);
  } else if (passRate >= 75) {
    log('yellow', `\n⚠️  Pass Rate: ${passRate}% - Most tests passing, some issues`);
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
