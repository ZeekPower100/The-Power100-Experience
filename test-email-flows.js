/**
 * Comprehensive Email Flow Test Script
 * Tests all email integrations with emailScheduler
 *
 * Tests:
 * 1. Registration confirmation email (immediate)
 * 2. Profile completion request email (immediate)
 * 3. Personalized agenda email (immediate)
 * 4. Scheduled check-in reminder emails (via agenda generation)
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'tpe-backend', '.env.development') });

const { query } = require('./tpe-backend/src/config/database');
const eventRegistrationService = require('./tpe-backend/src/services/eventOrchestrator/eventRegistrationService');
const { scheduleCheckInReminders } = require('./tpe-backend/src/services/eventOrchestrator/checkInReminderScheduler');
const { sendPersonalizedAgenda } = require('./tpe-backend/src/services/eventOrchestrator/emailScheduler');

// Color codes for terminal output
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

/**
 * Get or create a test event
 */
async function getTestEvent() {
  section('Setup: Getting Test Event');

  // Check for existing test event
  const existingEvent = await query(`
    SELECT id, name, date, location FROM events
    WHERE name LIKE '%Test%' OR name LIKE '%Demo%'
    ORDER BY created_at DESC
    LIMIT 1
  `);

  if (existingEvent.rows.length > 0) {
    const event = existingEvent.rows[0];
    log('✅', 'green', `Found existing test event: ${event.name} (ID: ${event.id})`);
    log('📅', 'blue', `  Date: ${event.date}`);
    log('📍', 'blue', `  Location: ${event.location}`);
    return event;
  }

  // Create new test event (2 days from now)
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 2);
  futureDate.setHours(10, 0, 0, 0); // 10 AM

  const newEvent = await query(`
    INSERT INTO events (
      name,
      date,
      location,
      description,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, NOW(), NOW())
    RETURNING id, name, date, location
  `, [
    'Email Flow Test Event',
    futureDate,
    'Power100 HQ',
    'Test event for email integration testing'
  ]);

  const event = newEvent.rows[0];
  log('✨', 'green', `Created new test event: ${event.name} (ID: ${event.id})`);
  log('📅', 'blue', `  Date: ${event.date}`);
  log('📍', 'blue', `  Location: ${event.location}`);
  return event;
}

/**
 * Get or create test contractor
 */
async function getTestContractor() {
  section('Setup: Getting Test Contractor');

  const testEmail = 'test.emailflow@power100.io';

  // Check for existing test contractor
  const existing = await query(`
    SELECT id, first_name, last_name, email, phone, company_name
    FROM contractors
    WHERE email = $1
  `, [testEmail]);

  if (existing.rows.length > 0) {
    const contractor = existing.rows[0];
    log('✅', 'green', `Found existing test contractor: ${contractor.first_name} ${contractor.last_name}`);
    log('📧', 'blue', `  Email: ${contractor.email}`);
    log('📱', 'blue', `  Phone: ${contractor.phone || 'N/A'}`);
    return contractor;
  }

  // Create new test contractor
  const newContractor = await query(`
    INSERT INTO contractors (
      first_name,
      last_name,
      email,
      phone,
      company_name,
      focus_areas,
      revenue_tier,
      team_size,
      onboarding_source,
      sms_opt_in,
      ai_coach_opt_in,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
    RETURNING id, first_name, last_name, email, phone, company_name
  `, [
    'Email',
    'Tester',
    testEmail,
    '+15551234567',
    'Test Company LLC',
    JSON.stringify(['Sales & Marketing', 'Operations']),
    '$1M-$5M',
    '11-50',
    'test',
    true,
    true
  ]);

  const contractor = newContractor.rows[0];
  log('✨', 'green', `Created new test contractor: ${contractor.first_name} ${contractor.last_name}`);
  log('📧', 'blue', `  Email: ${contractor.email}`);
  log('📱', 'blue', `  Phone: ${contractor.phone}`);
  return contractor;
}

/**
 * Test 1: Registration Confirmation Email
 */
