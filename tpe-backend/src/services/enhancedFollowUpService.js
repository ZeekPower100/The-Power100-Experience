// ============================================================================
// DATABASE-CHECKED: Phase 3 Day 3 - Enhanced Follow-Up System
// ============================================================================
// TABLE: contractor_followup_schedules (21 columns verified)
// VERIFIED COLUMNS: id, contractor_id, action_item_id, event_id, scheduled_time,
//                   followup_type, message_template, message_tone, status, sent_at,
//                   response_received_at, response_text, ai_should_personalize,
//                   ai_context_hints (JSONB), skip_if_completed, is_recurring,
//                   recurrence_interval_days, next_occurrence_id, created_at, updated_at, sent_by
//
// TABLE: contractor_action_items (27 columns verified)
// VERIFIED COLUMNS: id, contractor_id, event_id, title, description, action_type,
//                   priority, contractor_priority, ai_suggested_priority, due_date,
//                   reminder_time, status, completed_at, cancelled_reason,
//                   related_partner_id, related_peer_contractor_id, related_speaker_id,
//                   related_sponsor_id, related_note_id, related_demo_booking_id,
//                   ai_generated, ai_reasoning, extraction_confidence, source_message_id,
//                   conversation_context (JSONB), created_at, updated_at
//
// TABLE: ai_concierge_goals (from Phase 1, referenced for follow-ups)
// TABLE: ai_proactive_messages (from Phase 3 Day 1, for tracking)
//
// VERIFIED: October 22, 2025
// ============================================================================

const { query } = require('../config/database');

/**
 * Phase 3 - Day 3: Enhanced Follow-Up Scheduler
 *
 * Goal-driven follow-up system that:
 * - Schedules based on goal priority and checklist triggers
 * - Generates context-aware messages referencing past conversations
 * - Adapts timing based on contractor response patterns
 * - Auto-cancels if contractor completes action early
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const FOLLOWUP_TYPE = {
  CHECK_IN: 'check_in',
  REMINDER: 'reminder',
  STATUS_UPDATE: 'status_update',
  OFFER_HELP: 'offer_help',
  COMPLETION_CONFIRMATION: 'completion_confirmation',
  EVENT_RECAP: 'event_recap',
  POST_EVENT_SURVEY: 'post_event_survey',
  PARTNER_INTRODUCTION: 'partner_introduction',
  RESOURCE_RECOMMENDATION: 'resource_recommendation'
};

const FOLLOWUP_STATUS = {
  SCHEDULED: 'scheduled',
  SENT: 'sent',
  RESPONDED: 'responded',
  CANCELLED: 'cancelled',
  SKIPPED: 'skipped'
};

// ============================================================================
// SCHEDULE GOAL-DRIVEN FOLLOW-UP
// ============================================================================

/**
 * Schedule a follow-up based on goal priority and status
 *
 * @param {Object} followUpData - Follow-up configuration
 * @param {number} followUpData.contractor_id - Contractor ID
 * @param {number} followUpData.goal_id - Related goal ID (optional)
 * @param {number} followUpData.action_item_id - Related action item ID (optional)
 * @param {string} followUpData.followup_type - Type of follow-up
 * @param {number} followUpData.days_until_followup - Days from now to schedule
 * @param {Object} followUpData.context_hints - JSONB context for personalization
 * @returns {Promise<Object>} Scheduled follow-up record
 */
async function scheduleGoalDrivenFollowUp(followUpData) {
  const {
    contractor_id,
    goal_id = null,
    action_item_id = null,
    followup_type,
    days_until_followup = 3,
    context_hints = {}
  } = followUpData;

  try {
    // Calculate scheduled time based on goal priority
    let adjustedDays = days_until_followup;

    if (goal_id) {
      const goalResult = await query(
        'SELECT priority_score FROM ai_concierge_goals WHERE id = $1',
        [goal_id]
      );

      if (goalResult.rows.length > 0) {
        const priority = goalResult.rows[0].priority_score;

        // High-priority goals (8-10) get faster follow-ups
        if (priority >= 8) {
          adjustedDays = Math.max(2, Math.floor(days_until_followup * 0.7)); // 30% faster
        }
        // Medium-high priority (6-7)
        else if (priority >= 6) {
          adjustedDays = Math.max(2, Math.floor(days_until_followup * 0.85)); // 15% faster
        }
      }
    }

    // Check contractor's response pattern
    const responseTiming = await getContractorResponseTiming(contractor_id);

    // Adjust based on when contractor typically responds
    if (responseTiming.avg_response_days) {
      adjustedDays = Math.max(2, Math.min(adjustedDays, Math.ceil(responseTiming.avg_response_days * 1.5)));
    }

    const scheduledTime = new Date();
    scheduledTime.setDate(scheduledTime.getDate() + adjustedDays);

    // Insert follow-up
    const result = await query(
      `INSERT INTO contractor_followup_schedules (
        contractor_id,
        action_item_id,
        scheduled_time,
        followup_type,
        message_template,
        message_tone,
        status,
        ai_should_personalize,
        ai_context_hints,
        skip_if_completed,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *`,
      [
        contractor_id,
        action_item_id,
        scheduledTime,
        followup_type,
        '', // Will be generated dynamically
        'friendly',
        FOLLOWUP_STATUS.SCHEDULED,
        true,
        JSON.stringify({ ...context_hints, goal_id }),
        true // Auto-cancel if completed
      ]
    );

    return {
      ...result.rows[0],
      adjusted_days: adjustedDays,
      original_days: days_until_followup
    };
  } catch (error) {
    console.error('Error scheduling goal-driven follow-up:', error);
    throw error;
  }
}

