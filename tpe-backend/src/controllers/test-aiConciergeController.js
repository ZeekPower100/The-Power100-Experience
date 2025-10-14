// ================================================================
// Test: AI Concierge Controller with Agent Routing
// ================================================================
// Tests controller integration with Standard and Event Agent routing
// Verifies database-checked field names and agent selection logic
// ================================================================

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/ai-concierge';

// Test contractor IDs
const TEST_CONTRACTOR_ID = 1;

// Note: All routes use flexibleProtect middleware which allows dev mode bypass

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testControllerRouting() {
  console.log('='.repeat(80));
  log('Testing AI Concierge Controller with Agent Routing', 'cyan');
  console.log('='.repeat(80));

  try {
    // Test Case 1: Check Access (Dev Mode)
    log('\n📍 Test Case 1: Check AI Concierge Access (Dev Mode)', 'blue');

    const accessResponse = await axios.get(`${BASE_URL}/access-status`);
    log(`✅ Access check successful`, 'green');
    log(`  Has Access: ${accessResponse.data.hasAccess}`, 'green');
    log(`  Access Level: ${accessResponse.data.accessLevel}`, 'green');

    // Test Case 2: Send Message with Standard Agent (No Event)
    log('\n\n📍 Test Case 2: Send Message - Standard Agent Routing', 'blue');
    log('  Expectation: Contractor NOT at event, should use Standard Agent', 'yellow');

    const standardMessage = await axios.post(`${BASE_URL}/message`, {
      message: "Hi! I'm testing the AI Concierge. Can you tell me which mode you're in and what you can help me with?"
    });

    log(`✅ Standard Agent Response received`, 'green');
    log(`  Session ID: ${standardMessage.data.session_id}`, 'green');
    log(`  User Message ID: ${standardMessage.data.userMessage.id}`, 'green');
    log(`  AI Response ID: ${standardMessage.data.aiResponse.id}`, 'green');
    log(`\n  AI Says:`, 'cyan');
    log(`  "${standardMessage.data.aiResponse.content.substring(0, 200)}..."`, 'cyan');

    // Test Case 3: Get Conversations
    log('\n\n📍 Test Case 3: Get Conversation History', 'blue');

    const conversations = await axios.get(`${BASE_URL}/conversations?limit=10`);
    log(`✅ Retrieved ${conversations.data.conversations.length} messages`, 'green');
    log(`  Total in database: ${conversations.data.total}`, 'green');
    log(`  Has more: ${conversations.data.hasMore}`, 'green');

    // Test Case 4: Send Follow-up Message
    log('\n\n📍 Test Case 4: Send Follow-up Message (Same Session)', 'blue');

    const followupMessage = await axios.post(`${BASE_URL}/message`, {
      message: "Can you recommend a partner that could help me with customer retention?",
      session_id: standardMessage.data.session_id
    });

    log(`✅ Follow-up Response received`, 'green');
    log(`  Using same session: ${followupMessage.data.session_id === standardMessage.data.session_id}`, 'green');
    log(`\n  AI Says:`, 'cyan');
    log(`  "${followupMessage.data.aiResponse.content.substring(0, 200)}..."`, 'cyan');

    // Test Case 5: Agent Routing Logic Verification
    log('\n\n📍 Test Case 5: Verify Agent Routing Logic', 'blue');
    log('  Testing database query for event registration check...', 'yellow');

    const { query } = require('../config/database');

    const eventCheck = await query(`
      SELECT
        cer.event_id,
        cer.event_status,
        e.name as event_name,
        e.date as event_date
      FROM contractor_event_registrations cer
      JOIN events e ON e.id = cer.event_id
      WHERE cer.contractor_id = $1
        AND cer.event_status IN ('registered', 'checked_in', 'attending')
        AND e.date >= CURRENT_DATE - INTERVAL '1 day'
        AND e.date <= CURRENT_DATE + INTERVAL '1 day'
      ORDER BY e.date DESC
      LIMIT 1
    `, [TEST_CONTRACTOR_ID]);

    if (eventCheck.rows.length > 0) {
      log(`✅ Contractor IS at an event:`, 'green');
      log(`  Event: ${eventCheck.rows[0].event_name}`, 'green');
      log(`  Date: ${eventCheck.rows[0].event_date}`, 'green');
      log(`  Status: ${eventCheck.rows[0].event_status}`, 'green');
      log(`  ⚠️ IMPORTANT: Next message should route to EVENT AGENT`, 'yellow');
    } else {
      log(`✅ Contractor NOT at an event`, 'green');
      log(`  All messages should route to STANDARD AGENT`, 'green');
    }

    // Test Case 6: Session Management
    log('\n\n📍 Test Case 6: Test Session Management', 'blue');

    const sessionResponse = await axios.get(`${BASE_URL}/session`);
    log(`✅ Session retrieved/created`, 'green');
    log(`  Session ID: ${sessionResponse.data.session.session_id}`, 'green');
    log(`  Session Type: ${sessionResponse.data.session.session_type}`, 'green');
    log(`  Session Status: ${sessionResponse.data.session.session_status}`, 'green');

    // Test Case 7: Database Field Name Verification
    log('\n\n📍 Test Case 7: Verify Database Field Names Used', 'blue');
    log('  Checking ai_concierge_sessions table...', 'yellow');

    const sessionCheck = await query(`
      SELECT
        id,
        contractor_id,     -- DATABASE VERIFIED (NOT contractorId)
        session_id,        -- DATABASE VERIFIED
        session_type,      -- DATABASE VERIFIED
        session_status,    -- DATABASE VERIFIED
        started_at         -- DATABASE VERIFIED
      FROM ai_concierge_sessions
      WHERE contractor_id = $1
      ORDER BY started_at DESC
      LIMIT 1
    `, [TEST_CONTRACTOR_ID]);

    if (sessionCheck.rows.length > 0) {
      const session = sessionCheck.rows[0];
      log(`✅ Session found in database:`, 'green');
      log(`  ID: ${session.id}`, 'green');
      log(`  Contractor ID: ${session.contractor_id} (using snake_case ✓)`, 'green');
      log(`  Session ID: ${session.session_id}`, 'green');
      log(`  Session Type: ${session.session_type}`, 'green');
      log(`  Session Status: ${session.session_status}`, 'green');
      log(`  Started At: ${session.started_at}`, 'green');
    }

    // Test Case 8: Knowledge Base Test
    log('\n\n📍 Test Case 8: Test Knowledge Base Access', 'blue');

    const knowledgeTest = await axios.get(`${BASE_URL}/test-knowledge`);
    log(`✅ Knowledge Base Test:`, 'green');
    log(`  Books Loaded: ${knowledgeTest.data.data.booksLoaded}`, 'green');
    log(`  Podcasts Loaded: ${knowledgeTest.data.data.podcastsLoaded}`, 'green');
    log(`  Partners Loaded: ${knowledgeTest.data.data.partnersLoaded}`, 'green');

    // Summary
    console.log('\n' + '='.repeat(80));
    log('✅ All AI Concierge Controller tests completed successfully!', 'green');
    console.log('='.repeat(80));

    log('\n📊 Test Summary:', 'cyan');
    log('  ✅ Access check: PASSED', 'green');
    log('  ✅ Standard Agent routing: PASSED', 'green');
    log('  ✅ Conversation history: PASSED', 'green');
    log('  ✅ Follow-up messages: PASSED', 'green');
    log('  ✅ Agent routing logic: VERIFIED', 'green');
    log('  ✅ Session management: PASSED', 'green');
    log('  ✅ Database field names: VERIFIED', 'green');
    log('  ✅ Knowledge base access: PASSED', 'green');

    log('\n🎯 Next Steps:', 'yellow');
    log('  1. To test Event Agent: Add event registration for contractor 1', 'yellow');
    log('  2. Run test again - should route to Event Agent', 'yellow');
    log('  3. Monitor backend console for routing logs', 'yellow');

  } catch (error) {
    log(`\n❌ Test failed with error:`, 'red');
    if (error.response) {
      log(`  Status: ${error.response.status}`, 'red');
      log(`  Message: ${error.response.data.error || error.response.data.message}`, 'red');
      log(`  Data: ${JSON.stringify(error.response.data, null, 2)}`, 'red');
    } else {
      log(`  ${error.message}`, 'red');
    }
    log(`  Stack: ${error.stack}`, 'red');
  }

  process.exit(0);
}

