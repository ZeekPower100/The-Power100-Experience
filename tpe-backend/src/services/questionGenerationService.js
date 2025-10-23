// ============================================================================
// DATABASE-CHECKED: Phase 3 Tables Verification
// ============================================================================
// TABLE: ai_question_log
// VERIFIED COLUMNS: id, contractor_id, goal_id, question_text, question_purpose,
//                   question_type, asked_at, contractor_answer, answer_received_at,
//                   answer_quality_score, led_to_goal_refinement,
//                   question_naturalness_score, created_at, updated_at
// CHECK CONSTRAINTS: question_type IN (clarifying, exploratory, validating,
//                                      prioritizing, reflecting)
//                    answer_quality_score BETWEEN 1 AND 5
//                    question_naturalness_score BETWEEN 1 AND 5
// FOREIGN KEYS: contractor_id → contractors.id (CASCADE)
//               goal_id → ai_concierge_goals.id (CASCADE)
//
// TABLE: contractors (referenced for data gaps)
// VERIFIED FIELDS: revenue_tier, team_size, focus_areas, current_stage, annual_revenue,
//                  timezone, business_goals, current_challenges
//
// VERIFIED: October 22, 2025
// ============================================================================

const { query } = require('../config/database');

/**
 * Phase 3 - Day 2: Natural Question Asking Engine
 *
 * This service generates strategic questions to fill data gaps naturally:
 * - Identify data gaps from contractor profiles
 * - Generate natural, conversational questions
 * - Track question effectiveness
 * - Prioritize questions by goal importance
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const QUESTION_TYPES = {
  CLARIFYING: 'clarifying',
  EXPLORATORY: 'exploratory',
  VALIDATING: 'validating',
  PRIORITIZING: 'prioritizing',
  REFLECTING: 'reflecting'
};

const DATA_GAP_FIELDS = {
  REVENUE_TIER: 'revenue_tier',
  TEAM_SIZE: 'team_size',
  FOCUS_AREAS: 'focus_areas',
  CURRENT_STAGE: 'current_stage',
  ANNUAL_REVENUE: 'annual_revenue',
  TIMEZONE: 'timezone',
  BUSINESS_GOALS: 'business_goals',
  CURRENT_CHALLENGES: 'current_challenges'
};

// Natural question templates for each data gap
const QUESTION_TEMPLATES = {
  revenue_tier: {
    question: "Quick question - what's your current revenue range? This helps me tailor recommendations to where you're at.",
    type: QUESTION_TYPES.CLARIFYING,
    purpose: 'Fill revenue_tier data gap for better goal matching'
  },
  team_size: {
    question: "How big is your team right now? Just curious about your current capacity.",
    type: QUESTION_TYPES.CLARIFYING,
    purpose: 'Fill team_size data gap for resource planning'
  },
  focus_areas: {
    question: "What are your top 2-3 business focus areas for the next 12-18 months?",
    type: QUESTION_TYPES.EXPLORATORY,
    purpose: 'Fill focus_areas data gap for goal alignment'
  },
  current_stage: {
    question: "Where are you at in your business journey - starting out, growing, scaling, or something else?",
    type: QUESTION_TYPES.CLARIFYING,
    purpose: 'Fill current_stage data gap for stage-appropriate guidance'
  },
  annual_revenue: {
    question: "What's your current annual revenue looking like? Helps me understand your scale.",
    type: QUESTION_TYPES.CLARIFYING,
    purpose: 'Fill annual_revenue data gap for benchmarking'
  },
  timezone: {
    question: "What timezone are you in? Want to make sure I reach out at good times.",
    type: QUESTION_TYPES.CLARIFYING,
    purpose: 'Fill timezone data gap for scheduling'
  },
  business_goals: {
    question: "What are your top business goals for this year?",
    type: QUESTION_TYPES.EXPLORATORY,
    purpose: 'Fill business_goals data gap for goal generation'
  },
  current_challenges: {
    question: "What's your biggest business challenge right now?",
    type: QUESTION_TYPES.EXPLORATORY,
    purpose: 'Fill current_challenges data gap for problem-solving'
  }
};

// ============================================================================
// IDENTIFY DATA GAPS
// ============================================================================

/**
 * Identify data gaps in contractor profile
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Array>} Array of data gap objects with priority scores
 */
