// DATABASE-CHECKED: event_messages, event_agenda_items, event_speakers, event_attendees columns verified on 2025-10-18
/**
 * Attendance Confirmation Scheduler (formerly PCR Request Scheduler)
 *
 * Creates scheduled attendance confirmation messages when agenda is generated
 * Messages are sent 7 minutes after each speaker session ends
 *
 * IMPORTANT: This creates attendance_check messages, NOT pcr_request messages
 * The flow is:
 * 1. Agenda generation calls schedulePCRRequests()
 * 2. Creates attendance_check messages scheduled for end_time + 7 minutes
 * 3. eventMessageWorker sends "Did you attend?" confirmation
 * 4. attendanceHandlers.js processes YES/NO response
 * 5. If YES without PCR → attendanceHandlers sends pcr_request automatically
 * 6. If YES with PCR → attendanceHandlers saves PCR and sends thank you
 * 7. If NO → attendanceHandlers acknowledges, no PCR needed
 */

const { query } = require('../../config/database');
const { safeJsonStringify } = require('../../utils/jsonHelpers');
const { scheduleEventMessage } = require('../../queues/eventMessageQueue');

/**
 * Schedule all PCR request messages for an event
 * Called during agenda generation
 *
 * @param {number} eventId - Event ID
 * @returns {Object} - Scheduling results
 */
async function schedulePCRRequests(eventId) {
  try {
    console.log(`[PCRRequestScheduler] 📊 Scheduling PCR requests for event ${eventId}`);

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
    console.log(`[PCRRequestScheduler] Found ${sessions.length} speaker sessions`);

    if (sessions.length === 0) {
      console.log(`[PCRRequestScheduler] No speaker sessions found`);
      return { success: true, messages_scheduled: 0, reason: 'no_sessions' };
    }

    // Get all attendees with SMS opt-in (they'll receive speaker alerts, so likely to attend)
    const attendeesResult = await query(`
      SELECT DISTINCT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        ea.sms_opt_in
      FROM contractors c
      INNER JOIN event_attendees ea ON c.id = ea.contractor_id
      WHERE ea.event_id = $1
        AND ea.sms_opt_in = true
        AND c.phone IS NOT NULL
    `, [eventId]);

    const attendees = attendeesResult.rows;
    console.log(`[PCRRequestScheduler] Found ${attendees.length} eligible attendees`);

    if (attendees.length === 0) {
      console.log(`[PCRRequestScheduler] No eligible attendees found`);
      return { success: true, messages_scheduled: 0, reason: 'no_attendees' };
    }

    // Schedule PCR request for each session for each attendee
    const messagesScheduled = [];

    for (const session of sessions) {
      // Calculate PCR request time: 7 minutes after session ends
      const pcrRequestTime = new Date(session.end_time);
      pcrRequestTime.setMinutes(pcrRequestTime.getMinutes() + 7);

      console.log(`[PCRRequestScheduler] Session: ${session.session_title} ends ${session.end_time}, PCR request at ${pcrRequestTime.toISOString()}`);

      for (const attendee of attendees) {
        // Create PCR request message
        const message = await schedulePCRRequestMessage(
          eventId,
          attendee,
          session,
          pcrRequestTime
        );
        messagesScheduled.push(message);
      }

      console.log(`[PCRRequestScheduler] ✅ Scheduled ${attendees.length} PCR requests for session: ${session.session_title}`);
    }

    console.log(`[PCRRequestScheduler] ✅ Complete: ${messagesScheduled.length} PCR requests scheduled`);

    return {
      success: true,
      sessions_count: sessions.length,
      attendees_count: attendees.length,
      messages_scheduled: messagesScheduled.length,
      messages: messagesScheduled
    };

  } catch (error) {
    console.error('[PCRRequestScheduler] ❌ Error scheduling PCR requests:', error);
    throw error;
  }
}

/**
 * Schedule a single PCR request message
 * Creates message in database and schedules via BullMQ
 *
 * @param {number} eventId - Event ID
 * @param {Object} attendee - Contractor receiving the PCR request
 * @param {Object} session - Speaker session details
 * @param {Date} scheduledTime - When to send the PCR request (7 min after session ends)
 * @returns {Object} - Scheduled message details
 */
async function schedulePCRRequestMessage(eventId, attendee, session, scheduledTime) {
  try {
    // Prepare personalization data for attendance confirmation
    // attendanceHandlers.js expects: attendance_type, session_name/speaker_name, session_id/speaker_id
    const personalizationData = {
      attendance_type: 'speaker', // Used by attendanceHandlers to understand context
      session_name: session.session_title,
      speaker_name: session.speaker_name,
      session_id: session.agenda_item_id,
      speaker_id: session.speaker_id,
      session_description: session.session_description,
      speaker_company: session.speaker_company,
      location: session.location
    };

    // Create message record in database
    // IMPORTANT: message_type = 'attendance_check' NOT 'pcr_request'
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
      'attendance_check', // Changed from 'pcr_request'
      'pcr_collection',
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
      message_type: 'attendance_check', // Changed from 'pcr_request'
      message_category: 'pcr_collection',
      scheduled_time: message.scheduled_time,
      message_content: '',
      personalization_data: personalizationData,
      phone: attendee.phone
    });

    console.log(`[PCRRequestScheduler] Scheduled PCR request ${message.id} for contractor ${attendee.id} at ${scheduledTime.toISOString()}`);

    return {
      message_id: message.id,
      contractor_id: attendee.id,
      session_title: session.session_title,
      speaker_name: session.speaker_name,
      scheduled_time: message.scheduled_time
    };

  } catch (error) {
    console.error('[PCRRequestScheduler] Error scheduling PCR request message:', error);
    throw error;
  }
}

module.exports = {
  schedulePCRRequests,
  schedulePCRRequestMessage
};
