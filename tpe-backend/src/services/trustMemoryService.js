// ============================================================================
// DATABASE-CHECKED: Phase 3 Day 5 - Trust-Building Memory System
// ============================================================================
// TABLE: ai_trust_indicators (10 columns verified)
// VERIFIED COLUMNS: id, contractor_id, indicator_type, indicator_description,
//                   context_data (JSONB), confidence_impact, cumulative_trust_score,
//                   recorded_at, created_at, updated_at
//
// TABLE: ai_proactive_messages (14 columns verified)
// VERIFIED COLUMNS: id, contractor_id, message_type, message_content, ai_reasoning,
//                   context_data (JSONB), sent_at, contractor_response,
//                   response_received_at, conversation_continued, outcome_rating,
//                   led_to_action, created_at, updated_at
//
// TABLE: contractor_action_items (referenced for memory)
// TABLE: ai_concierge_goals (referenced for memory)
//
// VERIFIED: October 22, 2025
// ============================================================================

const { query } = require('../config/database');

/**
 * Phase 3 - Day 5: Trust-Building Memory System
 *
 * This service manages trust tracking and memory integration:
 * - Track trust-building events
 * - Calculate cumulative trust scores
 * - Integrate memories into AI responses
 * - Adjust AI behavior based on trust level
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const TRUST_INDICATOR_TYPE = {
  POSITIVE_FEEDBACK: 'positive_feedback',
  NEGATIVE_FEEDBACK: 'negative_feedback',
  IGNORED_SUGGESTION: 'ignored_suggestion',
  ACTED_ON_SUGGESTION: 'acted_on_suggestion',
  SHARED_VULNERABILITY: 'shared_vulnerability',
  ASKED_FOR_HELP: 'asked_for_help',
  MILESTONE_ACHIEVED: 'milestone_achieved',
  SETBACK_SHARED: 'setback_shared'
};

const TRUST_IMPACT = {
  POSITIVE_FEEDBACK: 5,
  ACTED_ON_SUGGESTION: 8,
  MILESTONE_ACHIEVED: 10,
  SHARED_VULNERABILITY: 7,
  ASKED_FOR_HELP: 6,
  SETBACK_SHARED: 4,
  NEGATIVE_FEEDBACK: -5,
  IGNORED_SUGGESTION: -2
};

const TRUST_LEVELS = {
  VERY_LOW: { min: 0, max: 20, label: 'Building Trust' },
  LOW: { min: 21, max: 40, label: 'Establishing' },
  MEDIUM: { min: 41, max: 60, label: 'Trusted Advisor' },
  HIGH: { min: 61, max: 80, label: 'Highly Trusted' },
  VERY_HIGH: { min: 81, max: 100, label: 'Complete Trust' }
};

// ============================================================================
// TRACK TRUST EVENT
// ============================================================================

/**
 * Track a trust-building or trust-damaging event
 *
 * @param {Object} eventData - Trust event configuration
 * @param {number} eventData.contractor_id - Contractor ID
 * @param {string} eventData.indicator_type - Type of trust indicator
 * @param {string} eventData.description - Description of what happened
 * @param {Object} eventData.context - Additional context (JSONB)
 * @returns {Promise<Object>} Trust indicator record with new cumulative score
 */
