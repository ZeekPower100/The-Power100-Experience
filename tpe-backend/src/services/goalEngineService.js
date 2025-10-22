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

// ================================================================
// GOAL GENERATION & INTELLIGENCE
// ================================================================

/**
 * Identify data gaps for a contractor
 * Analyzes contractor profile to find missing critical data
 * @param {Object} contractor - Contractor data from database
 * @returns {Array} Array of missing field names
 */
function identifyDataGaps(contractor) {
  const dataGaps = [];

  // Revenue & Financial Data
  if (!contractor.revenue_tier || contractor.revenue_tier === '') {
    dataGaps.push('revenue_tier');
  }

  // Team Structure
  if (!contractor.team_size || contractor.team_size === '') {
    dataGaps.push('team_size');
  }

  // Business Focus
  if (!contractor.focus_areas || contractor.focus_areas === '') {
    dataGaps.push('focus_areas');
  }

  // Business Stage
  if (!contractor.current_stage || contractor.current_stage === '') {
    dataGaps.push('current_stage');
  }

  // Service Details
  if (!contractor.service_area || contractor.service_area === '') {
    dataGaps.push('service_area');
  }

  if (!contractor.services_offered || contractor.services_offered === '') {
    dataGaps.push('services_offered');
  }

  return dataGaps;
}

/**
 * Generate goals for a contractor based on their profile
 * Analyzes contractor data and creates relevant internal goals
 * @param {number} contractorId - Contractor ID
 * @returns {Object} Generated goals and checklist items
 */
