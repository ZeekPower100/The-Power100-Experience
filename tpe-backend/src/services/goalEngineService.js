// DATABASE-CHECKED: ai_concierge_goals, ai_concierge_checklist_items, contractors verified October 22, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - ai_concierge_goals.status: CHECK IN ('active', 'completed', 'abandoned', 'blocked')
// - ai_concierge_goals.priority_score: CHECK BETWEEN 1 AND 10
// - ai_concierge_goals.current_progress: CHECK BETWEEN 0 AND 100
// - ai_concierge_goals.pattern_confidence: CHECK BETWEEN 0 AND 1
// - ai_concierge_checklist_items.status: CHECK IN ('pending', 'in_progress', 'completed', 'skipped')
// ================================================================
// VERIFIED FIELD NAMES:
// - goal_type (NOT goalType)
// - goal_description (NOT goalDescription)
// - priority_score (NOT priorityScore)
// - current_progress (NOT currentProgress)
// - data_gaps (NOT dataGaps)
// - success_criteria (NOT successCriteria)
// - checklist_item (NOT checklistItem)
// - item_type (NOT itemType)
// - contractor_id (NOT contractorId)
// - goal_id (NOT goalId)
// ================================================================
// VERIFIED DATA TYPES:
// - success_criteria: JSONB (store as object)
// - data_gaps: JSONB (store as array)
// - execution_context: JSONB (store conversation excerpt)
// - priority_score: INTEGER (1-10)
// - current_progress: INTEGER (0-100)
// - pattern_confidence: NUMERIC(3,2) (0.00-1.00)
// ================================================================

const { query } = require('../config/database');

/**
 * Goal Engine Service
 * Manages AI's internal goals and checklist system
 */

// ================================================================
// GOAL CRUD OPERATIONS
// ================================================================

/**
 * Create a new internal goal for a contractor
 * @param {Object} goalData - Goal data
 * @param {number} goalData.contractor_id - Contractor ID
 * @param {string} goalData.goal_type - Type of goal (revenue_growth, team_expansion, etc.)
 * @param {string} goalData.goal_description - Full description of goal
 * @param {string} goalData.target_milestone - Target to achieve
 * @param {number} goalData.priority_score - Priority 1-10
 * @param {Object} goalData.success_criteria - JSONB success criteria
 * @param {Array} goalData.data_gaps - JSONB array of missing data fields
 * @param {string} goalData.trigger_condition - When to act on this goal
 * @returns {Object} Created goal
 */
async function createGoal(goalData) {
  const {
    contractor_id,
    goal_type,
    goal_description,
    target_milestone = null,
    priority_score = 5,
    success_criteria = null,
    data_gaps = null,
    trigger_condition = 'next_conversation',
    pattern_source = null,
    pattern_confidence = null
  } = goalData;

  // Validate priority_score (1-10)
  if (priority_score < 1 || priority_score > 10) {
    throw new Error('priority_score must be between 1 and 10');
  }

  // Validate pattern_confidence (0-1)
  if (pattern_confidence !== null && (pattern_confidence < 0 || pattern_confidence > 1)) {
    throw new Error('pattern_confidence must be between 0 and 1');
  }

  const result = await query(`
    INSERT INTO ai_concierge_goals (
      contractor_id,
      goal_type,
      goal_description,
      target_milestone,
      priority_score,
      success_criteria,
      data_gaps,
      trigger_condition,
      pattern_source,
      pattern_confidence,
      status,
      current_progress
    ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, 'active', 0)
    RETURNING *;
  `, [
    contractor_id,
    goal_type,
    goal_description,
    target_milestone,
    priority_score,
    success_criteria ? JSON.stringify(success_criteria) : null,
    data_gaps ? JSON.stringify(data_gaps) : null,
    trigger_condition,
    pattern_source,
    pattern_confidence
  ]);

  return result.rows[0];
}

/**
 * Get active goals for a contractor (ordered by priority)
 * @param {number} contractorId - Contractor ID
 * @param {number} limit - Max goals to return (default: 10)
 * @returns {Array} Active goals
 */
async function getActiveGoals(contractorId, limit = 10) {
  const result = await query(`
    SELECT *
    FROM ai_concierge_goals
    WHERE contractor_id = $1 AND status = 'active'
    ORDER BY priority_score DESC, created_at ASC
    LIMIT $2;
  `, [contractorId, limit]);

  return result.rows;
}

/**
 * Get all goals for a contractor (all statuses)
 * @param {number} contractorId - Contractor ID
 * @returns {Array} All goals
 */
