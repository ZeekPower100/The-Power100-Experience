/**
 * Test AI Function Calling for Event Orchestration
 * Tests GPT-4's ability to capture notes, create action items, and schedule follow-ups
 */

// Load environment variables from backend
require('dotenv').config({ path: './tpe-backend/.env' });

const openAIService = require('./tpe-backend/src/services/openAIService');
const { query } = require('./tpe-backend/src/config/database');

async function testAIFunctionCalling() {
  console.log('🧪 Testing AI Function Calling for Event Orchestration\n');
  console.log('━'.repeat(80));

  try {
    // Get test contractor
    const contractorResult = await query('SELECT * FROM contractors WHERE id = 1');
    const contractor = contractorResult.rows[0];

    if (!contractor) {
      console.error('❌ Test contractor not found!');
      return;
    }

    console.log('✅ Test Contractor:', contractor.first_name, contractor.last_name);
    console.log('━'.repeat(80));

    // Get event registration
    const eventResult = await query(`
      SELECT * FROM contractor_event_registrations
      WHERE contractor_id = 1 AND event_status = 'during_event'
    `);

    console.log('\n📅 Event Registration:', eventResult.rows[0]?.event_name || 'None');
    console.log('━'.repeat(80));

    // Build knowledge base with current event
    const knowledgeBase = {
      currentEvent: {
        name: eventResult.rows[0]?.event_name || 'Test Conference 2025',
        date: eventResult.rows[0]?.event_date || '2025-12-15',
        eventStatus: 'during_event'
      }
    };

    // TEST 1: Note Capture
    console.log('\n\n📝 TEST 1: Note Capture');
    console.log('━'.repeat(80));
    console.log('Contractor says: "Met John Smith from Acme Corp, he had great insights about AI automation. His email is john@acme.com"');

    const response1 = await openAIService.generateConciergeResponse(
      'Met John Smith from Acme Corp, he had great insights about AI automation. His email is john@acme.com',
      contractor,
      [],
      [],
      knowledgeBase
    );

    console.log('\n🤖 AI Response:', response1);

    // Verify note was captured
    const notesResult = await query(`
      SELECT * FROM event_notes
      WHERE contractor_id = 1
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (notesResult.rows.length > 0) {
      const note = notesResult.rows[0];
      console.log('\n✅ Note Captured in Database:');
      console.log('   ID:', note.id);
      console.log('   Text:', note.note_text.substring(0, 100));
      console.log('   Type:', note.note_type);
      console.log('   Entities:', note.extracted_entities);
    } else {
      console.log('\n❌ No note captured!');
    }

    // TEST 2: Action Item Creation
    console.log('\n\n📋 TEST 2: Action Item Creation');
    console.log('━'.repeat(80));
    console.log('Contractor says: "I need to follow up with John Smith next week about implementing AI tools"');

    const response2 = await openAIService.generateConciergeResponse(
      'I need to follow up with John Smith next week about implementing AI tools',
      contractor,
      [],
      [],
      knowledgeBase
    );

    console.log('\n🤖 AI Response:', response2);

    // Verify action item was created
    const actionItemsResult = await query(`
      SELECT * FROM contractor_action_items
      WHERE contractor_id = 1
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (actionItemsResult.rows.length > 0) {
      const item = actionItemsResult.rows[0];
      console.log('\n✅ Action Item Created in Database:');
      console.log('   ID:', item.id);
      console.log('   Title:', item.title);
      console.log('   Type:', item.action_type);
      console.log('   Priority:', item.priority);
      console.log('   AI Generated:', item.ai_generated);
    } else {
      console.log('\n❌ No action item created!');
    }

    // TEST 3: Follow-Up Scheduling
    console.log('\n\n⏰ TEST 3: Follow-Up Scheduling');
    console.log('━'.repeat(80));
    console.log('Contractor says: "Remind me in 3 days to check if I completed that follow-up"');

    const response3 = await openAIService.generateConciergeResponse(
      'Remind me in 3 days to check if I completed that follow-up',
      contractor,
      [],
      [],
      knowledgeBase
    );

    console.log('\n🤖 AI Response:', response3);

    // Verify follow-up was scheduled
    const followUpsResult = await query(`
      SELECT * FROM contractor_followup_schedules
      WHERE contractor_id = 1
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (followUpsResult.rows.length > 0) {
      const followUp = followUpsResult.rows[0];
      console.log('\n✅ Follow-Up Scheduled in Database:');
      console.log('   ID:', followUp.id);
      console.log('   Type:', followUp.followup_type);
      console.log('   Scheduled Time:', followUp.scheduled_time);
      console.log('   Message Template:', followUp.message_template?.substring(0, 100));
      console.log('   Status:', followUp.status);
    } else {
      console.log('\n❌ No follow-up scheduled!');
    }

    console.log('\n\n━'.repeat(80));
    console.log('✅ Testing Complete!');
    console.log('━'.repeat(80));

  } catch (error) {
    console.error('❌ Test Error:', error);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

// Run tests
testAIFunctionCalling();
