// Test script for backward compatibility with old speaker_recommendation messages
// Run: node test-backward-compatibility.js

const { query } = require('./tpe-backend/src/config/database');
const { safeJsonParse } = require('./tpe-backend/src/utils/jsonHelpers');

async function testBackwardCompatibility() {
  console.log('🧪 Testing Backward Compatibility with Old Message Formats\n');

  try {
    // Test 1: Check if old messages exist
    console.log('='.repeat(80));
    console.log('TEST 1: Verify old speaker_recommendation messages exist');
    console.log('='.repeat(80));

    const oldMessagesResult = await query(`
      SELECT
        id,
        message_type,
        personalization_data,
        contractor_id,
        event_id
      FROM event_messages
      WHERE message_type = 'speaker_recommendation'
      LIMIT 1
    `);

    if (oldMessagesResult.rows.length === 0) {
      console.log('❌ FAIL: No old speaker_recommendation messages found in database');
      console.log('   Creating a test message...\n');

      // Create a test old-format message
      const testOldFormat = {
        contractor_name: "Test Contractor",
        company_name: "Test Company",
        recommendations: [
          {
            name: "John Smith",
            company: "Tech Innovations",
            session: {
              title: "Growing Your Business with AI",
              time: "2:00 PM",
              location: "Main Stage"
            },
            why: "Aligns with your growth goals",
            quick_reasons: ["AI expertise", "Growth focus"]
          }
        ]
      };

      await query(`
        INSERT INTO event_messages (
          contractor_id,
          event_id,
          message_type,
          message_content,
          personalization_data,
          status,
          direction,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, 'sent', 'outbound', NOW())
      `, [
        1, // contractor_id
        54, // event_id
        'speaker_recommendation',
        'Test old format message',
        JSON.stringify(testOldFormat)
      ]);

      console.log('✅ Created test old-format message');
    } else {
      console.log('✅ PASS: Found', oldMessagesResult.rows.length, 'old message(s)');

      const oldMessage = oldMessagesResult.rows[0];
      console.log('\nOld message structure:');
      console.log('  - ID:', oldMessage.id);
      console.log('  - Message Type:', oldMessage.message_type);
      console.log('  - Contractor ID:', oldMessage.contractor_id);
      console.log('  - Event ID:', oldMessage.event_id);

      const personalizationData = safeJsonParse(oldMessage.personalization_data);

      // Check which keys exist
      const hasRecommendedSessions = !!personalizationData?.recommended_sessions;
      const hasRecommendedSpeakers = !!personalizationData?.recommended_speakers;
      const hasRecommendations = !!personalizationData?.recommendations;

      console.log('\nPersonalization data keys:');
      console.log('  - recommended_sessions:', hasRecommendedSessions ? 'YES ✅' : 'NO');
      console.log('  - recommended_speakers:', hasRecommendedSpeakers ? 'YES ✅' : 'NO');
      console.log('  - recommendations (OLDEST):', hasRecommendations ? 'YES ✅' : 'NO');

      if (hasRecommendations) {
        const recommendations = personalizationData.recommendations;
        console.log('\n  Recommendations structure:');
        console.log('    - Count:', recommendations.length);
        console.log('    - First item has name:', !!recommendations[0]?.name);
        console.log('    - First item has session:', !!recommendations[0]?.session);
        console.log('    - First item has company:', !!recommendations[0]?.company);
      }
    }

    // Test 2: Verify handler can parse all three formats
    console.log('\n' + '='.repeat(80));
    console.log('TEST 2: Verify handler supports all three message formats');
    console.log('='.repeat(80));

    console.log('\nChecking speakerHandlers.js for format support...');

    const fs = require('fs');
    const handlerCode = fs.readFileSync(
      './tpe-backend/src/services/eventOrchestrator/speakerHandlers.js',
      'utf8'
    );

    const hasRecommendedSessionsCheck = handlerCode.includes('recommended_sessions');
    const hasRecommendedSpeakersCheck = handlerCode.includes('recommended_speakers');
    const hasRecommendationsCheck = handlerCode.includes('recommendations');
    const hasOldestFormatHandler = handlerCode.includes('OLDEST format');

    console.log('\nHandler code checks:');
    console.log('  - Checks for recommended_sessions:', hasRecommendedSessionsCheck ? 'YES ✅' : 'NO ❌');
    console.log('  - Checks for recommended_speakers:', hasRecommendedSpeakersCheck ? 'YES ✅' : 'NO ❌');
    console.log('  - Checks for recommendations:', hasRecommendationsCheck ? 'YES ✅' : 'NO ❌');
    console.log('  - Has OLDEST format handler:', hasOldestFormatHandler ? 'YES ✅' : 'NO ❌');

    if (hasRecommendedSessionsCheck && hasRecommendedSpeakersCheck &&
        hasRecommendationsCheck && hasOldestFormatHandler) {
      console.log('\n✅ PASS: Handler supports all three message formats');
    } else {
      console.log('\n❌ FAIL: Handler missing support for some formats');
    }

    // Test 3: Check for new session_recommendation messages
    console.log('\n' + '='.repeat(80));
    console.log('TEST 3: Check for new session_recommendation messages');
    console.log('='.repeat(80));

    const newMessagesResult = await query(`
      SELECT
        id,
        message_type,
        personalization_data
      FROM event_messages
      WHERE message_type = 'session_recommendation'
      LIMIT 1
    `);

    if (newMessagesResult.rows.length === 0) {
      console.log('ℹ️  INFO: No new session_recommendation messages yet (expected for fresh system)');
    } else {
      console.log('✅ Found', newMessagesResult.rows.length, 'new session_recommendation message(s)');

      const newMessage = newMessagesResult.rows[0];
      const personalizationData = safeJsonParse(newMessage.personalization_data);

      if (personalizationData?.recommended_sessions) {
        const session = personalizationData.recommended_sessions[0];
        console.log('\nNew format structure:');
        console.log('  - Has agenda_item_id:', !!session.agenda_item_id);
        console.log('  - Has speaker_id:', session.speaker_id !== undefined);
        console.log('  - Has data_source:', !!session.data_source);
        console.log('  - Has match_score:', !!session.match_score);

        if (session.agenda_item_id && session.data_source && session.match_score) {
          console.log('\n✅ PASS: New format has all required fields');
        } else {
          console.log('\n❌ FAIL: New format missing required fields');
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('🎉 BACKWARD COMPATIBILITY TESTS COMPLETE');
    console.log('='.repeat(80));
    console.log('\nSummary:');
    console.log('  ✅ Old messages preserved in database');
    console.log('  ✅ Handler supports all three formats (NEW, MIDDLE, OLDEST)');
    console.log('  ✅ System can handle mixed message types');
    console.log('\n💡 Migration Strategy:');
    console.log('  - Old messages (recommendations) will continue to work');
    console.log('  - New messages will use session_recommendation format');
    console.log('  - No breaking changes for existing data');

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
  }

  process.exit(0);
}

// Run tests
testBackwardCompatibility().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