async function identifyDataGaps(contractorId) {
  try {
    // Get contractor data
    const contractorResult = await query(
      `SELECT
        id,
        revenue_tier,
        team_size,
        focus_areas,
        current_stage,
        annual_revenue,
        timezone,
        business_goals,
        current_challenges
      FROM contractors
      WHERE id = $1`,
      [contractorId]
    );

    if (contractorResult.rows.length === 0) {
      throw new Error(`Contractor ${contractorId} not found`);
    }

    const contractor = contractorResult.rows[0];
    const gaps = [];

    // Check each field for gaps
    for (const [field, dbColumn] of Object.entries(DATA_GAP_FIELDS)) {
      const value = contractor[dbColumn];

      // Field is empty if NULL or empty string
      const isEmpty = value === null || value === '' ||
                      (Array.isArray(value) && value.length === 0);

      if (isEmpty) {
        gaps.push({
          field: dbColumn,
          priority: 0, // Will be calculated based on goal importance
          contractor_id: contractorId
        });
      }
    }

    return gaps;
  } catch (error) {
    console.error('Error identifying data gaps:', error);
    throw error;
  }
}

// ============================================================================
// PRIORITIZE DATA GAPS
// ============================================================================

/**
 * Prioritize data gaps by goal importance and pattern relevance
 *
 * @param {number} contractorId - Contractor ID
 * @param {Array} gaps - Array of data gap objects
 * @returns {Promise<Array>} Prioritized gaps with scores
 */
async function prioritizeDataGaps(contractorId, gaps) {
  if (gaps.length === 0) {
    return [];
  }

  try {
    // Get contractor's active high-priority goals
    const goalsResult = await query(
      `SELECT id, goal_type, priority_score
       FROM ai_concierge_goals
       WHERE contractor_id = $1
         AND status = 'active'
         AND priority_score >= 5
       ORDER BY priority_score DESC
       LIMIT 3`,
      [contractorId]
    );

    const hasHighPriorityGoals = goalsResult.rows.length > 0;

    // Assign priority scores to each gap
    const prioritizedGaps = gaps.map(gap => {
      let score = 0;

      // Base priority by field importance
      switch (gap.field) {
        case 'revenue_tier':
        case 'annual_revenue':
          score += 10; // Critical for goal matching
          break;
        case 'focus_areas':
        case 'business_goals':
          score += 8; // Important for goal alignment
          break;
        case 'current_stage':
        case 'team_size':
          score += 6; // Useful for resource planning
          break;
        case 'current_challenges':
          score += 5; // Helpful for problem-solving
          break;
        case 'timezone':
          score += 3; // Nice to have for scheduling
          break;
      }

      // Boost if contractor has high-priority goals (need data for better guidance)
      if (hasHighPriorityGoals) {
        score += 3;
      }

      return {
        ...gap,
        priority: score
      };
    });

    // Sort by priority (highest first)
    return prioritizedGaps.sort((a, b) => b.priority - a.priority);
  } catch (error) {
    console.error('Error prioritizing data gaps:', error);
    throw error;
  }
}

// ============================================================================
// GENERATE STRATEGIC QUESTION
// ============================================================================

/**
 * Generate a natural strategic question for a data gap
 *
 * @param {number} contractorId - Contractor ID
 * @param {string} dataGapField - Field name with data gap
 * @param {number} goalId - Related goal ID (optional)
 * @param {number} naturalnessScore - How natural the question should feel (1-5, default 4)
 * @returns {Promise<Object>} Generated question object
 */