async function generateGoalsForContractor(contractorId) {
  // Get contractor profile
  const contractorResult = await query(`
    SELECT
      id, revenue_tier, team_size, focus_areas, current_stage,
      business_goals, current_challenges, ai_insights,
      growth_potential, lifecycle_stage, service_area, services_offered
    FROM contractors
    WHERE id = $1;
  `, [contractorId]);

  if (contractorResult.rows.length === 0) {
    throw new Error(`Contractor ${contractorId} not found`);
  }

  const contractor = contractorResult.rows[0];
  const goals = [];
  const allChecklistItems = [];

  // ================================================================
  // PHASE 2 ENHANCEMENT: Query matching patterns first
  // ================================================================
  let matchingPatterns = [];
  try {
    const patternMatchingService = require('./patternMatchingService');
    matchingPatterns = await patternMatchingService.findMatchingPatterns(contractorId);
    console.log(`[Goal Engine] Found ${matchingPatterns.length} matching pattern(s) for contractor ${contractorId}`);
  } catch (error) {
    console.error('[Goal Engine] Error fetching patterns (continuing without patterns):', error.message);
  }

  // Get top pattern for goal enhancement
  const topPattern = matchingPatterns.length > 0 ? matchingPatterns[0] : null;

  // Identify data gaps first
  const dataGaps = identifyDataGaps(contractor);

  // Parse focus_areas (could be JSON array or comma-separated text)
  let focusAreas = [];
  if (contractor.focus_areas) {
    try {
      // Try parsing as JSON first
      focusAreas = typeof contractor.focus_areas === 'string'
        ? JSON.parse(contractor.focus_areas)
        : contractor.focus_areas;

      // Ensure it's an array
      if (!Array.isArray(focusAreas)) {
        focusAreas = [focusAreas];
      }

      // Normalize to lowercase
      focusAreas = focusAreas.map(a => a.toString().trim().toLowerCase());
    } catch (e) {
      // If JSON parsing fails, treat as comma-separated string
      focusAreas = contractor.focus_areas.split(',').map(a => a.trim().toLowerCase());
    }
  }

  // ================================================================
  // GOAL 1: Revenue Growth (if relevant)
  // ================================================================
  // Revenue tiers from contractorflow (profilingstep.tsx)
  const revenueTiers = {
    '0_5_million': { target: '$5M - $10M', priority: 9, description: 'Break through to $10M milestone' },
    '5_10_million': { target: '$11M - $20M', priority: 9, description: 'Scale to mid-tier contractor' },
    '11_20_million': { target: '$21M - $30M', priority: 8, description: 'Expand market presence' },
    '21_30_million': { target: '$31M - $50M', priority: 8, description: 'Build regional dominance' },
    '31_50_million': { target: '$51M - $75M', priority: 7, description: 'Optimize for sustainable growth' },
    '51_75_million': { target: '$76M - $150M', priority: 6, description: 'Strengthen market position' },
    '76_150_million': { target: '$151M+', priority: 5, description: 'Maintain leadership position' },
    '151_300_million': { target: 'Continued excellence', priority: 4, description: 'Focus on operational excellence' },
    '300_plus_million': { target: 'Market leadership', priority: 3, description: 'Industry leadership & innovation' }
  };

  if (contractor.revenue_tier && revenueTiers[contractor.revenue_tier]) {
    const tierInfo = revenueTiers[contractor.revenue_tier];

    // PHASE 2 ENHANCEMENT: Use pattern data to enhance goal
    let goalDescription = `Help contractor grow to ${tierInfo.target} revenue level`;
    let priorityScore = tierInfo.priority;
    let patternSource = null;
    let patternConfidence = null;
    let revenueChecklist = [];

    if (topPattern) {
      // Enhance description with pattern data
      goalDescription = `Help contractor grow to ${tierInfo.target} revenue level. Based on ${topPattern.sample_size} contractors who successfully made this transition`;

      // Boost priority if pattern has high confidence
      if (topPattern.confidence_score >= 0.8) {
        priorityScore = Math.min(10, tierInfo.priority + 1);
      }

      // Add pattern attribution
      patternSource = `Based on ${topPattern.sample_size} contractors who went from ${formatRevenueTier(topPattern.from_revenue_tier)} to ${formatRevenueTier(topPattern.to_revenue_tier)}`;
      patternConfidence = topPattern.confidence_score;

      // Generate checklist from pattern milestones
      if (topPattern.common_milestones && topPattern.common_milestones.length > 0) {
        revenueChecklist = topPattern.common_milestones.map((milestone, index) => ({
          checklist_item: milestone,
          item_type: 'recommendation',
          trigger_condition: index === 0 ? 'immediately' : 'after_data_collected'
        }));
      }

      // Add pattern-based focus area items
      if (topPattern.common_focus_areas && topPattern.common_focus_areas.length > 0) {
        revenueChecklist.push({
          checklist_item: `Focus on: ${topPattern.common_focus_areas.join(', ')}`,
          item_type: 'recommendation',
          trigger_condition: 'next_conversation'
        });
      }

      console.log(`[Goal Engine] Enhanced revenue goal with pattern data (confidence: ${patternConfidence})`);
    }

    // Fallback checklist if no pattern data
    if (revenueChecklist.length === 0) {
      revenueChecklist = [
        {
          checklist_item: 'Understand current lead flow and conversion rate',
          item_type: 'data_collection',
          trigger_condition: 'immediately'
        },
        {
          checklist_item: 'Assess pricing strategy and profitability',
          item_type: 'data_collection',
          trigger_condition: 'next_conversation'
        },
        {
          checklist_item: 'Identify revenue growth opportunities',
          item_type: 'recommendation',
          trigger_condition: 'after_data_collected'
        }
      ];
    }

    const revenueGoal = {
      contractor_id: contractorId,
      goal_type: 'revenue_growth',
      goal_description: goalDescription,
      target_milestone: tierInfo.target,
      priority_score: priorityScore,
      success_criteria: { revenue_increase: 20, sustainable_growth: true },
      data_gaps: dataGaps.filter(gap => ['revenue_tier', 'services_offered', 'service_area'].includes(gap)),
      trigger_condition: 'next_conversation',
      pattern_source: patternSource,
      pattern_confidence: patternConfidence
    };

    goals.push(revenueGoal);
    allChecklistItems.push(...revenueChecklist);
  }

  // ================================================================
  // GOAL 2: Team Expansion (if scaling)
  // ================================================================
  const teamSizes = ['solo', '2-5', '6-10'];
  const isSmallTeam = contractor.team_size && teamSizes.includes(contractor.team_size.toLowerCase());

  if (isSmallTeam && focusAreas.includes('operational_efficiency')) {
    const teamGoal = {
      contractor_id: contractorId,
      goal_type: 'team_expansion',
      goal_description: 'Prepare contractor for strategic team expansion',
      target_milestone: 'Hire key role (operations manager or estimator)',
      priority_score: 8,
      success_criteria: { team_growth: true, roles_defined: true },
      data_gaps: dataGaps.filter(gap => ['team_size', 'current_stage'].includes(gap)),
      trigger_condition: 'next_conversation'
    };

    goals.push(teamGoal);

    // Checklist items for team expansion
    const teamChecklist = [
      {
        checklist_item: 'Understand current team structure and roles',
        item_type: 'data_collection',
        trigger_condition: 'next_conversation'
      },
      {
        checklist_item: 'Identify hiring pain points and timeline',
        item_type: 'data_collection',
        trigger_condition: 'next_conversation'
      },
      {
        checklist_item: 'Recommend hiring best practices for contractors',
        item_type: 'recommendation',
        trigger_condition: 'after_data_collected'
      }
    ];

    allChecklistItems.push(...teamChecklist);
  }

  // ================================================================
  // GOAL 3: Lead System Improvement (if greenfield growth focus)
  // ================================================================
  if (focusAreas.includes('greenfield_growth') || focusAreas.includes('referral_growth')) {
    const leadGoal = {
      contractor_id: contractorId,
      goal_type: 'lead_improvement',
      goal_description: 'Optimize lead generation and conversion systems',
      target_milestone: 'Implement effective CRM and lead tracking',
      priority_score: 9,
      success_criteria: { close_rate_improved: true, lead_system_in_place: true },
      data_gaps: dataGaps.filter(gap => ['focus_areas', 'services_offered'].includes(gap)),
      trigger_condition: 'immediately'
    };

    goals.push(leadGoal);

    // Checklist items for lead improvement
    const leadChecklist = [
      {
        checklist_item: 'Get current close rate and lead sources',
        item_type: 'data_collection',
        trigger_condition: 'immediately'
      },
      {
        checklist_item: 'Assess current CRM usage and lead tracking',
        item_type: 'data_collection',
        trigger_condition: 'next_conversation'
      },
      {
        checklist_item: 'Recommend CRM tools based on business size',
        item_type: 'recommendation',
        trigger_condition: 'after_data_collected'
      }
    ];

    allChecklistItems.push(...leadChecklist);
  }

  // ================================================================
  // GOAL 4: Network Building (if referral focus or small network)
  // ================================================================
  if (focusAreas.includes('referral_growth') || focusAreas.includes('networking')) {
    const networkGoal = {
      contractor_id: contractorId,
      goal_type: 'network_building',
      goal_description: 'Expand professional network and referral sources',
      target_milestone: 'Attend 2+ industry events, build referral partnerships',
      priority_score: 6,
      success_criteria: { events_attended: 2, referral_partnerships: 3 },
      data_gaps: [],
      trigger_condition: 'post_event'
    };

    goals.push(networkGoal);

    // Checklist items for networking
    const networkChecklist = [
      {
        checklist_item: 'Suggest upcoming industry events',
        item_type: 'recommendation',
        trigger_condition: 'next_conversation'
      },
      {
        checklist_item: 'Introduce to complementary contractors',
        item_type: 'introduction',
        trigger_condition: 'post_event'
      }
    ];

    allChecklistItems.push(...networkChecklist);
  }

  // ================================================================
  // CREATE GOALS AND CHECKLIST ITEMS IN DATABASE
  // ================================================================
  const createdGoals = [];
  const createdChecklist = [];

  for (const goalData of goals) {
    const createdGoal = await createGoal(goalData);
    createdGoals.push(createdGoal);

    // Create checklist items for this goal
    const goalChecklistItems = allChecklistItems.splice(0, 3); // Get first 3 items for this goal

    for (const itemData of goalChecklistItems) {
      const checklistItem = await createChecklistItem({
        goal_id: createdGoal.id,
        contractor_id: contractorId,
        ...itemData
      });
      createdChecklist.push(checklistItem);
    }
  }

  return {
    contractor_id: contractorId,
    goals_created: createdGoals.length,
    checklist_items_created: createdChecklist.length,
    data_gaps_identified: dataGaps.length,
    goals: createdGoals,
    checklist: createdChecklist,
    data_gaps: dataGaps
  };
}

