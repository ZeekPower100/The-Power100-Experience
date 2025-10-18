// DATABASE-CHECKED: event_peer_matches, event_messages, event_attendees, event_agenda_items columns verified on 2025-10-18
/**
 * Peer Matching Batch Scheduler
 *
 * Schedules batch peer matching to run ONCE per event at optimal time (15 min before lunch)
 * This ensures maximum match quality by waiting until most attendees have checked in
 *
 * Flow:
 * 1. Agenda generation schedules peer matching job for lunch_time - 15 minutes
 * 2. At scheduled time, runs matching for ALL checked-in contractors
 * 3. Creates peer_match records for best matches
 * 4. Schedules peer introduction SMS for lunch_time + 5 minutes
 */

const { query } = require('../../config/database');
const { safeJsonStringify } = require('../../utils/jsonHelpers');
const peerMatchingService = require('../peerMatchingService');
const { scheduleEventMessage } = require('../../queues/eventMessageQueue');
const { scheduleBatchPeerMatchingJob } = require('../../queues/eventOrchestrationQueue');

/**
 * Run batch peer matching for an event
 * Called at scheduled time (15 min before lunch)
 *
 * @param {number} eventId - Event ID
 * @returns {Object} - Matching results
 */
async function runBatchPeerMatching(eventId) {
  try {
    console.log(`[PeerMatchingBatch] 🤝 Running batch peer matching for event ${eventId}`);

    // Get all checked-in contractors
    // DATABASE-CHECKED: Using exact field names from event_attendees and contractors
    const contractorsResult = await query(`
      SELECT DISTINCT
        c.id,
        c.first_name,
        c.last_name,
        c.phone,
        c.email,
        c.company_name,
        c.service_area,
        c.focus_areas,
        c.revenue_tier,
        c.team_size,
        c.services_offered,
        c.job_title,
        ea.check_in_time
      FROM contractors c
      INNER JOIN event_attendees ea ON c.id = ea.contractor_id
      WHERE ea.event_id = $1
        AND ea.check_in_time IS NOT NULL
        AND ea.sms_opt_in = true
        AND c.phone IS NOT NULL
      ORDER BY ea.check_in_time ASC
    `, [eventId]);

    const contractors = contractorsResult.rows;
    console.log(`[PeerMatchingBatch] Found ${contractors.length} checked-in contractors`);

    if (contractors.length < 2) {
      console.log(`[PeerMatchingBatch] Not enough contractors for matching (need at least 2)`);
      return { success: true, matches_created: 0, messages_scheduled: 0, reason: 'insufficient_contractors' };
    }

    // Get lunch time for scheduling introduction messages
    const lunchTimeResult = await query(`
      SELECT start_time
      FROM event_agenda_items
      WHERE event_id = $1
        AND item_type = 'lunch'
      ORDER BY start_time ASC
      LIMIT 1
    `, [eventId]);

    if (lunchTimeResult.rows.length === 0) {
      console.log(`[PeerMatchingBatch] No lunch time found in agenda`);
      return { success: false, error: 'No lunch time in agenda' };
    }

    const lunchTime = lunchTimeResult.rows[0].start_time;

    // Calculate introduction message send time (lunch + 5 minutes)
    const introductionTime = new Date(lunchTime);
    introductionTime.setMinutes(introductionTime.getMinutes() + 5);

    console.log(`[PeerMatchingBatch] Lunch time: ${lunchTime}, Introduction messages: ${introductionTime.toISOString()}`);

    // Run matching for each contractor and track all matches
    const allMatches = [];
    const matchedPairs = new Set(); // Track pairs to avoid duplicates

    for (const contractor of contractors) {
      // Find best matches for this contractor
      const matches = await peerMatchingService.findPeerMatches(
        contractor.id,
        eventId,
        {
          maxMatches: 3, // Top 3 matches per contractor
          minScore: 0.6, // Minimum 60% match score
          excludeMatched: true // Don't re-match existing pairs
        }
      );

      console.log(`[PeerMatchingBatch] Contractor ${contractor.id} (${contractor.first_name} ${contractor.last_name}): ${matches.length} matches found`);

      // Create match records for top matches
      for (const match of matches) {
        // Create unique pair key (ensure smaller ID first)
        const pairKey = contractor.id < match.id
          ? `${contractor.id}-${match.id}`
          : `${match.id}-${contractor.id}`;

        // Skip if we've already matched this pair
        if (matchedPairs.has(pairKey)) {
          continue;
        }

        matchedPairs.add(pairKey);

        // Create peer match record
        // DATABASE-CHECKED: Using exact field names from event_peer_matches
        const matchRecord = await peerMatchingService.createPeerMatch(
          contractor.id,
          match.id,
          eventId,
          {
            matchType: match.matchType,
            matchCriteria: match.matchCriteria,
            matchScore: match.matchScore,
            matchReason: match.matchReason
          }
        );

        allMatches.push({
          match_id: matchRecord.id,
          contractor1_id: matchRecord.contractor1_id,
          contractor2_id: matchRecord.contractor2_id,
          match_score: matchRecord.match_score,
          match_reason: matchRecord.match_reason
        });

        console.log(`[PeerMatchingBatch] ✅ Created match ${matchRecord.id}: Contractor ${matchRecord.contractor1_id} ↔ ${matchRecord.contractor2_id} (score: ${matchRecord.match_score})`);
      }
    }

    console.log(`[PeerMatchingBatch] Created ${allMatches.length} peer matches total`);

    // Schedule introduction messages for each match (both contractors in pair)
    const messagesScheduled = [];

    for (const match of allMatches) {
      // Get both contractor profiles for message personalization
      const contractor1 = contractors.find(c => c.id === match.contractor1_id);
      const contractor2 = contractors.find(c => c.id === match.contractor2_id);

      if (!contractor1 || !contractor2) {
        console.log(`[PeerMatchingBatch] ⚠️ Skipping match ${match.match_id} - contractor profiles not found`);
        continue;
      }

      // Schedule introduction message for contractor1
      const message1 = await scheduleIntroductionMessage(
        eventId,
        contractor1,
        contractor2,
        match,
        introductionTime
      );
      messagesScheduled.push(message1);

      // Schedule introduction message for contractor2
      const message2 = await scheduleIntroductionMessage(
        eventId,
        contractor2,
        contractor1,
        match,
        introductionTime
      );
      messagesScheduled.push(message2);

      console.log(`[PeerMatchingBatch] 📅 Scheduled introductions for match ${match.match_id} (2 messages)`);
    }

    console.log(`[PeerMatchingBatch] ✅ Batch peer matching complete: ${allMatches.length} matches, ${messagesScheduled.length} messages scheduled`);

    return {
      success: true,
      matches_created: allMatches.length,
      messages_scheduled: messagesScheduled.length,
      introduction_time: introductionTime.toISOString(),
      matches: allMatches
    };

  } catch (error) {
    console.error('[PeerMatchingBatch] ❌ Error in batch peer matching:', error);
    throw error;
  }
}

