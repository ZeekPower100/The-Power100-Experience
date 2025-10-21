// DATABASE-CHECKED: event_messages (24 columns), event_peer_matches (21 columns), event_speakers (22 columns), demo_bookings (7 columns), contractors (69 columns) verified on 2025-10-06

const { query } = require('../../config/database');
const { safeJsonParse, safeJsonStringify } = require('../../utils/jsonHelpers');
const axios = require('axios');

/**
 * Post-Event Wrap-Up Service
 * Sends comprehensive event summary, demo reminders, peer contact exchanges, content recommendations
 * Triggered after event ends to maintain engagement and transition to ongoing AI coach relationship
 */

/**
 * Send post-event wrap-up to all attendees or specific contractor
 * @param {number} eventId - Event ID
 * @param {number} contractorId - Optional contractor ID (if null, sends to all attendees)
 * @returns {object} - Wrap-up results
 */
async function sendPostEventWrapUp(eventId, contractorId = null) {
  try {
    console.log('[PostEventWrapUp] Starting wrap-up for event', eventId, contractorId ? `contractor ${contractorId}` : 'all attendees');

    // Get event details
    const eventResult = await query(`
      SELECT id, name, date, end_date, location, sms_event_code
      FROM events WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      throw new Error('Event not found');
    }

    const event = eventResult.rows[0];

    // Get attendees (either specific contractor or all)
    let attendeesQuery;
    let attendeesParams;

    if (contractorId) {
      attendeesQuery = `
        SELECT ea.contractor_id, c.first_name, c.last_name, c.phone, c.email,
               to_json(c.focus_areas) as focus_areas
        FROM event_attendees ea
        JOIN contractors c ON ea.contractor_id = c.id
        WHERE ea.event_id = $1 AND ea.contractor_id = $2
      `;
      attendeesParams = [eventId, contractorId];
    } else {
      attendeesQuery = `
        SELECT ea.contractor_id, c.first_name, c.last_name, c.phone, c.email,
               to_json(c.focus_areas) as focus_areas
        FROM event_attendees ea
        JOIN contractors c ON ea.contractor_id = c.id
        WHERE ea.event_id = $1 AND ea.check_in_time IS NOT NULL
      `;
      attendeesParams = [eventId];
    }

    const attendeesResult = await query(attendeesQuery, attendeesParams);

    const results = {
      success: [],
      failed: [],
      total: attendeesResult.rows.length
    };

    // Send wrap-up to each attendee
    for (const attendee of attendeesResult.rows) {
      try {
        await sendIndividualWrapUp(eventId, attendee.contractor_id, event, attendee);
        results.success.push({
          contractor_id: attendee.contractor_id,
          name: `${attendee.first_name} ${attendee.last_name}`
        });
      } catch (error) {
        console.error('[PostEventWrapUp] Failed for contractor', attendee.contractor_id, error);
        results.failed.push({
          contractor_id: attendee.contractor_id,
          error: error.message
        });
      }
    }

    console.log(`[PostEventWrapUp] Completed: ${results.success.length} sent, ${results.failed.length} failed`);
    return results;

  } catch (error) {
    console.error('[PostEventWrapUp] Error in sendPostEventWrapUp:', error);
    throw error;
  }
}

/**
 * Send individual wrap-up to single contractor
 */
async function sendIndividualWrapUp(eventId, contractorId, event, contractor) {
  console.log('[PostEventWrapUp] Generating wrap-up for contractor', contractorId);

  // Gather all wrap-up components
  const summary = await generateEventSummary(eventId, contractorId);
  const speakerRankings = await getSpeakerRankings(eventId, contractorId);
  const demoReminders = await getDemoReminders(contractorId);
  const peerContacts = await getPeerContactExchanges(eventId, contractorId);
  const contentRecs = await getContentRecommendations(contractorId, event);

  // Build comprehensive wrap-up message
  const firstName = contractor.first_name || 'there';
  let wrapUpMessage = `🎉 ${firstName}, thank you for attending ${event.name}!\n\n`;

  // Event Summary
  if (summary.sessions_attended > 0) {
    wrapUpMessage += `📊 YOUR EVENT SUMMARY:\n`;
    wrapUpMessage += `• ${summary.sessions_attended} sessions attended\n`;
    wrapUpMessage += `• ${summary.sponsors_visited} sponsors visited\n`;
    wrapUpMessage += `• ${summary.peer_connections} peer connections made\n\n`;
  }

  // Top Speakers
  if (speakerRankings.length > 0) {
    wrapUpMessage += `⭐ YOUR TOP SPEAKERS:\n`;
    speakerRankings.forEach((speaker, index) => {
      wrapUpMessage += `${index + 1}. ${speaker.name} - ${speaker.session_title}\n`;
      if (speaker.rating) {
        wrapUpMessage += `   Your rating: ${speaker.rating}/10\n`;
      }
    });
    wrapUpMessage += `\n`;
  }

  // Demo Reminders
  if (demoReminders.length > 0) {
    wrapUpMessage += `📅 UPCOMING DEMOS:\n`;
    demoReminders.forEach((demo) => {
      wrapUpMessage += `• ${demo.partner_name} - ${new Date(demo.scheduled_date).toLocaleDateString()}\n`;
    });
    wrapUpMessage += `Don't forget to prepare your questions!\n\n`;
  }

  // Peer Contacts
  if (peerContacts.length > 0) {
    wrapUpMessage += `🤝 PEER CONNECTIONS:\n`;
    peerContacts.forEach((peer) => {
      wrapUpMessage += `• ${peer.name} (${peer.company})\n`;
      wrapUpMessage += `  ${peer.phone} | ${peer.email}\n`;
    });
    wrapUpMessage += `\n`;
  }

  // Content Recommendations
  if (contentRecs.books.length > 0 || contentRecs.podcasts.length > 0) {
    wrapUpMessage += `📚 RECOMMENDED FOR YOU:\n`;
    contentRecs.books.forEach((book) => {
      wrapUpMessage += `📖 "${book.title}" by ${book.author}\n`;
    });
    contentRecs.podcasts.forEach((podcast) => {
      wrapUpMessage += `🎧 ${podcast.title}\n`;
    });
    wrapUpMessage += `\n`;
  }

  // Continuous Engagement CTA
  wrapUpMessage += `💬 Your AI business coach is ready! Text me anytime for guidance on implementing what you learned.\n\n`;
  wrapUpMessage += `Reply "INSIGHTS" for personalized next steps based on your event experience.`;

  // Split into multiple SMS if needed
  const messages = splitIntoSMS(wrapUpMessage);

  // Save to event_messages
  const messageResult = await query(`
    INSERT INTO event_messages (
      event_id, contractor_id, message_type, direction,
      scheduled_time, actual_send_time,
      phone, message_content, status,
      personalization_data, created_at, updated_at
    ) VALUES ($1, $2, 'post_event_wrap_up', 'outbound', NOW(), NOW(), $3, $4, 'sent', $5, NOW(), NOW())
    RETURNING id
  `, [
    eventId,
    contractorId,
    contractor.phone,
    messages.join(' '),
    safeJsonStringify({
      sms_event_code: event.sms_event_code,
      summary,
      speaker_rankings: speakerRankings,
      demo_reminders: demoReminders,
      peer_contacts: peerContacts,
      content_recommendations: contentRecs
    })
  ]);

  console.log('[PostEventWrapUp] Wrap-up message saved:', messageResult.rows[0].id, `(${messages.length} SMS)`);

  // Send via n8n webhook
  await sendViaWebhook(contractor.phone, messages);

  return messageResult.rows[0].id;
}

/**
 * Generate event summary statistics for contractor
 */
async function generateEventSummary(eventId, contractorId) {
  try {
    // Count sessions attended (speaker ratings given)
    const sessionsResult = await query(`
      SELECT COUNT(DISTINCT em.id) as sessions_attended
      FROM event_messages em
      WHERE em.event_id = $1
        AND em.contractor_id = $2
        AND em.message_type = 'speaker_feedback'
        AND em.pcr_score IS NOT NULL
    `, [eventId, contractorId]);

    // Count sponsors visited (sponsor detail requests)
    const sponsorsResult = await query(`
      SELECT COUNT(DISTINCT em.id) as sponsors_visited
      FROM event_messages em
      WHERE em.event_id = $1
        AND em.contractor_id = $2
        AND em.message_type = 'sponsor_details'
    `, [eventId, contractorId]);

    // Count peer connections
    const peersResult = await query(`
      SELECT COUNT(*) as peer_connections
      FROM event_peer_matches epm
      WHERE epm.event_id = $1
        AND (epm.contractor1_id = $2 OR epm.contractor2_id = $2)
        AND epm.connection_made = true
    `, [eventId, contractorId]);

    return {
      sessions_attended: parseInt(sessionsResult.rows[0]?.sessions_attended || 0),
      sponsors_visited: parseInt(sponsorsResult.rows[0]?.sponsors_visited || 0),
      peer_connections: parseInt(peersResult.rows[0]?.peer_connections || 0)
    };
  } catch (error) {
    console.error('[PostEventWrapUp] Error generating summary:', error);
    return { sessions_attended: 0, sponsors_visited: 0, peer_connections: 0 };
  }
}

/**
 * Get contractor's top-rated speakers from event
 */
async function getSpeakerRankings(eventId, contractorId) {
  try {
    const result = await query(`
      SELECT
        es.id, es.name, es.session_title,
        em.pcr_score as rating
      FROM event_messages em
      JOIN event_speakers es ON es.event_id = em.event_id
      WHERE em.event_id = $1
        AND em.contractor_id = $2
        AND em.message_type = 'speaker_feedback'
        AND em.pcr_score IS NOT NULL
      ORDER BY em.pcr_score DESC
      LIMIT 3
    `, [eventId, contractorId]);

    return result.rows;
  } catch (error) {
    console.error('[PostEventWrapUp] Error getting speaker rankings:', error);
    return [];
  }
}

/**
 * Get upcoming demo bookings for contractor
 */
async function getDemoReminders(contractorId) {
  try {
    const result = await query(`
      SELECT
        db.id, db.scheduled_date,
        sp.company_name as partner_name
      FROM demo_bookings db
      JOIN strategic_partners sp ON db.partner_id = sp.id
      WHERE db.contractor_id = $1
        AND db.scheduled_date > NOW()
        AND db.status IN ('scheduled', 'confirmed')
      ORDER BY db.scheduled_date ASC
      LIMIT 5
    `, [contractorId]);

    return result.rows;
  } catch (error) {
    console.error('[PostEventWrapUp] Error getting demo reminders:', error);
    return [];
  }
}

/**
 * Get peer contact exchanges (both responded positively)
 */
async function getPeerContactExchanges(eventId, contractorId) {
  try {
    const result = await query(`
      SELECT
        CASE
          WHEN epm.contractor1_id = $2 THEN c2.id
          ELSE c1.id
        END as peer_id,
        CASE
          WHEN epm.contractor1_id = $2 THEN CONCAT(c2.first_name, ' ', c2.last_name)
          ELSE CONCAT(c1.first_name, ' ', c1.last_name)
        END as name,
        CASE
          WHEN epm.contractor1_id = $2 THEN c2.company_name
          ELSE c1.company_name
        END as company,
        CASE
          WHEN epm.contractor1_id = $2 THEN c2.phone
          ELSE c1.phone
        END as phone,
        CASE
          WHEN epm.contractor1_id = $2 THEN c2.email
          ELSE c1.email
        END as email
      FROM event_peer_matches epm
      JOIN contractors c1 ON epm.contractor1_id = c1.id
      JOIN contractors c2 ON epm.contractor2_id = c2.id
      WHERE epm.event_id = $1
        AND (epm.contractor1_id = $2 OR epm.contractor2_id = $2)
        AND epm.contractor1_response = true
        AND epm.contractor2_response = true
        AND epm.connection_made = true
    `, [eventId, contractorId]);

    return result.rows;
  } catch (error) {
    console.error('[PostEventWrapUp] Error getting peer contacts:', error);
    return [];
  }
}

/**
 * Get content recommendations based on sessions attended
 */
async function getContentRecommendations(contractorId, event) {
  try {
    // Get contractor's focus areas
    const contractorResult = await query(`
      SELECT to_json(focus_areas) as focus_areas FROM contractors WHERE id = $1
    `, [contractorId]);

    const focusAreas = safeJsonParse(contractorResult.rows[0]?.focus_areas) || [];

    // Get relevant books
    const booksResult = await query(`
      SELECT id, title, author
      FROM books
      WHERE status = 'published'
        AND focus_areas_covered::text LIKE ANY($1)
      ORDER BY ai_quality_score DESC NULLS LAST
      LIMIT 2
    `, [focusAreas.map(fa => `%${fa}%`)]);

    // Get relevant podcasts
    const podcastsResult = await query(`
      SELECT id, title
      FROM podcasts
      WHERE is_active = true
        AND status = 'published'
        AND focus_areas_covered::text LIKE ANY($1)
      ORDER BY ai_quality_score DESC NULLS LAST
      LIMIT 2
    `, [focusAreas.map(fa => `%${fa}%`)]);

    return {
      books: booksResult.rows,
      podcasts: podcastsResult.rows
    };
  } catch (error) {
    console.error('[PostEventWrapUp] Error getting content recommendations:', error);
    return { books: [], podcasts: [] };
  }
}

/**
 * Split long message into multiple SMS (320 chars each)
 */
function splitIntoSMS(message, maxLength = 320) {
  if (message.length <= maxLength) return [message];

  const messages = [];
  let remaining = message;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      messages.push(remaining);
      break;
    }

    // Find last space before maxLength
    let splitIndex = remaining.lastIndexOf(' ', maxLength);
    if (splitIndex === -1) splitIndex = maxLength;

    messages.push(remaining.substring(0, splitIndex).trim());
    remaining = remaining.substring(splitIndex).trim();
  }

  return messages;
}

/**
 * Send SMS via n8n webhook (outbound endpoint)
 * Uses environment-aware webhook path
 */
async function sendViaWebhook(phone, messages) {
  try {
    const n8nWebhookUrl = process.env.NODE_ENV === 'production'
      ? 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl'
      : 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev';

    for (const message of messages) {
      await axios.post(n8nWebhookUrl, {
        phone,
        message,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[PostEventWrapUp] SMS sent via webhook:', { phone, count: messages.length });
  } catch (error) {
    console.error('[PostEventWrapUp] Error sending via webhook:', error.message);
    // Don't throw - we've already saved to database, can retry later
  }
}

module.exports = {
  sendPostEventWrapUp,
  sendIndividualWrapUp
};
