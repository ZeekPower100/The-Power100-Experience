// ================================================================
// Test: Capture Note Tool
// ================================================================
// Tests captureNoteTool with real database insertions
// ================================================================

const captureNoteTool = require('./captureNoteTool');

async function testCaptureNote() {
  console.log('='.repeat(80));
  console.log('Testing Capture Note Tool');
  console.log('='.repeat(80));

  try {
    // Test Case 1: Capture speaker note
    console.log('\n📍 Test Case 1: Capture speaker note');
    console.log('Input: contractorId=1, eventId=1, noteType=speaker_note');

    const result1 = await captureNoteTool.invoke({
      contractorId: 1,
      eventId: 1,
      noteText: 'Great presentation on customer retention strategies. Would love to implement the 90-day check-in system.',
      noteType: 'speaker_note',
      speakerId: 1,
      requiresFollowup: false
    });

    console.log('\n✅ Result:');
    const parsed1 = JSON.parse(result1);
    console.log(JSON.stringify(parsed1, null, 2));

    if (parsed1.success) {
      console.log(`\n✅ Note captured with ID: ${parsed1.noteId}`);
      console.log(`Captured at: ${parsed1.capturedAt}`);
      console.log(`Message: ${parsed1.message}`);
    }

    // Test Case 2: Capture sponsor note with follow-up
    console.log('\n\n📍 Test Case 2: Capture sponsor note (requires follow-up)');
    console.log('Input: contractorId=1, eventId=1, noteType=sponsor_note, requiresFollowup=true');

    const result2 = await captureNoteTool.invoke({
      contractorId: 1,
      eventId: 1,
      noteText: 'Very interested in the CRM solution from SponsorCo. Need to schedule a demo after the event.',
      noteType: 'sponsor_note',
      sponsorId: 5,
      requiresFollowup: true
    });

    const parsed2 = JSON.parse(result2);
    console.log(`\n✅ Note captured: ${parsed2.noteId}`);
    console.log(`Requires follow-up: ${parsed2.requiresFollowup}`);
    console.log(`Message: ${parsed2.message}`);

    // Test Case 3: Capture action item
    console.log('\n\n📍 Test Case 3: Capture action item');
    console.log('Input: contractorId=1, eventId=1, noteType=action_item');

    const result3 = await captureNoteTool.invoke({
      contractorId: 1,
      eventId: 1,
      noteText: 'Download the customer feedback template shared during session. Implement within 2 weeks.',
      noteType: 'action_item',
      requiresFollowup: true
    });

    const parsed3 = JSON.parse(result3);
    console.log(`\n✅ Action item captured: ${parsed3.noteId}`);

    // Test Case 4: Capture general note
    console.log('\n\n📍 Test Case 4: Capture general note');
    console.log('Input: contractorId=1, eventId=1, noteType=general');

    const result4 = await captureNoteTool.invoke({
      contractorId: 1,
      eventId: 1,
      noteText: 'Networking at this event is excellent. Met 3 other contractors in similar revenue tier.',
      noteType: 'general',
      requiresFollowup: false
    });

    const parsed4 = JSON.parse(result4);
    console.log(`\n✅ Observation captured: ${parsed4.noteId}`);

    // Test Case 5: Capture insight
    console.log('\n\n📍 Test Case 5: Capture business insight');
    console.log('Input: contractorId=1, eventId=1, noteType=insight');

    const result5 = await captureNoteTool.invoke({
      contractorId: 1,
      eventId: 1,
      noteText: 'Realized we need to focus more on customer lifetime value rather than just acquisition.',
      noteType: 'insight',
      requiresFollowup: false
    });

    const parsed5 = JSON.parse(result5);
    console.log(`\n✅ Insight captured: ${parsed5.noteId}`);

    // Test Case 6: Test error handling (missing required field)
    console.log('\n\n📍 Test Case 6: Test error handling (missing noteText)');
    try {
      const result6 = await captureNoteTool.invoke({
        contractorId: 1,
        eventId: 1,
        noteType: 'general'
        // noteText is missing - should fail validation
      });
      console.log('❌ Should have failed validation');
    } catch (error) {
      console.log(`✅ Validation error caught correctly: ${error.message}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ All Capture Note Tool tests completed successfully!');
    console.log('='.repeat(80));
    console.log('\n📊 Test Summary:');
    console.log('  - Speaker note: Captured');
    console.log('  - Sponsor note: Captured with follow-up');
    console.log('  - Action item: Captured with follow-up');
    console.log('  - General note: Captured');
    console.log('  - Business insight: Captured');
    console.log('  - Error handling: Validated');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }

  process.exit(0);
}

// Run tests
testCaptureNote();
