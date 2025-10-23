// ============================================================================
// DATABASE-CHECKED: Phase 3 Tables Verification
// ============================================================================
// TABLE: ai_proactive_messages
// VERIFIED COLUMNS: id, contractor_id, message_type, message_content, ai_reasoning,
//                   context_data (JSONB), sent_at, contractor_response,
//                   response_received_at, conversation_continued, outcome_rating,
//                   led_to_action, created_at, updated_at
// CHECK CONSTRAINTS: message_type IN (check_in, milestone_follow_up, resource_suggestion,
//                                     encouragement, course_correction, celebration)
//                    outcome_rating BETWEEN 1 AND 5
// FOREIGN KEYS: contractor_id → contractors.id (CASCADE)
//
// VERIFIED: October 22, 2025
// ============================================================================

const { query } = require('../config/database');

/**
 * Phase 3 - Day 1: Proactive Message System
 *
 * This service manages AI-initiated messages:
 * - Schedule proactive messages based on goals
 * - Generate context-aware follow-up messages
 * - Track message outcomes (response, engagement, action taken)
 * - Evaluate triggers for proactive outreach
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const MESSAGE_TYPES = {
  CHECK_IN: 'check_in',
  MILESTONE_FOLLOW_UP: 'milestone_follow_up',
  RESOURCE_SUGGESTION: 'resource_suggestion',
  ENCOURAGEMENT: 'encouragement',
  COURSE_CORRECTION: 'course_correction',
  CELEBRATION: 'celebration'
};

const OUTCOME_RATING = {
  VERY_NEGATIVE: 1,
  NEGATIVE: 2,
  NEUTRAL: 3,
  POSITIVE: 4,
  VERY_POSITIVE: 5
};

// ============================================================================
// SCHEDULE PROACTIVE MESSAGE
// ============================================================================

/**
 * Schedule a proactive message for a contractor
 *
 * @param {Object} messageData - Message details
 * @param {number} messageData.contractor_id - Contractor ID
 * @param {string} messageData.message_type - Type of message (check_in, milestone_follow_up, etc.)
 * @param {string} messageData.message_content - The message text
 * @param {string} messageData.ai_reasoning - Why AI is sending this message
 * @param {Object} messageData.context_data - JSONB context (goal_id, milestone, pattern data)
 * @returns {Promise<Object>} Scheduled message record
 */
