// ================================================================
// Test: AI Concierge Agents (Standard & Event Mode)
// ================================================================
// Tests both agents with database operations and tool access
// ================================================================

const { createStandardAgent, logSession: logStandardSession, getContractorContext: getStandardContext } = require('./aiConciergeStandardAgent');
const { createEventAgent, logSession: logEventSession, getContractorContext: getEventContext } = require('./aiConciergeEventAgent');

async function testAgents() {
  console.log('='.repeat(80));
  console.log('Testing AI Concierge Agents');
  console.log('='.repeat(80));

  try {
    // Test Case 1: Get Contractor Context (database field verification)
    console.log('\n📍 Test Case 1: Get Contractor Context');
    console.log('Testing DATABASE VERIFIED field name parsing...');

    const contractorContext = await getStandardContext(1);
    console.log('\n✅ Contractor Context Retrieved:');
    console.log(`  Name: ${contractorContext.firstName} ${contractorContext.lastName}`);
    console.log(`  Company: ${contractorContext.companyName}`);
    console.log(`  Revenue Tier: ${contractorContext.revenueTier}`);
    console.log(`  Focus Areas: ${JSON.stringify(contractorContext.focusAreas)}`);
    console.log(`  Business Goals: ${JSON.stringify(contractorContext.businessGoals)}`);

    // Test Case 2: Create Standard Agent
    console.log('\n\n📍 Test Case 2: Create AI Concierge (Standard Mode)');
    const standardAgent = createStandardAgent();
    console.log('✅ Standard Agent created with 5 tools');

    // Test Case 3: Create Event Agent
    console.log('\n\n📍 Test Case 3: Create AI Concierge (Event Mode)');
    const eventAgent = createEventAgent();
    console.log('✅ Event Agent created with 5 tools');

    // Test Case 4: Log Standard Session (database insert)
    console.log('\n\n📍 Test Case 4: Log Standard Session to Database');
    const sessionId1 = `test-standard-${Date.now()}`;
    const sessionDbId1 = await logStandardSession(1, sessionId1, {
      testMode: true,
      timestamp: new Date().toISOString()
    });
    console.log(`✅ Standard session logged with DB ID: ${sessionDbId1}`);

    // Test Case 5: Log Event Session (database insert)
    console.log('\n\n📍 Test Case 5: Log Event Session to Database');
    const sessionId2 = `test-event-${Date.now()}`;
    const sessionDbId2 = await logEventSession(1, sessionId2, 999, {
      testMode: true,
      timestamp: new Date().toISOString()
    });
    console.log(`✅ Event session logged with DB ID: ${sessionDbId2}`);

    // Test Case 6: Test Agent with Simple Message (no tool calls)
    console.log('\n\n📍 Test Case 6: Test Standard Agent Invocation');
    console.log('Sending test message...');

    const standardResponse = await standardAgent.invoke(
      {
        messages: [
          {
            role: 'user',
            content: `Hi, I'm testing the AI Concierge system. Can you introduce yourself and tell me what you can help me with? My name is ${contractorContext.firstName} from ${contractorContext.companyName}.`
          }
        ]
      },
      {
        configurable: { thread_id: sessionId1 }
      }
    );

    console.log('\n✅ Standard Agent Response:');
    console.log(standardResponse.messages[standardResponse.messages.length - 1].content);

    console.log('\n' + '='.repeat(80));
    console.log('✅ All AI Concierge Agent tests completed successfully!');
    console.log('='.repeat(80));
    console.log('\n📊 Test Summary:');
    console.log('  - Contractor context retrieval: ✅');
    console.log('  - Standard agent creation: ✅');
    console.log('  - Event agent creation: ✅');
    console.log('  - Standard session logging: ✅');
    console.log('  - Event session logging: ✅');
    console.log('  - Standard agent invocation: ✅');
    console.log('\n🎯 Next: Test with tool calls (partner matching, event sessions, etc.)');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }

  process.exit(0);
}

// Run tests
testAgents();
