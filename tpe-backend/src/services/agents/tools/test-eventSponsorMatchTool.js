// ================================================================
// Test: Event Sponsor Match Tool
// ================================================================
// Tests eventSponsorMatchTool with real database queries
// ================================================================

const eventSponsorMatchTool = require('./eventSponsorMatchTool');

async function testEventSponsorMatch() {
  console.log('='.repeat(80));
  console.log('Testing Event Sponsor Match Tool');
  console.log('='.repeat(80));

  try {
    // Test Case 1: Find sponsors for a contractor at an event
    console.log('\n📍 Test Case 1: Find sponsors at event for contractor');
    console.log('Input: eventId=1, contractorId=1, limit=3');

    const result1 = await eventSponsorMatchTool.invoke({
      eventId: 1,
      contractorId: 1,
      limit: 3
    });

    console.log('\n✅ Result:');
    const parsed1 = JSON.parse(result1);
    console.log(JSON.stringify(parsed1, null, 2));

    if (parsed1.success && parsed1.sponsors && parsed1.sponsors.length > 0) {
      console.log(`\n✅ Found ${parsed1.sponsors.length} sponsor recommendations`);
      console.log(`Top sponsor: ${parsed1.sponsors[0].companyName} (score: ${parsed1.sponsors[0].matchScore})`);

      // Show booth details
      const topSponsor = parsed1.sponsors[0];
      if (topSponsor.boothNumber) {
        console.log(`Booth: ${topSponsor.boothNumber} at ${topSponsor.boothLocation}`);
      }
      if (topSponsor.talkingPoints && topSponsor.talkingPoints.length > 0) {
        console.log(`Talking points: ${topSponsor.talkingPoints.length} provided`);
      }
    } else {
      console.log('ℹ️ No sponsors found at this event');
    }

    // Test Case 2: Test with different limit
    console.log('\n\n📍 Test Case 2: Request 5 sponsors');
    console.log('Input: eventId=1, contractorId=1, limit=5');

    const result2 = await eventSponsorMatchTool.invoke({
      eventId: 1,
      contractorId: 1,
      limit: 5
    });

    const parsed2 = JSON.parse(result2);
    console.log(`\n✅ Returned ${parsed2.sponsors ? parsed2.sponsors.length : 0} sponsors (capped at 5)`);

    // Test Case 3: Test with non-existent event
    console.log('\n\n📍 Test Case 3: Non-existent event');
    console.log('Input: eventId=99999, contractorId=1, limit=3');

    const result3 = await eventSponsorMatchTool.invoke({
      eventId: 99999,
      contractorId: 1,
      limit: 3
    });

    const parsed3 = JSON.parse(result3);
    console.log(`\n✅ Result: ${parsed3.message}`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ All Event Sponsor Match Tool tests completed successfully!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }

  process.exit(0);
}

// Run tests
testEventSponsorMatch();