// ================================================================
// DAY 4: CHECKLIST TRIGGER EVALUATION & ACTION TRACKING
// ================================================================

/**
 * Evaluate which checklist items should trigger based on current context
 * @param {number} contractorId - Contractor ID
 * @param {Object} context - Current conversation context
 * @returns {Array} Prioritized list of checklist items to act on
 */
async function evaluateChecklistTriggers(contractorId, context = {}) {
  const {
    isInConversation = true,
    isPostEvent = false,
    recentlyCompletedActions = [],
    eventId = null
  } = context;

  // Get all pending checklist items
  const result = await query(`
    SELECT
      ci.id,
      ci.checklist_item,
      ci.item_type,
      ci.trigger_condition,
      ci.goal_id,
      g.goal_description,
      g.priority_score
    FROM ai_concierge_checklist_items ci
    LEFT JOIN ai_concierge_goals g ON ci.goal_id = g.id
    WHERE ci.contractor_id = $1
      AND ci.status = 'pending'
      AND g.status = 'active'
    ORDER BY g.priority_score DESC, ci.created_at ASC;
  `, [contractorId]);

  const allItems = result.rows;
  const triggeredItems = [];

  for (const item of allItems) {
    let shouldTrigger = false;
    let triggerReason = '';

    switch (item.trigger_condition) {
      case 'immediately':
        // Always trigger immediate items
        shouldTrigger = true;
        triggerReason = 'Immediate action required';
        break;

      case 'next_conversation':
        // Trigger if currently in conversation
        if (isInConversation) {
          shouldTrigger = true;
          triggerReason = 'Active conversation detected';
        }
        break;

      case 'post_event':
        // Trigger if post-event context
        if (isPostEvent) {
          shouldTrigger = true;
          triggerReason = 'Post-event follow-up';
        }
        break;

      case 'after_data_collected':
        // Trigger if prerequisite data has been collected
        // Check if related data collection items are complete
        const prerequisiteCheck = await query(`
          SELECT COUNT(*) as completed_count
          FROM ai_concierge_checklist_items
          WHERE contractor_id = $1
            AND goal_id = $2
            AND item_type = 'data_collection'
            AND status = 'completed';
        `, [contractorId, item.goal_id]);

        if (prerequisiteCheck.rows[0].completed_count > 0) {
          shouldTrigger = true;
          triggerReason = 'Prerequisite data collected';
        }
        break;

      case 'after_action_completed':
        // Trigger if specific action recently completed
        if (recentlyCompletedActions.length > 0) {
          shouldTrigger = true;
          triggerReason = 'Dependent action completed';
        }
        break;

      default:
        // Unknown trigger - default to next_conversation behavior
        if (isInConversation) {
          shouldTrigger = true;
          triggerReason = 'Default trigger (conversation active)';
        }
    }

    if (shouldTrigger) {
      triggeredItems.push({
        ...item,
        trigger_reason: triggerReason
      });
    }
  }

  console.log(`[Goal Engine] Evaluated ${allItems.length} items, ${triggeredItems.length} triggered`);

  return triggeredItems;
}

