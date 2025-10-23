// ============================================================================
// DATABASE-CHECKED: Phase 3 Day 4 - Goal Evolution System
// ============================================================================
// TABLE: ai_goal_evolution_log (15 columns verified)
// VERIFIED COLUMNS: id, goal_id, contractor_id, evolution_type, original_description,
//                   evolved_description, original_milestones (JSONB), evolved_milestones (JSONB),
//                   reason_for_evolution, ai_confidence_in_change, contractor_approved,
//                   goal_relevance_score, evolved_at, created_at, updated_at
//
// TABLE: ai_concierge_goals (18 columns verified)
// VERIFIED COLUMNS: id, contractor_id, goal_type, goal_description, target_milestone,
//                   priority_score, current_progress, next_milestone, success_criteria (JSONB),
//                   pattern_source, pattern_confidence, data_gaps (JSONB), status,
//                   trigger_condition, last_action_at, created_at, updated_at, completed_at
//
// VERIFIED: October 22, 2025
// ============================================================================

const { query } = require('../config/database');

/**
 * Phase 3 - Day 4: Goal Evolution & Adaptation
 *
 * This service manages goal evolution based on contractor behavior:
 * - Evolve goals when priorities change
 * - Adjust goals based on progress and feedback
 * - Generate new goals when appropriate
 * - Track abandoned goals to learn from them
 */

// ============================================================================
// CONSTANTS
// ============================================================================

const EVOLUTION_TYPE = {
  REFINEMENT: 'refinement',
  EXPANSION: 'expansion',
  PIVOT: 'pivot',
  MILESTONE_ADJUSTMENT: 'milestone_adjustment',
  PRIORITY_CHANGE: 'priority_change',
  GOAL_COMPLETION: 'goal_completion'
};

const GOAL_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
  BLOCKED: 'blocked'
};

// Days of inactivity before considering goal stalled/abandoned
const STALLED_THRESHOLD_DAYS = 30;
const ABANDONED_THRESHOLD_DAYS = 60;

// ============================================================================
// EVOLVE GOAL
// ============================================================================

/**
 * Evolve a goal based on new data or contractor behavior
 *
 * @param {Object} evolutionData - Evolution configuration
 * @param {number} evolutionData.goal_id - Goal ID to evolve
 * @param {string} evolutionData.evolution_type - Type of evolution
 * @param {string} evolutionData.evolved_description - New goal description
 * @param {Array} evolutionData.evolved_milestones - New milestone array (optional)
 * @param {string} evolutionData.reason - Why the goal is evolving
 * @param {number} evolutionData.confidence - AI confidence in change (0-1)
 * @param {number} evolutionData.relevance_score - How relevant is evolved goal (1-10)
 * @param {boolean} evolutionData.auto_approve - Auto-approve or wait for contractor
 * @returns {Promise<Object>} Evolution record and updated goal
 */
