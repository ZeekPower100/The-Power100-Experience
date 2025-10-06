/**
 * Test script for conversation context service
 */

const { buildConversationContext } = require('./tpe-backend/src/services/conversationContext');

async function testConversationContext() {
  try {
    console.log('\n🧪 Testing Conversation Context Service\n');
    console.log('='.repeat(60));

    // Test with contractor ID 56 (Zeek Test) and event ID 1
    const contractorId = 56;
    const eventId = 1;

    console.log(`\n📋 Building context for Contractor ${contractorId}, Event ${eventId}...\n`);

    const context = await buildConversationContext(contractorId, eventId);

    console.log('✅ Context built successfully!\n');
    console.log('='.repeat(60));

    // Display contractor info
    console.log('\n👤 CONTRACTOR INFO:');
    console.log(JSON.stringify(context.contractor, null, 2));

    // Display event info
    console.log('\n📅 EVENT INFO:');
    if (context.event) {
      console.log(`Name: ${context.event.name}`);
      console.log(`Date: ${context.event.date}`);
      console.log(`Location: ${context.event.location}`);
      console.log(`Speakers: ${context.event.speakers.length}`);
      console.log(`Sponsors: ${context.event.sponsors.length}`);
    } else {
      console.log('No event context');
    }

    // Display conversation history
    console.log('\n💬 CONVERSATION HISTORY (last 5 messages):');
    context.conversationHistory.forEach((msg, i) => {
      console.log(`\n[${i + 1}] ${msg.direction.toUpperCase()} - ${msg.message_type}`);
      console.log(`    Time: ${msg.timestamp}`);
      console.log(`    Content: ${msg.message_content?.substring(0, 80)}${msg.message_content?.length > 80 ? '...' : ''}`);
      if (Object.keys(msg.personalization_data || {}).length > 0) {
        console.log(`    Personalization: ${JSON.stringify(msg.personalization_data).substring(0, 100)}...`);
      }
    });

    // Display last outbound message
    console.log('\n📤 LAST OUTBOUND MESSAGE:');
    if (context.lastOutboundMessage) {
      console.log(`Type: ${context.lastOutboundMessage.message_type}`);
      console.log(`Content: ${context.lastOutboundMessage.message_content?.substring(0, 150)}...`);
      console.log(`Timestamp: ${context.lastOutboundMessage.timestamp}`);
    } else {
      console.log('No outbound messages');
    }

    // Display expected response type
    console.log('\n🎯 EXPECTED RESPONSE TYPE:');
    if (context.expectedResponseType) {
      console.log(JSON.stringify(context.expectedResponseType, null, 2));
    } else {
      console.log('No expected response detected');
    }

    // Display context age
    console.log('\n⏰ CONTEXT AGE:');
    if (context.contextAge !== null) {
      const ageSeconds = Math.floor(context.contextAge / 1000);
      const ageMinutes = Math.floor(ageSeconds / 60);
      const ageHours = Math.floor(ageMinutes / 60);

      if (ageHours > 0) {
        console.log(`${ageHours} hours, ${ageMinutes % 60} minutes ago`);
      } else if (ageMinutes > 0) {
        console.log(`${ageMinutes} minutes, ${ageSeconds % 60} seconds ago`);
      } else {
        console.log(`${ageSeconds} seconds ago`);
      }

      // Warn if context is stale
      if (ageHours >= 24) {
        console.log('⚠️  WARNING: Context is older than 24 hours - may be stale!');
      }
    } else {
      console.log('No conversation history');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Test completed successfully!\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testConversationContext();
