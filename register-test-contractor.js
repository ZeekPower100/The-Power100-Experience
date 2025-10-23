/**
 * Register test contractor (zeek@power100.io) for Business Growth Expo Test Event
 * This will trigger the full event orchestration flow
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tpedb',
  user: 'postgres',
  password: 'TPXP0stgres!!'
});

async function registerContractor() {
  const client = await pool.connect();

  try {
    console.log('\n🎫 Registering test contractor for Business Growth Expo...\n');

    const eventId = 49;
    const contractorId = 56;

    // Check if already registered
    const existingCheck = await client.query(
      'SELECT id FROM event_attendees WHERE event_id = $1 AND contractor_id = $2',
      [eventId, contractorId]
    );

    if (existingCheck.rows.length > 0) {
      console.log('⚠️  Contractor already registered for this event');
      return;
    }

    // Register the contractor
    const result = await client.query(`
      INSERT INTO event_attendees (
        event_id,
        contractor_id,
        registration_date,
        profile_completion_status,
        sms_opt_in
      ) VALUES ($1, $2, NOW(), 'completed', true)
      RETURNING id
    `, [eventId, contractorId]);

    const attendeeId = result.rows[0].id;

    console.log(`✅ Contractor registered successfully!`);
    console.log(`   Attendee ID: ${attendeeId}`);
    console.log(`   Event ID: ${eventId}`);
    console.log(`   Contractor ID: ${contractorId}`);
    console.log(`   Email: zeek@power100.io`);
    console.log(`   Phone: +18108934075`);
    console.log(`   SMS Opt-in: YES`);
    console.log(`   Email Opt-in: YES\n`);

    // Get event details to show timeline
    const eventDetails = await client.query(`
      SELECT name, date, sms_event_code
      FROM events
      WHERE id = $1
    `, [eventId]);

    const event = eventDetails.rows[0];
    console.log('📅 Event Details:');
    console.log(`   Name: ${event.name}`);
    console.log(`   SMS Code: ${event.sms_event_code}`);
    console.log(`   Date: ${event.date}\n`);

    console.log('🎯 Next Steps:');
    console.log('   1. Event orchestration should now trigger automatically');
    console.log('   2. Watch for SMS/Email messages in the next 8 minutes');
    console.log('   3. Pre-event communications: Check-in reminders');
    console.log('   4. During-event: Speaker alerts, sponsor recommendations, peer matching');
    console.log('   5. Post-event: PCR requests, feedback collection\n');

    console.log('📱 Monitor SMS messages to: +18108934075');
    console.log('📧 Monitor emails to: zeek@power100.io\n');

    return attendeeId;

  } catch (error) {
    console.error('❌ Error registering contractor:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

registerContractor()
  .then(attendeeId => {
    console.log(`✅ Registration complete! Attendee ID: ${attendeeId}`);
    console.log('🚀 Event orchestration flow is now active!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
