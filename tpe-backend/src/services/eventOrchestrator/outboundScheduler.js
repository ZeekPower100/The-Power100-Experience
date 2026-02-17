// DATABASE-CHECKED: event_messages, event_sessions, event_sponsors columns verified on 2025-10-06
// Outbound Message Scheduler Service
// Handles scheduled sending of speaker alerts, sponsor recommendations, and PCR requests

const { query } = require('../../config/database');
const { safeJsonParse, safeJsonStringify } = require('../../utils/jsonHelpers');
const { processMessageForSMS } = require('../../utils/smsHelpers');
const { buildTags } = require('../../utils/tagBuilder');
const axios = require('axios');

/**
 * Send speaker alert/recommendation before session
 * Triggered: 15 minutes before session starts
 */
async function sendSpeakerAlert(eventId, contractorId, speakerRecommendations) {
  try {
    console.log('[OutboundScheduler] Sending speaker alert:', { eventId, contractorId, speakers: speakerRecommendations.length });

    // Get contractor info
    const contractorResult = await query(`
      SELECT id, CONCAT(first_name, ' ', last_name) as name, phone, email
      FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      throw new Error('Contractor not found');
    }

    const contractor = contractorResult.rows[0];

    // Get event info
    const eventResult = await query(`
      SELECT id, name, sms_event_code FROM events WHERE id = $1
    `, [eventId]);

    const event = eventResult.rows[0];

    // Build speaker alert message
    let message = `Hi ${contractor.name.split(' ')[0]}! 🎤 Upcoming sessions at ${event.name}:\n\n`;

    speakerRecommendations.forEach((speaker, index) => {
      message += `${index + 1}. ${speaker.name} (${speaker.company})\n`;
      message += `   ${speaker.session.title}\n`;
      message += `   ${speaker.session.time} - ${speaker.session.location}\n`;
      message += `   Why: ${speaker.why}\n\n`;
    });

    message += `Reply with the number (1-${speakerRecommendations.length}) for more details!`;

    // Process for multi-SMS if needed
    const smsResult = processMessageForSMS(message, {
      allowMultiSMS: true,
      maxMessages: 3,
      context: { messageType: 'speaker_alert' }
    });

    // Save to event_messages
    const messageResult = await query(`
      INSERT INTO event_messages (
        contractor_id,
        event_id,
        message_type,
        direction,
        scheduled_time,
        actual_send_time,
        personalization_data,
        phone,
        message_content
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $5, $6, $7)
      RETURNING id
    `, [
      contractorId,
      eventId,
      'speaker_alert',
      'outbound',
      safeJsonStringify({
        speaker_recommendations: speakerRecommendations,
        sms_event_code: event.sms_event_code
      }),
      contractor.phone,
      smsResult.messages.join(' ')
    ]);

    // Build tags for GHL contact tagging
    const tags = buildTags({
      category: 'event',
      type: 'speaker-alert',
      recipient: 'contractor',
      channel: 'sms',
      status: 'sent',
      entityId: eventId
    });

    // Send via n8n webhook (outbound endpoint)
    await sendViaWebhook(contractor.phone, smsResult.messages, tags);

    console.log('[OutboundScheduler] Speaker alert sent successfully:', messageResult.rows[0].id);

    return {
      success: true,
      message_id: messageResult.rows[0].id,
      sms_count: smsResult.messages.length
    };

  } catch (error) {
    console.error('[OutboundScheduler] Error sending speaker alert:', error);
    throw error;
  }
}

/**
 * Send sponsor recommendation
 * Triggered: During event networking breaks
 */
async function sendSponsorRecommendation(eventId, contractorId, sponsorRecommendations) {
  try {
    console.log('[OutboundScheduler] Sending sponsor recommendation:', { eventId, contractorId, sponsors: sponsorRecommendations.length });

    // Get contractor info
    const contractorResult = await query(`
      SELECT id, CONCAT(first_name, ' ', last_name) as name, phone, email
      FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      throw new Error('Contractor not found');
    }

    const contractor = contractorResult.rows[0];

    // Get event info
    const eventResult = await query(`
      SELECT id, name, sms_event_code FROM events WHERE id = $1
    `, [eventId]);

    const event = eventResult.rows[0];

    // Build sponsor recommendation message
    let message = `Hi ${contractor.name.split(' ')[0]}! 🤝 Check out these sponsors at ${event.name}:\n\n`;

    sponsorRecommendations.forEach((sponsor, index) => {
      message += `${index + 1}. ${sponsor.company_name} - Booth ${sponsor.booth_number}\n`;
      message += `   ${sponsor.tagline}\n`;
      message += `   Why: ${sponsor.why_recommended}\n\n`;
    });

    message += `Reply with the number (1-${sponsorRecommendations.length}) to learn more!`;

    // Process for multi-SMS if needed
    const smsResult = processMessageForSMS(message, {
      allowMultiSMS: true,
      maxMessages: 3,
      context: { messageType: 'sponsor_recommendation' }
    });

    // Save to event_messages
    const messageResult = await query(`
      INSERT INTO event_messages (
        contractor_id,
        event_id,
        message_type,
        direction,
        scheduled_time,
        actual_send_time,
        personalization_data,
        phone,
        message_content
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $5, $6, $7)
      RETURNING id
    `, [
      contractorId,
      eventId,
      'sponsor_recommendation',
      'outbound',
      safeJsonStringify({
        sponsor_recommendations: sponsorRecommendations,
        sms_event_code: event.sms_event_code
      }),
      contractor.phone,
      smsResult.messages.join(' ')
    ]);

    // Build tags for GHL contact tagging
    const tags = buildTags({
      category: 'event',
      type: 'sponsor-recommendation',
      recipient: 'contractor',
      channel: 'sms',
      status: 'sent',
      entityId: eventId
    });

    // Send via n8n webhook
    await sendViaWebhook(contractor.phone, smsResult.messages, tags);

    console.log('[OutboundScheduler] Sponsor recommendation sent successfully:', messageResult.rows[0].id);

    return {
      success: true,
      message_id: messageResult.rows[0].id,
      sms_count: smsResult.messages.length
    };

  } catch (error) {
    console.error('[OutboundScheduler] Error sending sponsor recommendation:', error);
    throw error;
  }
}

