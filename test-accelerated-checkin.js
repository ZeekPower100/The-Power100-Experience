/**
 * Test Accelerated Check-In Reminders
 * Creates agenda with check-in reminders scheduled to send in 1-3 minutes
 */

const { query } = require('./tpe-backend/src/config/database');
const { scheduleCheckInReminders } = require('./tpe-backend/src/services/eventOrchestrator/checkInReminderScheduler');

async function testAcceleratedCheckIn() {
  try {
    console.log('🧪 Testing Accelerated Check-In Reminders Flow\n');
    console.log('═══════════════════════════════════════════════\n');

    const eventId = 48; // Business Growth Expo: LIVE TEST
    const contractorId = 56; // zeek@power100.io / +18108934075

    // Create accelerated agenda items (starting in 3 minutes)
    const now = new Date();
    const eventStart = new Date(now.getTime() + 3 * 60 * 1000); // 3 minutes from now
    const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000); // 1 hour after start

    console.log(`📅 Event: Business Growth Expo: LIVE TEST (ID: ${eventId})`);
    console.log(`👤 Contractor: zeek@power100.io / +18108934075 (ID: ${contractorId})\n`);

    // Clear old agenda items for this event
    await query('DELETE FROM event_agenda_items WHERE event_id = $1', [eventId]);
    console.log('✅ Cleared old agenda items\n');

    // Create first agenda item (determines event start time)
    await query(`
      INSERT INTO event_agenda_items (
        event_id,
        title,
        description,
        start_time,
        end_time,
        item_type,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      eventId,
      'Welcome & Keynote',
      'Opening session and main keynote presentation',
      eventStart,
      eventEnd,
      'session'
    ]);

    console.log(`📋 Created agenda item:`);
    console.log(`   Title: Welcome & Keynote`);
    console.log(`   Start: ${eventStart.toLocaleTimeString()} (3 min from now)\n`);

    // Schedule check-in reminders (with accelerated timeline)
    console.log('📬 Scheduling check-in reminders with ACCELERATED timeline:\n');

    const result = await scheduleCheckInReminders(eventId);

    if (result.success) {
      console.log(`✅ Scheduled ${result.messages_scheduled} messages for ${result.attendees_count} attendee(s)\n`);

      // Calculate when messages will send
      const nightBefore = new Date(eventStart.getTime() - 24 * 60 * 60 * 1000 + 24 * 60 * 60 * 1000 + 20 * 60 * 1000); // Adjust to ~1 min
      const oneHourBefore = new Date(eventStart.getTime() - 60 * 60 * 1000 + 60 * 60 * 1000 + 2 * 60 * 1000); // Adjust to ~2 min
      const atStart = eventStart; // 3 min from now

      console.log('⏰ EXPECTED MESSAGE DELIVERY TIMES:\n');
      console.log(`   🌙 Night Before Reminder:`);
      console.log(`      📧 Email: ~1 minute from now`);
      console.log(`      📱 SMS: ~1 minute from now\n`);

      console.log(`   ⏱️  1 Hour Before Reminder:`);
      console.log(`      📧 Email: ~2 minutes from now`);
      console.log(`      📱 SMS: ~2 minutes from now\n`);

      console.log(`   🎉 Event Start Reminder:`);
      console.log(`      📧 Email: ~3 minutes from now (${eventStart.toLocaleTimeString()})`);
      console.log(`      📱 SMS: ~3 minutes from now (${eventStart.toLocaleTimeString()})\n`);

      // Check scheduled messages in database
      const messages = await query(`
        SELECT id, message_type, channel, scheduled_time, status
        FROM event_messages
        WHERE event_id = $1 AND contractor_id = $2
        ORDER BY scheduled_time
      `, [eventId, contractorId]);

      console.log('═══════════════════════════════════════════════\n');
      console.log('📊 Messages queued in database:\n');
      messages.rows.forEach((msg, i) => {
        const timeFromNow = Math.round((new Date(msg.scheduled_time) - now) / 1000 / 60);
        const channel = msg.channel === 'email' ? '📧 Email' : '📱 SMS';
        console.log(`   ${i + 1}. ${channel} - ${msg.message_type}`);
        console.log(`      Scheduled: ${new Date(msg.scheduled_time).toLocaleTimeString()} (~${timeFromNow} min)`);
        console.log(`      Status: ${msg.status}\n`);
      });

      console.log('═══════════════════════════════════════════════\n');
      console.log('✅ Test setup complete!\n');
      console.log('🔔 WHAT TO WATCH FOR:\n');
      console.log('   • Check zeek@power100.io inbox for 3 emails over next 3 minutes');
      console.log('   • Check +18108934075 for 3 SMS messages over next 3 minutes');
      console.log('   • Each pair (Email + SMS) should arrive at the same time\n');
      console.log('⏳ Waiting for messages to process...\n');
      console.log('   💡 Messages are processed by eventMessageWorker via BullMQ');
      console.log('   💡 Worker checks every 60 seconds for due messages');
      console.log('   💡 Keep this terminal open to monitor...\n');

    } else {
      console.error('❌ Failed to schedule check-in reminders:', result.error);
    }

  } catch (error) {
    console.error('❌ Error in test:', error);
    process.exit(1);
  }
}

testAcceleratedCheckIn();