/**
 * Mark checklist item as in-progress and track execution
 * @param {number} itemId - Checklist item ID
 * @param {Object} executionContext - Context about how item was executed
 * @returns {Object} Updated checklist item
 */
async function trackActionExecution(itemId, executionContext = {}) {
  const result = await query(`
    UPDATE ai_concierge_checklist_items
    SET
      status = 'in_progress',
      executed_at = NOW(),
      execution_context = $1::jsonb,
      updated_at = NOW()
    WHERE id = $2
    RETURNING *;
  `, [JSON.stringify(executionContext), itemId]);

  const item = result.rows[0];

  // Update goal's last_action_at timestamp
  if (item.goal_id) {
    await query(`
      UPDATE ai_concierge_goals
      SET last_action_at = NOW()
      WHERE id = $1;
    `, [item.goal_id]);
  }

  console.log(`[Goal Engine] Tracked execution for checklist item ${itemId}`);

  return item;
}

/**
 * Complete checklist item and update goal progress
 * @param {number} itemId - Checklist item ID
 * @param {string} completionNotes - Notes about completion
 * @param {Object} executionContext - Additional context
 * @returns {Object} Result with updated item and goal progress
 */
async function completeActionAndUpdateProgress(itemId, completionNotes = '', executionContext = {}) {
  // Mark item as completed
  const itemResult = await query(`
    UPDATE ai_concierge_checklist_items
    SET
      status = 'completed',
      completed_at = NOW(),
      completion_notes = $1,
      execution_context = $2::jsonb,
      updated_at = NOW()
    WHERE id = $3
    RETURNING *;
  `, [completionNotes, JSON.stringify(executionContext), itemId]);

  const item = itemResult.rows[0];

  // Auto-update goal progress
  let goalProgress = null;
  if (item.goal_id) {
    const progress = await calculateGoalProgress(item.goal_id);

    await query(`
      UPDATE ai_concierge_goals
      SET
        current_progress = $1,
        last_action_at = NOW(),
        updated_at = NOW()
      WHERE id = $2;
    `, [progress, item.goal_id]);

    goalProgress = progress;

    console.log(`[Goal Engine] Goal ${item.goal_id} progress updated to ${progress}%`);

    // If goal is 100% complete, mark it as completed
    if (progress >= 100) {
      await query(`
        UPDATE ai_concierge_goals
        SET
          status = 'completed',
          completed_at = NOW()
        WHERE id = $1;
      `, [item.goal_id]);

      console.log(`[Goal Engine] Goal ${item.goal_id} marked as completed!`);
    }
  }

  return {
    item,
    goalProgress
  };
}

