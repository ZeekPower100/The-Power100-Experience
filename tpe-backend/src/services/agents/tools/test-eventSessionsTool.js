// ================================================================
// Test: Event Sessions Tool
// ================================================================
// Tests eventSessionsTool with real database queries (materialized views)
// ================================================================

const eventSessionsTool = require('./eventSessionsTool');

async function testEventSessions() {
  console.log('='.repeat(80));
  console.log('Testing Event Sessions Tool');
  console.log('='.repeat(80));

  try {
    // Test Case 1: Get sessions happening NOW
    console.log('\n📍 Test Case 1: Get sessions happening NOW');
    console.log('Input: contractorId=1, eventId=1, timeWindow=now');

    const result1 = await eventSessionsTool.invoke({
      contractorId: 1,
      eventId: 1,
      timeWindow: 'now'
    });

    console.log('\n✅ Result:');
    const parsed1 = JSON.parse(result1);
    console.log(JSON.stringify(parsed1, null, 2));

    if (parsed1.success && parsed1.sessions && parsed1.sessions.length > 0) {
      console.log(`\n✅ Found ${parsed1.sessions.length} active sessions`);
      const topSession = parsed1.sessions[0];
      console.log(`Top session: "${topSession.sessionTitle}" by ${topSession.speakerName}`);
      console.log(`Relevance score: ${topSession.relevanceScore}`);
      console.log(`Location: ${topSession.location}`);
      console.log(`Why relevant: ${topSession.whyRelevant}`);
    } else {
      console.log('ℹ️ No sessions happening right now');
    }

    // Test Case 2: Get sessions in NEXT 60 minutes
    console.log('\n\n📍 Test Case 2: Get sessions in NEXT 60 minutes');
    console.log('Input: contractorId=1, eventId=1, timeWindow=next_60');

    const result2 = await eventSessionsTool.invoke({
      contractorId: 1,
      eventId: 1,
      timeWindow: 'next_60'
    });

    const parsed2 = JSON.parse(result2);
    console.log(`\n✅ Found ${parsed2.sessions ? parsed2.sessions.length : 0} upcoming sessions`);

    if (parsed2.sessions && parsed2.sessions.length > 0) {
      parsed2.sessions.forEach((session, idx) => {
        console.log(`${idx + 1}. "${session.sessionTitle}" - ${session.startTime}`);
        console.log(`   Relevance: ${session.relevanceScore} | Focus area matches: ${session.focusAreaMatches}`);
      });
    }

    // Test Case 3: Test with non-existent event
    console.log('\n\n📍 Test Case 3: Non-existent event');
    console.log('Input: contractorId=1, eventId=99999, timeWindow=now');

    const result3 = await eventSessionsTool.invoke({
      contractorId: 1,
      eventId: 99999,
      timeWindow: 'now'
    });

    const parsed3 = JSON.parse(result3);
    console.log(`\n✅ Result: ${parsed3.message}`);

    // Test Case 4: Default timeWindow (should be 'now')
    console.log('\n\n📍 Test Case 4: Default timeWindow');
    console.log('Input: contractorId=1, eventId=1 (no timeWindow specified)');

    const result4 = await eventSessionsTool.invoke({
      contractorId: 1,
      eventId: 1
    });

    const parsed4 = JSON.parse(result4);
    console.log(`\n✅ Using default timeWindow: ${parsed4.timeWindow}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ All Event Sessions Tool tests completed successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }

  process.exit(0);
}

// Run tests
testEventSessions();
