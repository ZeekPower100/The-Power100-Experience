// DATABASE-CHECKED: event_messages, event_agenda_items, event_sponsors (focus_areas_served, talking_points, special_offers), event_attendees columns verified and corrected on 2025-10-18
/**
 * Sponsor Recommendation Message Scheduler
 *
 * Creates scheduled sponsor recommendation messages when agenda is generated
 * Messages are sent during breaks to recommend relevant sponsors to contractors
 *
 * Flow:
 * 1. Agenda generation calls scheduleSponsorRecommendations()
 * 2. Creates event_messages records for each break, scheduled for start_time + 2 minutes
 * 3. eventMessageWorker automatically sends recommendations at scheduled time
 */

const { query } = require('../../config/database');
const { safeJsonStringify } = require('../../utils/jsonHelpers');
const { scheduleEventMessage } = require('../../queues/eventMessageQueue');

/**
 * Schedule all sponsor recommendation messages for an event
 * Called during agenda generation
 *
 * @param {number} eventId - Event ID
 * @returns {Object} - Scheduling results
 */
async function scheduleSponsorRecommendations(eventId) {
  try {
    console.log(`[SponsorRecommendationScheduler] 🤝 Scheduling sponsor recommendations for event ${eventId}`);

    // Get all breaks and lunch periods from agenda
    const breaksResult = await query(`
      SELECT
        id as agenda_item_id,
        start_time,
        end_time,
        item_type,
        title,
        location
      FROM event_agenda_items
      WHERE event_id = $1
        AND item_type IN ('break', 'lunch')
      ORDER BY start_time ASC
    `, [eventId]);

    const breaks = breaksResult.rows;
    console.log(`[SponsorRecommendationScheduler] Found ${breaks.length} break periods`);

    if (breaks.length === 0) {
      console.log(`[SponsorRecommendationScheduler] No break periods found`);
      return { success: true, messages_scheduled: 0, reason: 'no_breaks' };
    }

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
    console.log(`[SponsorRecommendationScheduler] Found ${sponsors.length} sponsors`);

    if (sponsors.length === 0) {
      console.log(`[SponsorRecommendationScheduler] No sponsors found`);
      return { success: true, messages_scheduled: 0, reason: 'no_sponsors' };
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
        c.revenue_tier,
        ea.profile_completion_status
      FROM contractors c
      INNER JOIN event_attendees ea ON c.id = ea.contractor_id
      WHERE ea.event_id = $1
        AND ea.profile_completion_status = 'complete'
        AND ea.sms_opt_in = true
        AND c.phone IS NOT NULL
    `, [eventId]);

    const attendees = attendeesResult.rows;
    console.log(`[SponsorRecommendationScheduler] Found ${attendees.length} eligible attendees`);

    if (attendees.length === 0) {
      console.log(`[SponsorRecommendationScheduler] No eligible attendees found`);
      return { success: true, messages_scheduled: 0, reason: 'no_attendees' };
    }

    // Schedule sponsor recommendation for each break for each attendee
    const messagesScheduled = [];

    for (const breakPeriod of breaks) {
      // Calculate recommendation time: 2 minutes after break starts
      const recommendationTime = new Date(breakPeriod.start_time);
      recommendationTime.setMinutes(recommendationTime.getMinutes() + 2);

      console.log(`[SponsorRecommendationScheduler] Break: ${breakPeriod.title} at ${breakPeriod.start_time}, recommendations at ${recommendationTime.toISOString()}`);

      for (const attendee of attendees) {
        // Create sponsor recommendation message (AI will match sponsors to contractor in worker)
        const message = await scheduleSponsorRecommendationMessage(
          eventId,
          attendee,
          sponsors,
          breakPeriod,
          recommendationTime
        );
        messagesScheduled.push(message);
      }

      console.log(`[SponsorRecommendationScheduler] ✅ Scheduled ${attendees.length} recommendations for break: ${breakPeriod.title}`);
    }

    console.log(`[SponsorRecommendationScheduler] ✅ Complete: ${messagesScheduled.length} sponsor recommendations scheduled`);

    return {
      success: true,
      breaks_count: breaks.length,
      sponsors_count: sponsors.length,
      attendees_count: attendees.length,
      messages_scheduled: messagesScheduled.length,
      messages: messagesScheduled
    };

  } catch (error) {
    console.error('[SponsorRecommendationScheduler] ❌ Error scheduling sponsor recommendations:', error);
    throw error;
  }
}

/**
 * Schedule a single sponsor recommendation message
 * Creates message in database and schedules via BullMQ
 *
 * @param {number} eventId - Event ID
 * @param {Object} attendee - Contractor receiving the recommendation
 * @param {Array} sponsors - All sponsors for the event
 * @param {Object} breakPeriod - Break period details
 * @param {Date} scheduledTime - When to send the recommendation (2 min after break starts)
 * @returns {Object} - Scheduled message details
 */
async function scheduleSponsorRecommendationMessage(eventId, attendee, sponsors, breakPeriod, scheduledTime) {
  try {
    // Prepare personalization data for message generation
    // AI will use this to match top 3 sponsors to contractor focus areas/revenue tier
    const personalizationData = {
      agenda_item_id: breakPeriod.agenda_item_id,
      break_type: breakPeriod.item_type,
      break_title: breakPeriod.title,
      location: breakPeriod.location,
      sponsors: sponsors.map(s => ({
        id: s.id,
        sponsor_name: s.sponsor_name,
        booth_number: s.booth_number,
        focus_areas_served: s.focus_areas_served,
        talking_points: s.talking_points,
        special_offers: s.special_offers
      })),
      contractor_focus_areas: attendee.focus_areas,
      contractor_revenue_tier: attendee.revenue_tier
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
      'sponsor_recommendation',
      'event_day_real_time',
      scheduledTime,
      '', // Empty - will be generated by worker with AI matching
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
      message_type: 'sponsor_recommendation',
      message_category: 'event_day_real_time',
      scheduled_time: message.scheduled_time,
      message_content: '',
      personalization_data: personalizationData,
      phone: attendee.phone
    });

    console.log(`[SponsorRecommendationScheduler] Scheduled sponsor recommendation ${message.id} for contractor ${attendee.id} at ${scheduledTime.toISOString()}`);

    return {
      message_id: message.id,
      contractor_id: attendee.id,
      break_title: breakPeriod.title,
      scheduled_time: message.scheduled_time
    };

  } catch (error) {
    console.error('[SponsorRecommendationScheduler] Error scheduling sponsor recommendation message:', error);
    throw error;
  }
}

module.exports = {
  scheduleSponsorRecommendations,
  scheduleSponsorRecommendationMessage
};
