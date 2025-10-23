// Test Batch Peer Matching
// Tests the complete batch peer matching flow

const { runBatchPeerMatching } = require('./tpe-backend/src/services/eventOrchestrator/peerMatchingBatchScheduler');
const { query } = require('./tpe-backend/src/config/database');

async function testBatchPeerMatching() {
  console.log('🧪 Testing Batch Peer Matching System...\\n');

  try {
    const eventId = 41; // Business Growth Expo

    // First, let's see who's checked in
    console.log('📋 Checking current check-ins for event', eventId);
    const checkInsResult = await query(`
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.company_name,
        c.phone,
        c.focus_areas,
        c.service_area,
        ea.check_in_time,
        ea.sms_opt_in
      FROM contractors c
      INNER JOIN event_attendees ea ON c.id = ea.contractor_id
      WHERE ea.event_id = $1
      ORDER BY ea.check_in_time ASC
    `, [eventId]);

    console.log('\\n✅ Found', checkInsResult.rows.length, 'total attendees');

    const checkedIn = checkInsResult.rows.filter(r => r.check_in_time !== null);
    const smsOptIn = checkedIn.filter(r => r.sms_opt_in === true && r.phone);

    console.log('   -', checkedIn.length, 'have checked in');
    console.log('   -', smsOptIn.length, 'are eligible for peer matching (checked in + SMS opt-in + phone)');

    if (smsOptIn.length > 0) {
      console.log('\\n📝 Eligible contractors:');
      smsOptIn.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.first_name} ${c.last_name} (${c.company_name || 'No company'}) - ${c.service_area || 'No location'}`);
        console.log(`      Focus: ${c.focus_areas ? JSON.parse(c.focus_areas).join(', ') : 'None'}`);
      });
    }

    // Check if lunch exists in agenda
    console.log('\\n🍽️ Checking for lunch in agenda...');
    const lunchResult = await query(`
      SELECT id, start_time, end_time, location
      FROM event_agenda_items
      WHERE event_id = $1 AND item_type = 'lunch'
      ORDER BY start_time ASC
      LIMIT 1
    `, [eventId]);

    if (lunchResult.rows.length === 0) {
      console.log('❌ No lunch found in agenda - peer matching requires lunch time');
      console.log('\\nNeed to add lunch to agenda first. Run agenda generation or add manually.');
      process.exit(1);
    }

    const lunch = lunchResult.rows[0];
    console.log('✅ Lunch found:', new Date(lunch.start_time).toLocaleTimeString(), '-', new Date(lunch.end_time).toLocaleTimeString());
    console.log('   Location:', lunch.location || 'Not specified');

    // Check existing matches
    console.log('\\n🔍 Checking existing peer matches...');
    const existingMatchesResult = await query(`
      SELECT COUNT(*) as count
      FROM event_peer_matches
      WHERE event_id = $1
    `, [eventId]);

    console.log(`   Found ${existingMatchesResult.rows[0].count} existing matches`);

    if (smsOptIn.length < 2) {
      console.log('\\n⚠️ Need at least 2 eligible contractors for peer matching');
      console.log('   Current eligible:', smsOptIn.length);
      console.log('\\nTo test:');
      console.log('   1. Check in more contractors');
      console.log('   2. Ensure they have sms_opt_in = true');
      console.log('   3. Ensure they have phone numbers');
      process.exit(1);
    }

    console.log('\\n🚀 Running batch peer matching...');
    console.log('─────────────────────────────────────\\n');

    const result = await runBatchPeerMatching(eventId);

    console.log('\\n─────────────────────────────────────');
    console.log('📊 Batch Peer Matching Results:\\n');
    console.log('   Success:', result.success ? '✅' : '❌');
    console.log('   Matches Created:', result.matches_created);
    console.log('   Messages Scheduled:', result.messages_scheduled);
    console.log('   Introduction Time:', result.introduction_time);

    if (result.matches && result.matches.length > 0) {
      console.log('\\n🤝 Matches Created:');
      result.matches.forEach((match, i) => {
        console.log(`   ${i + 1}. Match ID ${match.match_id}:`);
        console.log(`      Contractor ${match.contractor1_id} ↔ Contractor ${match.contractor2_id}`);
        console.log(`      Score: ${match.match_score}`);
        console.log(`      Reason: ${match.match_reason}`);
      });
    }

    // Verify messages were created in database
    console.log('\\n📱 Verifying scheduled messages in database...');
    const messagesResult = await query(`
      SELECT
        id,
        contractor_id,
        message_type,
        scheduled_time,
        status,
        personalization_data
      FROM event_messages
      WHERE event_id = $1
        AND message_type = 'peer_match_introduction'
        AND status = 'scheduled'
      ORDER BY contractor_id, scheduled_time
    `, [eventId]);

    console.log(`   Found ${messagesResult.rows.length} scheduled peer introduction messages`);

    if (messagesResult.rows.length > 0) {
      console.log('\\n📋 Scheduled Messages:');
      messagesResult.rows.forEach((msg, i) => {
        const data = typeof msg.personalization_data === 'string'
          ? JSON.parse(msg.personalization_data)
          : msg.personalization_data;
        console.log(`   ${i + 1}. Message ID ${msg.id} → Contractor ${msg.contractor_id}`);
        console.log(`      Peer: ${data.peer_name} (${data.peer_company})`);
        console.log(`      Scheduled: ${new Date(msg.scheduled_time).toLocaleString()}`);
        console.log(`      Status: ${msg.status}`);
      });
    }

    console.log('\\n✅ TEST COMPLETE!');
    console.log('\\n📝 Next Steps:');
    console.log('   1. Messages are scheduled in BullMQ for', result.introduction_time);
    console.log('   2. Event message worker will send them at that time');
    console.log('   3. Contractors will receive peer introduction SMS');
    console.log('   4. Reply "YES" to test peer matching response handlers');

    process.exit(0);

  } catch (error) {
    console.error('\\n❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testBatchPeerMatching();
