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

module.exports = {
  scheduleMessage,
  massScheduleMessages,
  applyDelayOverride,
  getPendingMessages,
  markMessageSent,
  recordResponse,
  getEventMessageAnalytics
};