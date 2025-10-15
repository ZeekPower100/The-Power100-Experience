// DATABASE-CHECKED: ai_concierge_sessions, contractor_event_registrations, events verified October 15, 2025
// Test script for Day 3: State Transitions and Edge Cases
// Tests mid-conversation state switching and edge scenarios

const stateMachineManager = require('./src/services/conciergeStateMachineManager');
const { query } = require('./src/config/database');

async function testStateTransitions() {
  console.log('\n🧪 Testing State Transitions & Edge Cases (Day 3)\n');
  console.log('='.repeat(70));

  const testContractorId = 1;
  const testSessionId = 'transition-test-' + Date.now();

  try {
    // Setup: Create session in database
    console.log('\n📋 Setup: Creating test session');
    await query(`
      INSERT INTO ai_concierge_sessions (
        session_id, contractor_id, session_type, session_status, started_at
      ) VALUES ($1, $2, $3, $4, $5)
    `, [testSessionId, testContractorId, 'standard', 'active', new Date()]);
    console.log('   ✅ Test session created');

    // ========================================
    // SCENARIO 1: Standard Agent → Event Agent
    // Contractor starts conversation, then event becomes active
    // ========================================
    console.log('\n' + '='.repeat(70));
    console.log('📝 SCENARIO 1: Mid-Conversation Event Activation');
    console.log('='.repeat(70));

    // Step 1: Start in Standard Agent mode (no event)
    console.log('\n1️⃣  Starting conversation in Standard Agent mode');
    await stateMachineManager.updateEventContext(testContractorId, testSessionId, null);
    await stateMachineManager.sendEvent(testContractorId, testSessionId, 'MESSAGE_RECEIVED', {});

    let currentAgent = await stateMachineManager.getCurrentAgent(testContractorId, testSessionId);
    console.log('   Current agent:', currentAgent);
    console.log('   Expected: standard');
    console.log('   Result:', currentAgent === 'standard' ? '✅ PASS' : '❌ FAIL');

    // Step 2: Contractor sends another message (still standard)
    console.log('\n2️⃣  Sending second message (still no event)');
    await stateMachineManager.sendEvent(testContractorId, testSessionId, 'MESSAGE_RECEIVED', {});
    currentAgent = await stateMachineManager.getCurrentAgent(testContractorId, testSessionId);
    console.log('   Current agent:', currentAgent);
    console.log('   Expected: standard');
    console.log('   Result:', currentAgent === 'standard' ? '✅ PASS' : '❌ FAIL');

    // Step 3: EVENT BECOMES ACTIVE mid-conversation
    console.log('\n3️⃣  🎉 EVENT REGISTERED! (Contractor just registered for event)');
    const today = new Date().toISOString().split('T')[0];
    const activeEventContext = {
      eventId: 1,
      eventName: 'Power100 Live Event',
      eventDate: today,
      eventStatus: 'registered'
    };

    // Trigger EVENT_REGISTERED to notify state machine
    await stateMachineManager.updateEventContext(testContractorId, testSessionId, activeEventContext);
    await stateMachineManager.sendEvent(testContractorId, testSessionId, 'EVENT_REGISTERED', { eventContext: activeEventContext });

    currentAgent = await stateMachineManager.getCurrentAgent(testContractorId, testSessionId);
    console.log('   Current agent after EVENT_REGISTERED:', currentAgent);
    console.log('   Expected: event (immediately transitions)');
    console.log('   Result:', currentAgent === 'event' ? '✅ PASS' : '❌ FAIL');

    // Step 4: Verify agent stays in event mode
    console.log('\n4️⃣  Sending next message (should stay in Event Agent)');
    await stateMachineManager.sendEvent(testContractorId, testSessionId, 'MESSAGE_RECEIVED', { eventContext: activeEventContext });
    currentAgent = await stateMachineManager.getCurrentAgent(testContractorId, testSessionId);
    console.log('   Current agent:', currentAgent);
    console.log('   Expected: event');
    console.log('   Result:', currentAgent === 'event' ? '✅ PASS' : '❌ FAIL');

    // ========================================
    // SCENARIO 2: Event Agent → Standard Agent
    // Event ends mid-conversation
    // ========================================
    console.log('\n' + '='.repeat(70));
    console.log('📝 SCENARIO 2: Mid-Conversation Event Deactivation');
    console.log('='.repeat(70));

    // Step 1: Currently in Event Agent mode
    console.log('\n1️⃣  Currently in Event Agent mode');
    currentAgent = await stateMachineManager.getCurrentAgent(testContractorId, testSessionId);
    console.log('   Current agent:', currentAgent);
    console.log('   Expected: event');
    console.log('   Result:', currentAgent === 'event' ? '✅ PASS' : '❌ FAIL');

    // Step 2: Event ends
    console.log('\n2️⃣  📢 EVENT ENDED! (Event just concluded)');
    await stateMachineManager.updateEventContext(testContractorId, testSessionId, null);
    await stateMachineManager.sendEvent(testContractorId, testSessionId, 'EVENT_ENDED', {});

    currentAgent = await stateMachineManager.getCurrentAgent(testContractorId, testSessionId);
    console.log('   Current agent after EVENT_ENDED:', currentAgent);
    console.log('   Expected: standard (immediately transitions)');
    console.log('   Result:', currentAgent === 'standard' ? '✅ PASS' : '❌ FAIL');

    // Step 3: Verify agent stays in standard mode
    console.log('\n3️⃣  Sending next message (should stay in Standard Agent)');
    await stateMachineManager.sendEvent(testContractorId, testSessionId, 'MESSAGE_RECEIVED', {});
    currentAgent = await stateMachineManager.getCurrentAgent(testContractorId, testSessionId);
    console.log('   Current agent:', currentAgent);
    console.log('   Expected: standard');
    console.log('   Result:', currentAgent === 'standard' ? '✅ PASS' : '❌ FAIL');

    // ========================================
    // SCENARIO 3: Event Status Changes
    // Contractor checks in at event
    // ========================================
    console.log('\n' + '='.repeat(70));
    console.log('📝 SCENARIO 3: Event Status Changes');
    console.log('='.repeat(70));

    // Step 1: Register for tomorrow's event
    console.log('\n1️⃣  Contractor registers for TOMORROW\'s event');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const futureEventContext = {
      eventId: 2,
      eventName: 'Future Event',
      eventDate: tomorrowStr,
      eventStatus: 'registered'
    };

    await stateMachineManager.updateEventContext(testContractorId, testSessionId, futureEventContext);
    await stateMachineManager.sendEvent(testContractorId, testSessionId, 'MESSAGE_RECEIVED', { eventContext: futureEventContext });

    currentAgent = await stateMachineManager.getCurrentAgent(testContractorId, testSessionId);
    console.log('   Current agent (event tomorrow):', currentAgent);
    console.log('   Expected: standard (event not today)');
    console.log('   Result:', currentAgent === 'standard' ? '✅ PASS' : '❌ FAIL');

    // Step 2: Event date changes to TODAY (event started)
    console.log('\n2️⃣  Event date becomes TODAY (event started)');
    const todayEventContext = {
      eventId: 2,
      eventName: 'Future Event',
      eventDate: today,
      eventStatus: 'checked_in'
    };

    await stateMachineManager.updateEventContext(testContractorId, testSessionId, todayEventContext);
    await stateMachineManager.sendEvent(testContractorId, testSessionId, 'MESSAGE_RECEIVED', { eventContext: todayEventContext });

    currentAgent = await stateMachineManager.getCurrentAgent(testContractorId, testSessionId);
    console.log('   Current agent (checked in today):', currentAgent);
    console.log('   Expected: event');
    console.log('   Result:', currentAgent === 'event' ? '✅ PASS' : '❌ FAIL');

    // ========================================
    // SCENARIO 4: State Persistence Across Multiple Messages
    // ========================================
    console.log('\n' + '='.repeat(70));
    console.log('📝 SCENARIO 4: State Persistence');
    console.log('='.repeat(70));

    console.log('\n1️⃣  Sending 5 messages in a row (Event Agent should persist)');
    for (let i = 1; i <= 5; i++) {
      await stateMachineManager.sendEvent(testContractorId, testSessionId, 'MESSAGE_RECEIVED', { eventContext: todayEventContext });
      currentAgent = await stateMachineManager.getCurrentAgent(testContractorId, testSessionId);
      console.log(`   Message ${i}: Agent = ${currentAgent} ${currentAgent === 'event' ? '✅' : '❌'}`);
    }

    // Verify state persisted in database
    console.log('\n2️⃣  Verifying state persistence in database');
    const dbResult = await query(`
      SELECT session_type, session_data
      FROM ai_concierge_sessions
      WHERE session_id = $1
    `, [testSessionId]);

    if (dbResult.rows.length > 0) {
      const { session_type, session_data } = dbResult.rows[0];
      console.log('   Session type in DB:', session_type);
      console.log('   Session data exists:', !!session_data);
      console.log('   Result:', session_type === 'event' ? '✅ PASS' : '❌ FAIL');
    }

    // ========================================
    // SCENARIO 5: Machine Restoration
    // ========================================
    console.log('\n' + '='.repeat(70));
    console.log('📝 SCENARIO 5: Machine Restoration (Simulating Server Restart)');
    console.log('='.repeat(70));

    // Step 1: Destroy machine (simulate server restart)
    console.log('\n1️⃣  Destroying machine instance (simulating restart)');
    await stateMachineManager.destroyMachine(testContractorId, testSessionId);
    console.log('   ✅ Machine destroyed');

    // Step 2: Create new machine (should restore state)
    console.log('\n2️⃣  Creating new machine (should restore from database)');
    await stateMachineManager.getOrCreateMachine(testContractorId, testSessionId);
    console.log('   ✅ Machine restored');

    // Step 3: Check current state
    console.log('\n3️⃣  Checking restored state');
    const currentState = await stateMachineManager.getCurrentState(testContractorId, testSessionId);
    console.log('   Current state:', currentState);
    console.log('   Expected: event_agent');
    console.log('   Result:', currentState === 'event_agent' ? '✅ PASS' : '❌ FAIL');

    // ========================================
    // Cleanup
    // ========================================
    console.log('\n' + '='.repeat(70));
    console.log('🧹 Cleanup');
    console.log('='.repeat(70));

    await stateMachineManager.destroyMachine(testContractorId, testSessionId);
    await query(`DELETE FROM ai_concierge_sessions WHERE session_id = $1`, [testSessionId]);
    console.log('   ✅ Test session cleaned up');

    console.log('\n' + '='.repeat(70));
    console.log('\n🎉 Day 3 State Transition Tests Complete!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);

    // Cleanup on error
    try {
      await stateMachineManager.destroyMachine(testContractorId, testSessionId);
      await query(`DELETE FROM ai_concierge_sessions WHERE session_id = $1`, [testSessionId]);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }

  process.exit(0);
}

// Run tests
testStateTransitions();
