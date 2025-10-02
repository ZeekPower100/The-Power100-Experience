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

  if (!apiKey || apiKey !== process.env.N8N_API_KEY) {
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

module.exports = {
  scheduleMessage,
  massScheduleMessages,
  applyDelayOverride,
  getPendingMessages,
  markMessageSent,
  recordResponse,
  getEventMessageAnalytics,
  // Peer Matching
  findPeerMatches,
  createPeerMatch,
  sendPeerIntroduction,
  recordPeerResponse,
  recordPeerConnection,
  getContractorMatches,
  // n8n Webhook
  webhookResponse,
  // SMS Router
  getPendingContext,
  logRoutingDecision
};