// ============================================================================
// GENERATE CONTEXT-AWARE FOLLOW-UP MESSAGE
// ============================================================================

/**
 * Generate a follow-up message that references past context
 *
 * @param {number} contractorId - Contractor ID
 * @param {Object} context - Message context
 * @param {number} context.goal_id - Related goal ID
 * @param {number} context.action_item_id - Related action item ID
 * @param {string} context.followup_type - Type of follow-up
 * @param {string} context.last_conversation - What was discussed
 * @returns {Promise<Object>} Generated follow-up message
 */
async function generateContextAwareFollowUp(contractorId, context = {}) {
  const {
    goal_id,
    action_item_id,
    followup_type,
    last_conversation
  } = context;

  try {
    // Get contractor name
    const contractorResult = await query(
      'SELECT first_name FROM contractors WHERE id = $1',
      [contractorId]
    );

    if (contractorResult.rows.length === 0) {
      throw new Error(`Contractor ${contractorId} not found`);
    }

    const firstName = contractorResult.rows[0].first_name || 'there';

    let message = '';
    let messageType = 'check_in';
    let aiReasoning = '';

    // Build context-aware message based on type
    if (action_item_id) {
      // Follow up on action item
      const actionResult = await query(
        'SELECT title, description, status FROM contractor_action_items WHERE id = $1',
        [action_item_id]
      );

      if (actionResult.rows.length > 0) {
        const action = actionResult.rows[0];

        if (action.status === 'completed') {
          // Skip - action already completed
          return null;
        }

        message = `Hi ${firstName}, checking in on "${action.title}". How's that going?`;
        messageType = 'milestone_follow_up';
        aiReasoning = `Following up on action item: ${action.title}`;
      }
    } else if (goal_id) {
      // Follow up on goal
      const goalResult = await query(
        'SELECT goal_description, priority_score FROM ai_concierge_goals WHERE id = $1',
        [goal_id]
      );

      if (goalResult.rows.length > 0) {
        const goal = goalResult.rows[0];

        if (last_conversation) {
          message = `Hi ${firstName}, remember you mentioned "${last_conversation}"? Wanted to check how progress is going on "${goal.goal_description}".`;
        } else {
          message = `Hi ${firstName}, checking in on your progress with "${goal.goal_description}". Any updates?`;
        }

        messageType = 'check_in';
        aiReasoning = `High-priority goal follow-up (priority: ${goal.priority_score})`;
      }
    } else {
      // Generic check-in
      if (last_conversation) {
        message = `Hi ${firstName}, remember we talked about "${last_conversation}"? How's that been going?`;
      } else {
        message = `Hi ${firstName}, just checking in! How have things been this week?`;
      }

      messageType = 'check_in';
      aiReasoning = 'Routine check-in to maintain engagement';
    }

    // Get pattern data if available
    const patternData = await getRelevantPatternData(contractorId, goal_id);

    if (patternData) {
      message += ` ${patternData.suggestion}`;
      aiReasoning += ` | Pattern insight: ${patternData.pattern_description}`;
    }

    return {
      message_content: message,
      message_type: messageType,
      ai_reasoning: aiReasoning,
      context_data: {
        goal_id,
        action_item_id,
        followup_type,
        last_conversation,
        pattern_reference: patternData?.pattern_id
      }
    };
  } catch (error) {
    console.error('Error generating context-aware follow-up:', error);
    throw error;
  }
}

// ============================================================================
// GET CONTRACTOR RESPONSE TIMING
// ============================================================================

/**
 * Analyze contractor's response patterns to optimize follow-up timing
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Object>} Response timing analysis
 */
async function getContractorResponseTiming(contractorId) {
  try {
    // Check proactive message response times
    const responseResult = await query(
      `SELECT
        COUNT(*) as total_messages,
        COUNT(contractor_response) as responded_count,
        AVG(EXTRACT(EPOCH FROM (response_received_at - sent_at)) / 86400) as avg_response_days
      FROM ai_proactive_messages
      WHERE contractor_id = $1
        AND sent_at IS NOT NULL`,
      [contractorId]
    );

    const totalMessages = parseInt(responseResult.rows[0].total_messages);
    const respondedCount = parseInt(responseResult.rows[0].responded_count);
    const avgResponseDays = parseFloat(responseResult.rows[0].avg_response_days);

    // Check follow-up response times
    const followUpResult = await query(
      `SELECT
        COUNT(*) as total_followups,
        COUNT(response_received_at) as responded_followups
      FROM contractor_followup_schedules
      WHERE contractor_id = $1
        AND sent_at IS NOT NULL`,
      [contractorId]
    );

    const totalFollowups = parseInt(followUpResult.rows[0].total_followups);
    const respondedFollowups = parseInt(followUpResult.rows[0].responded_followups);

    return {
      total_messages: totalMessages,
      response_rate: totalMessages > 0 ? Math.round((respondedCount / totalMessages) * 100) : 0,
      avg_response_days: avgResponseDays || null,
      total_followups: totalFollowups,
      followup_response_rate: totalFollowups > 0 ? Math.round((respondedFollowups / totalFollowups) * 100) : 0,
      prefers_quick_response: avgResponseDays && avgResponseDays < 1, // Within 1 day
      prefers_weekly_checkin: avgResponseDays && avgResponseDays >= 5 // 5+ days
    };
  } catch (error) {
    console.error('Error getting contractor response timing:', error);
    throw error;
  }
}

