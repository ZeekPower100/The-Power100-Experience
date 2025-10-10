const { query } = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Event Messaging Controller
 * Handles all event SMS messaging including scheduling, personalization, and CEO overrides
 * Database fields must match EXACTLY as defined in EVENT-DATABASE-SCHEMA.md
 */

// Schedule a message for an attendee
const scheduleMessage = async (req, res, next) => {
  const {
    event_id,
    contractor_id,
    message_type,
    message_category,
    scheduled_time,
    message_content,
    personalization_data
  } = req.body;

  try {
    const result = await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        message_category,
        scheduled_time,
        message_content,
        personalization_data,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      event_id,
      contractor_id,
      message_type,
      message_category,
      scheduled_time,
      message_content,
      safeJsonStringify(personalization_data || {})
    ]);

    res.status(201).json({
      success: true,
      message: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Mass schedule messages for all attendees
const massScheduleMessages = async (req, res, next) => {
  const { event_id, message_type, message_template, scheduled_time, personalization_fields } = req.body;

  try {
    // Get all checked-in attendees
    const attendees = await query(`
      SELECT
        ea.contractor_id,
        c.name,
        c.company_name,
        c.phone,
        ea.real_phone
      FROM event_attendees ea
      JOIN contractors c ON ea.contractor_id = c.id
      WHERE ea.event_id = $1 AND ea.check_in_time IS NOT NULL
    `, [event_id]);

    // Create personalized messages for each attendee
    const messages = [];
    for (const attendee of attendees.rows) {
      // Personalize the template
      let personalizedContent = message_template;
      const personalizationData = {
        name: attendee.name,
        company: attendee.company_name,
        phone: attendee.real_phone || attendee.phone
      };

      // Replace placeholders
      personalizedContent = personalizedContent.replace(/\{\{name\}\}/g, attendee.name);
      personalizedContent = personalizedContent.replace(/\{\{company\}\}/g, attendee.company_name);

      const result = await query(`
        INSERT INTO event_messages (
          event_id,
          contractor_id,
          message_type,
          message_category,
          scheduled_time,
          message_content,
          personalization_data,
          status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
        RETURNING id
      `, [
        event_id,
        attendee.contractor_id,
        message_type,
        'mass_send',
        scheduled_time,
        personalizedContent,
        safeJsonStringify(personalizationData)
      ]);

      messages.push(result.rows[0].id);
    }

    res.json({
      success: true,
      messages_scheduled: messages.length,
      message_ids: messages
    });
  } catch (error) {
    next(error);
  }
};

// CEO Override - Delay all pending messages
const applyDelayOverride = async (req, res, next) => {
  const { event_id, delay_minutes, reason } = req.body;

  try {
    // Update all pending messages for the event
    const result = await query(`
      UPDATE event_messages
      SET
        scheduled_time = scheduled_time + INTERVAL '${delay_minutes} minutes',
        delay_minutes = COALESCE(delay_minutes, 0) + $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $1 AND status = 'pending'
      RETURNING id
    `, [event_id, delay_minutes]);

    // Log the override in the timeline
    await query(`
      UPDATE event_timeline
      SET
        delay_minutes = COALESCE(delay_minutes, 0) + $2,
        ceo_override_log = ceo_override_log || $3::jsonb,
        updated_at = CURRENT_TIMESTAMP
      WHERE event_id = $1 AND status = 'scheduled'
    `, [
      event_id,
      delay_minutes,
      safeJsonStringify([{
        time: new Date().toISOString(),
        message: reason,
        delay_applied: delay_minutes
      }])
    ]);

    res.json({
      success: true,
      messages_delayed: result.rows.length,
      delay_applied: delay_minutes
    });
  } catch (error) {
    next(error);
  }
};

// Get pending messages ready to send
const getPendingMessages = async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        em.*,
        c.phone,
        c.name,
        ea.real_phone,
        ea.sms_opt_in
      FROM event_messages em
      JOIN contractors c ON em.contractor_id = c.id
      LEFT JOIN event_attendees ea ON ea.event_id = em.event_id AND ea.contractor_id = em.contractor_id
      WHERE
        em.status = 'pending'
        AND em.scheduled_time <= CURRENT_TIMESTAMP
      ORDER BY em.scheduled_time
      LIMIT 50
    `);

    res.json({
      success: true,
      messages: result.rows.map(msg => ({
        ...msg,
        phone_number: msg.real_phone || msg.phone,
        can_send: msg.sms_opt_in !== false
      }))
    });
  } catch (error) {
    next(error);
  }
};

// Mark message as sent
const markMessageSent = async (req, res, next) => {
  const { messageId } = req.params;
  const { error_message } = req.body;

  try {
    const status = error_message ? 'failed' : 'sent';
    const result = await query(`
      UPDATE event_messages
      SET
        status = $2,
        actual_send_time = CASE WHEN $2 = 'sent' THEN CURRENT_TIMESTAMP ELSE NULL END,
        error_message = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [messageId, status, error_message]);

    if (result.rows.length === 0) {
      throw new AppError('Message not found', 404);
    }

    res.json({
      success: true,
      message: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Record message response
const recordResponse = async (req, res, next) => {
  const { messageId } = req.params;
  const { response_received, sentiment_score, pcr_score, action_taken } = req.body;

  try {
    const result = await query(`
      UPDATE event_messages
      SET
        response_received = $2,
        response_time = CURRENT_TIMESTAMP,
        sentiment_score = $3,
        pcr_score = $4,
        action_taken = $5,
        status = 'responded',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [messageId, response_received, sentiment_score, pcr_score, action_taken]);

    if (result.rows.length === 0) {
      throw new AppError('Message not found', 404);
    }

    res.json({
      success: true,
      message: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

// Get message analytics for an event
const getEventMessageAnalytics = async (req, res, next) => {
  const { eventId } = req.params;

  try {
    const stats = await query(`
      SELECT
        COUNT(*) as total_messages,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
        COUNT(CASE WHEN status = 'responded' THEN 1 END) as response_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        AVG(CASE WHEN pcr_score IS NOT NULL THEN pcr_score END) as avg_pcr_score,
        AVG(CASE WHEN sentiment_score IS NOT NULL THEN sentiment_score END) as avg_sentiment
      FROM event_messages
      WHERE event_id = $1
    `, [eventId]);

    const byType = await query(`
      SELECT
        message_type,
        COUNT(*) as count,
        AVG(CASE WHEN pcr_score IS NOT NULL THEN pcr_score END) as avg_pcr
      FROM event_messages
      WHERE event_id = $1
      GROUP BY message_type
    `, [eventId]);

    res.json({
      success: true,
      overall: stats.rows[0],
      by_type: byType.rows
    });
  } catch (error) {
    next(error);
  }
};

// ==================== PEER MATCHING ENDPOINTS ====================

const peerMatchingService = require('../services/peerMatchingService');

// Find peer matches for a contractor at an event
const findPeerMatches = async (req, res, next) => {
  const { eventId, contractorId } = req.params;
  const { maxMatches, minScore, excludeMatched } = req.query;

  try {
    const matches = await peerMatchingService.findPeerMatches(
      parseInt(contractorId),
      parseInt(eventId),
      {
        maxMatches: parseInt(maxMatches) || 3,
        minScore: parseFloat(minScore) || 0.6,
        excludeMatched: excludeMatched !== 'false' // Default true
      }
    );

    res.json({
      success: true,
      count: matches.length,
      matches
    });
  } catch (error) {
    next(error);
  }
};

// Create a peer match
const createPeerMatch = async (req, res, next) => {
  const { eventId } = req.params;
  const { contractorId, peerId, matchData } = req.body;

  try {
    const match = await peerMatchingService.createPeerMatch(
      contractorId,
      peerId,
      parseInt(eventId),
      matchData
    );

    res.status(201).json({
      success: true,
      match
    });
  } catch (error) {
    next(error);
  }
};

// Send peer introduction via SMS
const sendPeerIntroduction = async (req, res, next) => {
  const { matchId } = req.params;
  const { message } = req.body;

  try {
    // Record introduction in database
    const match = await peerMatchingService.recordIntroduction(matchId, message);

    // TODO: Send actual SMS via n8n/GHL webhook
    // This would integrate with your SMS service

    res.json({
      success: true,
      message: 'Introduction sent',
      match
    });
  } catch (error) {
    next(error);
  }
};

// Record contractor response to peer introduction
const recordPeerResponse = async (req, res, next) => {
  const { matchId } = req.params;
  const { contractorId, response } = req.body;

  try {
    const match = await peerMatchingService.recordResponse(
      parseInt(matchId),
      contractorId,
      response
    );

    res.json({
      success: true,
      match
    });
  } catch (error) {
    next(error);
  }
};

// Record that connection was made (meeting scheduled)
const recordPeerConnection = async (req, res, next) => {
  const { matchId } = req.params;
  const { meetingDetails } = req.body;

  try {
    const match = await peerMatchingService.recordConnection(
      parseInt(matchId),
      meetingDetails
    );

    res.json({
      success: true,
      match
    });
  } catch (error) {
    next(error);
  }
};

// Get all matches for a contractor at an event
const getContractorMatches = async (req, res, next) => {
  const { eventId, contractorId } = req.params;

  try {
    const matches = await peerMatchingService.getContractorMatches(
      parseInt(contractorId),
      parseInt(eventId)
    );

    res.json({
      success: true,
      count: matches.length,
      matches
    });
  } catch (error) {
    next(error);
  }
};

// Webhook response from n8n - Log SMS delivery data
const webhookResponse = async (req, res, next) => {
  // Validate n8n API key
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey || apiKey !== process.env.TPX_N8N_API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid API key'
    });
  }

  const {
    type,
    direction,
    contractor_id,
    event_id,
    message_type,
    contactId,
    phone,
    messageId,
    status,
    success,
    timestamp
  } = req.body;

  try {
    // Log to event_messages table for comprehensive tracking
    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        phone,
        ghl_contact_id,
        ghl_message_id,
        status,
        direction,
        actual_send_time,
        message_content,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      event_id,
      contractor_id,
      message_type,
      phone,
      contactId,
      messageId,
      status,
      direction || 'outbound',
      timestamp,
      'SMS delivery log from n8n workflow'
    ]);

    res.status(200).json({
      success: true,
      message: 'SMS delivery logged successfully'
    });
  } catch (error) {
    console.error('Error logging SMS delivery:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Log speaker feedback from n8n workflow
// DATABASE-CHECKED: event_speakers, event_messages columns verified on 2025-10-03
const logSpeakerFeedback = async (req, res) => {
  // Validate n8n API key
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');

  if (!apiKey || apiKey !== process.env.TPX_N8N_API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized - Invalid API key'
    });
  }

  const {
    contractor_id,
    event_id,
    speaker_id,
    rating,
    feedback_text,
    sentiment_score,
    sentiment_analysis,
    phone,
    contactId,
    messageId,
    timestamp
  } = req.body;

  try {
    // Update speaker's average rating and total ratings
    await query(`
      UPDATE event_speakers
      SET
        total_ratings = total_ratings + 1,
        average_rating = (
          COALESCE(average_rating * total_ratings, 0) + $2
        ) / (total_ratings + 1),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [speaker_id, rating]);

    // Log the feedback to event_messages table
    await query(`
      INSERT INTO event_messages (
        event_id,
        contractor_id,
        message_type,
        message_category,
        phone,
        ghl_contact_id,
        ghl_message_id,
        status,
        direction,
        actual_send_time,
        response_received,
        response_time,
        sentiment_score,
        pcr_score,
        message_content,
        created_at,
        updated_at
      ) VALUES ($1, $2, 'speaker_feedback', 'feedback', $3, $4, $5, 'delivered', 'outbound', $6, $7, CURRENT_TIMESTAMP, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      event_id,
      contractor_id,
      phone,
      contactId,
      messageId,
      timestamp,
      feedback_text,
      sentiment_score,
      rating * 10, // Convert 1-10 rating to 0-100 PCR score
      safeJsonStringify({
        speaker_id,
        rating,
        feedback_text,
        sentiment_analysis
      })
    ]);

    res.status(200).json({
      success: true,
      message: 'Speaker feedback logged successfully',
      speaker_id,
      rating
    });
  } catch (error) {
    console.error('Error logging speaker feedback:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get pending messages for SMS routing context
const getPendingContext = async (req, res) => {
  const { contractor_id } = req.query;

  if (!contractor_id) {
    return res.status(400).json({
      success: false,
      error: 'contractor_id is required'
    });
  }

  try {
    // Get messages sent in last 48 hours that are still expecting responses
    const result = await query(`
      SELECT
        id,
        event_id,
        message_type,
        message_category,
        personalization_data,
        actual_send_time as sent_at,
        status,
        EXTRACT(EPOCH FROM (NOW() - actual_send_time))/3600 as hours_since_sent
      FROM event_messages
      WHERE contractor_id = $1
        AND status = 'sent'
        AND actual_send_time IS NOT NULL
        AND actual_send_time >= NOW() - INTERVAL '48 hours'
      ORDER BY actual_send_time DESC
    `, [contractor_id]);

    res.json({
      success: true,
      contractor_id: parseInt(contractor_id),
      pending_messages: result.rows
    });
  } catch (error) {
    console.error('Error getting pending context:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Log routing decision for analytics
const logRoutingDecision = async (req, res) => {
  const {
    contractor_id,
    phone,
    message_text,
    route_to,
    confidence,
    routing_method,
    timestamp
  } = req.body;

  try {
    // Log to database for analytics (optional - can add table later)
    console.log('SMS Routing Decision:', {
      contractor_id,
      phone,
      route_to,
      confidence,
      routing_method,
      message_preview: message_text?.substring(0, 50)
    });

    // Future: Insert into sms_routing_decisions table when created
    // await query(`
    //   INSERT INTO sms_routing_decisions (
    //     contractor_id, phone, message_text, route_to, confidence,
    //     routing_method, timestamp
    //   ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    // `, [contractor_id, phone, message_text, route_to, confidence, routing_method, timestamp]);

    res.json({
      success: true,
      message: 'Routing decision logged'
    });
  } catch (error) {
    console.error('Error logging routing decision:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get message queue for an event
const getMessageQueue = async (req, res) => {
  const { eventId } = req.params;

  try {
    // DATABASE-CHECKED: event_messages columns verified on 2025-01-29
    const result = await query(`
      SELECT
        em.id,
        em.event_id,
        em.contractor_id,
        em.message_type,
        em.message_category,
        em.scheduled_time,
        em.actual_send_time,
        em.message_content,
        em.status,
        em.delay_minutes,
        c.name as contractor_name,
        c.company_name,
        c.phone
      FROM event_messages em
      JOIN contractors c ON em.contractor_id = c.id
      WHERE em.event_id = $1
        AND em.status IN ('pending', 'sent')
      ORDER BY em.scheduled_time ASC
      LIMIT 100
    `, [eventId]);

    res.json({
      success: true,
      messages: result.rows
    });
  } catch (error) {
    console.error('Error fetching message queue:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Send pending messages (called by n8n or cron job)
const sendPendingMessages = async (req, res) => {
  try {
    // DATABASE-CHECKED: event_messages columns verified on 2025-01-29
    const messages = await query(`
      SELECT
        em.id,
        em.event_id,
        em.contractor_id,
        em.message_type,
        em.message_content,
        em.scheduled_time,
        em.phone,
        c.phone as contractor_phone,
        ea.real_phone,
        ea.sms_opt_in
      FROM event_messages em
      JOIN contractors c ON em.contractor_id = c.id
      LEFT JOIN event_attendees ea ON ea.event_id = em.event_id AND ea.contractor_id = em.contractor_id
      WHERE em.status = 'pending'
        AND em.scheduled_time <= CURRENT_TIMESTAMP
      ORDER BY em.scheduled_time
      LIMIT 50
    `);

    res.json({
      success: true,
      messages: messages.rows.map(msg => ({
        ...msg,
        phone_number: msg.real_phone || msg.phone || msg.contractor_phone,
        can_send: msg.sms_opt_in !== false
      }))
    });
  } catch (error) {
    console.error('Error sending pending messages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Update message status
const updateMessageStatus = async (req, res) => {
  const { messageId } = req.params;
  const { status, error_message } = req.body;

  try {
    // DATABASE-CHECKED: event_messages columns verified on 2025-01-29
    const result = await query(`
      UPDATE event_messages
      SET
        status = $2,
        actual_send_time = CASE WHEN $2 = 'sent' THEN CURRENT_TIMESTAMP ELSE actual_send_time END,
        error_message = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [messageId, status, error_message]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    res.json({
      success: true,
      message: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Outbound Trigger: Send Speaker Alert
 * Trigger speaker recommendation SMS for specific contractor
 */
const triggerSpeakerAlert = async (req, res, next) => {
  try {
    const { event_id, contractor_id, speaker_recommendations } = req.body;

    if (!event_id || !contractor_id || !speaker_recommendations) {
      return res.status(400).json({
        success: false,
        error: 'event_id, contractor_id, and speaker_recommendations are required'
      });
    }

    const outboundScheduler = require('../services/eventOrchestrator/outboundScheduler');
    const result = await outboundScheduler.sendSpeakerAlert(event_id, contractor_id, speaker_recommendations);

    res.json({
      success: true,
      message: 'Speaker alert sent successfully',
      ...result
    });
  } catch (error) {
    console.error('Error triggering speaker alert:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Outbound Trigger: Send Sponsor Recommendation
 * Trigger sponsor recommendation SMS for specific contractor
 */
const triggerSponsorRecommendation = async (req, res, next) => {
  try {
    const { event_id, contractor_id, sponsor_recommendations } = req.body;

    if (!event_id || !contractor_id || !sponsor_recommendations) {
      return res.status(400).json({
        success: false,
        error: 'event_id, contractor_id, and sponsor_recommendations are required'
      });
    }

    const outboundScheduler = require('../services/eventOrchestrator/outboundScheduler');
    const result = await outboundScheduler.sendSponsorRecommendation(event_id, contractor_id, sponsor_recommendations);

    res.json({
      success: true,
      message: 'Sponsor recommendation sent successfully',
      ...result
    });
  } catch (error) {
    console.error('Error triggering sponsor recommendation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Outbound Trigger: Send PCR Request
 * Trigger PCR request SMS for specific contractor after session
 */
const triggerPCRRequest = async (req, res, next) => {
  try {
    const { event_id, contractor_id, session_info } = req.body;

    if (!event_id || !contractor_id || !session_info) {
      return res.status(400).json({
        success: false,
        error: 'event_id, contractor_id, and session_info are required'
      });
    }

    const outboundScheduler = require('../services/eventOrchestrator/outboundScheduler');
    const result = await outboundScheduler.sendPCRRequest(event_id, contractor_id, session_info);

    res.json({
      success: true,
      message: 'PCR request sent successfully',
      ...result
    });
  } catch (error) {
    console.error('Error triggering PCR request:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Register contractor(s) for event - triggers profile completion or agenda
 */
const registerForEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const registrationData = req.body;

    // registrationData can be single object or array for bulk
    // Required fields: email, phone (optional: first_name, last_name, company_name)

    const eventRegistrationService = require('../services/eventOrchestrator/eventRegistrationService');
    const result = await eventRegistrationService.registerContractors(eventId, registrationData);

    res.json({
      success: true,
      message: `Processed ${result.success.length + result.failed.length} registrations`,
      ...result
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Resend personalized agenda to contractor
 */
const resendAgenda = async (req, res, next) => {
  try {
    const { eventId, contractorId } = req.params;

    const eventRegistrationService = require('../services/eventOrchestrator/eventRegistrationService');
    const messageId = await eventRegistrationService.sendPersonalizedAgenda(eventId, contractorId);

    res.json({
      success: true,
      message: 'Personalized agenda sent',
      message_id: messageId
    });
  } catch (error) {
    console.error('Error resending agenda:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Trigger post-event wrap-up for all attendees or specific contractor
 */
const triggerPostEventWrapUp = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { contractorId } = req.body; // Optional - if null, sends to all

    const postEventWrapUpService = require('../services/eventOrchestrator/postEventWrapUpService');
    const result = await postEventWrapUpService.sendPostEventWrapUp(eventId, contractorId);

    res.json({
      success: true,
      message: contractorId
        ? 'Post-event wrap-up sent to contractor'
        : `Post-event wrap-up sent to ${result.success.length} attendees`,
      ...result
    });
  } catch (error) {
    console.error('Error triggering post-event wrap-up:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Resend post-event wrap-up to specific contractor
 */
const resendPostEventWrapUp = async (req, res, next) => {
  try {
    const { eventId, contractorId } = req.params;

    const postEventWrapUpService = require('../services/eventOrchestrator/postEventWrapUpService');

    // Get event and contractor details
    const eventResult = await query(`
      SELECT id, name, date, end_date, location, sms_event_code
      FROM events WHERE id = $1
    `, [eventId]);

    if (eventResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Event not found'
      });
    }

    const contractorResult = await query(`
      SELECT id, first_name, last_name, phone, email, focus_areas
      FROM contractors WHERE id = $1
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contractor not found'
      });
    }

    const messageId = await postEventWrapUpService.sendIndividualWrapUp(
      eventId,
      contractorId,
      eventResult.rows[0],
      contractorResult.rows[0]
    );

    res.json({
      success: true,
      message: 'Post-event wrap-up resent successfully',
      message_id: messageId
    });
  } catch (error) {
    console.error('Error resending post-event wrap-up:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ==================== EMAIL TRIGGERS ====================

/**
 * Trigger registration confirmation email
 * DATABASE-CHECKED: event_messages, events, contractors, event_attendees tables verified
 */
const triggerRegistrationConfirmation = async (req, res) => {
  try {
    const { event_id, contractor_id } = req.body;

    if (!event_id || !contractor_id) {
      return res.status(400).json({
        success: false,
        error: 'event_id and contractor_id are required'
      });
    }

    const emailScheduler = require('../services/eventOrchestrator/emailScheduler');
    const result = await emailScheduler.sendRegistrationConfirmation(event_id, contractor_id);

    res.json({
      success: true,
      message: 'Registration confirmation email sent successfully',
      ...result
    });
  } catch (error) {
    console.error('Error triggering registration confirmation:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Trigger profile completion reminder email
 * DATABASE-CHECKED: Uses exact field names from database schema
 */
const triggerProfileCompletionReminder = async (req, res) => {
  try {
    const { event_id, contractor_id } = req.body;

    if (!event_id || !contractor_id) {
      return res.status(400).json({
        success: false,
        error: 'event_id and contractor_id are required'
      });
    }

    const emailScheduler = require('../services/eventOrchestrator/emailScheduler');
    const result = await emailScheduler.sendProfileCompletionReminder(event_id, contractor_id);

    res.json({
      success: true,
      message: 'Profile completion reminder sent successfully',
      ...result
    });
  } catch (error) {
    console.error('Error triggering profile completion reminder:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Trigger personalized agenda email
 * DATABASE-CHECKED: Uses exact field names from database schema
 */
const triggerPersonalizedAgenda = async (req, res) => {
  try {
    const { event_id, contractor_id, recommendations } = req.body;

    if (!event_id || !contractor_id) {
      return res.status(400).json({
        success: false,
        error: 'event_id and contractor_id are required'
      });
    }

    const emailScheduler = require('../services/eventOrchestrator/emailScheduler');
    const result = await emailScheduler.sendPersonalizedAgenda(event_id, contractor_id, recommendations || []);

    res.json({
      success: true,
      message: 'Personalized agenda sent successfully',
      ...result
    });
  } catch (error) {
    console.error('Error triggering personalized agenda:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

/**
 * Trigger event summary email
 * DATABASE-CHECKED: Uses exact field names from database schema
 */
const triggerEventSummary = async (req, res) => {
  try {
    const { event_id, contractor_id, session_data } = req.body;

    if (!event_id || !contractor_id) {
      return res.status(400).json({
        success: false,
        error: 'event_id and contractor_id are required'
      });
    }

    const emailScheduler = require('../services/eventOrchestrator/emailScheduler');
    const result = await emailScheduler.sendEventSummary(event_id, contractor_id, session_data || {});

    res.json({
      success: true,
      message: 'Event summary sent successfully',
      ...result
    });
  } catch (error) {
    console.error('Error triggering event summary:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  scheduleMessage,
  massScheduleMessages,
  applyDelayOverride,
  getPendingMessages,
  markMessageSent,
  recordResponse,
  getEventMessageAnalytics,
  getMessageQueue,
  sendPendingMessages,
  updateMessageStatus,
  // Peer Matching
  findPeerMatches,
  createPeerMatch,
  sendPeerIntroduction,
  recordPeerResponse,
  recordPeerConnection,
  getContractorMatches,
  // n8n Webhook
  webhookResponse,
  logSpeakerFeedback,
  // SMS Router
  getPendingContext,
  logRoutingDecision,
  // Outbound Triggers (SMS)
  triggerSpeakerAlert,
  triggerSponsorRecommendation,
  triggerPCRRequest,
  // Event Registration
  registerForEvent,
  resendAgenda,
  // Post-Event Wrap-Up
  triggerPostEventWrapUp,
  resendPostEventWrapUp,
  // Email Triggers
  triggerRegistrationConfirmation,
  triggerProfileCompletionReminder,
  triggerPersonalizedAgenda,
  triggerEventSummary
};