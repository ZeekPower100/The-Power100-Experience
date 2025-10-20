// DATABASE-CHECKED: event_messages, events, event_agenda_items, event_attendees, contractors columns verified on 2025-10-18
/**
 * Check-In Reminder Scheduler
 *
 * Creates scheduled check-in reminder messages when agenda is generated
 * Three reminders are sent to ensure maximum attendance:
 * 1. Night before (8 PM day before event)
 * 2. 1 hour before event start
 * 3. At event start time
 *
 * Flow:
 * 1. Agenda generation calls scheduleCheckInReminders()
 * 2. Creates 3 event_messages records per attendee with template-based content
 * 3. eventMessageWorker automatically sends reminders at scheduled times
 */

const { query } = require('../../config/database');
const { safeJsonStringify } = require('../../utils/jsonHelpers');
const { scheduleEventMessage } = require('../../queues/eventMessageQueue');

// Email scheduling: Creates event_messages records that eventMessageWorker will process
// Worker calls emailScheduler functions at scheduled times

/**
 * Schedule all check-in reminder messages for an event
 * Called during agenda generation
 *
 * @param {number} eventId - Event ID
 * @returns {Object} - Scheduling results
 */
async function scheduleCheckInReminders(eventId) {
  try {
    console.log(`[CheckInReminderScheduler] 📅 Scheduling check-in reminders for event ${eventId}`);

    // Get event details (date, name, location)
    // DATABASE-CHECKED: events table has date, name, location (NOT start_time, NOT venue_address)
    const eventResult = await query(`
      SELECT
        id,
        name,
        date,
        location
      FROM events
      WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      console.error(`[CheckInReminderScheduler] Event ${eventId} not found`);
      return { success: false, error: 'event_not_found' };
    }

    const event = eventResult.rows[0];

    // Get FIRST agenda item to determine event start time
    // DATABASE-CHECKED: event_agenda_items has start_time (timestamp without time zone)
    const firstItemResult = await query(`
      SELECT start_time
      FROM event_agenda_items
      WHERE event_id = $1
      ORDER BY start_time ASC
      LIMIT 1
    `, [eventId]);

    if (firstItemResult.rows.length === 0) {
      console.error(`[CheckInReminderScheduler] No agenda items found for event ${eventId}`);
      return { success: false, error: 'no_agenda_items' };
    }

    const eventStartTime = new Date(firstItemResult.rows[0].start_time);
    console.log(`[CheckInReminderScheduler] Event: ${event.name} starts at ${eventStartTime.toISOString()}`);

    // Get all attendees with SMS opt-in
    // DATABASE-CHECKED: contractors has first_name, last_name, phone, email
    // DATABASE-CHECKED: event_attendees has sms_opt_in
    const attendeesResult = await query(`
      SELECT DISTINCT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email
      FROM contractors c
      INNER JOIN event_attendees ea ON c.id = ea.contractor_id
      WHERE ea.event_id = $1
        AND ea.sms_opt_in = true
        AND c.phone IS NOT NULL
    `, [eventId]);

    const attendees = attendeesResult.rows;
    console.log(`[CheckInReminderScheduler] Found ${attendees.length} eligible attendees`);

    if (attendees.length === 0) {
      console.log(`[CheckInReminderScheduler] No eligible attendees found`);
      return { success: true, messages_scheduled: 0, reason: 'no_attendees' };
    }

    // Calculate reminder times
    // Night before: 8 PM (20:00) on the day before event
    const nightBeforeTime = new Date(eventStartTime);
    nightBeforeTime.setDate(nightBeforeTime.getDate() - 1);
    nightBeforeTime.setHours(20, 0, 0, 0); // 8 PM

    // 1 hour before: event start time - 1 hour
    const oneHourBeforeTime = new Date(eventStartTime);
    oneHourBeforeTime.setHours(oneHourBeforeTime.getHours() - 1);

    // Event start: exactly at event start time
    const atEventStartTime = new Date(eventStartTime);

    console.log(`[CheckInReminderScheduler] Reminder times:`);
    console.log(`  Night before: ${nightBeforeTime.toISOString()}`);
    console.log(`  1 hour before: ${oneHourBeforeTime.toISOString()}`);
    console.log(`  Event start: ${atEventStartTime.toISOString()}`);

    let messagesScheduled = 0;

    // Schedule reminders for each attendee
    for (const attendee of attendees) {
      const firstName = attendee.first_name || attendee.email.split('@')[0];

      // Format event time for display (e.g., "9:00 AM")
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

      // 1. Night before reminder (SMS + Email)
      await scheduleCheckInReminderMessage({
        eventId,
        contractorId: attendee.id,
        reminderType: 'check_in_reminder_night_before',
        scheduledTime: nightBeforeTime,
        personalizationData: reminderData
      });
      messagesScheduled++;

      await scheduleCheckInReminderEmail({
        eventId,
        contractorId: attendee.id,
        reminderType: 'check_in_reminder_night_before',
        scheduledTime: nightBeforeTime,
        personalizationData: reminderData
      });
      messagesScheduled++;

      // 2. One hour before reminder (SMS + Email)
      await scheduleCheckInReminderMessage({
        eventId,
        contractorId: attendee.id,
        reminderType: 'check_in_reminder_1_hour',
        scheduledTime: oneHourBeforeTime,
        personalizationData: reminderData
      });
      messagesScheduled++;

      await scheduleCheckInReminderEmail({
        eventId,
        contractorId: attendee.id,
        reminderType: 'check_in_reminder_1_hour',
        scheduledTime: oneHourBeforeTime,
        personalizationData: reminderData
      });
      messagesScheduled++;

      // 3. Event start reminder (SMS + Email)
      await scheduleCheckInReminderMessage({
        eventId,
        contractorId: attendee.id,
        reminderType: 'check_in_reminder_event_start',
        scheduledTime: atEventStartTime,
        personalizationData: {
          first_name: firstName,
          event_name: event.name,
          location: event.location
        }
      });
      messagesScheduled++;

      await scheduleCheckInReminderEmail({
        eventId,
        contractorId: attendee.id,
        reminderType: 'check_in_reminder_event_start',
        scheduledTime: atEventStartTime,
        personalizationData: {
          first_name: firstName,
          event_name: event.name,
          location: event.location
        }
      });
      messagesScheduled++;
    }

    console.log(`[CheckInReminderScheduler] ✅ Scheduled ${messagesScheduled} check-in reminder messages (${attendees.length} attendees × 6 reminders: 3 SMS + 3 Email)`);

    return {
      success: true,
      messages_scheduled: messagesScheduled,
      attendees_count: attendees.length,
      reminder_times: {
        night_before: nightBeforeTime.toISOString(),
        one_hour_before: oneHourBeforeTime.toISOString(),
        event_start: atEventStartTime.toISOString()
      }
    };

  } catch (error) {
    console.error('[CheckInReminderScheduler] ❌ Error scheduling check-in reminders:', error);
    throw error;
  }
}

/**
 * Schedule a single check-in reminder message
 *
 * @param {Object} params - Message parameters
 * @returns {Object} - Database insert result
 */
async function scheduleCheckInReminderMessage({
  eventId,
  contractorId,
  reminderType,
  scheduledTime,
  personalizationData
}) {
  try {
    // Create message content based on reminder type
    let messageContent = '';

    switch (reminderType) {
      case 'check_in_reminder_night_before':
        messageContent = `Hi ${personalizationData.first_name}! ${personalizationData.event_name} is tomorrow! Tap here to check in now and get your personalized agenda early. Start planning your day before you arrive!`;
        break;

      case 'check_in_reminder_1_hour':
        messageContent = `${personalizationData.event_name} starts in 1 hour! Check in now to unlock your personalized experience - tap here to see your custom speaker, sponsor, and peer recommendations!`;
        break;

      case 'check_in_reminder_event_start':
        messageContent = `${personalizationData.event_name} is starting now! Tap to check in and access your personalized agenda with curated connections. Make today count!`;
        break;

      default:
        messageContent = `Reminder: ${personalizationData.event_name} check-in required for personalized agenda`;
    }

    // Get contractor phone for BullMQ job
    const contractorResult = await query(`
      SELECT phone FROM contractors WHERE id = $1
    `, [contractorId]);

    const phone = contractorResult.rows[0]?.phone;

    // DATABASE-CHECKED: event_messages has these exact fields
    // Insert scheduled message into database
    const result = await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        direction,
        scheduled_time,
        status,
        message_content,
        personalization_data,
        created_at
      ) VALUES ($1, $2, $3, 'outbound', $4, 'scheduled', $5, $6, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      eventId,
      contractorId,
      reminderType,
      scheduledTime,
      messageContent,
      safeJsonStringify(personalizationData)
    ]);

    const message = result.rows[0];

    // Schedule message in BullMQ (System A - direct queueing)
    await scheduleEventMessage({
      id: message.id,
      event_id: eventId,
      contractor_id: contractorId,
      message_type: reminderType,
      message_category: 'event_preparation',
      scheduled_time: scheduledTime,
      message_content: messageContent,
      personalization_data: personalizationData,
      phone: phone
    });

    console.log(`[CheckInReminderScheduler] ✅ SMS ${reminderType} queued in BullMQ for contractor ${contractorId}`);

    return message;

  } catch (error) {
    console.error(`[CheckInReminderScheduler] Error scheduling ${reminderType} for contractor ${contractorId}:`, error);
    throw error;
  }
}

/**
 * Schedule a single check-in reminder EMAIL (creates scheduled record for worker to process)
 *
 * @param {Object} params - Message parameters
 * @returns {Object} - Database insert result
 */
async function scheduleCheckInReminderEmail({
  eventId,
  contractorId,
  reminderType,
  scheduledTime,
  personalizationData
}) {
  try {
    // Get contractor email
    const contractorResult = await query(`
      SELECT email, first_name, last_name FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      console.error(`[CheckInReminderScheduler] Contractor ${contractorId} not found`);
      return null;
    }

    const contractor = contractorResult.rows[0];
    const email = contractor.email;

    if (!email) {
      console.log(`[CheckInReminderScheduler] No email for contractor ${contractorId}`);
      return null;
    }

    // Create subject and content based on reminder type (matching emailScheduler templates)
    let subject = '';
    let messageContent = '';

    switch (reminderType) {
      case 'check_in_reminder_night_before':
        subject = `${personalizationData.event_name} is tomorrow!`;
        messageContent = `Hi ${personalizationData.first_name}! ${personalizationData.event_name} is tomorrow at ${personalizationData.event_time} at ${personalizationData.location}. Tap the check-in button below to get your personalized agenda now and start planning your day before you arrive!`;
        break;

      case 'check_in_reminder_1_hour':
        subject = `${personalizationData.event_name} starts in 1 hour!`;
        messageContent = `${personalizationData.event_name} starts in 1 hour! Check in now to unlock your personalized experience - click below to see your custom speaker, sponsor, and peer recommendations!`;
        break;

      case 'check_in_reminder_event_start':
        subject = `${personalizationData.event_name} is starting now!`;
        messageContent = `${personalizationData.event_name} is starting now! Click to check in and access your personalized agenda with curated connections. Make today count!`;
        break;

      default:
        subject = `Reminder: ${personalizationData.event_name}`;
        messageContent = `Reminder: ${personalizationData.event_name} check-in required for personalized agenda`;
    }

    // DATABASE-CHECKED: event_messages has channel, from_email, to_email, subject fields
    // Insert scheduled email message into database (worker will process it)
    const result = await query(`
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
      ) VALUES ($1, $2, $3, 'outbound', 'email', $4, $5, $6, $7, 'scheduled', $8, $9, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      eventId,
      contractorId,
      reminderType,
      process.env.EVENT_FROM_EMAIL || 'events@power100.io',
      email,
      subject,
      scheduledTime,
      messageContent,
      safeJsonStringify(personalizationData)
    ]);

    const message = result.rows[0];

    // Schedule email message in BullMQ (System A - direct queueing)
    await scheduleEventMessage({
      id: message.id,
      event_id: eventId,
      contractor_id: contractorId,
      message_type: reminderType,
      message_category: 'event_preparation',
      scheduled_time: scheduledTime,
      message_content: messageContent,
      personalization_data: personalizationData,
      email: email,
      subject: subject,
      from_email: process.env.EVENT_FROM_EMAIL || 'events@power100.io',
      to_email: email,
      channel: 'email'
    });

    console.log(`[CheckInReminderScheduler] ✅ Email ${reminderType} queued in BullMQ for contractor ${contractorId}`);

    return message;

  } catch (error) {
    console.error(`[CheckInReminderScheduler] Error scheduling email ${reminderType} for contractor ${contractorId}:`, error);
    throw error;
  }
}

/**
 * Schedule check-in reminders for a SINGLE attendee (per-attendee approach)
 * Called automatically when an attendee registers for an event
 *
 * @param {number} eventId - Event ID
 * @param {number} contractorId - Contractor ID
 * @returns {Object} - Scheduling results
 */
async function scheduleCheckInRemindersForAttendee(eventId, contractorId) {
  try {
    console.log(`[CheckInReminderScheduler] 📅 Scheduling check-in reminders for contractor ${contractorId} at event ${eventId}`);

    // Get event details (date, name, location)
    const eventResult = await query(`
      SELECT
        id,
        name,
        date,
        location
      FROM events
      WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      console.error(`[CheckInReminderScheduler] Event ${eventId} not found`);
      return { success: false, error: 'event_not_found' };
    }

    const event = eventResult.rows[0];

    // Get FIRST agenda item to determine event start time
    const firstItemResult = await query(`
      SELECT start_time
      FROM event_agenda_items
      WHERE event_id = $1
      ORDER BY start_time ASC
      LIMIT 1
    `, [eventId]);

    if (firstItemResult.rows.length === 0) {
      console.error(`[CheckInReminderScheduler] No agenda items found for event ${eventId}`);
      return { success: false, error: 'no_agenda_items' };
    }

    const eventStartTime = new Date(firstItemResult.rows[0].start_time);
    console.log(`[CheckInReminderScheduler] Event: ${event.name} starts at ${eventStartTime.toISOString()}`);

    // Get contractor details
    const contractorResult = await query(`
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        ea.sms_opt_in
      FROM contractors c
      INNER JOIN event_attendees ea ON c.id = ea.contractor_id
      WHERE c.id = $1 AND ea.event_id = $2
    `, [contractorId, eventId]);

    if (contractorResult.rows.length === 0) {
      console.error(`[CheckInReminderScheduler] Contractor ${contractorId} not found or not registered for event ${eventId}`);
      return { success: false, error: 'contractor_not_found' };
    }

    const contractor = contractorResult.rows[0];

    // Check if contractor has SMS opt-in and phone
    if (!contractor.sms_opt_in || !contractor.phone) {
      console.log(`[CheckInReminderScheduler] Contractor ${contractorId} has no SMS opt-in or phone - skipping SMS reminders`);
      // Continue with email only
    }

    // Calculate reminder times (same logic as bulk function)
    // Night before: 8 PM (20:00) on the day before event
    const nightBeforeTime = new Date(eventStartTime);
    nightBeforeTime.setDate(nightBeforeTime.getDate() - 1);
    nightBeforeTime.setHours(20, 0, 0, 0); // 8 PM

    // 1 hour before: event start time - 1 hour
    const oneHourBeforeTime = new Date(eventStartTime);
    oneHourBeforeTime.setHours(oneHourBeforeTime.getHours() - 1);

    // Event start: exactly at event start time
    const atEventStartTime = new Date(eventStartTime);

    console.log(`[CheckInReminderScheduler] Reminder times for contractor ${contractorId}:`);
    console.log(`  Night before: ${nightBeforeTime.toISOString()}`);
    console.log(`  1 hour before: ${oneHourBeforeTime.toISOString()}`);
    console.log(`  Event start: ${atEventStartTime.toISOString()}`);

    let messagesScheduled = 0;

    // Format data for personalization
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

    // 1. Night before reminder (SMS + Email)
    if (contractor.sms_opt_in && contractor.phone) {
      await scheduleCheckInReminderMessage({
        eventId,
        contractorId: contractor.id,
        reminderType: 'check_in_reminder_night_before',
        scheduledTime: nightBeforeTime,
        personalizationData: reminderData
      });
      messagesScheduled++;
    }

    await scheduleCheckInReminderEmail({
      eventId,
      contractorId: contractor.id,
      reminderType: 'check_in_reminder_night_before',
      scheduledTime: nightBeforeTime,
      personalizationData: reminderData
    });
    messagesScheduled++;

    // 2. One hour before reminder (SMS + Email)
    if (contractor.sms_opt_in && contractor.phone) {
      await scheduleCheckInReminderMessage({
        eventId,
        contractorId: contractor.id,
        reminderType: 'check_in_reminder_1_hour',
        scheduledTime: oneHourBeforeTime,
        personalizationData: reminderData
      });
      messagesScheduled++;
    }

    await scheduleCheckInReminderEmail({
      eventId,
      contractorId: contractor.id,
      reminderType: 'check_in_reminder_1_hour',
      scheduledTime: oneHourBeforeTime,
      personalizationData: reminderData
    });
    messagesScheduled++;

    // 3. Event start reminder (SMS + Email)
    if (contractor.sms_opt_in && contractor.phone) {
      await scheduleCheckInReminderMessage({
        eventId,
        contractorId: contractor.id,
        reminderType: 'check_in_reminder_event_start',
        scheduledTime: atEventStartTime,
        personalizationData: {
          first_name: firstName,
          event_name: event.name,
          location: event.location
        }
      });
      messagesScheduled++;
    }

    await scheduleCheckInReminderEmail({
      eventId,
      contractorId: contractor.id,
      reminderType: 'check_in_reminder_event_start',
      scheduledTime: atEventStartTime,
      personalizationData: {
        first_name: firstName,
        event_name: event.name,
        location: event.location
      }
    });
    messagesScheduled++;

    const smsCount = contractor.sms_opt_in && contractor.phone ? 3 : 0;
    const emailCount = 3;

    console.log(`[CheckInReminderScheduler] ✅ Scheduled ${messagesScheduled} check-in reminder messages for contractor ${contractorId} (${smsCount} SMS + ${emailCount} Email)`);

    return {
      success: true,
      messages_scheduled: messagesScheduled,
      contractor_id: contractorId,
      sms_count: smsCount,
      email_count: emailCount,
      reminder_times: {
        night_before: nightBeforeTime.toISOString(),
        one_hour_before: oneHourBeforeTime.toISOString(),
        event_start: atEventStartTime.toISOString()
      }
    };

  } catch (error) {
    console.error(`[CheckInReminderScheduler] ❌ Error scheduling check-in reminders for contractor ${contractorId}:`, error);
    throw error;
  }
}

