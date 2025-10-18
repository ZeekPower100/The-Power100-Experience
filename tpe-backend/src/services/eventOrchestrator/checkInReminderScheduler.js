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

      // 1. Night before reminder
      await scheduleCheckInReminderMessage({
        eventId,
        contractorId: attendee.id,
        reminderType: 'check_in_reminder_night_before',
        scheduledTime: nightBeforeTime,
        personalizationData: {
          first_name: firstName,
          event_name: event.name,
          event_date: event.date,
          event_time: eventTimeFormatted,
          location: event.location
        }
      });
      messagesScheduled++;

      // 2. One hour before reminder
      await scheduleCheckInReminderMessage({
        eventId,
        contractorId: attendee.id,
        reminderType: 'check_in_reminder_1_hour',
        scheduledTime: oneHourBeforeTime,
        personalizationData: {
          first_name: firstName,
          event_name: event.name,
          event_time: eventTimeFormatted,
          location: event.location
        }
      });
      messagesScheduled++;

      // 3. Event start reminder
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
    }

    console.log(`[CheckInReminderScheduler] ✅ Scheduled ${messagesScheduled} check-in reminder messages (${attendees.length} attendees × 3 reminders)`);

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
        messageContent = `Hi ${personalizationData.first_name}! Tomorrow's the big day - ${personalizationData.event_name} starts at ${personalizationData.event_time}. Location: ${personalizationData.location}. See you there!`;
        break;

      case 'check_in_reminder_1_hour':
        messageContent = `Alright, ${personalizationData.first_name}! You have just enough time to grab a coffee and a quick bite before we need to be at the event in an hour. Let's get ready to breakthrough. The time is now!`;
        break;

      case 'check_in_reminder_event_start':
        messageContent = `${personalizationData.event_name} is starting NOW! Head to ${personalizationData.location} for check-in. Let's make today count!`;
        break;

      default:
        messageContent = `Reminder: ${personalizationData.event_name} check-in`;
    }

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

    return result.rows[0];

  } catch (error) {
    console.error(`[CheckInReminderScheduler] Error scheduling ${reminderType} for contractor ${contractorId}:`, error);
    throw error;
  }
}

module.exports = {
  scheduleCheckInReminders
};
