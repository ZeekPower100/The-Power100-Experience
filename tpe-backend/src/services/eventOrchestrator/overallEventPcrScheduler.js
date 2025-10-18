// DATABASE-CHECKED: event_messages, event_agenda_items, event_attendees (check_in_time), event_peer_matches (connection_made), contractors columns verified and corrected on 2025-10-18
/**
 * Overall Event PCR Scheduler
 *
 * Creates scheduled overall event feedback messages 1 hour after event ends
 * Requests overall event experience rating and wrap-up
 *
 * Flow:
 * 1. Agenda generation calls scheduleOverallEventPCR()
 * 2. Creates post_event_wrap_up message scheduled for event end + 1 hour
 * 3. eventMessageWorker sends AI-driven wrap-up with stats
 * 4. Contractor rates overall event experience (1-5)
 * 5. Response handler saves overall event PCR
 */

const { query } = require('../../config/database');
const { safeJsonStringify } = require('../../utils/jsonHelpers');
const { scheduleEventMessage } = require('../../queues/eventMessageQueue');

/**
 * Schedule overall event PCR requests for all attendees
 * Called during agenda generation
 *
 * @param {number} eventId - Event ID
 * @returns {Object} - Scheduling results
 */
async function scheduleOverallEventPCR(eventId) {
  try {
    console.log(`[OverallEventPCRScheduler] 🎯 Scheduling overall event PCR for event ${eventId}`);

    // Get event end time from agenda (last agenda item end_time)
    const eventEndResult = await query(`
      SELECT MAX(end_time) as event_end_time
      FROM event_agenda_items
      WHERE event_id = $1
    `, [eventId]);

    if (eventEndResult.rows.length === 0 || !eventEndResult.rows[0].event_end_time) {
      console.log(`[OverallEventPCRScheduler] No agenda items found for event ${eventId}`);
      return { success: false, error: 'No agenda items found' };
    }

    const eventEndTime = new Date(eventEndResult.rows[0].event_end_time);

    // Schedule PCR request 1 hour after event ends
    const pcrRequestTime = new Date(eventEndTime.getTime() + (60 * 60 * 1000));

    console.log(`[OverallEventPCRScheduler] Event ends at ${eventEndTime.toISOString()}, PCR at ${pcrRequestTime.toISOString()}`);

    // Get all attendees who checked in (they actually attended)
    const attendeesResult = await query(`
      SELECT DISTINCT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        ea.check_in_time
      FROM contractors c
      INNER JOIN event_attendees ea ON c.id = ea.contractor_id
      WHERE ea.event_id = $1
        AND ea.check_in_time IS NOT NULL
        AND ea.sms_opt_in = true
        AND c.phone IS NOT NULL
    `, [eventId]);

    const attendees = attendeesResult.rows;
    console.log(`[OverallEventPCRScheduler] Found ${attendees.length} attendees who checked in`);

    if (attendees.length === 0) {
      console.log(`[OverallEventPCRScheduler] No eligible attendees found`);
      return { success: true, messages_scheduled: 0, reason: 'no_attendees' };
    }

    // Schedule overall event PCR for each attendee
    const messagesScheduled = [];

    for (const attendee of attendees) {
      const message = await scheduleOverallEventPCRMessage(
        eventId,
        attendee,
        pcrRequestTime
      );
      messagesScheduled.push(message);
    }

    console.log(`[OverallEventPCRScheduler] ✅ Complete: ${messagesScheduled.length} overall event PCR requests scheduled`);

    return {
      success: true,
      attendees_count: attendees.length,
      messages_scheduled: messagesScheduled.length,
      scheduled_time: pcrRequestTime,
      messages: messagesScheduled
    };

  } catch (error) {
    console.error('[OverallEventPCRScheduler] ❌ Error scheduling overall event PCR:', error);
    throw error;
  }
}

/**
 * Schedule a single overall event PCR message
 * Creates message in database and schedules via BullMQ
 *
 * @param {number} eventId - Event ID
 * @param {Object} attendee - Contractor receiving the PCR request
 * @param {Date} scheduledTime - When to send (event end + 1 hour)
 * @returns {Object} - Scheduled message details
 */
async function scheduleOverallEventPCRMessage(eventId, attendee, scheduledTime) {
  try {
    // Get event stats for this contractor to personalize wrap-up
    // Count peer matches, sponsor visits, sessions attended
    const statsResult = await query(`
      SELECT
        (SELECT COUNT(*) FROM event_peer_matches
         WHERE event_id = $1
           AND (contractor1_id = $2 OR contractor2_id = $2)
           AND connection_made = true) as peer_matches,
        (SELECT COUNT(DISTINCT personalization_data->>'sponsor_id')
         FROM event_messages
         WHERE event_id = $1 AND contractor_id = $2
           AND message_type = 'attendance_check'
           AND personalization_data->>'attendance_type' = 'sponsor'
           AND status = 'sent') as sponsor_visits,
        (SELECT COUNT(DISTINCT personalization_data->>'speaker_id')
         FROM event_messages
         WHERE event_id = $1 AND contractor_id = $2
           AND message_type = 'attendance_check'
           AND personalization_data->>'attendance_type' = 'speaker'
           AND status = 'sent') as sessions_attended
    `, [eventId, attendee.id]);

    const stats = statsResult.rows[0] || {
      peer_matches: 0,
      sponsor_visits: 0,
      sessions_attended: 0
    };

    // Prepare personalization data for wrap-up message
    const personalizationData = {
      peer_matches: parseInt(stats.peer_matches) || 0,
      sponsor_visits: parseInt(stats.sponsor_visits) || 0,
      sessions_attended: parseInt(stats.sessions_attended) || 0
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
      'post_event_wrap_up',
      'pcr_collection',
      scheduledTime,
      '', // Empty - will be generated by AI worker with stats
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
      message_type: 'post_event_wrap_up',
      message_category: 'pcr_collection',
      scheduled_time: message.scheduled_time,
      message_content: '',
      personalization_data: personalizationData,
      phone: attendee.phone
    });

    console.log(`[OverallEventPCRScheduler] Scheduled overall PCR ${message.id} for contractor ${attendee.id} at ${scheduledTime.toISOString()}`);

    return {
      message_id: message.id,
      contractor_id: attendee.id,
      scheduled_time: message.scheduled_time,
      stats: personalizationData
    };

  } catch (error) {
    console.error('[OverallEventPCRScheduler] Error scheduling overall event PCR message:', error);
    throw error;
  }
}

module.exports = {
  scheduleOverallEventPCR,
  scheduleOverallEventPCRMessage
};