async function getAllGoals(contractorId) {
  const result = await query(`
    SELECT *
    FROM ai_concierge_goals
    WHERE contractor_id = $1
    ORDER BY
      CASE status
        WHEN 'active' THEN 1
        WHEN 'in_progress' THEN 2
        WHEN 'blocked' THEN 3
        WHEN 'completed' THEN 4
        WHEN 'abandoned' THEN 5
      END,
      priority_score DESC,
      created_at ASC;
  `, [contractorId]);

  return result.rows;
}

/**
 * Get a specific goal by ID
 * @param {number} goalId - Goal ID
 * @returns {Object|null} Goal or null if not found
 */
async function getGoalById(goalId) {
  const result = await query(`
    SELECT * FROM ai_concierge_goals WHERE id = $1;
  `, [goalId]);

  return result.rows[0] || null;
}

/**
 * Update goal progress
 * @param {number} goalId - Goal ID
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} nextMilestone - Next milestone description
 * @returns {Object} Updated goal
 */
async function updateGoalProgress(goalId, progress, nextMilestone = null) {
  // Validate progress (0-100)
  if (progress < 0 || progress > 100) {
    throw new Error('progress must be between 0 and 100');
  }

  const result = await query(`
    UPDATE ai_concierge_goals
    SET
      current_progress = $1,
      next_milestone = $2,
      last_action_at = NOW(),
      updated_at = NOW()
    WHERE id = $3
    RETURNING *;
  `, [progress, nextMilestone, goalId]);

  return result.rows[0];
}

/**
 * Complete a goal
 * @param {number} goalId - Goal ID
 * @returns {Object} Completed goal
 */
async function completeGoal(goalId) {
  const result = await query(`
    UPDATE ai_concierge_goals
    SET
      status = 'completed',
      current_progress = 100,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = $1
    RETURNING *;
  `, [goalId]);

  return result.rows[0];
}

/**
 * Update goal status
 * @param {number} goalId - Goal ID
 * @param {string} status - New status (active, completed, abandoned, blocked)
 * @returns {Object} Updated goal
 */
async function updateGoalStatus(goalId, status) {
  const validStatuses = ['active', 'completed', 'abandoned', 'blocked'];
  if (!validStatuses.includes(status)) {
    throw new Error(`status must be one of: ${validStatuses.join(', ')}`);
  }

  const result = await query(`
    UPDATE ai_concierge_goals
    SET
      status = $1,
      completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
      updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `, [status, goalId]);

  return result.rows[0];
}

// ================================================================
// CHECKLIST CRUD OPERATIONS
// ================================================================

/**
 * Create a checklist item for a goal
 * @param {Object} itemData - Checklist item data
 * @param {number} itemData.goal_id - Goal ID
 * @param {number} itemData.contractor_id - Contractor ID
 * @param {string} itemData.checklist_item - Item description
 * @param {string} itemData.item_type - Type (data_collection, recommendation, follow_up, etc.)
 * @param {string} itemData.trigger_condition - When to trigger
 * @returns {Object} Created checklist item
 */
async function createChecklistItem(itemData) {
  const {
    goal_id,
    contractor_id,
    checklist_item,
    item_type = null,
    trigger_condition = 'next_conversation'
  } = itemData;

  const result = await query(`
    INSERT INTO ai_concierge_checklist_items (
      goal_id,
      contractor_id,
      checklist_item,
      item_type,
      trigger_condition,
      status
    ) VALUES ($1, $2, $3, $4, $5, 'pending')
    RETURNING *;
  `, [goal_id, contractor_id, checklist_item, item_type, trigger_condition]);

  return result.rows[0];
}

/**
 * Get active checklist items for a contractor
 * @param {number} contractorId - Contractor ID
 * @param {string} triggerCondition - Optional filter by trigger condition
 * @returns {Array} Checklist items
 */
async function getActiveChecklist(contractorId, triggerCondition = null) {
  let sql = `
    SELECT ci.*, g.goal_type, g.goal_description, g.priority_score
    FROM ai_concierge_checklist_items ci
    JOIN ai_concierge_goals g ON ci.goal_id = g.id
    WHERE ci.contractor_id = $1 AND ci.status IN ('pending', 'in_progress')
    ${triggerCondition ? 'AND ci.trigger_condition = $2' : ''}
    ORDER BY g.priority_score DESC, ci.created_at ASC;
  `;

  const params = triggerCondition ? [contractorId, triggerCondition] : [contractorId];
  const result = await query(sql, params);

  return result.rows;
}