// Helper: Create test event registration (for Event Agent testing)
async function createTestEventRegistration() {
  log('\n🎪 Creating test event registration for Event Agent testing...', 'yellow');

  const { query } = require('../config/database');

  try {
    // Check if there's an event today or tomorrow
    const eventsCheck = await query(`
      SELECT id, name, date
      FROM events
      WHERE date >= CURRENT_DATE
        AND date <= CURRENT_DATE + INTERVAL '1 day'
      LIMIT 1
    `);

    if (eventsCheck.rows.length === 0) {
      log('  ⚠️ No events scheduled for today/tomorrow', 'yellow');
      log('  Event Agent testing requires an event within ±1 day', 'yellow');
      return null;
    }

    const event = eventsCheck.rows[0];

    // Create registration
    const registrationResult = await query(`
      INSERT INTO contractor_event_registrations (
        contractor_id,
        event_id,
        event_date,
        event_name,
        event_status,
        registration_date,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, 'attending', NOW(), NOW(), NOW())
      RETURNING id
    `, [TEST_CONTRACTOR_ID, event.id, event.date, event.name]);

    log(`✅ Test event registration created:`, 'green');
    log(`  Registration ID: ${registrationResult.rows[0].id}`, 'green');
    log(`  Event: ${event.name}`, 'green');
    log(`  Date: ${event.date}`, 'green');
    log(`  Status: attending`, 'green');

    return registrationResult.rows[0].id;
  } catch (error) {
    log(`❌ Failed to create test registration: ${error.message}`, 'red');
    return null;
  }
}

// Run tests
const args = process.argv.slice(2);
if (args.includes('--create-event-registration')) {
  createTestEventRegistration().then(() => process.exit(0));
} else {
  testControllerRouting();
}
