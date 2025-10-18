// DATABASE-CHECKED: event_messages, event_agenda_items, event_sponsors (focus_areas_served, talking_points, special_offers), contractors, event_attendees columns verified and corrected on 2025-10-18
/**
 * End-of-Day Sponsor Batch Check Scheduler
 *
 * Creates scheduled sponsor attendance confirmation messages at end of event day
 * Prioritizes sponsors they requested talking points for, excludes those with existing PCRs
 *
 * Flow:
 * 1. Agenda generation calls scheduleSponsorBatchCheck()
 * 2. Scheduled for event end time (or day end for multi-day)
 * 3. Message queries ai_learning_events to prioritize sponsors with talking point requests
 * 4. Excludes sponsors with existing PCRs from previous days (multi-day events)
 * 5. eventMessageWorker sends AI-driven batch check message
 * 6. Contractor replies with numbers (e.g., "1" or "1,2,3")
 * 7. Response handler processes each sponsor sequentially for PCR
 */

const { query } = require('../../config/database');
const { safeJsonStringify } = require('../../utils/jsonHelpers');
const { scheduleEventMessage } = require('../../queues/eventMessageQueue');

/**
 * Schedule end-of-day sponsor batch check for an event
 * Called during agenda generation
 *
 * @param {number} eventId - Event ID
 * @param {number} dayNumber - Day number for multi-day events (default 1)
 * @returns {Object} - Scheduling results
 */
async function scheduleSponsorBatchCheck(eventId, dayNumber = 1) {
  try {
    console.log(`[SponsorBatchCheckScheduler] 📊 Scheduling end-of-day sponsor checks for event ${eventId}, day ${dayNumber}`);

    // Get event end time from agenda (last agenda item end_time)
    const eventEndResult = await query(`
      SELECT MAX(end_time) as event_end_time
      FROM event_agenda_items
      WHERE event_id = $1
    `, [eventId]);

    if (eventEndResult.rows.length === 0 || !eventEndResult.rows[0].event_end_time) {
      console.log(`[SponsorBatchCheckScheduler] No agenda items found for event ${eventId}`);
      return { success: false, error: 'No agenda items found' };
    }

    const eventEndTime = new Date(eventEndResult.rows[0].event_end_time);

    // Get all sponsors for this event
    const sponsorsResult = await query(`
      SELECT
        id,
        sponsor_name,
        booth_number,
        focus_areas_served,
        talking_points,
        special_offers
      FROM event_sponsors
      WHERE event_id = $1
      ORDER BY id
    `, [eventId]);

    const sponsors = sponsorsResult.rows;
    console.log(`[SponsorBatchCheckScheduler] Found ${sponsors.length} sponsors`);

    if (sponsors.length === 0) {
      console.log(`[SponsorBatchCheckScheduler] No sponsors found`);
      return { success: true, messages_scheduled: 0, reason: 'no_sponsors' };
    }

    // Get all attendees with SMS opt-in
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
    console.log(`[SponsorBatchCheckScheduler] Found ${attendees.length} eligible attendees`);

    if (attendees.length === 0) {
      console.log(`[SponsorBatchCheckScheduler] No eligible attendees found`);
      return { success: true, messages_scheduled: 0, reason: 'no_attendees' };
    }

    // Schedule batch check for each attendee at event end time
    const messagesScheduled = [];

    for (const attendee of attendees) {
      const message = await scheduleSponsorBatchCheckMessage(
        eventId,
        attendee,
        sponsors,
        eventEndTime,
        dayNumber
      );
      messagesScheduled.push(message);
    }

    console.log(`[SponsorBatchCheckScheduler] ✅ Complete: ${messagesScheduled.length} batch check messages scheduled`);

    return {
      success: true,
      attendees_count: attendees.length,
      sponsors_count: sponsors.length,
      messages_scheduled: messagesScheduled.length,
      scheduled_time: eventEndTime,
      day_number: dayNumber,
      messages: messagesScheduled
    };

  } catch (error) {
    console.error('[SponsorBatchCheckScheduler] ❌ Error scheduling sponsor batch checks:', error);
    throw error;
  }
}

/**
 * Schedule a single sponsor batch check message
 * Creates message in database and schedules via BullMQ
 *
 * Message will query ai_learning_events at send time to prioritize sponsors
 * with talking point requests and exclude sponsors with existing PCRs
 *
 * @param {number} eventId - Event ID
 * @param {Object} attendee - Contractor receiving the batch check
 * @param {Array} sponsors - All sponsors for the event
 * @param {Date} scheduledTime - When to send (event end time)
 * @param {number} dayNumber - Day number for multi-day events
 * @returns {Object} - Scheduled message details
 */
async function scheduleSponsorBatchCheckMessage(eventId, attendee, sponsors, scheduledTime, dayNumber) {
  try {
    // Prepare personalization data
    // Worker will query ai_learning_events and pcr_feedback at send time
    // to build prioritized list and exclude completed sponsors
    const personalizationData = {
      day_number: dayNumber,
      all_sponsors: sponsors.map(s => ({
        id: s.id,
        sponsor_name: s.sponsor_name,
        booth_number: s.booth_number,
        focus_areas_served: s.focus_areas_served,
        talking_points: s.talking_points,
        special_offers: s.special_offers
      })),
      // These will be populated by worker at send time:
      // - prioritized_sponsors (talking points first, then others)
      // - excluded_sponsor_ids (those with existing PCRs)
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
      'sponsor_batch_check',
      'pcr_collection',
      scheduledTime,
      '', // Empty - will be generated by AI worker
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
      message_type: 'sponsor_batch_check',
      message_category: 'pcr_collection',
      scheduled_time: message.scheduled_time,
      message_content: '',
      personalization_data: personalizationData,
      phone: attendee.phone
    });

    console.log(`[SponsorBatchCheckScheduler] Scheduled batch check ${message.id} for contractor ${attendee.id} at ${scheduledTime.toISOString()}`);

    return {
      message_id: message.id,
      contractor_id: attendee.id,
      scheduled_time: message.scheduled_time,
      day_number: dayNumber
    };

  } catch (error) {
    console.error('[SponsorBatchCheckScheduler] Error scheduling batch check message:', error);
    throw error;
  }
}

module.exports = {
  scheduleSponsorBatchCheck,
  scheduleSponsorBatchCheckMessage
};
