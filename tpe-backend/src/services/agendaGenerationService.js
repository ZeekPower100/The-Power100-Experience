/**
 * Agenda Generation Service
 *
 * Automatically generates event agenda items from event speakers and sponsors
 * This enables the event orchestration system to schedule messages based on agenda timing
 */

const { query } = require('../config/database');
const { safeJsonStringify } = require('../utils/jsonHelpers');
const { scheduleBatchPeerMatching } = require('./eventOrchestrator/peerMatchingBatchScheduler');
const { scheduleSpeakerAlerts } = require('./eventOrchestrator/speakerAlertMessageScheduler');
const { scheduleSponsorRecommendations } = require('./eventOrchestrator/sponsorRecommendationScheduler');
const { schedulePCRRequests } = require('./eventOrchestrator/pcrRequestScheduler');
const { scheduleSponsorBatchCheck } = require('./eventOrchestrator/sponsorBatchCheckScheduler');
const { scheduleOverallEventPCR } = require('./eventOrchestrator/overallEventPcrScheduler');

/**
 * Generate agenda items from event speakers and sponsors
 * Creates a realistic event schedule with sessions, breaks, and networking
 *
 * @param {number} eventId - The event ID
 * @param {Date} eventDate - The event date
 * @param {boolean} accelerated - If true, creates accelerated timeline (minutes instead of hours)
 * @returns {Promise<{success: boolean, agenda_items: Array}>}
 */
