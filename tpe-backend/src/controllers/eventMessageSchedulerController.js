/**
 * Event Message Scheduler Controller
 *
 * Processes scheduled messages created by AI Orchestrator
 * Called by cron job or n8n workflow every minute
 * ALL FIELD NAMES MATCH DATABASE SCHEMA EXACTLY
 */

const { query } = require('../config/database');
const eventOrchestratorAutomation = require('../services/eventOrchestratorAutomation');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Process all scheduled messages that are ready to send
 * This is the heartbeat that sends AI-generated messages on time
 */
const processScheduledMessages = async (req, res, next) => {
  try {
    console.log('📬 Processing scheduled messages...');

    const result = await eventOrchestratorAutomation.processScheduledMessages();

    res.json({
      success: true,
      processed: result.processed,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error processing scheduled messages:', error);
    next(error);
  }
};

/**
 * Apply CEO override delay to all pending messages for an event
 * Used when event is running late
 */
const applyEventDelay = async (req, res, next) => {
  const { event_id, delay_minutes } = req.body;

  if (!event_id || !delay_minutes) {
    return res.status(400).json({
      error: 'Missing required fields: event_id, delay_minutes'
    });
  }

  try {
    const result = await eventOrchestratorAutomation.applyEventDelay(event_id, delay_minutes);

    res.json(result);
  } catch (error) {
    console.error('Error applying event delay:', error);
    next(error);
  }
};

/**
 * Get message queue status for monitoring
 */
const getMessageQueueStatus = async (req, res, next) => {
  const { event_id } = req.params;

  try {
    // Get scheduled messages
    const scheduled = await query(`
      SELECT
        message_type,
        COUNT(*) as count,
        MIN(scheduled_time) as next_send_time
      FROM event_messages
      WHERE event_id = $1 AND status = 'scheduled'
      GROUP BY message_type
      ORDER BY MIN(scheduled_time)
    `, [event_id]);

    // Get sent messages
    const sent = await query(`
      SELECT
        message_type,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (actual_send_time - scheduled_time))) as avg_delay_seconds
      FROM event_messages
      WHERE event_id = $1 AND status = 'sent'
      GROUP BY message_type
    `, [event_id]);

    // Get failed messages
    const failed = await query(`
      SELECT
        message_type,
        COUNT(*) as count,
        error_message
      FROM event_messages
      WHERE event_id = $1 AND status = 'failed'
      GROUP BY message_type, error_message
    `, [event_id]);

    res.json({
      event_id,
      scheduled: scheduled.rows,
      sent: sent.rows,
      failed: failed.rows,
      summary: {
        total_scheduled: scheduled.rows.reduce((sum, r) => sum + parseInt(r.count), 0),
        total_sent: sent.rows.reduce((sum, r) => sum + parseInt(r.count), 0),
        total_failed: failed.rows.reduce((sum, r) => sum + parseInt(r.count), 0)
      }
    });
  } catch (error) {
    console.error('Error getting message queue status:', error);
    next(error);
  }
};

/**
 * Get AI orchestration performance metrics
 */
const getOrchestrationMetrics = async (req, res, next) => {
  const { event_id } = req.params;

  try {
    // Get learning events for this event
    const learning = await query(`
      SELECT
        action_taken,
        AVG(success_score) as avg_success,
        COUNT(*) as count
      FROM ai_learning_events
      WHERE context = $1
      GROUP BY action_taken
    `, [`event_${event_id}`]);

    // Get recommendation stats using related_entities JSONB field
    const recommendations = await query(`
      SELECT
        contractor_id,
        related_entities
      FROM ai_learning_events
      WHERE context = $1 AND action_taken = 'check_in_orchestration'
    `, [`event_${event_id}`]);

    // Calculate averages from the JSONB data
    let totalSpeakers = 0, totalSponsors = 0, totalPeers = 0;
    recommendations.rows.forEach(row => {
      const entities = safeJsonParse(row.related_entities, {});
      if (entities.recommendations) {
        totalSpeakers += entities.recommendations.speakers || 0;
        totalSponsors += entities.recommendations.sponsors || 0;
        totalPeers += entities.recommendations.peers || 0;
      }
    });

    const count = Math.max(recommendations.rows.length, 1);

    // Get response rates
    const responses = await query(`
      SELECT
        message_type,
        COUNT(*) as total,
        COUNT(response_received) as responded,
        AVG(sentiment_score) as avg_sentiment
      FROM event_messages
      WHERE event_id = $1 AND status = 'sent'
      GROUP BY message_type
    `, [event_id]);

    res.json({
      event_id,
      learning_events: learning.rows,
      recommendations_generated: recommendations.rows.length,
      avg_recommendations: {
        speakers: totalSpeakers / count,
        sponsors: totalSponsors / count,
        peers: totalPeers / count
      },
      response_rates: responses.rows.map(r => ({
        ...r,
        response_rate: r.responded / Math.max(r.total, 1) * 100
      }))
    });
  } catch (error) {
    console.error('Error getting orchestration metrics:', error);
    next(error);
  }
};

/**
 * Track message response (webhook from SMS provider)
 */
const trackMessageResponse = async (req, res, next) => {
  const { phone, message_text, event_id } = req.body;

  try {
    // Find the most recent message sent to this phone number
    const message = await query(`
      SELECT em.*
      FROM event_messages em
      JOIN contractors c ON em.contractor_id = c.id
      WHERE c.phone = $1 AND em.event_id = $2
      ORDER BY em.actual_send_time DESC
      LIMIT 1
    `, [phone, event_id]);

    if (message.rows[0]) {
      // Calculate basic sentiment (can be enhanced with AI)
      let sentiment_score = 0;
      const lowerText = message_text.toLowerCase();
      if (lowerText.includes('yes') || lowerText.includes('great') || lowerText.includes('thanks')) {
        sentiment_score = 1;
      } else if (lowerText.includes('no') || lowerText.includes('stop')) {
        sentiment_score = -1;
      }

      // Track the response
      await eventOrchestratorAutomation.trackMessageResponse(
        message.rows[0].id,
        message_text,
        sentiment_score
      );

      res.json({
        success: true,
        message_id: message.rows[0].id,
        sentiment_score
      });
    } else {
      res.status(404).json({
        error: 'No message found for this phone number'
      });
    }
  } catch (error) {
    console.error('Error tracking message response:', error);
    next(error);
  }
};

module.exports = {
  processScheduledMessages,
  applyEventDelay,
  getMessageQueueStatus,
  getOrchestrationMetrics,
  trackMessageResponse
};