const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  database: 'tpedb',
  user: 'postgres',
  password: 'TPXP0stgres!!',
  port: 5432
});

const personalizationData = {
  contractor_name: "Zeek Test",
  event_name: "Power100 Summit 2025",
  recommended_speakers: [
    {
      speaker_id: 1,
      name: "Mike Davis",
      session_title: "Revenue Growth Strategies",
      session_time: "2:00 PM - 3:00 PM",
      session_location: "Main Conference Room A"
    },
    {
      speaker_id: 2,
      name: "Sarah Johnson",
      session_title: "Building Scalable Teams",
      session_time: "4:00 PM - 5:00 PM",
      session_location: "Main Conference Room B"
    },
    {
      speaker_id: 3,
      name: "Greg Salafia",
      session_title: "Leadership Excellence",
      session_time: "6:00 PM - 7:00 PM",
      session_location: "Grand Ballroom"
    }
  ]
};

async function insertMessage() {
  try {
    await client.connect();

    const result = await client.query(
      `INSERT INTO event_messages (
        contractor_id, event_id, phone, message_type, direction,
        personalization_data, scheduled_time, actual_send_time, status,
        ghl_contact_id, ghl_location_id, message_content
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '5 minutes', NOW() - INTERVAL '5 minutes', $7, $8, $9, $10)
      RETURNING id, message_type, contractor_id`,
      [
        56, // contractor_id (Zeek Test)
        39, // event_id (Power100 Summit 2025)
        '+18108934075', // phone
        'speaker_recommendation', // message_type
        'outbound', // direction
        JSON.stringify(personalizationData), // personalization_data
        'sent', // status
        'test_contact_123', // ghl_contact_id
        'test_location_456', // ghl_location_id
        'Hey Zeek! Here are 3 speakers at Power100 Summit 2025 that match your business goals: 1. Mike Davis - Revenue Growth Strategies, 2. Sarah Johnson - Building Scalable Teams, 3. Greg Salafia - Leadership Excellence. Reply with a number (1-3) to learn more!' // message_content
      ]
    );

    console.log('✅ Speaker recommendation message inserted:', result.rows[0]);
    console.log('\n📱 Ready for testing!');
    console.log('You can now text from your phone (+18108934075):');
    console.log('  - "What about speaker 2?" to test speaker details');
    console.log('  - "What\'s on the schedule?" to test event knowledge');
    console.log('  - "2" to test numeric speaker selection');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.end();
  }
}

insertMessage();