async function evolveGoal(evolutionData) {
  const {
    goal_id,
    evolution_type,
    evolved_description,
    evolved_milestones = null,
    reason,
    confidence = 0.7,
    relevance_score = 7,
    auto_approve = false
  } = evolutionData;

  // Validate evolution_type
  if (!Object.values(EVOLUTION_TYPE).includes(evolution_type)) {
    throw new Error(`Invalid evolution_type: ${evolution_type}`);
  }

  // Validate confidence range
  if (confidence < 0 || confidence > 1) {
    throw new Error('Confidence must be between 0 and 1');
  }

  // Validate relevance_score range
  if (relevance_score < 1 || relevance_score > 10) {
    throw new Error('Relevance score must be between 1 and 10');
  }

  try {
    // Get current goal state
    const goalResult = await query(
      `SELECT * FROM ai_concierge_goals WHERE id = $1`,
      [goal_id]
    );

    if (goalResult.rows.length === 0) {
      throw new Error(`Goal ${goal_id} not found`);
    }

    const currentGoal = goalResult.rows[0];

    // Log evolution
    const evolutionResult = await query(
      `INSERT INTO ai_goal_evolution_log (
        goal_id,
        contractor_id,
        evolution_type,
        original_description,
        evolved_description,
        original_milestones,
        evolved_milestones,
        reason_for_evolution,
        ai_confidence_in_change,
        contractor_approved,
        goal_relevance_score,
        evolved_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), NOW())
      RETURNING *`,
      [
        goal_id,
        currentGoal.contractor_id,
        evolution_type,
        currentGoal.goal_description,
        evolved_description,
        currentGoal.success_criteria, // Original milestones stored in success_criteria
        evolved_milestones ? JSON.stringify(evolved_milestones) : null,
        reason,
        confidence,
        auto_approve,
        relevance_score
      ]
    );

    // Update goal if auto-approved
    if (auto_approve) {
      const updateFields = ['goal_description = $1', 'updated_at = NOW()'];
      const updateValues = [evolved_description];
      let paramIndex = 2;

      if (evolved_milestones) {
        updateFields.push(`success_criteria = $${paramIndex++}`);
        updateValues.push(JSON.stringify(evolved_milestones));
      }

      // Adjust priority based on evolution type
      if (evolution_type === EVOLUTION_TYPE.PRIORITY_CHANGE) {
        updateFields.push(`priority_score = $${paramIndex++}`);
        updateValues.push(Math.min(10, currentGoal.priority_score + 1)); // Increase priority
      }

      // Mark completed if evolution is completion
      if (evolution_type === EVOLUTION_TYPE.GOAL_COMPLETION) {
        updateFields.push('status = $' + paramIndex++);
        updateFields.push('completed_at = NOW()');
        updateValues.push(GOAL_STATUS.COMPLETED);
      }

      updateValues.push(goal_id);

      await query(
        `UPDATE ai_concierge_goals
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}`,
        updateValues
      );
    }

    return {
      evolution: evolutionResult.rows[0],
      auto_approved: auto_approve,
      message: auto_approve
        ? 'Goal evolved and updated automatically'
        : 'Goal evolution logged, awaiting contractor approval'
    };
  } catch (error) {
    console.error('Error evolving goal:', error);
    throw error;
  }
}

// ============================================================================
// AUTOMATIC GOAL ADJUSTMENT
// ============================================================================

/**
 * Automatically adjust goals based on contractor behavior
 *
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Object>} Summary of adjustments made
 */
async function adjustGoalsBasedOnBehavior(contractorId) {
  try {
    const adjustments = {
      lowered_priority: [],
      increased_priority: [],
      marked_stalled: [],
      marked_abandoned: []
    };

    // Get all active goals
    const goalsResult = await query(
      `SELECT * FROM ai_concierge_goals
       WHERE contractor_id = $1
         AND status = $2
       ORDER BY priority_score DESC, created_at ASC`,
      [contractorId, GOAL_STATUS.ACTIVE]
    );

    for (const goal of goalsResult.rows) {
      const daysSinceAction = goal.last_action_at
        ? Math.floor((Date.now() - new Date(goal.last_action_at)) / (1000 * 60 * 60 * 24))
        : 999;

      // Check for abandoned goals (60+ days no action)
      if (daysSinceAction >= ABANDONED_THRESHOLD_DAYS) {
        await query(
          `UPDATE ai_concierge_goals
           SET status = $1, updated_at = NOW()
           WHERE id = $2`,
          [GOAL_STATUS.ABANDONED, goal.id]
        );

        // Log evolution
        await evolveGoal({
          goal_id: goal.id,
          evolution_type: EVOLUTION_TYPE.PRIORITY_CHANGE,
          evolved_description: goal.goal_description,
          reason: `Goal abandoned after ${daysSinceAction} days of inactivity`,
          confidence: 0.95,
          relevance_score: 1,
          auto_approve: true
        });

        adjustments.marked_abandoned.push({
          goal_id: goal.id,
          description: goal.goal_description,
          days_inactive: daysSinceAction
        });
      }
      // Check for stalled goals (30-59 days no action)
      else if (daysSinceAction >= STALLED_THRESHOLD_DAYS) {
        // Lower priority if stalled
        if (goal.priority_score > 3) {
          const newPriority = Math.max(3, goal.priority_score - 2);

          await query(
            `UPDATE ai_concierge_goals
             SET priority_score = $1, updated_at = NOW()
             WHERE id = $2`,
            [newPriority, goal.id]
          );

          adjustments.lowered_priority.push({
            goal_id: goal.id,
            description: goal.goal_description,
            old_priority: goal.priority_score,
            new_priority: newPriority,
            reason: `Stalled for ${daysSinceAction} days`
          });
        }

        adjustments.marked_stalled.push({
          goal_id: goal.id,
          description: goal.goal_description,
          days_inactive: daysSinceAction
        });
      }
      // Check for engaged goals (action within 7 days)
      else if (daysSinceAction <= 7 && goal.priority_score < 9) {
        const newPriority = Math.min(9, goal.priority_score + 1);

        await query(
          `UPDATE ai_concierge_goals
           SET priority_score = $1, updated_at = NOW()
           WHERE id = $2`,
          [newPriority, goal.id]
        );

        adjustments.increased_priority.push({
          goal_id: goal.id,
          description: goal.goal_description,
          old_priority: goal.priority_score,
          new_priority: newPriority,
          reason: `Active engagement (last action ${daysSinceAction} days ago)`
        });
      }
    }

    return adjustments;
  } catch (error) {
    console.error('Error adjusting goals based on behavior:', error);
    throw error;
  }
}