/**
 * Send PCR (PowerConfidence Rating) request
 * Triggered: 5-10 minutes after session ends
 */
async function sendPCRRequest(eventId, contractorId, sessionInfo) {
  try {
    console.log('[OutboundScheduler] Sending PCR request:', { eventId, contractorId, session: sessionInfo.title });

    // Get contractor info
    const contractorResult = await query(`
      SELECT id, CONCAT(first_name, ' ', last_name) as name, phone, email
      FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      throw new Error('Contractor not found');
    }

    const contractor = contractorResult.rows[0];

    // Build PCR request message
    const message = `Hi ${contractor.name.split(' ')[0]}! Did you attend "${sessionInfo.title}" with ${sessionInfo.speaker_name}? Reply YES or NO.`;

    // Save to event_messages
    const messageResult = await query(`
      INSERT INTO event_messages (
        contractor_id,
        event_id,
        message_type,
        direction,
        scheduled_time,
        actual_send_time,
        personalization_data,
        phone,
        message_content
      ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $5, $6, $7)
      RETURNING id
    `, [
      contractorId,
      eventId,
      'pcr_request',
      'outbound',
      safeJsonStringify({
        session_id: sessionInfo.session_id,
        speaker_name: sessionInfo.speaker_name,
        session_title: sessionInfo.title,
        pcr_type: 'speaker_session'
      }),
      contractor.phone,
      message
    ]);

    // Build tags for GHL contact tagging
    const tags = buildTags({
      category: 'event',
      type: 'pcr-request',
      recipient: 'contractor',
      channel: 'sms',
      status: 'sent',
      entityId: eventId
    });

    // Send via n8n webhook
    await sendViaWebhook(contractor.phone, [message], tags);

    console.log('[OutboundScheduler] PCR request sent successfully:', messageResult.rows[0].id);

    return {
      success: true,
      message_id: messageResult.rows[0].id,
      sms_count: 1
    };

  } catch (error) {
    console.error('[OutboundScheduler] Error sending PCR request:', error);
    throw error;
  }
}

/**
 * Send SMS via n8n webhook (outbound endpoint)
 * Uses environment-aware webhook path: backend-to-ghl (prod) or backend-to-ghl-dev (dev)
 * @param {string} phone - Phone number to send to
 * @param {Array} messages - Array of message strings
 * @param {Array} tags - Optional tags array for GHL contact tagging
 */
async function sendViaWebhook(phone, messages, tags = []) {
  try {
    const n8nWebhookUrl = process.env.NODE_ENV === 'production'
      ? 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl'
      : 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev';

    for (const message of messages) {
      await axios.post(n8nWebhookUrl, {
        send_via_ghl: {
          phone,
          message,
          from_name: 'Power100 Events',
          timestamp: new Date().toISOString(),
          tags: tags  // Add tags to webhook payload
        }
      });
    }

    console.log('[OutboundScheduler] SMS sent via webhook:', { phone, count: messages.length, tags, webhook: n8nWebhookUrl });
  } catch (error) {
    console.error('[OutboundScheduler] Error sending via webhook:', error.message);
    throw error; // Re-throw to allow worker retry
  }
}

/**
 * Get contractors who should receive speaker alerts
 * Returns contractors registered for event with matching interests
 */
async function getContractorsForSpeakerAlerts(eventId, sessionId) {
  const result = await query(`
    SELECT DISTINCT
      ea.contractor_id,
      c.phone,
      c.focus_areas
    FROM event_attendees ea
    JOIN contractors c ON ea.contractor_id = c.id
    WHERE ea.event_id = $1
      AND ea.sms_opt_in = true
      AND ea.profile_completion_status = 'complete'
      AND c.phone IS NOT NULL
  `, [eventId]);

  return result.rows;
}

/**
 * Get contractors who should receive sponsor recommendations
 */
async function getContractorsForSponsorRecommendations(eventId) {
  const result = await query(`
    SELECT DISTINCT
      ea.contractor_id,
      c.phone,
      c.focus_areas,
      c.revenue_tier
    FROM event_attendees ea
    JOIN contractors c ON ea.contractor_id = c.id
    WHERE ea.event_id = $1
      AND ea.sms_opt_in = true
      AND ea.profile_completion_status = 'complete'
      AND c.phone IS NOT NULL
  `, [eventId]);

  return result.rows;
}

module.exports = {
  sendSpeakerAlert,
  sendSponsorRecommendation,
  sendPCRRequest,
  getContractorsForSpeakerAlerts,
  getContractorsForSponsorRecommendations,
  sendViaWebhook // Export for use by event message worker
};
