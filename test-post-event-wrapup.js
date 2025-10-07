/**
 * Test Suite: Post-Event Wrap-Up Workflow
 * Tests comprehensive post-event follow-up messaging system
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzU5NzkzOTk4LCJleHAiOjE3NjIzODU5OTh9.KRHKInNtOke7tso6P1bQO5Tmbynjb_ixHQZKVSiflgE';

const TEST_EVENT_ID = 2; // Event with completed sessions and feedback
const TEST_CONTRACTOR_ID = 56; // Contractor who attended event

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
  log('cyan', '║     POST-EVENT WRAP-UP WORKFLOW TEST SUITE        ║');
  log('cyan', '╚════════════════════════════════════════════════════╝\n');

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: Send wrap-up to specific contractor
  results.total++;
  if (await testEndpoint(
    'Send Wrap-Up to Single Contractor',
    `/api/event-messaging/event/${TEST_EVENT_ID}/post-event-wrap-up`,
    'POST',
    {
      contractorId: TEST_CONTRACTOR_ID
    }
  )) results.passed++; else results.failed++;

  // Test 2: Resend wrap-up to specific contractor
  results.total++;
  if (await testEndpoint(
    'Resend Wrap-Up to Contractor',
    `/api/event-messaging/event/${TEST_EVENT_ID}/contractor/${TEST_CONTRACTOR_ID}/resend-wrap-up`,
    'POST',
    null
  )) results.passed++; else results.failed++;

  // Test 3: Send wrap-up to ALL checked-in attendees
  results.total++;
  if (await testEndpoint(
    'Send Wrap-Up to All Attendees',
    `/api/event-messaging/event/${TEST_EVENT_ID}/post-event-wrap-up`,
    'POST',
    {} // Empty body = send to all
  )) results.passed++; else results.failed++;

  // Test 4: Invalid event ID (should fail)
  results.total++;
  if (await testEndpoint(
    'Invalid Event ID (Should Fail)',
    `/api/event-messaging/event/99999/post-event-wrap-up`,
    'POST',
    {}
  )) results.failed++; else results.passed++; // Reversed - we expect failure

  // Test 5: Invalid contractor ID (should fail)
  results.total++;
  if (await testEndpoint(
    'Invalid Contractor ID (Should Fail)',
    `/api/event-messaging/event/${TEST_EVENT_ID}/contractor/99999/resend-wrap-up`,
    'POST',
    null
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
    log('green', `\n🎉 Perfect Score: ${passRate}% - Post-event wrap-up working!`);
  } else if (passRate >= 75) {
    log('yellow', `\n⚠️  Pass Rate: ${passRate}% - Most tests passing, some issues`);
  } else {
    log('red', `\n❌ Pass Rate: ${passRate}% - Significant issues detected`);
  }

  log('cyan', '\n════════════════════════════════════════════════════\n');

  // Test Output Analysis
  log('blue', '\n📊 EXPECTED WRAP-UP COMPONENTS:\n');
  console.log('✓ Event Summary (sessions attended, sponsors visited, peer connections)');
  console.log('✓ Top 3 Speaker Rankings (by PCR score)');
  console.log('✓ Upcoming Demo Reminders');
  console.log('✓ Peer Contact Exchanges (mutual connections)');
  console.log('✓ Content Recommendations (books/podcasts based on focus areas)');
  console.log('✓ Continuous Engagement CTA (AI coach transition)');

  process.exit(passRate === 100 ? 0 : 1);
}

runTests().catch(error => {
  log('red', `\n❌ Test suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