/**
 * Schedule profile completion reminders for a SINGLE attendee with tiered approach
 * Called automatically on registration
 *
 * Strategy:
 * - If event is MORE than 3 days away:
 *   1. Send 3 daily reminders (1, 2, 3 days after registration)
 *   2. Pause reminders
 *   3. Resume 3 days before event (send reminders at 3, 2, 1 days before event)
 *
 * - If event is 3 days or LESS away:
 *   1. Send daily reminders until event day
 *
 * @param {number} eventId - Event ID
 * @param {number} contractorId - Contractor ID
 * @returns {Object} - Scheduling results
 */
async function scheduleProfileCompletionReminder(eventId, contractorId) {
  try {
    console.log(`[ProfileCompletionReminder] 📅 Scheduling profile completion reminders for contractor ${contractorId} at event ${eventId}`);

    // Get event details including the start time from first agenda item
    const eventResult = await query(`
      SELECT id, name, date, location
      FROM events
      WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      console.error(`[ProfileCompletionReminder] Event ${eventId} not found`);
      return { success: false, error: 'event_not_found' };
    }

    const event = eventResult.rows[0];

    // Get event start time from first agenda item
    const agendaResult = await query(`
      SELECT start_time
      FROM event_agenda_items
      WHERE event_id = $1
      ORDER BY start_time ASC
      LIMIT 1
    `, [eventId]);

    if (agendaResult.rows.length === 0) {
      console.error(`[ProfileCompletionReminder] No agenda items found for event ${eventId} - cannot determine event start time`);
      return { success: false, error: 'no_agenda_items' };
    }

    const eventStartTime = new Date(agendaResult.rows[0].start_time);

    // Get contractor details and profile status
    const contractorResult = await query(`
      SELECT c.id, c.first_name, c.last_name, c.phone, c.email, ea.sms_opt_in, ea.profile_completion_status, ea.registration_date
      FROM contractors c
      INNER JOIN event_attendees ea ON c.id = ea.contractor_id
      WHERE c.id = $1 AND ea.event_id = $2
    `, [contractorId, eventId]);

    if (contractorResult.rows.length === 0) {
      console.error(`[ProfileCompletionReminder] Contractor ${contractorId} not found or not registered for event ${eventId}`);
      return { success: false, error: 'contractor_not_found' };
    }

    const contractor = contractorResult.rows[0];

    // Check if profile is already complete - skip reminder if so
    if (contractor.profile_completion_status === 'completed') {
      console.log(`[ProfileCompletionReminder] Profile already complete for contractor ${contractorId}, skipping all reminders`);
      return {
        success: true,
        skipped: true,
        reason: 'profile_already_complete'
      };
    }

    const registrationDate = new Date(contractor.registration_date);
    const firstName = contractor.first_name || contractor.email.split('@')[0];

    // Calculate days until event
    const msUntilEvent = eventStartTime.getTime() - registrationDate.getTime();
    const daysUntilEvent = Math.floor(msUntilEvent / (1000 * 60 * 60 * 24));

    console.log(`[ProfileCompletionReminder] Event is ${daysUntilEvent} days away from registration`);

    const reminderTimes = [];

    if (daysUntilEvent > 3) {
      // Event is MORE than 3 days away
      // Phase 1: Send 3 daily reminders after registration (days 1, 2, 3)
      reminderTimes.push({
        time: new Date(registrationDate.getTime() + 1 * 24 * 60 * 60 * 1000),
        phase: 'initial',
        dayNumber: 1
      });
      reminderTimes.push({
        time: new Date(registrationDate.getTime() + 2 * 24 * 60 * 60 * 1000),
        phase: 'initial',
        dayNumber: 2
      });
      reminderTimes.push({
        time: new Date(registrationDate.getTime() + 3 * 24 * 60 * 60 * 1000),
        phase: 'initial',
        dayNumber: 3
      });

      // Phase 2: Resume 3 days before event (3 days, 2 days, 1 day before)
      reminderTimes.push({
        time: new Date(eventStartTime.getTime() - 3 * 24 * 60 * 60 * 1000),
        phase: 'final',
        dayNumber: 3
      });
      reminderTimes.push({
        time: new Date(eventStartTime.getTime() - 2 * 24 * 60 * 60 * 1000),
        phase: 'final',
        dayNumber: 2
      });
      reminderTimes.push({
        time: new Date(eventStartTime.getTime() - 1 * 24 * 60 * 60 * 1000),
        phase: 'final',
        dayNumber: 1
      });

      console.log(`[ProfileCompletionReminder] Scheduling 6 total reminders (3 initial + 3 final)`);
    } else {
      // Event is 3 days or LESS away
      // Send daily reminders until event
      for (let i = 1; i <= daysUntilEvent; i++) {
        reminderTimes.push({
          time: new Date(registrationDate.getTime() + i * 24 * 60 * 60 * 1000),
          phase: 'countdown',
          dayNumber: i
        });
      }

      console.log(`[ProfileCompletionReminder] Scheduling ${reminderTimes.length} daily reminders until event`);
    }

    let messagesScheduled = 0;

    // Schedule all reminders
    for (const reminder of reminderTimes) {
      const personalizationData = {
        first_name: firstName,
        event_name: event.name,
        event_date: event.date,
        event_id: eventId,
        contractor_id: contractorId,
        reminder_phase: reminder.phase,
        days_until_event: reminder.phase === 'final' ? reminder.dayNumber : null
      };

      // Schedule SMS reminder (if opted in and has phone)
      if (contractor.sms_opt_in && contractor.phone) {
        await scheduleProfileCompletionReminderSMS({
          eventId,
          contractorId: contractor.id,
          scheduledTime: reminder.time,
          personalizationData,
          reminderPhase: reminder.phase
        });
        messagesScheduled++;
      }

      // Schedule Email reminder (always)
      await scheduleProfileCompletionReminderEmail({
        eventId,
        contractorId: contractor.id,
        scheduledTime: reminder.time,
        personalizationData,
        reminderPhase: reminder.phase
      });
      messagesScheduled++;
    }

    const smsCount = contractor.sms_opt_in && contractor.phone ? reminderTimes.length : 0;
    const emailCount = reminderTimes.length;

    console.log(`[ProfileCompletionReminder] ✅ Scheduled ${messagesScheduled} total profile completion reminders for contractor ${contractorId} (${smsCount} SMS + ${emailCount} Email)`);

    return {
      success: true,
      messages_scheduled: messagesScheduled,
      contractor_id: contractorId,
      sms_count: smsCount,
      email_count: emailCount,
      reminder_count: reminderTimes.length,
      days_until_event: daysUntilEvent,
      strategy: daysUntilEvent > 3 ? 'tiered' : 'daily',
      reminder_times: reminderTimes.map(r => r.time.toISOString()),
      profile_status: contractor.profile_completion_status
    };

  } catch (error) {
    console.error(`[ProfileCompletionReminder] ❌ Error scheduling profile completion reminders for contractor ${contractorId}:`, error);
    throw error;
  }
}

/**
 * Schedule a profile completion reminder SMS
 *
 * @param {Object} params - Message parameters
 * @returns {Object} - Database insert result
 */
async function scheduleProfileCompletionReminderSMS({
  eventId,
  contractorId,
  scheduledTime,
  personalizationData,
  reminderPhase
}) {
  try {
    // Create SMS message content based on phase
    let messageContent = '';

    if (reminderPhase === 'initial') {
      // First 3 days after registration
      messageContent = `Hi ${personalizationData.first_name}! Quick reminder: Complete your profile for ${personalizationData.event_name} to unlock your personalized event experience. It only takes 2 minutes! 🚀`;
    } else if (reminderPhase === 'final') {
      // Final 3 days before event
      const daysUntil = personalizationData.days_until_event;
      messageContent = `${personalizationData.first_name}, ${personalizationData.event_name} is only ${daysUntil} day${daysUntil > 1 ? 's' : ''} away! Complete your profile now to unlock your personalized agenda and connections. Don't miss out! 🎯`;
    } else {
      // Countdown mode (event 3 days or less away)
      messageContent = `${personalizationData.first_name}, complete your profile for ${personalizationData.event_name} to get your personalized experience! Event is coming up soon! ⚡`;
    }

    // Get contractor phone for BullMQ job
    const contractorResult = await query(`
      SELECT phone FROM contractors WHERE id = $1
    `, [contractorId]);

    const phone = contractorResult.rows[0]?.phone;

    // Insert scheduled message into database
    const result = await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        direction,
        scheduled_time,
        status,
        message_content,
        personalization_data,
        created_at
      ) VALUES ($1, $2, $3, 'outbound', $4, 'scheduled', $5, $6, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      eventId,
      contractorId,
      'profile_completion_reminder',
      scheduledTime,
      messageContent,
      safeJsonStringify(personalizationData)
    ]);

    const message = result.rows[0];

    // Schedule message in BullMQ (System A - direct queueing)
    await scheduleEventMessage({
      id: message.id,
      event_id: eventId,
      contractor_id: contractorId,
      message_type: 'profile_completion_reminder',
      message_category: 'event_preparation',
      scheduled_time: scheduledTime,
      message_content: messageContent,
      personalization_data: personalizationData,
      phone: phone
    });

    console.log(`[ProfileCompletionReminder] ✅ SMS queued in BullMQ for contractor ${contractorId}`);

    return message;

  } catch (error) {
    console.error(`[ProfileCompletionReminder] Error scheduling SMS for contractor ${contractorId}:`, error);
    throw error;
  }
}

