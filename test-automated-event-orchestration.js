/**
 * Accelerated Event Orchestration Test
 * Creates a compressed timeline test event to validate the complete automated flow:
 * 1. Event registration → Confirmation email
 * 2. Profile check → Personalized agenda OR profile completion request
 * 3. Scheduled check-in reminders (accelerated: 2min, 5min, 10min instead of night/1hr/start)
 * 4. Message worker processing
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'tpe-backend', '.env.development') });

const { query } = require('./tpe-backend/src/config/database');
const { safeJsonStringify } = require('./tpe-backend/src/utils/jsonHelpers');

const TEST_CONTRACTOR_ID = 56; // Zeek Test
const TEST_PHONE = '+18108934075';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(emoji, color, message) {
  console.log(`${colors[color]}${emoji} ${message}${colors.reset}`);
}

function section(title) {
  console.log('\n' + '='.repeat(80));
  log('📋', 'bright', title.toUpperCase());
  console.log('='.repeat(80));
}

async function setupAcceleratedTest() {
  try {
    section('Setting Up Accelerated Test Event');

    // Calculate accelerated timeline (event starts in 15 minutes from now)
    const now = new Date();
    const eventStartTime = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes from now
    const eventDate = eventStartTime.toISOString().split('T')[0]; // YYYY-MM-DD

    // Check-in reminder times (accelerated)
    const reminderNightBefore = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
    const reminder1Hour = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
    const reminderEventStart = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now

    log('🕐', 'blue', `Current time: ${now.toLocaleString()}`);
    log('🕐', 'blue', `Event start time: ${eventStartTime.toLocaleString()} (in 15 minutes)`);
    log('⏰', 'yellow', `Reminder 1 (night before): ${reminderNightBefore.toLocaleString()} (in 2 minutes)`);
    log('⏰', 'yellow', `Reminder 2 (1 hour before): ${reminder1Hour.toLocaleString()} (in 5 minutes)`);
    log('⏰', 'yellow', `Reminder 3 (event start): ${reminderEventStart.toLocaleString()} (in 10 minutes)`);

    section('Creating Accelerated Test Event');

    // Create test event
    const eventResult = await query(`
      INSERT INTO events (
        name,
        date,
        location,
        description,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, 'active', CURRENT_TIMESTAMP)
      RETURNING id, name, date, location
    `, [
      'Business Growth Expo: ACCELERATED TEST',
      eventDate,
      'Power100 Innovation Center (Test)',
      'Accelerated test event for automated orchestration flow validation - Compressed timeline for rapid testing'
    ]);

    const event = eventResult.rows[0];
    const eventId = event.id;

    log('✅', 'green', `Event created: ${event.name}`);
    log('🆔', 'blue', `  Event ID: ${eventId}`);
    log('📅', 'blue', `  Event Date: ${event.date}`);
    log('📍', 'blue', `  Location: ${event.location}`);

    section('Creating Event Agenda (Compressed Timeline)');

    // Create compressed agenda items
    const agendaItems = [
      {
        title: 'Registration & Networking',
        description: 'Check-in and morning networking',
        start_time: eventStartTime,
        duration_minutes: 30,
        type: 'networking'
      },
      {
        title: 'Keynote: AI-Powered Business Growth',
        description: 'Main keynote presentation on AI transformation',
        start_time: new Date(eventStartTime.getTime() + 30 * 60 * 1000),
        duration_minutes: 45,
        type: 'session'
      },
      {
        title: 'Partner Showcase',
        description: 'Meet our strategic partners and explore solutions',
        start_time: new Date(eventStartTime.getTime() + 75 * 60 * 1000),
        duration_minutes: 60,
        type: 'networking'
      },
      {
        title: 'Closing & Next Steps',
        description: 'Event wrap-up and action planning',
        start_time: new Date(eventStartTime.getTime() + 135 * 60 * 1000),
        duration_minutes: 30,
        type: 'session'
      }
    ];

    for (const item of agendaItems) {
      const endTime = new Date(item.start_time.getTime() + item.duration_minutes * 60 * 1000);

      await query(`
        INSERT INTO event_agenda_items (
          event_id,
          title,
          description,
          start_time,
          end_time,
          item_type,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        eventId,
        item.title,
        item.description,
        item.start_time,
        endTime,
        item.type
      ]);

      log('📝', 'yellow', `  ${item.title} - ${item.start_time.toLocaleTimeString()} (${item.duration_minutes} min)`);
    }

    section('Registering Test Contractor');

    // Verify test contractor exists
    const contractorResult = await query(`
      SELECT id, first_name, last_name, email, phone FROM contractors WHERE id = $1
    `, [TEST_CONTRACTOR_ID]);

    if (contractorResult.rows.length === 0) {
      log('❌', 'red', `Test contractor ID ${TEST_CONTRACTOR_ID} not found`);
      process.exit(1);
    }

    const contractor = contractorResult.rows[0];
    log('✅', 'green', `Found contractor: ${contractor.first_name} ${contractor.last_name}`);
    log('📧', 'blue', `  Email: ${contractor.email}`);
    log('📱', 'blue', `  Phone: ${contractor.phone}`);

    // Register contractor for event
    await query(`
      INSERT INTO event_attendees (
        event_id,
        contractor_id,
        registration_date,
        sms_opt_in,
        real_phone,
        created_at,
        updated_at
      ) VALUES ($1, $2, CURRENT_TIMESTAMP, true, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [eventId, TEST_CONTRACTOR_ID, TEST_PHONE]);

    log('✅', 'green', `Contractor registered for event`);

    section('Scheduling Accelerated Check-In Reminders');

    // Manually schedule check-in reminder messages with accelerated timeline
    const firstName = contractor.first_name || contractor.email.split('@')[0];
    const eventTimeFormatted = eventStartTime.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const reminderData = {
      first_name: firstName,
      event_name: event.name,
      event_date: event.date,
      event_time: eventTimeFormatted,
      location: event.location
    };

    // 1. "Night before" reminder (2 minutes from now) - SMS + Email
    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        direction,
        channel,
        scheduled_time,
        status,
        message_content,
        personalization_data,
        created_at
      ) VALUES ($1, $2, 'check_in_reminder_night_before', 'outbound', 'sms', $3, 'scheduled', $4, $5, CURRENT_TIMESTAMP)
    `, [
      eventId,
      TEST_CONTRACTOR_ID,
      reminderNightBefore,
      `Hi ${firstName}! Tomorrow's the big day - ${event.name} starts at ${eventTimeFormatted}. Location: ${event.location}. See you there!`,
      safeJsonStringify(reminderData)
    ]);

    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        direction,
        channel,
        from_email,
        to_email,
        subject,
        scheduled_time,
        status,
        message_content,
        personalization_data,
        created_at
      ) VALUES ($1, $2, 'check_in_reminder_night_before', 'outbound', 'email', $3, $4, $5, $6, 'scheduled', $7, $8, CURRENT_TIMESTAMP)
    `, [
      eventId,
      TEST_CONTRACTOR_ID,
      process.env.EVENT_FROM_EMAIL || 'events@power100.io',
      contractor.email,
      `Tomorrow's the big day - ${event.name}!`,
      reminder1Hour,
      `Hi ${firstName}! Tomorrow's the big day - ${event.name} starts at ${eventTimeFormatted}. Location: ${event.location}. See you there!`,
      safeJsonStringify(reminderData)
    ]);

    log('✅', 'green', `Scheduled "night before" reminders for ${reminderNightBefore.toLocaleString()}`);

    // 2. "1 hour before" reminder (5 minutes from now) - SMS + Email
    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        direction,
        channel,
        scheduled_time,
        status,
        message_content,
        personalization_data,
        created_at
      ) VALUES ($1, $2, 'check_in_reminder_1_hour', 'outbound', 'sms', $3, 'scheduled', $4, $5, CURRENT_TIMESTAMP)
    `, [
      eventId,
      TEST_CONTRACTOR_ID,
      reminder1Hour,
      `Alright, ${firstName}! You have just enough time to grab a coffee and a quick bite before we need to be at the event in an hour. Let's get ready to breakthrough. The time is now!`,
      safeJsonStringify(reminderData)
    ]);

    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        direction,
        channel,
        from_email,
        to_email,
        subject,
        scheduled_time,
        status,
        message_content,
        personalization_data,
        created_at
      ) VALUES ($1, $2, 'check_in_reminder_1_hour', 'outbound', 'email', $3, $4, $5, $6, 'scheduled', $7, $8, CURRENT_TIMESTAMP)
    `, [
      eventId,
      TEST_CONTRACTOR_ID,
      process.env.EVENT_FROM_EMAIL || 'events@power100.io',
      contractor.email,
      `${event.name} starts in 1 hour!`,
      reminder1Hour,
      `Alright, ${firstName}! You have just enough time to grab a coffee and a quick bite before we need to be at the event in an hour. Let's get ready to breakthrough. The time is now!`,
      safeJsonStringify(reminderData)
    ]);

    log('✅', 'green', `Scheduled "1 hour before" reminders for ${reminder1Hour.toLocaleString()}`);

    // 3. "Event start" reminder (10 minutes from now) - SMS + Email
    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        direction,
        channel,
        scheduled_time,
        status,
        message_content,
        personalization_data,
        created_at
      ) VALUES ($1, $2, 'check_in_reminder_event_start', 'outbound', 'sms', $3, 'scheduled', $4, $5, CURRENT_TIMESTAMP)
    `, [
      eventId,
      TEST_CONTRACTOR_ID,
      reminderEventStart,
      `${event.name} is starting NOW! Head to ${event.location} for check-in. Let's make today count!`,
      safeJsonStringify({ first_name: firstName, event_name: event.name, location: event.location })
    ]);

    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        direction,
        channel,
        from_email,
        to_email,
        subject,
        scheduled_time,
        status,
        message_content,
        personalization_data,
        created_at
      ) VALUES ($1, $2, 'check_in_reminder_event_start', 'outbound', 'email', $3, $4, $5, $6, 'scheduled', $7, $8, CURRENT_TIMESTAMP)
    `, [
      eventId,
      TEST_CONTRACTOR_ID,
      process.env.EVENT_FROM_EMAIL || 'events@power100.io',
      contractor.email,
      `${event.name} is starting NOW!`,
      reminderEventStart,
      `${event.name} is starting NOW! Head to ${event.location} for check-in. Let's make today count!`,
      safeJsonStringify({ first_name: firstName, event_name: event.name, location: event.location })
    ]);

    log('✅', 'green', `Scheduled "event start" reminders for ${reminderEventStart.toLocaleString()}`);

    section('Sending Immediate Registration Confirmation');

    // Send registration confirmation (immediate)
    const { sendRegistrationConfirmation } = require('./tpe-backend/src/services/eventOrchestrator/emailScheduler');
    await sendRegistrationConfirmation(eventId, TEST_CONTRACTOR_ID);
    log('✅', 'green', `Registration confirmation sent immediately`);

    // Check if profile is complete, send appropriate message
    const profileComplete = contractor.focus_areas &&
                           contractor.revenue_tier &&
                           contractor.team_size;

    if (profileComplete) {
      const { sendPersonalizedAgenda } = require('./tpe-backend/src/services/eventOrchestrator/emailScheduler');
      await sendPersonalizedAgenda(eventId, TEST_CONTRACTOR_ID, null);
      log('✅', 'green', `Personalized agenda sent (profile complete)`);
    } else {
      const { sendProfileCompletionRequest } = require('./tpe-backend/src/services/eventOrchestrator/emailScheduler');
      await sendProfileCompletionRequest(eventId, TEST_CONTRACTOR_ID);
      log('✅', 'green', `Profile completion request sent (profile incomplete)`);
    }

    section('Test Event Setup Complete!');

    log('🎯', 'bright', 'ACCELERATED TEST TIMELINE:');
    log('⏰', 'yellow', `NOW: Registration confirmation & ${profileComplete ? 'personalized agenda' : 'profile completion'} sent`);
    log('⏰', 'yellow', `+2 min: "Night before" reminder (SMS + Email)`);
    log('⏰', 'yellow', `+5 min: "1 hour before" reminder (SMS + Email)`);
    log('⏰', 'yellow', `+10 min: "Event start" reminder (SMS + Email)`);
    log('⏰', 'yellow', `+15 min: Event officially starts`);

    console.log('\n');
    log('📊', 'blue', 'EVENT DETAILS:');
    log('🆔', 'blue', `  Event ID: ${eventId}`);
    log('📛', 'blue', `  Event Name: ${event.name}`);
    log('🕐', 'blue', `  Event Start: ${eventStartTime.toLocaleString()}`);
    log('👤', 'blue', `  Test Contractor: ${contractor.first_name} ${contractor.last_name} (ID: ${TEST_CONTRACTOR_ID})`);

    console.log('\n');
    log('🎯', 'bright', 'WHAT TO EXPECT:');
    console.log(`  1. Check your email (${contractor.email}) for registration confirmation`);
    console.log(`  2. ${profileComplete ? 'Check for personalized agenda email' : 'Check for profile completion request'}`);
    console.log(`  3. Wait for scheduled reminders to be sent by eventMessageWorker`);
    console.log(`  4. Monitor worker logs: tail -f tpe-backend/logs/worker.log`);
    console.log(`  5. Check message status: SELECT * FROM event_messages WHERE event_id = ${eventId} ORDER BY created_at;`);

    console.log('\n');
    log('🔧', 'magenta', 'WORKER STATUS:');
    console.log(`  • Ensure eventMessageWorker is running: pm2 status`);
    console.log(`  • If not running: pm2 start tpe-backend/src/workers/eventMessageWorker.js --name eventMessageWorker`);
    console.log(`  • Watch logs: pm2 logs eventMessageWorker --lines 50`);

    console.log('\n');
    log('✅', 'green', 'ACCELERATED TEST EVENT READY FOR 100% AUTOMATED ORCHESTRATION!');
    console.log('\n');

    process.exit(0);

  } catch (error) {
    log('❌', 'red', `Test setup failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

setupAcceleratedTest();
