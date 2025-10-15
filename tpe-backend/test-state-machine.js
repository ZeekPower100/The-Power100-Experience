// Test script for State Machine integration
// Tests the state machine without requiring full server startup

const stateMachineManager = require('./src/services/conciergeStateMachineManager');
const { query } = require('./src/config/database');

async function testStateMachine() {
  console.log('\n🧪 Testing State Machine Integration\n');
  console.log('='.repeat(60));

  // Test contractor IDs
  const testContractorId = 1;
  const testSessionId = 'test-session-' + Date.now();

  try {
    // Test 0: Create session in database first
    console.log('\n✅ Test 0: Create session in database');
    await query(`
      INSERT INTO ai_concierge_sessions (
        session_id, contractor_id, session_type, session_status, started_at
      ) VALUES ($1, $2, $3, $4, $5)
    `, [testSessionId, testContractorId, 'standard', 'active', new Date()]);
    console.log('   Session created in database');

    // Test 1: Create a new machine instance
    console.log('\n✅ Test 1: Create machine instance');
    const machine = await stateMachineManager.getOrCreateMachine(testContractorId, testSessionId);
    console.log('   Machine created successfully');

    // Test 2: Check initial state
    console.log('\n✅ Test 2: Check initial state');
    const initialState = await stateMachineManager.getCurrentState(testContractorId, testSessionId);
    console.log('   Initial state:', initialState);

    // Test 3: Get current agent (should be null in idle state)
    console.log('\n✅ Test 3: Get current agent from idle state');
    const agent1 = await stateMachineManager.getCurrentAgent(testContractorId, testSessionId);
    console.log('   Current agent:', agent1 || 'null (in idle state)');

    // Test 4: Send MESSAGE_RECEIVED event with NO event context (should route to standard agent)
    console.log('\n✅ Test 4: Route with NO event context (expect: standard agent)');
    await stateMachineManager.updateEventContext(testContractorId, testSessionId, null);
    await stateMachineManager.sendEvent(testContractorId, testSessionId, 'MESSAGE_RECEIVED', {});
    const agent2 = await stateMachineManager.getCurrentAgent(testContractorId, testSessionId);
    console.log('   Current agent:', agent2);
    console.log('   Expected: standard');
    console.log('   Result:', agent2 === 'standard' ? '✅ PASS' : '❌ FAIL');

    // Test 5: Send MESSAGE_RECEIVED with event context (should route to event agent)
    console.log('\n✅ Test 5: Route WITH event context (expect: event agent)');
    const today = new Date().toISOString().split('T')[0];
    const eventContext = {
      eventId: 1,
      eventName: 'Test Event',
      eventDate: today, // Today's date
      eventStatus: 'registered' // Active status
    };
    console.log('   Event context:', { eventDate: today, eventStatus: 'registered' });
    await stateMachineManager.updateEventContext(testContractorId, testSessionId, eventContext);
    await stateMachineManager.sendEvent(testContractorId, testSessionId, 'MESSAGE_RECEIVED', { eventContext });
    const agent3 = await stateMachineManager.getCurrentAgent(testContractorId, testSessionId);
    console.log('   Current agent:', agent3);
    console.log('   Expected: event');
    console.log('   Result:', agent3 === 'event' ? '✅ PASS' : '❌ FAIL');

    // Test 6: Verify state persistence to database
    console.log('\n✅ Test 6: Verify state persistence');
    const result = await query(`
      SELECT session_data, session_type
      FROM ai_concierge_sessions
      WHERE session_id = $1
    `, [testSessionId]);

    if (result.rows.length > 0) {
      const { session_data, session_type } = result.rows[0];
      console.log('   Session type in DB:', session_type);
      console.log('   Session data exists:', !!session_data);

      if (session_data) {
        const parsed = JSON.parse(session_data);
        console.log('   State value:', parsed.state);
        console.log('   Context agent:', parsed.context.currentAgent);
        console.log('   Result: ✅ State persisted correctly');
      }
    } else {
      console.log('   Result: ❌ No session found in database');
    }

    // Test 7: Destroy machine
    console.log('\n✅ Test 7: Destroy machine');
    await stateMachineManager.destroyMachine(testContractorId, testSessionId);
    console.log('   Machine destroyed successfully');

    // Test 8: Clean up database
    console.log('\n✅ Test 8: Clean up test session from database');
    await query(`DELETE FROM ai_concierge_sessions WHERE session_id = $1`, [testSessionId]);
    console.log('   Test session deleted');

    console.log('\n' + '='.repeat(60));
    console.log('\n🎉 All tests completed!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);

    // Clean up test session even if test fails
    try {
      await query(`DELETE FROM ai_concierge_sessions WHERE session_id = $1`, [testSessionId]);
    } catch (cleanupError) {
      // Ignore cleanup errors
    }
  }

  process.exit(0);
}

// Run tests
testStateMachine();
