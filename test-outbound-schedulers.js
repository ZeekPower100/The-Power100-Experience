/**
 * Test Suite: Outbound Message Schedulers
 * Tests trigger endpoints for speaker alerts, sponsor recommendations, and PCR requests
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000';
const ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzU5NzkzOTk4LCJleHAiOjE3NjIzODU5OTh9.KRHKInNtOke7tso6P1bQO5Tmbynjb_ixHQZKVSiflgE';

const TEST_PHONE = '+18108934075';
const TEST_EVENT_ID = 2;
const TEST_CONTRACTOR_ID = 56;

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

async function testTrigger(testName, endpoint, payload) {
  log('cyan', `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  log('blue', `Testing: ${testName}`);
  log('cyan', `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log('Endpoint:', endpoint);
  console.log('Payload:', JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(`${API_BASE}${endpoint}`, payload, {
      headers: {
        'Authorization': `Bearer ${ADMIN_TOKEN}`
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
  log('cyan', '║     OUTBOUND MESSAGE SCHEDULERS TEST SUITE        ║');
  log('cyan', '╚════════════════════════════════════════════════════╝\n');

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Test 1: Trigger Speaker Alert
  results.total++;
  if (await testTrigger(
    'Speaker Alert Trigger',
    '/api/event-messaging/trigger-speaker-alert',
    {
      event_id: TEST_EVENT_ID,
      contractor_id: TEST_CONTRACTOR_ID,
      speaker_recommendations: [
        {
          name: "John Smith",
          company: "Tech Innovations",
          session: {
            title: "Growing Your Construction Business with AI",
            time: "2:00 PM",
            location: "Main Stage"
          },
          why: "Aligns with your AI automation and growth goals"
        },
        {
          name: "Jane Doe",
          company: "BuildSmart Solutions",
          session: {
            title: "Scaling Your Operations",
            time: "3:30 PM",
            location: "Workshop Room A"
          },
          why: "Perfect for operational efficiency improvements"
        }
      ]
    }
  )) results.passed++; else results.failed++;

  // Test 2: Trigger Sponsor Recommendation
  results.total++;
  if (await testTrigger(
    'Sponsor Recommendation Trigger',
    '/api/event-messaging/trigger-sponsor-recommendation',
    {
      event_id: TEST_EVENT_ID,
      contractor_id: TEST_CONTRACTOR_ID,
      sponsor_recommendations: [
        {
          company_name: "TechCorp Solutions",
          booth_number: "A12",
          tagline: "AI-Powered Business Automation",
          why_recommended: "Matches your interest in AI automation and scaling operations"
        },
        {
          company_name: "Growth Partners Inc",
          booth_number: "B05",
          tagline: "Strategic Business Growth",
          why_recommended: "Specializes in helping contractors scale to 7-figures"
        }
      ]
    }
  )) results.passed++; else results.failed++;

  // Test 3: Trigger PCR Request
  results.total++;
  if (await testTrigger(
    'PCR Request Trigger',
    '/api/event-messaging/trigger-pcr-request',
    {
      event_id: TEST_EVENT_ID,
      contractor_id: TEST_CONTRACTOR_ID,
      session_info: {
        session_id: 101,
        title: "Growing Your Construction Business with AI",
        speaker_name: "John Smith"
      }
    }
  )) results.passed++; else results.failed++;

  // Test 4: Speaker Alert - Missing event_id
  results.total++;
  if (await testTrigger(
    'Speaker Alert - Missing event_id (should fail)',
    '/api/event-messaging/trigger-speaker-alert',
    {
      contractor_id: TEST_CONTRACTOR_ID,
      speaker_recommendations: []
    }
  )) results.failed++; else results.passed++;  // Reversed - we expect this to fail

  // Test 5: Sponsor Recommendation - Empty array
  results.total++;
  if (await testTrigger(
    'Sponsor Recommendation - Empty array',
    '/api/event-messaging/trigger-sponsor-recommendation',
    {
      event_id: TEST_EVENT_ID,
      contractor_id: TEST_CONTRACTOR_ID,
      sponsor_recommendations: []
    }
  )) results.passed++; else results.failed++;

  // Test 6: PCR Request - Invalid contractor
  results.total++;
  if (await testTrigger(
    'PCR Request - Invalid contractor (should fail)',
    '/api/event-messaging/trigger-pcr-request',
    {
      event_id: TEST_EVENT_ID,
      contractor_id: 99999,
      session_info: {
        session_id: 101,
        title: "Test Session",
        speaker_name: "Test Speaker"
      }
    }
  )) results.failed++; else results.passed++;  // Reversed - we expect this to fail

  // Print summary
  log('cyan', '\n\n╔════════════════════════════════════════════════════╗');
  log('cyan', '║              TEST SUMMARY                          ║');
  log('cyan', '╚════════════════════════════════════════════════════╝');
  log('blue', `\nTotal Tests: ${results.total}`);
  log('green', `Passed: ${results.passed}`);
  log('red', `Failed: ${results.failed}`);

  const passRate = Math.round((results.passed / results.total) * 100);

  if (passRate === 100) {
    log('green', `\n🎉 Perfect Score: ${passRate}% - All outbound triggers working!`);
  } else if (passRate >= 75) {
    log('yellow', `\n⚠️  Pass Rate: ${passRate}% - Most triggers working, some issues`);
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