/**
 * Get checklist items for a specific goal
 * @param {number} goalId - Goal ID
 * @returns {Array} Checklist items
 */
async function getChecklistItemsByGoal(goalId) {
  const result = await query(`
    SELECT * FROM ai_concierge_checklist_items
    WHERE goal_id = $1
    ORDER BY
      CASE status
        WHEN 'in_progress' THEN 1
        WHEN 'pending' THEN 2
        WHEN 'completed' THEN 3
        WHEN 'skipped' THEN 4
      END,
      created_at ASC;
  `, [goalId]);

  return result.rows;
}

/**
 * Complete a checklist item
 * @param {number} itemId - Checklist item ID
 * @param {string} completionNotes - Notes about what was done
 * @param {Object} executionContext - JSONB context about execution
 * @returns {Object} Completed item
 */
async function completeChecklistItem(itemId, completionNotes = null, executionContext = null) {
  const result = await query(`
    UPDATE ai_concierge_checklist_items
    SET
      status = 'completed',
      completed_at = NOW(),
      completion_notes = $1,
      execution_context = $2::jsonb,
      updated_at = NOW()
    WHERE id = $3
    RETURNING *;
  `, [completionNotes, executionContext ? JSON.stringify(executionContext) : null, itemId]);

  return result.rows[0];
}

/**
 * Mark checklist item as in progress
 * @param {number} itemId - Checklist item ID
 * @param {Object} executionContext - JSONB context about what's happening
 * @returns {Object} Updated item
 */
async function markChecklistItemInProgress(itemId, executionContext = null) {
  const result = await query(`
    UPDATE ai_concierge_checklist_items
    SET
      status = 'in_progress',
      executed_at = NOW(),
      execution_context = $1::jsonb,
      updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `, [executionContext ? JSON.stringify(executionContext) : null, itemId]);

  return result.rows[0];
}

/**
 * Skip a checklist item
 * @param {number} itemId - Checklist item ID
 * @param {string} reason - Why skipping
 * @returns {Object} Skipped item
 */
async function skipChecklistItem(itemId, reason = null) {
  const result = await query(`
    UPDATE ai_concierge_checklist_items
    SET
      status = 'skipped',
      completion_notes = $1,
      completed_at = NOW(),
      updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `, [reason, itemId]);

  return result.rows[0];
}

/**
 * Update checklist item status
 * @param {number} itemId - Checklist item ID
 * @param {string} status - New status (pending, in_progress, completed, skipped)
 * @returns {Object} Updated item
 */
async function updateChecklistItemStatus(itemId, status) {
  const validStatuses = ['pending', 'in_progress', 'completed', 'skipped'];
  if (!validStatuses.includes(status)) {
    throw new Error(`status must be one of: ${validStatuses.join(', ')}`);
  }

  const result = await query(`
    UPDATE ai_concierge_checklist_items
    SET
      status = $1,
      updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `, [status, itemId]);

  return result.rows[0];
}

// ================================================================
// HELPER FUNCTIONS
// ================================================================

/**
 * Calculate goal progress based on checklist completion
 * @param {number} goalId - Goal ID
 * @returns {number} Progress percentage (0-100)
 */
async function calculateGoalProgress(goalId) {
  const result = await query(`
    SELECT
      COUNT(*) as total_items,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_items
    FROM ai_concierge_checklist_items
    WHERE goal_id = $1;
  `, [goalId]);

  const { total_items, completed_items } = result.rows[0];

  if (total_items === 0) return 0;

  return Math.floor((completed_items / total_items) * 100);
}

/**
 * Auto-update goal progress based on checklist completion
 * Call this after completing a checklist item
 * @param {number} goalId - Goal ID
 * @returns {Object} Updated goal
 */
async function autoUpdateGoalProgress(goalId) {
  const progress = await calculateGoalProgress(goalId);

  return await updateGoalProgress(goalId, progress);
}

module.exports = {
  // Goal operations
  createGoal,
  getActiveGoals,
  getAllGoals,
  getGoalById,
  updateGoalProgress,
  completeGoal,
  updateGoalStatus,

  // Checklist operations
  createChecklistItem,
  getActiveChecklist,
  getChecklistItemsByGoal,
  completeChecklistItem,
  markChecklistItemInProgress,
  skipChecklistItem,
  updateChecklistItemStatus,

  // Helper functions
  calculateGoalProgress,
  autoUpdateGoalProgress
};
