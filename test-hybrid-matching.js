// Test script for hybrid session matching
// Run: node test-hybrid-matching.js

const { getEventSessions, getSessionById } = require('./tpe-backend/src/services/eventOrchestrator/sessionDataService');

async function testHybridMatching() {
  console.log('🧪 Testing Hybrid Session Matching System\n');

  // Test 1: Get session WITHOUT speaker (id: 125)
  console.log('='.repeat(80));
  console.log('TEST 1: Session WITHOUT speaker_id (Session-only matching)');
  console.log('='.repeat(80));
  try {
    const sessionWithoutSpeaker = await getSessionById(125);
    console.log('\n✅ SUCCESS: Retrieved session without speaker');
    console.log('Session Data:', JSON.stringify({
      agenda_item_id: sessionWithoutSpeaker.agenda_item_id,
      title: sessionWithoutSpeaker.title,
      speaker_id: sessionWithoutSpeaker.speaker_id,
      has_speaker_data: sessionWithoutSpeaker.has_speaker_data,
      speaker: sessionWithoutSpeaker.speaker
    }, null, 2));

    if (sessionWithoutSpeaker.speaker_id === null && !sessionWithoutSpeaker.has_speaker_data) {
      console.log('✅ PASS: Correctly handles NULL speaker_id');
    } else {
      console.log('❌ FAIL: Expected speaker_id to be NULL');
    }
  } catch (error) {
    console.error('❌ FAIL: Error retrieving session without speaker:', error.message);
  }

  // Test 2: Get session WITH speaker (id: 141)
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: Session WITH speaker_id (Hybrid matching)');
  console.log('='.repeat(80));
  try {
    const sessionWithSpeaker = await getSessionById(141);
    console.log('\n✅ SUCCESS: Retrieved session with speaker');
    console.log('Session Data:', JSON.stringify({
      agenda_item_id: sessionWithSpeaker.agenda_item_id,
      title: sessionWithSpeaker.title,
      synopsis: sessionWithSpeaker.synopsis ? sessionWithSpeaker.synopsis.substring(0, 50) + '...' : null,
      speaker_id: sessionWithSpeaker.speaker_id,
      has_speaker_data: sessionWithSpeaker.has_speaker_data,
      speaker_name: sessionWithSpeaker.speaker?.name,
      focus_areas_count: sessionWithSpeaker.focus_areas.length
    }, null, 2));

    if (sessionWithSpeaker.speaker_id && sessionWithSpeaker.has_speaker_data && sessionWithSpeaker.speaker) {
      console.log('✅ PASS: Correctly includes speaker data when available');
    } else {
      console.log('❌ FAIL: Expected speaker data to be present');
    }
  } catch (error) {
    console.error('❌ FAIL: Error retrieving session with speaker:', error.message);
  }

  // Test 3: Get all sessions for event 54 (should have multiple sessions)
  console.log('\n' + '='.repeat(80));
  console.log('TEST 3: Get all sessions for event (LEFT JOIN test)');
  console.log('='.repeat(80));
  try {
    const allSessions = await getEventSessions(54);
    console.log(`\n✅ SUCCESS: Retrieved ${allSessions.length} sessions for event 54`);

    const sessionsWithSpeaker = allSessions.filter(s => s.speaker_id !== null);
    const sessionsWithoutSpeaker = allSessions.filter(s => s.speaker_id === null);

    console.log(`\nSession breakdown:`);
    console.log(`  - With speaker: ${sessionsWithSpeaker.length}`);
    console.log(`  - Without speaker: ${sessionsWithoutSpeaker.length}`);
    console.log(`  - Total: ${allSessions.length}`);

    // Show data richness scores
    console.log(`\nData richness scores:`);
    allSessions.slice(0, 3).forEach(s => {
      console.log(`  - "${s.title}": ${(s.data_richness_score * 100).toFixed(0)}% (speaker: ${s.has_speaker_data ? 'YES' : 'NO'})`);
    });

    if (allSessions.length > 0) {
      console.log('✅ PASS: LEFT JOIN successfully retrieved sessions');
    } else {
      console.log('❌ FAIL: No sessions retrieved');
    }
  } catch (error) {
    console.error('❌ FAIL: Error retrieving all sessions:', error.message);
    console.error(error.stack);
  }

  // Test 4: Verify JSONB parsing
  console.log('\n' + '='.repeat(80));
  console.log('TEST 4: JSONB field parsing');
  console.log('='.repeat(80));
  try {
    const session = await getSessionById(141);
    console.log('\n✅ SUCCESS: JSONB fields parsed');
    console.log('Field types:');
    console.log(`  - focus_areas: ${Array.isArray(session.focus_areas) ? 'Array ✅' : 'NOT ARRAY ❌'}`);
    console.log(`  - key_takeaways: ${Array.isArray(session.key_takeaways) ? 'Array ✅' : 'NOT ARRAY ❌'}`);
    console.log(`  - keywords: ${Array.isArray(session.keywords) ? 'Array ✅' : 'NOT ARRAY ❌'}`);

    if (Array.isArray(session.focus_areas) && Array.isArray(session.key_takeaways) && Array.isArray(session.keywords)) {
      console.log('✅ PASS: All JSONB fields correctly parsed as arrays');
    } else {
      console.log('❌ FAIL: JSONB fields not parsed correctly');
    }
  } catch (error) {
    console.error('❌ FAIL: Error testing JSONB parsing:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('🎉 HYBRID SESSION MATCHING TESTS COMPLETE');
  console.log('='.repeat(80));

  process.exit(0);
}

// Run tests
testHybridMatching().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