// ============================================================================
// GET RELEVANT PATTERN DATA
// ============================================================================

/**
 * Get relevant pattern data for follow-up suggestions
 *
 * @param {number} contractorId - Contractor ID
 * @param {number} goalId - Goal ID
 * @returns {Promise<Object|null>} Pattern data or null
 */
async function getRelevantPatternData(contractorId, goalId) {
  try {
    if (!goalId) return null;

    // Get contractor's pattern matches
    const patternResult = await query(
      `SELECT
        p.id,
        p.success_indicators,
        p.avg_time_to_level_up_months,
        pm.match_score
      FROM contractor_pattern_matches pm
      JOIN business_growth_patterns p ON p.id = pm.pattern_id
      WHERE pm.contractor_id = $1
      ORDER BY pm.match_score DESC
      LIMIT 1`,
      [contractorId]
    );

    if (patternResult.rows.length === 0) return null;

    const pattern = patternResult.rows[0];

    // Build suggestion from pattern
    const suggestion = pattern.success_indicators
      ? `By the way, contractors in similar situations who focused on "${pattern.success_indicators}" saw great results.`
      : null;

    return {
      pattern_id: pattern.id,
      pattern_description: pattern.success_indicators,
      suggestion: suggestion,
      match_score: pattern.match_score
    };
  } catch (error) {
    console.error('Error getting pattern data:', error);
    return null;
  }
}

// ============================================================================
// AUTO-CANCEL COMPLETED FOLLOW-UPS
// ============================================================================

/**
 * Auto-cancel follow-ups when action is completed
 *
 * @param {number} actionItemId - Action item ID
 * @returns {Promise<number>} Count of cancelled follow-ups
 */
async function autoCancelCompletedFollowUps(actionItemId) {
  try {
    const result = await query(
      `UPDATE contractor_followup_schedules
       SET status = $1, updated_at = NOW()
       WHERE action_item_id = $2
         AND status = $3
         AND skip_if_completed = true
       RETURNING id`,
      [FOLLOWUP_STATUS.CANCELLED, actionItemId, FOLLOWUP_STATUS.SCHEDULED]
    );

    return result.rows.length;
  } catch (error) {
    console.error('Error auto-cancelling follow-ups:', error);
    throw error;
  }
}

// ============================================================================
// GET PENDING FOLLOW-UPS
// ============================================================================

/**
 * Get pending follow-ups that are due
 *
 * @param {Object} filters - Optional filters
 * @param {number} filters.contractor_id - Filter by contractor
 * @param {Date} filters.due_before - Get follow-ups due before this date
 * @returns {Promise<Array>} Pending follow-ups
 */
async function getPendingFollowUps(filters = {}) {
  const {
    contractor_id,
    due_before = new Date()
  } = filters;

  try {
    let queryStr = `
      SELECT *
      FROM contractor_followup_schedules
      WHERE status = $1
        AND scheduled_time <= $2
    `;
    const params = [FOLLOWUP_STATUS.SCHEDULED, due_before];
    let paramIndex = 3;

    if (contractor_id) {
      queryStr += ` AND contractor_id = $${paramIndex++}`;
      params.push(contractor_id);
    }

    queryStr += ` ORDER BY scheduled_time ASC`;

    const result = await query(queryStr, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting pending follow-ups:', error);
    throw error;
  }
}

// ============================================================================
// MARK FOLLOW-UP AS SENT
// ============================================================================

/**
 * Mark a follow-up as sent
 *
 * @param {number} followUpId - Follow-up ID
 * @returns {Promise<Object>} Updated follow-up record
 */
async function markFollowUpAsSent(followUpId) {
  try {
    const result = await query(
      `UPDATE contractor_followup_schedules
       SET status = $1, sent_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [FOLLOWUP_STATUS.SENT, followUpId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Follow-up ${followUpId} not found`);
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error marking follow-up as sent:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  FOLLOWUP_TYPE,
  FOLLOWUP_STATUS,
  scheduleGoalDrivenFollowUp,
  generateContextAwareFollowUp,
  getContractorResponseTiming,
  getRelevantPatternData,
  autoCancelCompletedFollowUps,
  getPendingFollowUps,
  markFollowUpAsSent
};