/**
 * Parse AI response to detect completed actions
 * @param {string} aiResponse - AI's response text
 * @param {Array} activeChecklist - Current active checklist items
 * @returns {Object} Detected actions
 */
function parseResponseForActions(aiResponse, activeChecklist = []) {
  const detectedActions = {
    questionsAsked: [],
    dataCollected: [],
    recommendationsMade: [],
    matchedChecklistItems: []
  };

  const lowerResponse = aiResponse.toLowerCase();

  // Detect questions asked (data collection indicators)
  const questionPatterns = [
    /what(?:'s| is) your ([\w\s]+)\??/gi,
    /how (?:much|many) ([\w\s]+)\??/gi,
    /can you (?:tell me|share) (?:about )?([\w\s]+)\??/gi,
    /do you (?:have|use|know) ([\w\s]+)\??/gi
  ];

  questionPatterns.forEach(pattern => {
    const matches = aiResponse.matchAll(pattern);
    for (const match of matches) {
      detectedActions.questionsAsked.push(match[1].trim());
    }
  });

  // Detect recommendations made
  const recommendationPatterns = [
    /(?:i |let me )recommend ([\w\s]+)/gi,
    /(?:you should|i suggest|consider) ([\w\s]+)/gi,
    /(?:check out|take a look at) ([\w\s]+)/gi
  ];

  recommendationPatterns.forEach(pattern => {
    const matches = aiResponse.matchAll(pattern);
    for (const match of matches) {
      detectedActions.recommendationsMade.push(match[1].trim());
    }
  });

  // Match detected actions to checklist items
  activeChecklist.forEach(item => {
    const itemKeywords = item.checklist_item.toLowerCase().split(' ');

    // Check if response relates to this checklist item
    const hasKeywordMatch = itemKeywords.some(keyword =>
      keyword.length > 3 && lowerResponse.includes(keyword)
    );

    if (hasKeywordMatch) {
      detectedActions.matchedChecklistItems.push({
        id: item.id,
        checklist_item: item.checklist_item,
        item_type: item.item_type,
        confidence: 'medium' // Could be enhanced with better NLP
      });
    }
  });

  return detectedActions;
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
  autoUpdateGoalProgress,

  // Goal generation & intelligence (Day 2)
  generateGoalsForContractor,
  identifyDataGaps,

  // Day 4: Trigger evaluation & action tracking
  evaluateChecklistTriggers,
  trackActionExecution,
  completeActionAndUpdateProgress,
  parseResponseForActions
};

/**
 * Format revenue tier for human readability
 * PHASE 2 HELPER FUNCTION
 * @param {string} tier - Revenue tier (e.g., '0_5_million')
 * @returns {string} Formatted tier (e.g., '$0-5M')
 */
function formatRevenueTier(tier) {
  const tierMap = {
    '0_5_million': '$0-5M',
    '5_10_million': '$5-10M',
    '11_20_million': '$11-20M',
    '21_30_million': '$21-30M',
    '31_50_million': '$31-50M',
    '51_75_million': '$51-75M',
    '76_100_million': '$76-100M',
    '101_150_million': '$101-150M',
    '151_300_million': '$151-300M',
    '300_plus_million': '$300M+'
  };

  return tierMap[tier] || tier;
}