async function trackTrustEvent(eventData) {
  const {
    contractor_id,
    indicator_type,
    description,
    context = {}
  } = eventData;

  // Validate indicator_type
  if (!Object.values(TRUST_INDICATOR_TYPE).includes(indicator_type)) {
    throw new Error(`Invalid indicator_type: ${indicator_type}`);
  }

  try {
    // Get current cumulative trust score
    const currentResult = await query(
      `SELECT cumulative_trust_score
       FROM ai_trust_indicators
       WHERE contractor_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [contractor_id]
    );

    const currentScore = currentResult.rows.length > 0
      ? parseFloat(currentResult.rows[0].cumulative_trust_score)
      : 50; // Start at neutral 50

    // Calculate impact
    const impact = TRUST_IMPACT[indicator_type.toUpperCase()] || 0;
    const newScore = Math.max(0, Math.min(100, currentScore + impact));

    // Record trust indicator
    const result = await query(
      `INSERT INTO ai_trust_indicators (
        contractor_id,
        indicator_type,
        indicator_description,
        context_data,
        confidence_impact,
        cumulative_trust_score,
        recorded_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
      RETURNING *`,
      [
        contractor_id,
        indicator_type,
        description,
        JSON.stringify(context),
        impact,
        newScore
      ]
    );

    return {
      ...result.rows[0],
      previous_score: currentScore,
      trust_level: getTrustLevel(newScore)
    };
  } catch (error) {
    console.error('Error tracking trust event:', error);
    throw error;
  }
}

// ============================================================================
// GET TRUST SCORE
// ============================================================================

/**
 * Get current trust score for contractor
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Object>} Trust score details
 */
async function getTrustScore(contractorId) {
  try {
    const result = await query(
      `SELECT cumulative_trust_score, recorded_at, indicator_type, confidence_impact
       FROM ai_trust_indicators
       WHERE contractor_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [contractorId]
    );

    if (result.rows.length === 0) {
      return {
        score: 50, // Neutral start
        level: getTrustLevel(50),
        last_event: null,
        total_events: 0
      };
    }

    const score = parseFloat(result.rows[0].cumulative_trust_score);

    // Get total event count
    const countResult = await query(
      `SELECT COUNT(*) as total_events
       FROM ai_trust_indicators
       WHERE contractor_id = $1`,
      [contractorId]
    );

    return {
      score: score,
      level: getTrustLevel(score),
      last_event: {
        type: result.rows[0].indicator_type,
        impact: result.rows[0].confidence_impact,
        recorded_at: result.rows[0].recorded_at
      },
      total_events: parseInt(countResult.rows[0].total_events)
    };
  } catch (error) {
    console.error('Error getting trust score:', error);
    throw error;
  }
}

// ============================================================================
// GET TRUST LEVEL
// ============================================================================

/**
 * Get trust level label from score
 *
 * @param {number} score - Trust score (0-100)
 * @returns {Object} Trust level details
 */
function getTrustLevel(score) {
  for (const [key, level] of Object.entries(TRUST_LEVELS)) {
    if (score >= level.min && score <= level.max) {
      return {
        key: key,
        label: level.label,
        min: level.min,
        max: level.max
      };
    }
  }
  return TRUST_LEVELS.MEDIUM; // Fallback
}

// ============================================================================
// GET RELEVANT MEMORIES
// ============================================================================

/**
 * Get relevant memories for context injection
 *
 * @param {number} contractorId - Contractor ID
 * @param {Object} filters - Optional filters
 * @param {number} filters.limit - Max memories to return
 * @param {string} filters.topic - Filter by topic/goal type
 * @returns {Promise<Array>} Array of memory objects
 */
async function getRelevantMemories(contractorId, filters = {}) {
  const {
    limit = 5,
    topic = null
  } = filters;

  try {
    const memories = [];

    // Get recent proactive message responses
    let messageQuery = `
      SELECT
        'proactive_message' as memory_type,
        message_content,
        contractor_response,
        context_data,
        sent_at as memory_date
      FROM ai_proactive_messages
      WHERE contractor_id = $1
        AND contractor_response IS NOT NULL
      ORDER BY sent_at DESC
      LIMIT $2
    `;
    const messageResult = await query(messageQuery, [contractorId, Math.ceil(limit / 2)]);
    memories.push(...messageResult.rows);

    // Get recent action items
    let actionQuery = `
      SELECT
        'action_item' as memory_type,
        title as message_content,
        description as contractor_response,
        conversation_context as context_data,
        created_at as memory_date
      FROM contractor_action_items
      WHERE contractor_id = $1
        AND status IN ('completed', 'in_progress')
      ORDER BY created_at DESC
      LIMIT $2
    `;
    const actionResult = await query(actionQuery, [contractorId, Math.ceil(limit / 2)]);
    memories.push(...actionResult.rows);

    // Get goals
    let goalQuery = `
      SELECT
        'goal' as memory_type,
        goal_description as message_content,
        status as contractor_response,
        data_gaps as context_data,
        created_at as memory_date
      FROM ai_concierge_goals
      WHERE contractor_id = $1
        AND status = 'active'
      ORDER BY priority_score DESC
      LIMIT $2
    `;
    const goalResult = await query(goalQuery, [contractorId, limit]);
    memories.push(...goalResult.rows);

    // Sort all memories by date and limit
    const sortedMemories = memories
      .sort((a, b) => new Date(b.memory_date) - new Date(a.memory_date))
      .slice(0, limit);

    return sortedMemories.map(m => ({
      type: m.memory_type,
      content: m.message_content || '',
      response: m.contractor_response || '',
      context: m.context_data || {},
      date: m.memory_date
    }));
  } catch (error) {
    console.error('Error getting relevant memories:', error);
    throw error;
  }
}

// ============================================================================
// INJECT MEMORY INTO MESSAGE
// ============================================================================

/**
 * Inject relevant memory into AI message
 *
 * @param {number} contractorId - Contractor ID
 * @param {string} baseMessage - Base message to enhance
 * @param {Object} options - Options for memory injection
 * @param {boolean} options.include_past_conversation - Reference past conversation
 * @param {boolean} options.include_achievements - Reference milestones
 * @returns {Promise<Object>} Enhanced message with memory
 */
async function injectMemoryIntoMessage(contractorId, baseMessage, options = {}) {
  const {
    include_past_conversation = true,
    include_achievements = true
  } = options;

  try {
    const memories = await getRelevantMemories(contractorId, { limit: 3 });

    let enhancedMessage = baseMessage;
    const injectedMemories = [];

    if (include_past_conversation && memories.length > 0) {
      // Find most relevant recent conversation
      const recentConversation = memories.find(m => m.type === 'proactive_message' && m.response);

      if (recentConversation) {
        const memorySnippet = recentConversation.content.substring(0, 50);
        const prefix = `Remember when we talked about "${memorySnippet}"? `;
        enhancedMessage = prefix + baseMessage;
        injectedMemories.push({
          type: 'past_conversation',
          snippet: memorySnippet,
          date: recentConversation.date
        });
      }
    }

    if (include_achievements && memories.length > 0) {
      // Find completed actions or goals
      const achievement = memories.find(m =>
        (m.type === 'action_item' && m.response === 'completed') ||
        (m.type === 'goal' && m.response === 'completed')
      );

      if (achievement) {
        const achievementNote = ` Great work on "${achievement.content.substring(0, 40)}", by the way!`;
        enhancedMessage = enhancedMessage + achievementNote;
        injectedMemories.push({
          type: 'achievement',
          content: achievement.content.substring(0, 40),
          date: achievement.date
        });
      }
    }

    return {
      enhanced_message: enhancedMessage,
      original_message: baseMessage,
      memories_injected: injectedMemories,
      memory_count: memories.length
    };
  } catch (error) {
    console.error('Error injecting memory into message:', error);
    // Return original message if memory injection fails
    return {
      enhanced_message: baseMessage,
      original_message: baseMessage,
      memories_injected: [],
      memory_count: 0
    };
  }
}

// ============================================================================
// ADJUST AI BEHAVIOR BASED ON TRUST
// ============================================================================

/**
 * Get AI behavior settings based on trust level
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Object>} Behavior adjustment recommendations
 */
async function getAIBehaviorSettings(contractorId) {
  try {
    const trustData = await getTrustScore(contractorId);
    const score = trustData.score;

    // Adjust proactive message frequency
    let proactiveFrequency = 'normal'; // days between proactive messages
    if (score >= 80) proactiveFrequency = 'high'; // More frequent (2-3 days)
    else if (score >= 60) proactiveFrequency = 'normal'; // Standard (5-7 days)
    else if (score >= 40) proactiveFrequency = 'low'; // Less frequent (10-14 days)
    else proactiveFrequency = 'minimal'; // Very infrequent (30+ days)

    // Adjust question boldness
    let questionBoldness = 'moderate';
    if (score >= 70) questionBoldness = 'bold'; // Ask harder questions
    else if (score >= 50) questionBoldness = 'moderate'; // Standard questions
    else questionBoldness = 'gentle'; // Only easy questions

    // Adjust follow-up timing
    let followUpTiming = 'standard';
    if (score >= 75) followUpTiming = 'flexible'; // Can follow up sooner
    else if (score >= 50) followUpTiming = 'standard'; // Standard timing
    else followUpTiming = 'conservative'; // Wait longer

    // Determine if proactive behavior should pause
    const pauseProactive = score < 30;

    return {
      trust_score: score,
      trust_level: trustData.level.label,
      proactive_frequency: proactiveFrequency,
      question_boldness: questionBoldness,
      follow_up_timing: followUpTiming,
      pause_proactive: pauseProactive,
      recommendations: generateBehaviorRecommendations(score)
    };
  } catch (error) {
    console.error('Error getting AI behavior settings:', error);
    throw error;
  }
}

/**
 * Generate behavior recommendations based on trust score
 *
 * @param {number} score - Trust score
 * @returns {Array} Recommendations
 */
function generateBehaviorRecommendations(score) {
  const recommendations = [];

  if (score >= 80) {
    recommendations.push('High trust: Increase proactive messaging frequency');
    recommendations.push('Ask strategic/challenging questions');
    recommendations.push('Suggest bold next steps');
  } else if (score >= 60) {
    recommendations.push('Good trust: Maintain current engagement level');
    recommendations.push('Continue balanced approach');
  } else if (score >= 40) {
    recommendations.push('Building trust: Focus on value delivery');
    recommendations.push('Ask easier questions first');
    recommendations.push('Celebrate small wins');
  } else if (score >= 20) {
    recommendations.push('Low trust: Reduce proactive frequency');
    recommendations.push('Focus on listening over suggesting');
    recommendations.push('Wait for contractor to engage first');
  } else {
    recommendations.push('Very low trust: PAUSE proactive behavior');
    recommendations.push('Only respond when contractor initiates');
    recommendations.push('Rebuild trust through consistent value');
  }

  return recommendations;
}

// ============================================================================
// GET TRUST HISTORY
// ============================================================================

/**
 * Get trust score history over time
 *
 * @param {number} contractorId - Contractor ID
 * @param {number} limit - Number of records to return
 * @returns {Promise<Array>} Trust history
 */
async function getTrustHistory(contractorId, limit = 20) {
  try {
    const result = await query(
      `SELECT
        indicator_type,
        indicator_description,
        confidence_impact,
        cumulative_trust_score,
        recorded_at
       FROM ai_trust_indicators
       WHERE contractor_id = $1
       ORDER BY recorded_at DESC
       LIMIT $2`,
      [contractorId, limit]
    );

    return result.rows.map(row => ({
      type: row.indicator_type,
      description: row.indicator_description,
      impact: row.confidence_impact,
      score_after: parseFloat(row.cumulative_trust_score),
      recorded_at: row.recorded_at
    }));
  } catch (error) {
    console.error('Error getting trust history:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  TRUST_INDICATOR_TYPE,
  TRUST_IMPACT,
  TRUST_LEVELS,
  trackTrustEvent,
  getTrustScore,
  getTrustLevel,
  getRelevantMemories,
  injectMemoryIntoMessage,
  getAIBehaviorSettings,
  getTrustHistory
};