/**
 * Schedule a profile completion reminder EMAIL
 *
 * @param {Object} params - Message parameters
 * @returns {Object} - Database insert result
 */
async function scheduleProfileCompletionReminderEmail({
  eventId,
  contractorId,
  scheduledTime,
  personalizationData,
  reminderPhase
}) {
  try {
    // Get contractor email
    const contractorResult = await query(`
      SELECT email, first_name, last_name FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      console.error(`[ProfileCompletionReminder] Contractor ${contractorId} not found`);
      return null;
    }

    const contractor = contractorResult.rows[0];
    const email = contractor.email;

    if (!email) {
      console.log(`[ProfileCompletionReminder] No email for contractor ${contractorId}`);
      return null;
    }

    // Create subject and content based on phase
    let subject = '';
    let messageContent = '';

    if (reminderPhase === 'initial') {
      // First 3 days after registration
      subject = `${personalizationData.first_name}, unlock your personalized ${personalizationData.event_name} experience`;
      messageContent = `Hi ${personalizationData.first_name}! Complete your profile for ${personalizationData.event_name} to unlock your personalized event experience with curated connections. It only takes 2 minutes!`;
    } else if (reminderPhase === 'final') {
      // Final 3 days before event
      const daysUntil = personalizationData.days_until_event;
      subject = `URGENT: ${personalizationData.event_name} is ${daysUntil} day${daysUntil > 1 ? 's' : ''} away!`;
      messageContent = `${personalizationData.first_name}, ${personalizationData.event_name} is only ${daysUntil} day${daysUntil > 1 ? 's' : ''} away! Complete your profile now to unlock your personalized agenda, speaker recommendations, sponsor connections, and peer matches. Don't miss out on your curated experience!`;
    } else {
      // Countdown mode (event 3 days or less away)
      subject = `Complete your profile for ${personalizationData.event_name} - Event coming soon!`;
      messageContent = `${personalizationData.first_name}, complete your profile for ${personalizationData.event_name} to get your personalized experience! The event is approaching fast!`;
    }

    // Insert scheduled email message into database
    const result = await query(`
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
      ) VALUES ($1, $2, $3, 'outbound', 'email', $4, $5, $6, $7, 'scheduled', $8, $9, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      eventId,
      contractorId,
      'profile_completion_reminder',
      process.env.EVENT_FROM_EMAIL || 'events@power100.io',
      email,
      subject,
      scheduledTime,
      messageContent,
      safeJsonStringify(personalizationData)
    ]);

    const message = result.rows[0];

    // Schedule email message in BullMQ (System A - direct queueing)
    await scheduleEventMessage({
      id: message.id,
      event_id: eventId,
      contractor_id: contractorId,
      message_type: 'profile_completion_reminder',
      message_category: 'event_preparation',
      scheduled_time: scheduledTime,
      message_content: messageContent,
      personalization_data: personalizationData,
      email: email,
      subject: subject,
      from_email: process.env.EVENT_FROM_EMAIL || 'events@power100.io',
      to_email: email,
      channel: 'email'
    });

    console.log(`[ProfileCompletionReminder] ✅ Email queued in BullMQ for contractor ${contractorId}`);

    return message;

  } catch (error) {
    console.error(`[ProfileCompletionReminder] Error scheduling email for contractor ${contractorId}:`, error);
    throw error;
  }
}

module.exports = {
  scheduleCheckInReminders,
  scheduleCheckInRemindersForAttendee,
  scheduleProfileCompletionReminder
};
