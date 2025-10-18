// DATABASE-CHECKED: event_messages, event_agenda_items, event_attendees columns verified on 2025-10-18
/**
 * Speaker Alert Message Scheduler
 *
 * Creates scheduled speaker alert messages when agenda is generated
 * Messages are sent 15 minutes before each speaker session starts
 *
 * Flow:
 * 1. Agenda generation calls scheduleSpeakerAlerts()
 * 2. Creates event_messages records for each session, scheduled for start_time - 15 minutes
 * 3. eventMessageWorker automatically sends alerts at scheduled time
 */

const { query } = require('../../config/database');
const { safeJsonStringify } = require('../../utils/jsonHelpers');
const { scheduleEventMessage } = require('../../queues/eventMessageQueue');

/**
 * Schedule all speaker alert messages for an event
 * Called during agenda generation
 *
 * @param {number} eventId - Event ID
 * @returns {Object} - Scheduling results
 */
async function scheduleSpeakerAlerts(eventId) {
  try {
    console.log(`[SpeakerAlertScheduler] 📢 Scheduling speaker alerts for event ${eventId}`);

    // Get all speaker sessions from agenda
    const sessionsResult = await query(`
      SELECT
        eai.id as agenda_item_id,
        eai.start_time,
        eai.end_time,
        eai.location,
        eai.speaker_id,
        es.name as speaker_name,
        es.session_title,
        es.session_description,
        es.company as speaker_company
      FROM event_agenda_items eai
      INNER JOIN event_speakers es ON eai.speaker_id = es.id
      WHERE eai.event_id = $1
        AND eai.item_type = 'session'
      ORDER BY eai.start_time ASC
    `, [eventId]);

    const sessions = sessionsResult.rows;
    console.log(`[SpeakerAlertScheduler] Found ${sessions.length} speaker sessions`);

    if (sessions.length === 0) {
      console.log(`[SpeakerAlertScheduler] No speaker sessions found`);
      return { success: true, messages_scheduled: 0, reason: 'no_sessions' };
    }

    // Get all attendees with complete profiles and SMS opt-in
    const attendeesResult = await query(`
      SELECT DISTINCT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.focus_areas,
        ea.profile_completion_status
      FROM contractors c
      INNER JOIN event_attendees ea ON c.id = ea.contractor_id
      WHERE ea.event_id = $1
        AND ea.profile_completion_status = 'complete'
        AND ea.sms_opt_in = true
        AND c.phone IS NOT NULL
    `, [eventId]);

    const attendees = attendeesResult.rows;
    console.log(`[SpeakerAlertScheduler] Found ${attendees.length} eligible attendees`);

    if (attendees.length === 0) {
      console.log(`[SpeakerAlertScheduler] No eligible attendees found`);
      return { success: true, messages_scheduled: 0, reason: 'no_attendees' };
    }

    // Schedule speaker alert for each session for each attendee
    const messagesScheduled = [];

    for (const session of sessions) {
      // Calculate alert time: 15 minutes before session starts
      const alertTime = new Date(session.start_time);
      alertTime.setMinutes(alertTime.getMinutes() - 15);

      console.log(`[SpeakerAlertScheduler] Session: ${session.session_title} at ${session.start_time}, alert at ${alertTime.toISOString()}`);

      for (const attendee of attendees) {
        // Create speaker alert message
        const message = await scheduleSpeakerAlertMessage(
          eventId,
          attendee,
          session,
          alertTime
        );
        messagesScheduled.push(message);
      }

      console.log(`[SpeakerAlertScheduler] ✅ Scheduled ${attendees.length} alerts for session: ${session.session_title}`);
    }

    console.log(`[SpeakerAlertScheduler] ✅ Complete: ${messagesScheduled.length} speaker alerts scheduled`);

    return {
      success: true,
      sessions_count: sessions.length,
      attendees_count: attendees.length,
      messages_scheduled: messagesScheduled.length,
      messages: messagesScheduled
    };

  } catch (error) {
    console.error('[SpeakerAlertScheduler] ❌ Error scheduling speaker alerts:', error);
    throw error;
  }
}

/**
 * Schedule a single speaker alert message
 * Creates message in database and schedules via BullMQ
 *
 * @param {number} eventId - Event ID
 * @param {Object} attendee - Contractor receiving the alert
 * @param {Object} session - Speaker session details
 * @param {Date} scheduledTime - When to send the alert (15 min before session)
 * @returns {Object} - Scheduled message details
 */
async function scheduleSpeakerAlertMessage(eventId, attendee, session, scheduledTime) {
  try {
    // Prepare personalization data for message generation
    const personalizationData = {
      agenda_item_id: session.agenda_item_id,
      speaker_id: session.speaker_id,
      speaker_name: session.speaker_name,
      session_title: session.session_title,
      session_description: session.session_description,
      speaker_company: session.speaker_company,
      location: session.location,
      start_time: session.start_time,
      // AI will use focus_areas to personalize the recommendation
      contractor_focus_areas: attendee.focus_areas
    };

    // Create message record in database
    const messageResult = await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        message_category,
        scheduled_time,
        message_content,
        personalization_data,
        phone,
        status,
        direction,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id, scheduled_time
    `, [
      eventId,
      attendee.id,
      'speaker_alert',
      'event_day_real_time',
      scheduledTime,
      '', // Empty - will be generated by worker from personalization_data
      safeJsonStringify(personalizationData),
      attendee.phone,
      'scheduled',
      'outbound'
    ]);

    const message = messageResult.rows[0];

    // Schedule message in BullMQ
    await scheduleEventMessage({
      id: message.id,
      event_id: eventId,
      contractor_id: attendee.id,
      message_type: 'speaker_alert',
      message_category: 'event_day_real_time',
      scheduled_time: message.scheduled_time,
      message_content: '',
      personalization_data: personalizationData,
      phone: attendee.phone
    });

    console.log(`[SpeakerAlertScheduler] Scheduled speaker alert ${message.id} for contractor ${attendee.id} at ${scheduledTime.toISOString()}`);

    return {
      message_id: message.id,
      contractor_id: attendee.id,
      session_title: session.session_title,
      speaker_name: session.speaker_name,
      scheduled_time: message.scheduled_time
    };

  } catch (error) {
    console.error('[SpeakerAlertScheduler] Error scheduling speaker alert message:', error);
    throw error;
  }
}

module.exports = {
  scheduleSpeakerAlerts,
  scheduleSpeakerAlertMessage
};