async function generateAgendaFromSpeakers(eventId, eventDate, accelerated = false) {
  try {
    // Get event speakers
    const speakersResult = await query(`
      SELECT id, name, session_title, session_description, session_time, session_duration_minutes
      FROM event_speakers
      WHERE event_id = $1
      ORDER BY id
    `, [eventId]);

    const speakers = speakersResult.rows;

    if (speakers.length === 0) {
      return {
        success: false,
        error: 'No speakers found for this event'
      };
    }

    // Get event sponsors
    const sponsorsResult = await query(`
      SELECT id, sponsor_name, presentation_title, presentation_time
      FROM event_sponsors
      WHERE event_id = $1
      ORDER BY id
    `, [eventId]);

    const sponsors = sponsorsResult.rows;

    // Clear existing agenda items
    await query('DELETE FROM event_agenda_items WHERE event_id = $1', [eventId]);

    const agendaItems = [];
    const baseDate = new Date(eventDate);

    // Set start time based on whether accelerated or not
    let currentTime = new Date(baseDate);

    if (accelerated) {
      // Accelerated: Start in 5 minutes from now
      currentTime = new Date(Date.now() + (5 * 60 * 1000));

      // Registration & Welcome (immediate)
      agendaItems.push(await createAgendaItem(eventId, {
        start_time: new Date(currentTime),
        end_time: new Date(currentTime.getTime() + (2 * 60 * 1000)), // 2 minutes
        item_type: 'registration',
        title: 'Registration & Check-In',
        synopsis: 'Welcome and event registration',
        location: 'Main Entrance',
        status: 'confirmed'
      }));

      currentTime = new Date(currentTime.getTime() + (3 * 60 * 1000)); // +3 min gap

      // Opening Session
      agendaItems.push(await createAgendaItem(eventId, {
        start_time: new Date(currentTime),
        end_time: new Date(currentTime.getTime() + (2 * 60 * 1000)), // 2 minutes
        item_type: 'keynote',
        title: 'Opening Keynote & Event Overview',
        synopsis: 'Welcome address and event agenda overview',
        location: 'Main Hall',
        status: 'confirmed'
      }));

      currentTime = new Date(currentTime.getTime() + (3 * 60 * 1000)); // +3 min gap

      // Add speaker sessions (2-3 min each with 1-2 min gaps)
      for (let i = 0; i < speakers.length; i++) {
        const speaker = speakers[i];
        const duration = 2; // 2 minutes per session in accelerated mode

        agendaItems.push(await createAgendaItem(eventId, {
          start_time: new Date(currentTime),
          end_time: new Date(currentTime.getTime() + (duration * 60 * 1000)),
          item_type: 'session',
          title: speaker.session_title || `Session with ${speaker.name}`,
          synopsis: speaker.session_description || `Insights from ${speaker.name}`,
          speaker_id: speaker.id,
          location: `Track ${(i % 2) + 1}`,
          status: 'confirmed'
        }));

        currentTime = new Date(currentTime.getTime() + ((duration + 2) * 60 * 1000)); // +2 min gap

        // Add break/networking after every 2 sessions
        if ((i + 1) % 2 === 0 && i < speakers.length - 1) {
          agendaItems.push(await createAgendaItem(eventId, {
            start_time: new Date(currentTime),
            end_time: new Date(currentTime.getTime() + (3 * 60 * 1000)), // 3 min break
            item_type: 'break',
            title: 'Networking Break & Refreshments',
            synopsis: 'Connect with peers and visit sponsor booths',
            location: 'Networking Lounge',
            status: 'confirmed'
          }));

          currentTime = new Date(currentTime.getTime() + (3 * 60 * 1000));
        }
      }

      // Lunch break with sponsor presentations (5 minutes)
      if (sponsors.length > 0) {
        agendaItems.push(await createAgendaItem(eventId, {
          start_time: new Date(currentTime),
          end_time: new Date(currentTime.getTime() + (5 * 60 * 1000)),
          item_type: 'lunch',
          title: 'Lunch & Sponsor Showcase',
          synopsis: 'Networking lunch with sponsor presentations',
          location: 'Main Hall',
          status: 'confirmed'
        }));

        currentTime = new Date(currentTime.getTime() + (5 * 60 * 1000));

        // Add sponsor booth times during break
        for (const sponsor of sponsors) {
          agendaItems.push(await createAgendaItem(eventId, {
            start_time: new Date(currentTime),
            end_time: new Date(currentTime.getTime() + (2 * 60 * 1000)), // 2 min
            item_type: 'sponsor_session',
            title: `${sponsor.sponsor_name} Showcase`,
            synopsis: sponsor.presentation_title || `Learn about solutions from ${sponsor.sponsor_name}`,
            sponsor_id: sponsor.id,
            location: 'Sponsor Area',
            status: 'confirmed'
          }));

          currentTime = new Date(currentTime.getTime() + (2 * 60 * 1000));
        }
      }

      // Closing session (2 minutes)
      agendaItems.push(await createAgendaItem(eventId, {
        start_time: new Date(currentTime),
        end_time: new Date(currentTime.getTime() + (2 * 60 * 1000)),
        item_type: 'closing',
        title: 'Closing Remarks & Next Steps',
        synopsis: 'Event wrap-up and actionable takeaways',
        location: 'Main Hall',
        status: 'confirmed'
      }));

    } else {
      // Standard event timeline (full day)
      currentTime.setHours(8, 0, 0, 0); // Start at 8 AM

      // Registration (8:00-9:00 AM)
      agendaItems.push(await createAgendaItem(eventId, {
        start_time: new Date(currentTime),
        end_time: new Date(currentTime.setHours(9, 0)),
        item_type: 'registration',
        title: 'Registration & Welcome Coffee',
        synopsis: 'Check-in and morning networking',
        location: 'Main Entrance',
        status: 'confirmed'
      }));

      currentTime.setHours(9, 0); // 9:00 AM

      // Opening Keynote (9:00-9:30 AM)
      agendaItems.push(await createAgendaItem(eventId, {
        start_time: new Date(currentTime),
        end_time: new Date(currentTime.setHours(9, 30)),
        item_type: 'keynote',
        title: 'Opening Keynote',
        synopsis: 'Welcome address and event overview',
        location: 'Main Hall',
        status: 'confirmed'
      }));

      currentTime.setHours(9, 45); // 9:45 AM

      // Add speaker sessions (45-60 min each)
      for (let i = 0; i < speakers.length; i++) {
        const speaker = speakers[i];
        const duration = speaker.session_duration_minutes || 45;
        const endTime = new Date(currentTime.getTime() + (duration * 60 * 1000));

        agendaItems.push(await createAgendaItem(eventId, {
          start_time: new Date(currentTime),
          end_time: endTime,
          item_type: 'session',
          title: speaker.session_title || `Session with ${speaker.name}`,
          synopsis: speaker.session_description || `Insights from ${speaker.name}`,
          speaker_id: speaker.id,
          location: `Track ${(i % 2) + 1}`,
          status: 'confirmed'
        }));

        currentTime = new Date(endTime.getTime() + (15 * 60 * 1000)); // 15 min gap

        // Add breaks
        if ((i + 1) % 2 === 0 && i < speakers.length - 1) {
          if (i === 1) {
            // Morning break
            agendaItems.push(await createAgendaItem(eventId, {
              start_time: new Date(currentTime),
              end_time: new Date(currentTime.getTime() + (15 * 60 * 1000)),
              item_type: 'break',
              title: 'Morning Break',
              synopsis: 'Refreshments and networking',
              location: 'Networking Lounge',
              status: 'confirmed'
            }));
            currentTime = new Date(currentTime.getTime() + (15 * 60 * 1000));
          } else if (i === 3) {
            // Lunch
            agendaItems.push(await createAgendaItem(eventId, {
              start_time: new Date(currentTime),
              end_time: new Date(currentTime.getTime() + (60 * 60 * 1000)),
              item_type: 'lunch',
              title: 'Lunch & Networking',
              synopsis: 'Catered lunch with sponsor showcases',
              location: 'Main Hall',
              status: 'confirmed'
            }));
            currentTime = new Date(currentTime.getTime() + (60 * 60 * 1000));
          }
        }
      }

      // Afternoon break
      agendaItems.push(await createAgendaItem(eventId, {
        start_time: new Date(currentTime),
        end_time: new Date(currentTime.getTime() + (15 * 60 * 1000)),
        item_type: 'break',
        title: 'Afternoon Break',
        synopsis: 'Visit sponsor booths',
        location: 'Sponsor Area',
        status: 'confirmed'
      }));

      currentTime = new Date(currentTime.getTime() + (15 * 60 * 1000));

      // Closing session
      agendaItems.push(await createAgendaItem(eventId, {
        start_time: new Date(currentTime),
        end_time: new Date(currentTime.getTime() + (30 * 60 * 1000)),
        item_type: 'closing',
        title: 'Closing Session & Q&A',
        synopsis: 'Final takeaways and next steps',
        location: 'Main Hall',
        status: 'confirmed'
      }));
    }

    // Update event agenda_status
    await query(`
      UPDATE events
      SET agenda_status = 'confirmed'
      WHERE id = $1
    `, [eventId]);

    // Schedule batch peer matching (15 min before lunch)
    console.log('[AgendaGeneration] Scheduling batch peer matching...');
    const peerMatchingSchedule = await scheduleBatchPeerMatching(eventId);

    if (peerMatchingSchedule.success) {
      console.log('[AgendaGeneration] ✅ Peer matching scheduled for:', peerMatchingSchedule.matching_scheduled_time);
    } else {
      console.warn('[AgendaGeneration] ⚠️ Peer matching not scheduled:', peerMatchingSchedule.error);
    }

    // Schedule speaker alerts (15 min before each session)
    console.log('[AgendaGeneration] Scheduling speaker alerts...');
    const speakerAlertsSchedule = await scheduleSpeakerAlerts(eventId);

    if (speakerAlertsSchedule.success) {
      console.log('[AgendaGeneration] ✅ Speaker alerts scheduled:', speakerAlertsSchedule.messages_scheduled, 'messages');
    } else {
      console.warn('[AgendaGeneration] ⚠️ Speaker alerts not scheduled:', speakerAlertsSchedule.error);
    }

    // Schedule sponsor recommendations (2 min after each break)
    console.log('[AgendaGeneration] Scheduling sponsor recommendations...');
    const sponsorRecsSchedule = await scheduleSponsorRecommendations(eventId);

    if (sponsorRecsSchedule.success) {
      console.log('[AgendaGeneration] ✅ Sponsor recommendations scheduled:', sponsorRecsSchedule.messages_scheduled, 'messages');
    } else {
      console.warn('[AgendaGeneration] ⚠️ Sponsor recommendations not scheduled:', sponsorRecsSchedule.error);
    }

    // Schedule PCR requests (7 min after each session)
    console.log('[AgendaGeneration] Scheduling PCR requests...');
    const pcrRequestsSchedule = await schedulePCRRequests(eventId);

    if (pcrRequestsSchedule.success) {
      console.log('[AgendaGeneration] ✅ PCR requests scheduled:', pcrRequestsSchedule.messages_scheduled, 'messages');
    } else {
      console.warn('[AgendaGeneration] ⚠️ PCR requests not scheduled:', pcrRequestsSchedule.error);
    }

    // Schedule end-of-day sponsor batch check (at event end)
    console.log('[AgendaGeneration] Scheduling end-of-day sponsor batch check...');
    const sponsorBatchCheckSchedule = await scheduleSponsorBatchCheck(eventId, 1);

    if (sponsorBatchCheckSchedule.success) {
      console.log('[AgendaGeneration] ✅ Sponsor batch check scheduled:', sponsorBatchCheckSchedule.messages_scheduled, 'messages at', sponsorBatchCheckSchedule.scheduled_time);
    } else {
      console.warn('[AgendaGeneration] ⚠️ Sponsor batch check not scheduled:', sponsorBatchCheckSchedule.error);
    }

    // Schedule overall event PCR (1 hour after event ends)
    console.log('[AgendaGeneration] Scheduling overall event PCR...');
    const overallEventPCRSchedule = await scheduleOverallEventPCR(eventId);

    if (overallEventPCRSchedule.success) {
      console.log('[AgendaGeneration] ✅ Overall event PCR scheduled:', overallEventPCRSchedule.messages_scheduled, 'messages at', overallEventPCRSchedule.scheduled_time);
    } else {
      console.warn('[AgendaGeneration] ⚠️ Overall event PCR not scheduled:', overallEventPCRSchedule.error);
    }

    return {
      success: true,
      agenda_items: agendaItems,
      accelerated: accelerated,
      peer_matching_scheduled: peerMatchingSchedule.success,
      peer_matching_time: peerMatchingSchedule.matching_scheduled_time,
      speaker_alerts_scheduled: speakerAlertsSchedule.success,
      speaker_alerts_count: speakerAlertsSchedule.messages_scheduled,
      sponsor_recs_scheduled: sponsorRecsSchedule.success,
      sponsor_recs_count: sponsorRecsSchedule.messages_scheduled,
      pcr_requests_scheduled: pcrRequestsSchedule.success,
      pcr_requests_count: pcrRequestsSchedule.messages_scheduled,
      sponsor_batch_check_scheduled: sponsorBatchCheckSchedule.success,
      sponsor_batch_check_count: sponsorBatchCheckSchedule.messages_scheduled,
      sponsor_batch_check_time: sponsorBatchCheckSchedule.scheduled_time,
      overall_event_pcr_scheduled: overallEventPCRSchedule.success,
      overall_event_pcr_count: overallEventPCRSchedule.messages_scheduled,
      overall_event_pcr_time: overallEventPCRSchedule.scheduled_time,
      message: `Generated ${agendaItems.length} agenda items with full event automation`
    };

  } catch (error) {
    console.error('Error generating agenda:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Helper to create an agenda item
 */
async function createAgendaItem(eventId, itemData) {
  const result = await query(`
    INSERT INTO event_agenda_items (
      event_id,
      start_time,
      end_time,
      item_type,
      title,
      synopsis,
      description,
      location,
      speaker_id,
      sponsor_id,
      track,
      capacity,
      focus_areas,
      target_audience,
      skill_level,
      is_mandatory,
      requires_registration,
      status,
      speaker_confirmed
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING *
  `, [
    eventId,
    itemData.start_time,
    itemData.end_time || null,
    itemData.item_type,
    itemData.title,
    itemData.synopsis || null,
    itemData.description || null,
    itemData.location || null,
    itemData.speaker_id || null,
    itemData.sponsor_id || null,
    itemData.track || null,
    itemData.capacity || null,
    itemData.focus_areas ? safeJsonStringify(itemData.focus_areas) : null,
    itemData.target_audience ? safeJsonStringify(itemData.target_audience) : null,
    itemData.skill_level || null,
    itemData.is_mandatory || false,
    itemData.requires_registration || false,
    itemData.status || 'tentative',
    itemData.speaker_confirmed || false
  ]);

  return result.rows[0];
}

module.exports = {
  generateAgendaFromSpeakers
};