// ============================================================================
// NEW GOAL GENERATION
// ============================================================================

/**
 * Generate new goal when appropriate
 *
 * @param {Object} goalData - New goal configuration
 * @param {number} goalData.contractor_id - Contractor ID
 * @param {string} goalData.goal_type - Type of goal
 * @param {string} goalData.goal_description - Goal description
 * @param {string} goalData.reason - Why generating this goal
 * @param {number} goalData.priority_score - Initial priority (1-10)
 * @param {Object} goalData.trigger_context - Context that triggered goal generation
 * @returns {Promise<Object>} New goal record or null if max goals reached
 */
async function generateNewGoal(goalData) {
  const {
    contractor_id,
    goal_type,
    goal_description,
    reason,
    priority_score = 5,
    trigger_context = {}
  } = goalData;

  try {
    // Check active goal count (max 3-4 per contractor)
    const countResult = await query(
      `SELECT COUNT(*) as active_goals
       FROM ai_concierge_goals
       WHERE contractor_id = $1
         AND status = $2`,
      [contractor_id, GOAL_STATUS.ACTIVE]
    );

    const activeGoals = parseInt(countResult.rows[0].active_goals);

    if (activeGoals >= 4) {
      return {
        generated: false,
        reason: 'Max active goals (4) already reached',
        active_goal_count: activeGoals
      };
    }

    // Create new goal
    const goalResult = await query(
      `INSERT INTO ai_concierge_goals (
        contractor_id,
        goal_type,
        goal_description,
        priority_score,
        current_progress,
        status,
        trigger_condition,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *`,
      [
        contractor_id,
        goal_type,
        goal_description,
        priority_score,
        0, // Initial progress
        GOAL_STATUS.ACTIVE,
        reason
      ]
    );

    // Log this as a goal evolution (expansion)
    await query(
      `INSERT INTO ai_goal_evolution_log (
        goal_id,
        contractor_id,
        evolution_type,
        original_description,
        evolved_description,
        reason_for_evolution,
        ai_confidence_in_change,
        contractor_approved,
        goal_relevance_score,
        evolved_at,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), NOW())`,
      [
        goalResult.rows[0].id,
        contractor_id,
        EVOLUTION_TYPE.EXPANSION,
        '', // No original (new goal)
        goal_description,
        reason,
        0.8,
        true, // Auto-approved for new goals
        priority_score
      ]
    );

    return {
      generated: true,
      goal: goalResult.rows[0],
      reason: reason,
      active_goal_count: activeGoals + 1
    };
  } catch (error) {
    console.error('Error generating new goal:', error);
    throw error;
  }
}

// ============================================================================
// ABANDONED GOAL ANALYSIS
// ============================================================================