async function scheduleProactiveMessage(messageData) {
  const {
    contractor_id,
    message_type,
    message_content,
    ai_reasoning,
    context_data = {}
  } = messageData;

  // Validate message_type
  const validTypes = Object.values(MESSAGE_TYPES);
  if (!validTypes.includes(message_type)) {
    throw new Error(`Invalid message_type. Must be one of: ${validTypes.join(', ')}`);
  }

  // Validate required fields
  if (!contractor_id) {
    throw new Error('contractor_id is required');
  }
  if (!message_content) {
    throw new Error('message_content is required');
  }
  if (!ai_reasoning) {
    throw new Error('ai_reasoning is required');
  }

  try {
    const result = await query(
      `INSERT INTO ai_proactive_messages (
        contractor_id,
        message_type,
        message_content,
        ai_reasoning,
        context_data,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *`,
      [
        contractor_id,
        message_type,
        message_content,
        ai_reasoning,
        JSON.stringify(context_data)
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error scheduling proactive message:', error);
    throw error;
  }
}

// ============================================================================
// GENERATE FOLLOW-UP MESSAGE
// ============================================================================

/**
 * Generate a context-aware follow-up message for a contractor
 *
 * @param {number} contractorId - Contractor ID
 * @param {Object} context - Follow-up context
 * @param {number} context.goal_id - Related goal ID (optional)
 * @param {string} context.milestone_name - Milestone name (optional)
 * @param {number} context.pattern_match_score - Pattern relevance (optional)
 * @param {string} context.last_interaction - What contractor said last
 * @returns {Promise<Object>} Generated follow-up message
 */
async function generateFollowUpMessage(contractorId, context = {}) {
  // Validate contractor exists
  const contractorCheck = await query(
    'SELECT id, first_name, last_name FROM contractors WHERE id = $1',
    [contractorId]
  );

  if (contractorCheck.rows.length === 0) {
    throw new Error(`Contractor ${contractorId} not found`);
  }

  const contractor = contractorCheck.rows[0];
  const firstName = contractor.first_name || 'there';

  // Determine message type based on context
  let messageType = MESSAGE_TYPES.CHECK_IN;
  let messageContent = '';
  let aiReasoning = '';

  if (context.milestone_name) {
    messageType = MESSAGE_TYPES.MILESTONE_FOLLOW_UP;
    messageContent = `Hi ${firstName}, just checking in on "${context.milestone_name}". How's it going?`;
    aiReasoning = `Following up on milestone: ${context.milestone_name}`;
  } else if (context.goal_id) {
    // Get goal details
    const goalResult = await query(
      'SELECT goal_description, priority_score FROM ai_concierge_goals WHERE id = $1',
      [context.goal_id]
    );

    if (goalResult.rows.length > 0) {
      const goal = goalResult.rows[0];
      messageType = MESSAGE_TYPES.CHECK_IN;
      messageContent = `Hi ${firstName}, wanted to check in on your progress with "${goal.goal_description}". Anything I can help with?`;
      aiReasoning = `Following up on high-priority goal (score: ${goal.priority_score})`;
    }
  } else if (context.last_interaction) {
    messageType = MESSAGE_TYPES.CHECK_IN;
    messageContent = `Hi ${firstName}, remember you mentioned "${context.last_interaction}"? Wanted to see how that's progressing.`;
    aiReasoning = 'Following up on previous conversation topic';
  } else {
    // Generic check-in
    messageContent = `Hi ${firstName}, just checking in! How have things been going this week?`;
    aiReasoning = 'Routine check-in to maintain engagement';
  }

  // Schedule the message
  const scheduledMessage = await scheduleProactiveMessage({
    contractor_id: contractorId,
    message_type: messageType,
    message_content: messageContent,
    ai_reasoning: aiReasoning,
    context_data: context
  });

  return scheduledMessage;
}

// ============================================================================
// TRACK MESSAGE OUTCOME
// ============================================================================

/**
 * Track the outcome of a proactive message
 *
 * @param {number} messageId - Message ID
 * @param {Object} outcome - Outcome details
 * @param {string} outcome.contractor_response - What contractor replied (optional)
 * @param {boolean} outcome.conversation_continued - Did conversation continue? (optional)
 * @param {number} outcome.outcome_rating - Rating 1-5 (optional)
 * @param {boolean} outcome.led_to_action - Did contractor take action? (optional)
 * @returns {Promise<Object>} Updated message record
 */
async function trackMessageOutcome(messageId, outcome = {}) {
  const {
    contractor_response,
    conversation_continued = false,
    outcome_rating,
    led_to_action = false
  } = outcome;

  // Validate outcome_rating if provided
  if (outcome_rating !== undefined && (outcome_rating < 1 || outcome_rating > 5)) {
    throw new Error('outcome_rating must be between 1 and 5');
  }

  try {
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (contractor_response !== undefined) {
      updates.push(`contractor_response = $${paramIndex++}`);
      values.push(contractor_response);
      updates.push(`response_received_at = $${paramIndex++}`);
      values.push(new Date());
    }

    updates.push(`conversation_continued = $${paramIndex++}`);
    values.push(conversation_continued);

    if (outcome_rating !== undefined) {
      updates.push(`outcome_rating = $${paramIndex++}`);
      values.push(outcome_rating);
    }

    updates.push(`led_to_action = $${paramIndex++}`);
    values.push(led_to_action);

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    // Add messageId as last parameter
    values.push(messageId);

    const updateQuery = `
      UPDATE ai_proactive_messages
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      throw new Error(`Message ${messageId} not found`);
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error tracking message outcome:', error);
    throw error;
  }
}

// ============================================================================
// GET SCHEDULED MESSAGES
// ============================================================================

/**
 * Get scheduled messages for a contractor
 *
 * @param {number} contractorId - Contractor ID
 * @param {Object} filters - Optional filters
 * @param {string} filters.message_type - Filter by message type
 * @param {boolean} filters.has_response - Filter by whether contractor responded
 * @param {number} filters.limit - Limit number of results (default: 10)
 * @returns {Promise<Array>} Array of scheduled messages
 */
async function getScheduledMessages(contractorId, filters = {}) {
  const {
    message_type,
    has_response,
    limit = 10
  } = filters;

  try {
    let queryStr = `
      SELECT *
      FROM ai_proactive_messages
      WHERE contractor_id = $1
    `;
    const params = [contractorId];
    let paramIndex = 2;

    if (message_type) {
      queryStr += ` AND message_type = $${paramIndex++}`;
      params.push(message_type);
    }

    if (has_response !== undefined) {
      if (has_response) {
        queryStr += ` AND contractor_response IS NOT NULL`;
      } else {
        queryStr += ` AND contractor_response IS NULL`;
      }
    }

    queryStr += `
      ORDER BY created_at DESC
      LIMIT $${paramIndex}
    `;
    params.push(limit);

    const result = await query(queryStr, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting scheduled messages:', error);
    throw error;
  }
}

// ============================================================================
// SEND MESSAGE (Mark as Sent)
// ============================================================================

/**
 * Mark a message as sent (updates sent_at timestamp)
 *
 * @param {number} messageId - Message ID
 * @returns {Promise<Object>} Updated message record
 */
async function markMessageAsSent(messageId) {
  try {
    const result = await query(
      `UPDATE ai_proactive_messages
       SET sent_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [messageId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Message ${messageId} not found`);
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error marking message as sent:', error);
    throw error;
  }
}

// ============================================================================
// EVALUATE PROACTIVE TRIGGERS
// ============================================================================

/**
 * Evaluate what proactive messages should be sent for a contractor
 *
 * This checks:
 * - High-priority goals with data gaps
 * - Time-based triggers (3 days after event, 1 week after action item)
 * - Pattern-based triggers ("89% of contractors did X at this stage")
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Array>} Array of recommended messages to send
 */
async function evaluateProactiveTriggers(contractorId) {
  const recommendations = [];

  try {
    // 1. Check for high-priority goals with incomplete checklist items
    const goalTriggersResult = await query(
      `SELECT
        g.id as goal_id,
        g.goal_description,
        g.priority_score,
        COUNT(ci.id) as pending_items
      FROM ai_concierge_goals g
      LEFT JOIN ai_concierge_checklist_items ci ON ci.goal_id = g.id AND ci.status = 'pending'
      WHERE g.contractor_id = $1
        AND g.status = 'active'
        AND g.priority_score >= 7
      GROUP BY g.id, g.goal_description, g.priority_score
      HAVING COUNT(ci.id) > 0
      ORDER BY g.priority_score DESC
      LIMIT 3`,
      [contractorId]
    );

    for (const goal of goalTriggersResult.rows) {
      // Check if we've already sent a message about this goal recently (within 3 days)
      const recentMessage = await query(
        `SELECT id FROM ai_proactive_messages
         WHERE contractor_id = $1
           AND context_data->>'goal_id' = $2
           AND created_at > NOW() - INTERVAL '3 days'
         LIMIT 1`,
        [contractorId, goal.goal_id.toString()]
      );

      if (recentMessage.rows.length === 0) {
        recommendations.push({
          trigger_type: 'high_priority_goal',
          message_type: MESSAGE_TYPES.CHECK_IN,
          contractor_id: contractorId,
          message_content: `Quick check-in on your progress with "${goal.goal_description}". How's it going?`,
          ai_reasoning: `High-priority goal (score: ${goal.priority_score}) has ${goal.pending_items} pending checklist items`,
          context_data: {
            goal_id: goal.goal_id,
            priority_score: goal.priority_score,
            pending_items: goal.pending_items
          }
        });
      }
    }

    // 2. Check for stalled goals (no progress in 7+ days)
    const stalledGoalsResult = await query(
      `SELECT
        g.id as goal_id,
        g.goal_description,
        g.priority_score,
        g.updated_at,
        EXTRACT(DAY FROM NOW() - g.updated_at) as days_stalled
      FROM ai_concierge_goals g
      WHERE g.contractor_id = $1
        AND g.status = 'active'
        AND g.updated_at < NOW() - INTERVAL '7 days'
        AND g.priority_score >= 5
      ORDER BY g.priority_score DESC
      LIMIT 2`,
      [contractorId]
    );

    for (const goal of stalledGoalsResult.rows) {
      const recentMessage = await query(
        `SELECT id FROM ai_proactive_messages
         WHERE contractor_id = $1
           AND context_data->>'goal_id' = $2
           AND created_at > NOW() - INTERVAL '7 days'
         LIMIT 1`,
        [contractorId, goal.goal_id.toString()]
      );

      if (recentMessage.rows.length === 0) {
        recommendations.push({
          trigger_type: 'stalled_goal',
          message_type: MESSAGE_TYPES.ENCOURAGEMENT,
          contractor_id: contractorId,
          message_content: `I noticed "${goal.goal_description}" hasn't had updates in a bit. Any blockers I can help with?`,
          ai_reasoning: `Goal stalled for ${Math.floor(goal.days_stalled)} days - checking if contractor needs support`,
          context_data: {
            goal_id: goal.goal_id,
            priority_score: goal.priority_score,
            days_stalled: Math.floor(goal.days_stalled)
          }
        });
      }
    }

    // 3. Check for recent milestones achieved (celebration opportunity)
    const recentMilestonesResult = await query(
      `SELECT
        ci.id as item_id,
        ci.checklist_item as description,
        ci.goal_id,
        g.goal_description,
        ci.completed_at
      FROM ai_concierge_checklist_items ci
      JOIN ai_concierge_goals g ON g.id = ci.goal_id
      WHERE g.contractor_id = $1
        AND ci.status = 'completed'
        AND ci.completed_at > NOW() - INTERVAL '2 days'
        AND ci.completed_at IS NOT NULL
      ORDER BY ci.completed_at DESC
      LIMIT 2`,
      [contractorId]
    );

    for (const milestone of recentMilestonesResult.rows) {
      const recentCelebration = await query(
        `SELECT id FROM ai_proactive_messages
         WHERE contractor_id = $1
           AND message_type = 'celebration'
           AND context_data->>'item_id' = $2
         LIMIT 1`,
        [contractorId, milestone.item_id.toString()]
      );

      if (recentCelebration.rows.length === 0) {
        recommendations.push({
          trigger_type: 'milestone_achieved',
          message_type: MESSAGE_TYPES.CELEBRATION,
          contractor_id: contractorId,
          message_content: `Congrats on completing "${milestone.description}"! That's real progress. 🎉`,
          ai_reasoning: 'Celebrating recent milestone completion to build trust and momentum',
          context_data: {
            goal_id: milestone.goal_id,
            item_id: milestone.item_id,
            milestone_name: milestone.description
          }
        });
      }
    }

    return recommendations;
  } catch (error) {
    console.error('Error evaluating proactive triggers:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  MESSAGE_TYPES,
  OUTCOME_RATING,
  scheduleProactiveMessage,
  generateFollowUpMessage,
  trackMessageOutcome,
  getScheduledMessages,
  markMessageAsSent,
  evaluateProactiveTriggers
};