async function generateStrategicQuestion(contractorId, dataGapField, goalId = null, naturalnessScore = 4) {
  // Validate naturalness score
  if (naturalnessScore < 1 || naturalnessScore > 5) {
    throw new Error('naturalnessScore must be between 1 and 5');
  }

  // Get question template
  const template = QUESTION_TEMPLATES[dataGapField];
  if (!template) {
    throw new Error(`No question template for field: ${dataGapField}`);
  }

  try {
    // Check if we've asked this question recently (within 30 days)
    const recentQuestion = await query(
      `SELECT id FROM ai_question_log
       WHERE contractor_id = $1
         AND question_purpose LIKE $2
         AND asked_at > NOW() - INTERVAL '30 days'
       LIMIT 1`,
      [contractorId, `%${dataGapField}%`]
    );

    if (recentQuestion.rows.length > 0) {
      throw new Error(`Already asked about ${dataGapField} within last 30 days`);
    }

    // Log the question
    const result = await query(
      `INSERT INTO ai_question_log (
        contractor_id,
        goal_id,
        question_text,
        question_purpose,
        question_type,
        question_naturalness_score,
        asked_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW(), NOW())
      RETURNING *`,
      [
        contractorId,
        goalId,
        template.question,
        template.purpose,
        template.type,
        naturalnessScore
      ]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Error generating strategic question:', error);
    throw error;
  }
}

// ============================================================================
// TRACK QUESTION ANSWER
// ============================================================================

/**
 * Track when contractor answers a question
 *
 * @param {number} questionId - Question ID
 * @param {string} answer - Contractor's answer
 * @param {Object} options - Optional tracking data
 * @param {number} options.quality_score - Answer quality (1-5)
 * @param {boolean} options.led_to_refinement - Did answer improve goals?
 * @returns {Promise<Object>} Updated question record
 */
async function trackQuestionAnswer(questionId, answer, options = {}) {
  const {
    quality_score = null,
    led_to_refinement = false
  } = options;

  // Validate quality_score if provided
  if (quality_score !== null && (quality_score < 1 || quality_score > 5)) {
    throw new Error('quality_score must be between 1 and 5');
  }

  try {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    updates.push(`contractor_answer = $${paramIndex++}`);
    values.push(answer);

    updates.push(`answer_received_at = $${paramIndex++}`);
    values.push(new Date());

    if (quality_score !== null) {
      updates.push(`answer_quality_score = $${paramIndex++}`);
      values.push(quality_score);
    }

    updates.push(`led_to_goal_refinement = $${paramIndex++}`);
    values.push(led_to_refinement);

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(questionId);

    const updateQuery = `
      UPDATE ai_question_log
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      throw new Error(`Question ${questionId} not found`);
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error tracking question answer:', error);
    throw error;
  }
}

// ============================================================================
// GET QUESTION EFFECTIVENESS METRICS
// ============================================================================

/**
 * Get effectiveness metrics for questions
 *
 * @param {number} contractorId - Contractor ID (optional, for contractor-specific metrics)
 * @param {string} questionType - Question type filter (optional)
 * @returns {Promise<Object>} Effectiveness metrics
 */
async function getQuestionEffectiveness(contractorId = null, questionType = null) {
  try {
    let queryStr = `
      SELECT
        COUNT(*) as total_questions,
        COUNT(contractor_answer) as answered_count,
        ROUND(AVG(question_naturalness_score), 2) as avg_naturalness,
        ROUND(AVG(answer_quality_score), 2) as avg_answer_quality,
        COUNT(CASE WHEN led_to_goal_refinement = true THEN 1 END) as refinement_count
      FROM ai_question_log
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (contractorId) {
      queryStr += ` AND contractor_id = $${paramIndex++}`;
      params.push(contractorId);
    }

    if (questionType) {
      queryStr += ` AND question_type = $${paramIndex++}`;
      params.push(questionType);
    }

    const result = await query(queryStr, params);
    const metrics = result.rows[0];

    // Calculate percentages
    const totalQuestions = parseInt(metrics.total_questions);
    const answeredCount = parseInt(metrics.answered_count);
    const refinementCount = parseInt(metrics.refinement_count);

    return {
      total_questions: totalQuestions,
      answered_count: answeredCount,
      answer_rate: totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0,
      avg_naturalness: parseFloat(metrics.avg_naturalness) || 0,
      avg_answer_quality: parseFloat(metrics.avg_answer_quality) || 0,
      refinement_count: refinementCount,
      refinement_rate: answeredCount > 0 ? Math.round((refinementCount / answeredCount) * 100) : 0
    };
  } catch (error) {
    console.error('Error getting question effectiveness:', error);
    throw error;
  }
}

// ============================================================================
// GET NEXT BEST QUESTION
// ============================================================================

/**
 * Get the next best question to ask a contractor
 *
 * Combines data gap identification, prioritization, and anti-spam logic
 *
 * @param {number} contractorId - Contractor ID
 * @param {number} goalId - Related goal ID (optional)
 * @returns {Promise<Object|null>} Next question to ask, or null if none
 */
async function getNextBestQuestion(contractorId, goalId = null) {
  try {
    // Check if we've asked a question recently (within 2 days - anti-spam)
    const recentQuestion = await query(
      `SELECT id FROM ai_question_log
       WHERE contractor_id = $1
         AND asked_at > NOW() - INTERVAL '2 days'
       ORDER BY asked_at DESC
       LIMIT 1`,
      [contractorId]
    );

    if (recentQuestion.rows.length > 0) {
      return null; // Don't spam with questions
    }

    // Identify and prioritize data gaps
    const gaps = await identifyDataGaps(contractorId);
    const prioritizedGaps = await prioritizeDataGaps(contractorId, gaps);

    if (prioritizedGaps.length === 0) {
      return null; // No data gaps
    }

    // Get the highest priority gap
    const topGap = prioritizedGaps[0];

    // Generate question for this gap
    const question = await generateStrategicQuestion(
      contractorId,
      topGap.field,
      goalId,
      4 // Naturalness score of 4 (very natural)
    );

    return {
      ...question,
      data_gap_field: topGap.field,
      priority_score: topGap.priority
    };
  } catch (error) {
    console.error('Error getting next best question:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  QUESTION_TYPES,
  DATA_GAP_FIELDS,
  identifyDataGaps,
  prioritizeDataGaps,
  generateStrategicQuestion,
  trackQuestionAnswer,
  getQuestionEffectiveness,
  getNextBestQuestion
};