/**
 * Analyze abandoned goals to learn patterns
 *
 * @param {number} contractorId - Contractor ID (optional, for contractor-specific analysis)
 * @returns {Promise<Object>} Abandoned goal insights
 */
async function analyzeAbandonedGoals(contractorId = null) {
  try {
    let queryStr = `
      SELECT
        goal_type,
        COUNT(*) as abandoned_count,
        AVG(priority_score) as avg_priority,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as avg_days_before_abandon
      FROM ai_concierge_goals
      WHERE status = $1
    `;
    const params = [GOAL_STATUS.ABANDONED];
    let paramIndex = 2;

    if (contractorId) {
      queryStr += ` AND contractor_id = $${paramIndex++}`;
      params.push(contractorId);
    }

    queryStr += ` GROUP BY goal_type ORDER BY abandoned_count DESC`;

    const result = await query(queryStr, params);

    // Get evolution logs for abandoned goals
    let evolutionQuery = `
      SELECT
        evolution_type,
        reason_for_evolution,
        COUNT(*) as occurrence_count
      FROM ai_goal_evolution_log gel
      JOIN ai_concierge_goals g ON gel.goal_id = g.id
      WHERE g.status = $1
    `;
    const evolutionParams = [GOAL_STATUS.ABANDONED];
    let evolutionParamIndex = 2;

    if (contractorId) {
      evolutionQuery += ` AND gel.contractor_id = $${evolutionParamIndex++}`;
      evolutionParams.push(contractorId);
    }

    evolutionQuery += ` GROUP BY evolution_type, reason_for_evolution ORDER BY occurrence_count DESC LIMIT 10`;

    const evolutionResult = await query(evolutionQuery, evolutionParams);

    return {
      abandoned_by_type: result.rows.map(row => ({
        goal_type: row.goal_type,
        count: parseInt(row.abandoned_count),
        avg_priority: parseFloat(row.avg_priority).toFixed(1),
        avg_days_active: parseFloat(row.avg_days_before_abandon).toFixed(0)
      })),
      common_reasons: evolutionResult.rows.map(row => ({
        evolution_type: row.evolution_type,
        reason: row.reason_for_evolution,
        occurrences: parseInt(row.occurrence_count)
      })),
      insights: generateAbandonmentInsights(result.rows)
    };
  } catch (error) {
    console.error('Error analyzing abandoned goals:', error);
    throw error;
  }
}

/**
 * Generate insights from abandoned goal data
 *
 * @param {Array} abandonedData - Abandoned goal data
 * @returns {Array} Array of insight strings
 */
function generateAbandonmentInsights(abandonedData) {
  const insights = [];

  for (const data of abandonedData) {
    const count = parseInt(data.abandoned_count);
    const avgDays = parseFloat(data.avg_days_before_abandon);

    if (count >= 3) {
      insights.push(
        `${data.goal_type} goals have high abandonment (${count} times). Consider different goal types.`
      );
    }

    if (avgDays < 14) {
      insights.push(
        `${data.goal_type} goals abandoned quickly (avg ${avgDays.toFixed(0)} days). May be too ambitious or unclear.`
      );
    }
  }

  if (insights.length === 0) {
    insights.push('Not enough abandoned goals to generate insights yet.');
  }

  return insights;
}

// ============================================================================
// GET EVOLUTION HISTORY
// ============================================================================

/**
 * Get evolution history for a goal
 *
 * @param {number} goalId - Goal ID
 * @returns {Promise<Array>} Evolution history
 */
async function getGoalEvolutionHistory(goalId) {
  try {
    const result = await query(
      `SELECT * FROM ai_goal_evolution_log
       WHERE goal_id = $1
       ORDER BY evolved_at DESC`,
      [goalId]
    );

    return result.rows;
  } catch (error) {
    console.error('Error getting goal evolution history:', error);
    throw error;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  EVOLUTION_TYPE,
  GOAL_STATUS,
  evolveGoal,
  adjustGoalsBasedOnBehavior,
  generateNewGoal,
  analyzeAbandonedGoals,
  getGoalEvolutionHistory
};
