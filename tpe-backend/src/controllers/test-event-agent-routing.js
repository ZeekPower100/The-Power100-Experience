// ================================================================
// Test: Event Agent Routing Verification
// ================================================================
// Tests that controller routes to Event Agent when contractor
// is registered for an active event
// ================================================================

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/ai-concierge';

// Color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEventAgentRouting() {
  console.log('='.repeat(80));
  log('Testing Event Agent Routing', 'cyan');
  console.log('='.repeat(80));

  try {
    // Step 1: Verify event registration exists
    log('\n📍 Step 1: Verify Event Registration', 'blue');

    const { query } = require('../config/database');

    const registrationCheck = await query(`
      SELECT
        cer.id,
        cer.contractor_id,
        cer.event_id,
        cer.event_status,
        e.name as event_name,
        e.date as event_date
      FROM contractor_event_registrations cer
      JOIN events e ON e.id = cer.event_id
      WHERE cer.contractor_id = 1
        AND cer.event_status IN ('registered', 'checked_in', 'attending')
        AND e.date >= CURRENT_DATE - INTERVAL '1 day'
        AND e.date <= CURRENT_DATE + INTERVAL '1 day'
      ORDER BY e.date DESC
      LIMIT 1
    `);

    if (registrationCheck.rows.length === 0) {
      log('❌ No active event registration found for contractor 1', 'red');
      log('   Run: node test-aiConciergeController.js --create-event-registration', 'yellow');
      process.exit(1);
    }

    const reg = registrationCheck.rows[0];
    log(`✅ Active event registration found:`, 'green');
    log(`   Registration ID: ${reg.id}`, 'green');
    log(`   Event: ${reg.event_name}`, 'green');
    log(`   Date: ${reg.event_date}`, 'green');
    log(`   Status: ${reg.event_status}`, 'green');
    log(`   Contractor ID: ${reg.contractor_id}`, 'green');

    // Step 2: Send message and monitor routing
    log('\n📍 Step 2: Send Message - Expecting Event Agent', 'blue');
    log('   Watch backend logs for routing message...', 'yellow');

    const response = await axios.post(`${BASE_URL}/message`, {
      message: "Hi! I'm at the event. What sessions are happening right now? Can you also recommend sponsors I should visit?"
    });

    log(`\n✅ Response received:`, 'green');
    log(`   Session ID: ${response.data.session_id}`, 'green');
    log(`   User Message ID: ${response.data.userMessage.id}`, 'green');
    log(`   AI Response ID: ${response.data.aiResponse.id}`, 'green');

    log(`\n💬 AI Response:`, 'cyan');
    log(`   ${response.data.aiResponse.content.substring(0, 400)}...`, 'cyan');

    // Step 3: Check session_type in database
    log('\n📍 Step 3: Verify Session Type in Database', 'blue');

    const sessionCheck = await query(`
      SELECT
        id,
        session_id,
        session_type,
        session_status,
        started_at
      FROM ai_concierge_sessions
      WHERE session_id = $1
    `, [response.data.session_id]);

    if (sessionCheck.rows.length > 0) {
      const session = sessionCheck.rows[0];
      log(`✅ Session found in database:`, 'green');
      log(`   ID: ${session.id}`, 'green');
      log(`   Session ID: ${session.session_id}`, 'green');

      if (session.session_type === 'event') {
        log(`   Session Type: ${session.session_type} ✅ CORRECT!`, 'green');
      } else {
        log(`   Session Type: ${session.session_type} ⚠️ Expected 'event'`, 'yellow');
      }

      log(`   Session Status: ${session.session_status}`, 'green');
      log(`   Started At: ${session.started_at}`, 'green');
    }

    // Step 4: Analyze AI response for event-specific content
    log('\n📍 Step 4: Analyze AI Response Content', 'blue');

    const content = response.data.aiResponse.content.toLowerCase();
    const eventIndicators = {
      'event mode': content.includes('event') && (content.includes('mode') || content.includes('orchestr')),
      'session info': content.includes('session'),
      'sponsor info': content.includes('sponsor'),
      'booth info': content.includes('booth'),
      'schedule info': content.includes('schedule') || content.includes('happening'),
      'real-time': content.includes('now') || content.includes('current')
    };

    log(`   Event Mode Indicators:`, 'cyan');
    Object.entries(eventIndicators).forEach(([indicator, found]) => {
      const symbol = found ? '✅' : '❌';
      const color = found ? 'green' : 'yellow';
      log(`     ${symbol} ${indicator}: ${found}`, color);
    });

    const eventScore = Object.values(eventIndicators).filter(Boolean).length;
    log(`\n   Event Context Score: ${eventScore}/6`, eventScore >= 3 ? 'green' : 'yellow');

    // Summary
    console.log('\n' + '='.repeat(80));
    if (session && session.session_type === 'event' && eventScore >= 3) {
      log('✅ EVENT AGENT ROUTING VERIFIED!', 'green');
      log('   - Event registration: ✅', 'green');
      log('   - Session type: event ✅', 'green');
      log('   - Event-specific content: ✅', 'green');
    } else {
      log('⚠️ EVENT AGENT ROUTING NEEDS REVIEW', 'yellow');
      log(`   - Event registration: ${registrationCheck.rows.length > 0 ? '✅' : '❌'}`, registrationCheck.rows.length > 0 ? 'green' : 'red');
      log(`   - Session type: ${session?.session_type === 'event' ? '✅' : '⚠️'} (${session?.session_type || 'unknown'})`, session?.session_type === 'event' ? 'green' : 'yellow');
      log(`   - Event-specific content: ${eventScore >= 3 ? '✅' : '⚠️'} (${eventScore}/6)`, eventScore >= 3 ? 'green' : 'yellow');
    }
    console.log('='.repeat(80));

  } catch (error) {
    log(`\n❌ Test failed:`, 'red');
    if (error.response) {
      log(`   Status: ${error.response.status}`, 'red');
      log(`   Error: ${error.response.data.error || error.response.data.message}`, 'red');
    } else {
      log(`   ${error.message}`, 'red');
    }
    console.error(error.stack);
  }

  process.exit(0);
}

// Run test
testEventAgentRouting();