/**
 * Schedule a peer introduction message
 * Creates message in database and schedules via BullMQ
 *
 * @param {number} eventId - Event ID
 * @param {Object} contractor - Contractor receiving the message
 * @param {Object} peer - Matched peer contractor
 * @param {Object} match - Match details
 * @param {Date} scheduledTime - When to send the message
 * @returns {Object} - Scheduled message details
 */
async function scheduleIntroductionMessage(eventId, contractor, peer, match, scheduledTime) {
  try {
    // Prepare personalization data for message generation
    const personalizationData = {
      match_id: match.match_id,
      peer_contractor_id: peer.id,
      peer_name: `${peer.first_name} ${peer.last_name}`.trim(),
      peer_company: peer.company_name,
      peer_location: peer.service_area,
      match_reason: match.match_reason,
      match_score: match.match_score
    };

    // Create message record in database
    // DATABASE-CHECKED: Using exact field names from event_messages table
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
      contractor.id,
      'peer_match_introduction',
      'peer_matching',
      scheduledTime,
      '', // Empty - will be generated by worker from personalization_data
      safeJsonStringify(personalizationData),
      contractor.phone,
      'scheduled',
      'outbound'
    ]);

    const message = messageResult.rows[0];

    // Schedule message in BullMQ
    await scheduleEventMessage({
      id: message.id,
      event_id: eventId,
      contractor_id: contractor.id,
      message_type: 'peer_match_introduction',
      message_category: 'peer_matching',
      scheduled_time: message.scheduled_time,
      message_content: '',
      personalization_data: personalizationData,
      phone: contractor.phone
    });

    console.log(`[PeerMatchingBatch] Scheduled introduction message ${message.id} for contractor ${contractor.id} at ${scheduledTime.toISOString()}`);

    return {
      message_id: message.id,
      contractor_id: contractor.id,
      peer_id: peer.id,
      scheduled_time: message.scheduled_time
    };

  } catch (error) {
    console.error('[PeerMatchingBatch] Error scheduling introduction message:', error);
    throw error;
  }
}

/**
 * Schedule batch peer matching job for an event
 * Called during agenda generation to schedule the matching process
 *
 * @param {number} eventId - Event ID
 * @returns {Object} - Scheduled job details
 */
async function scheduleBatchPeerMatching(eventId) {
  try {
    console.log(`[PeerMatchingBatch] Scheduling batch peer matching for event ${eventId}`);

    // Get lunch time from agenda
    const lunchTimeResult = await query(`
      SELECT start_time
      FROM event_agenda_items
      WHERE event_id = $1
        AND item_type = 'lunch'
      ORDER BY start_time ASC
      LIMIT 1
    `, [eventId]);

    if (lunchTimeResult.rows.length === 0) {
      console.log(`[PeerMatchingBatch] ⚠️ No lunch time found - peer matching not scheduled`);
      return { success: false, error: 'No lunch time in agenda' };
    }

    const lunchTime = lunchTimeResult.rows[0].start_time;

    // Schedule matching to run 15 minutes before lunch
    const matchingTime = new Date(lunchTime);
    matchingTime.setMinutes(matchingTime.getMinutes() - 15);

    console.log(`[PeerMatchingBatch] Lunch time: ${lunchTime}`);
    console.log(`[PeerMatchingBatch] Peer matching scheduled for: ${matchingTime.toISOString()}`);

    // Schedule BullMQ job to run batch peer matching at matchingTime
    const job = await scheduleBatchPeerMatchingJob(eventId, matchingTime);

    console.log(`[PeerMatchingBatch] ✅ BullMQ job created: ${job.id}`);

    return {
      success: true,
      event_id: eventId,
      lunch_time: lunchTime,
      matching_scheduled_time: matchingTime.toISOString(),
      job_id: job.id,
      message: 'Batch peer matching scheduled successfully'
    };

  } catch (error) {
    console.error('[PeerMatchingBatch] Error scheduling batch peer matching:', error);
    throw error;
  }
}

module.exports = {
  runBatchPeerMatching,
  scheduleIntroductionMessage,
  scheduleBatchPeerMatching
};