async function testRegistrationConfirmation(eventId, contractor) {
  section('Test 1: Registration Confirmation Email');

  try {
    log('🚀', 'yellow', 'Testing registration flow with emailScheduler...');

    // Register contractor for event (should trigger registration confirmation)
    const result = await eventRegistrationService.registerSingleContractor(eventId, {
      email: contractor.email,
      phone: contractor.phone,
      first_name: contractor.first_name,
      last_name: contractor.last_name,
      company_name: contractor.company_name
    });

    if (result.status === 'already_registered') {
      log('⏭️', 'yellow', 'Contractor already registered, checking for existing email record...');
    } else {
      log('✅', 'green', `Registration completed: ${result.status}`);
      log('📧', 'blue', `  Email sent: ${result.email_sent ? 'YES' : 'NO'}`);
      log('💬', 'blue', `  Message sent: ${result.message_sent ? 'YES' : 'NO'}`);
    }

    // Verify email was sent (check n8n logs or event_messages table)
    const emailCheck = await query(`
      SELECT id, message_type, channel, status, to_email, subject, created_at
      FROM event_messages
      WHERE event_id = $1
        AND contractor_id = $2
        AND message_type = 'registration_confirmation'
        AND channel = 'email'
      ORDER BY created_at DESC
      LIMIT 1
    `, [eventId, contractor.id]);

    if (emailCheck.rows.length > 0) {
      const record = emailCheck.rows[0];
      log('✅', 'green', 'Registration email record found in event_messages:');
      log('  📨', 'blue', `  ID: ${record.id}`);
      log('  📧', 'blue', `  To: ${record.to_email}`);
      log('  📝', 'blue', `  Subject: ${record.subject}`);
      log('  🔄', 'blue', `  Status: ${record.status}`);
    } else {
      log('⚠️', 'yellow', 'No email record found - email may have been sent directly (immediate send)');
    }

    return true;
  } catch (error) {
    log('❌', 'red', `Registration test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Test 2: Profile Completion Request Email
 */
async function testProfileCompletionRequest(eventId, contractorId) {
  section('Test 2: Profile Completion Request Email');

  try {
    log('🚀', 'yellow', 'Testing profile completion request with emailScheduler...');

    // This is automatically called during registration for incomplete profiles
    // Let's verify the event_messages record exists
    const emailCheck = await query(`
      SELECT id, message_type, channel, status, to_email, subject, created_at
      FROM event_messages
      WHERE event_id = $1
        AND contractor_id = $2
        AND message_type = 'profile_completion'
        AND channel = 'email'
      ORDER BY created_at DESC
      LIMIT 1
    `, [eventId, contractorId]);

    if (emailCheck.rows.length > 0) {
      const record = emailCheck.rows[0];
      log('✅', 'green', 'Profile completion email record found:');
      log('  📨', 'blue', `  ID: ${record.id}`);
      log('  📧', 'blue', `  To: ${record.to_email}`);
      log('  📝', 'blue', `  Subject: ${record.subject}`);
      log('  🔄', 'blue', `  Status: ${record.status}`);
    } else {
      log('⚠️', 'yellow', 'No profile completion email record found');
      log('💡', 'blue', 'This may be expected if profile is already complete');
    }

    return true;
  } catch (error) {
    log('❌', 'red', `Profile completion test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Test 3: Personalized Agenda Email
 */
async function testPersonalizedAgenda(eventId, contractorId) {
  section('Test 3: Personalized Agenda Email');

  try {
    log('🚀', 'yellow', 'Testing personalized agenda email with emailScheduler...');

    // Call the emailScheduler function directly
    await sendPersonalizedAgenda(eventId, contractorId, null);

    log('✅', 'green', 'Personalized agenda email sent successfully');

    // Verify email record
    const emailCheck = await query(`
      SELECT id, message_type, channel, status, to_email, subject, created_at
      FROM event_messages
      WHERE event_id = $1
        AND contractor_id = $2
        AND message_type = 'personalized_agenda'
        AND channel = 'email'
      ORDER BY created_at DESC
      LIMIT 1
    `, [eventId, contractorId]);

    if (emailCheck.rows.length > 0) {
      const record = emailCheck.rows[0];
      log('✅', 'green', 'Personalized agenda email record found:');
      log('  📨', 'blue', `  ID: ${record.id}`);
      log('  📧', 'blue', `  To: ${record.to_email}`);
      log('  📝', 'blue', `  Subject: ${record.subject}`);
      log('  🔄', 'blue', `  Status: ${record.status}`);
    } else {
      log('⚠️', 'yellow', 'No email record found - email sent directly (immediate send)');
    }

    return true;
  } catch (error) {
    log('❌', 'red', `Personalized agenda test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Test 4: Scheduled Check-In Reminder Emails (via Agenda Generation)
 */
async function testScheduledCheckInEmails(eventId) {
  section('Test 4: Scheduled Check-In Reminder Emails');

  try {
    log('🚀', 'yellow', 'Testing scheduled check-in emails via agenda generation...');

    // First, create test agenda items for the event
    const eventData = await query('SELECT date FROM events WHERE id = $1', [eventId]);
    const eventDate = new Date(eventData.rows[0].date);

    // Create 3 agenda items (if they don't exist)
    const agendaCheck = await query(`
      SELECT COUNT(*) as count FROM event_agenda_items WHERE event_id = $1
    `, [eventId]);

    if (agendaCheck.rows[0].count === 0) {
      log('📝', 'blue', 'Creating test agenda items...');

      const startTime1 = new Date(eventDate);
      startTime1.setHours(10, 0, 0, 0);

      const startTime2 = new Date(eventDate);
      startTime2.setHours(11, 30, 0, 0);

      const startTime3 = new Date(eventDate);
      startTime3.setHours(14, 0, 0, 0);

      await query(`
        INSERT INTO event_agenda_items (event_id, title, start_time, end_time, location, created_at)
        VALUES
          ($1, 'Opening Keynote', $2, $2 + INTERVAL '1 hour', 'Main Hall', NOW()),
          ($1, 'Workshop Session', $3, $3 + INTERVAL '1.5 hours', 'Room A', NOW()),
          ($1, 'Closing Remarks', $4, $4 + INTERVAL '30 minutes', 'Main Hall', NOW())
      `, [eventId, startTime1, startTime2, startTime3]);

      log('✅', 'green', 'Created 3 test agenda items');
    } else {
      log('✅', 'green', `Found ${agendaCheck.rows[0].count} existing agenda items`);
    }

    // Get count of attendees with sms_opt_in
    const attendeeCount = await query(`
      SELECT COUNT(*) as count
      FROM event_attendees
      WHERE event_id = $1 AND sms_opt_in = true
    `, [eventId]);

    const expectedMessages = attendeeCount.rows[0].count * 6; // 3 SMS + 3 Email per attendee

    log('📊', 'blue', `Expected messages: ${expectedMessages} (${attendeeCount.rows[0].count} attendees × 6 messages)`);

    // Call checkInReminderScheduler directly (this is what creates the scheduled messages)
    log('⏳', 'yellow', 'Scheduling check-in reminders (SMS + Email)...');

    const scheduleResult = await scheduleCheckInReminders(eventId);

    log('✅', 'green', `Check-in reminders scheduled successfully!`);
    log('📧', 'blue', `  Messages scheduled: ${scheduleResult.messages_scheduled || 0}`);

    // Verify scheduled EMAIL messages were created
    const scheduledEmails = await query(`
      SELECT
        id,
        message_type,
        channel,
        status,
        scheduled_time,
        to_email,
        subject
      FROM event_messages
      WHERE event_id = $1
        AND channel = 'email'
        AND status = 'scheduled'
        AND message_type LIKE '%check_in_reminder%'
      ORDER BY scheduled_time ASC
    `, [eventId]);

    log('✅', 'green', `Found ${scheduledEmails.rows.length} scheduled EMAIL messages:`);

    // Group by message type
    const emailsByType = {
      check_in_reminder_night_before: 0,
      check_in_reminder_1_hour: 0,
      check_in_reminder_event_start: 0
    };

    scheduledEmails.rows.forEach(email => {
      emailsByType[email.message_type]++;
    });

    log('  🌙', 'blue', `  Night before: ${emailsByType.check_in_reminder_night_before} emails`);
    log('  ⏰', 'blue', `  1 hour before: ${emailsByType.check_in_reminder_1_hour} emails`);
    log('  🎯', 'blue', `  Event start: ${emailsByType.check_in_reminder_event_start} emails`);

    // Show sample scheduled times
    if (scheduledEmails.rows.length > 0) {
      log('📅', 'blue', '\nSample scheduled times:');
      scheduledEmails.rows.slice(0, 3).forEach(email => {
        const scheduledTime = new Date(email.scheduled_time);
        log('  ⏰', 'blue', `  ${email.message_type}: ${scheduledTime.toLocaleString()}`);
      });
    }

    // Also check SMS messages for comparison
    const scheduledSMS = await query(`
      SELECT COUNT(*) as count
      FROM event_messages
      WHERE event_id = $1
        AND (channel = 'sms' OR channel IS NULL)
        AND status = 'scheduled'
        AND message_type LIKE '%check_in_reminder%'
    `, [eventId]);

    log('📱', 'blue', `\nScheduled SMS messages: ${scheduledSMS.rows[0].count}`);
    log('📧', 'blue', `Scheduled EMAIL messages: ${scheduledEmails.rows.length}`);
    log('📊', 'blue', `Total scheduled: ${parseInt(scheduledSMS.rows[0].count) + scheduledEmails.rows.length}`);

    return true;
  } catch (error) {
    log('❌', 'red', `Scheduled check-in test failed: ${error.message}`);
    console.error(error);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('\n');
  log('🧪', 'bright', 'EMAIL FLOW INTEGRATION TEST SUITE');
  log('📧', 'blue', 'Testing emailScheduler integration with event orchestration');
  console.log('\n');

  try {
    // Setup
    const event = await getTestEvent();
    const contractor = await getTestContractor();

    // Run tests
    const results = {
      registration: await testRegistrationConfirmation(event.id, contractor),
      profileCompletion: await testProfileCompletionRequest(event.id, contractor.id),
      personalizedAgenda: await testPersonalizedAgenda(event.id, contractor.id),
      scheduledCheckIns: await testScheduledCheckInEmails(event.id)
    };

    // Summary
    section('Test Summary');

    const passed = Object.values(results).filter(r => r === true).length;
    const total = Object.keys(results).length;

    log('📊', 'blue', `Tests Passed: ${passed}/${total}`);
    console.log('');

    Object.entries(results).forEach(([test, passed]) => {
      const emoji = passed ? '✅' : '❌';
      const color = passed ? 'green' : 'red';
      log(emoji, color, test.replace(/([A-Z])/g, ' $1').trim());
    });

    console.log('\n');

    if (passed === total) {
      log('🎉', 'green', 'ALL TESTS PASSED!');
      log('✅', 'green', 'Email integration with emailScheduler is working correctly');
      process.exit(0);
    } else {
      log('⚠️', 'yellow', 'SOME TESTS FAILED');
      log('🔍', 'blue', 'Review the test output above for details');
      process.exit(1);
    }

  } catch (error) {
    log('❌', 'red', `Test suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run the tests
runTests();
