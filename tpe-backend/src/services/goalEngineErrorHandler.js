/**
 * Goal Engine Error Handler
 *
 * Provides centralized error handling and edge case management
 * for the Internal Goal Engine system.
 *
 * Day 6-7: Error Handling & Edge Cases
 */

/**
 * Validate contractor data for goal generation
 * @param {Object} contractor - Contractor data
 * @returns {Object} { valid: boolean, errors: Array, warnings: Array }
 */
function validateContractorForGoalGeneration(contractor) {
  const errors = [];
  const warnings = [];

  // Critical: Contractor must exist
  if (!contractor) {
    errors.push('Contractor data is null or undefined');
    return { valid: false, errors, warnings };
  }

  // Critical: Contractor must have ID
  if (!contractor.id) {
    errors.push('Contractor missing required field: id');
  }

  // Warning: Missing focus areas limits goal generation
  if (!contractor.focus_areas || contractor.focus_areas === '') {
    warnings.push('Contractor has no focus_areas - will generate generic goals');
  }

  // Warning: Missing revenue tier limits goal specificity
  if (!contractor.revenue_tier || contractor.revenue_tier === '') {
    warnings.push('Contractor has no revenue_tier - cannot generate revenue goals');
  }

  // Warning: Missing team size limits goal options
  if (!contractor.team_size || contractor.team_size === '') {
    warnings.push('Contractor has no team_size - cannot generate team expansion goals');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Handle database connection failures gracefully
 * @param {Error} error - Database error
 * @param {string} operation - Operation being performed
 * @returns {Object} Standardized error response
 */
function handleDatabaseError(error, operation) {
  console.error(`[Goal Engine] Database error during ${operation}:`, error.message);

  // Check for specific PostgreSQL error codes
  if (error.code === '23503') {
    // Foreign key violation
    return {
      success: false,
      error: 'FOREIGN_KEY_VIOLATION',
      message: 'Referenced record does not exist',
      details: error.message,
      operation
    };
  }

  if (error.code === '23505') {
    // Unique constraint violation
    return {
      success: false,
      error: 'DUPLICATE_ENTRY',
      message: 'Record already exists',
      details: error.message,
      operation
    };
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
    // Connection error
    return {
      success: false,
      error: 'DATABASE_CONNECTION_FAILED',
      message: 'Could not connect to database',
      details: error.message,
      operation,
      retry: true
    };
  }

  // Generic database error
  return {
    success: false,
    error: 'DATABASE_ERROR',
    message: 'Database operation failed',
    details: error.message,
    operation
  };
}

/**
 * Validate goal data before creation
 * @param {Object} goalData - Goal data to validate
 * @returns {Object} { valid: boolean, errors: Array }
 */
function validateGoalData(goalData) {
  const errors = [];

  if (!goalData.contractor_id) {
    errors.push('Goal missing required field: contractor_id');
  }

  if (!goalData.goal_type || goalData.goal_type === '') {
    errors.push('Goal missing required field: goal_type');
  }

  if (!goalData.goal_description || goalData.goal_description === '') {
    errors.push('Goal missing required field: goal_description');
  }

  if (goalData.priority_score && (goalData.priority_score < 1 || goalData.priority_score > 10)) {
    errors.push('Goal priority_score must be between 1 and 10');
  }

  if (goalData.current_progress && (goalData.current_progress < 0 || goalData.current_progress > 100)) {
    errors.push('Goal current_progress must be between 0 and 100');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate checklist item data before creation
 * @param {Object} itemData - Checklist item data
 * @returns {Object} { valid: boolean, errors: Array }
 */
function validateChecklistItemData(itemData) {
  const errors = [];

  if (!itemData.contractor_id) {
    errors.push('Checklist item missing required field: contractor_id');
  }

  if (!itemData.checklist_item || itemData.checklist_item === '') {
    errors.push('Checklist item missing required field: checklist_item');
  }

  // Validate trigger_condition if provided
  const validTriggers = ['immediately', 'next_conversation', 'post_event', 'after_data_collected', 'after_action_completed'];
  if (itemData.trigger_condition && !validTriggers.includes(itemData.trigger_condition)) {
    errors.push(`Invalid trigger_condition: ${itemData.trigger_condition}. Must be one of: ${validTriggers.join(', ')}`);
  }

  // Validate status if provided
  const validStatuses = ['pending', 'in_progress', 'completed', 'skipped'];
  if (itemData.status && !validStatuses.includes(itemData.status)) {
    errors.push(`Invalid status: ${itemData.status}. Must be one of: ${validStatuses.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Handle edge case: Goal with no checklist items
 * @param {number} goalId - Goal ID
 * @returns {Object} Warning information
 */
function handleGoalWithNoChecklist(goalId) {
  console.warn(`[Goal Engine] Goal ${goalId} has no checklist items - progress will remain at 0%`);

  return {
    warning: 'GOAL_NO_CHECKLIST',
    message: 'Goal has no checklist items',
    goalId,
    suggestion: 'Consider generating checklist items for this goal',
    impact: 'Progress will remain at 0% until checklist items are added'
  };
}

/**
 * Handle edge case: All checklist items skipped
 * @param {number} goalId - Goal ID
 * @returns {Object} Warning information
 */
function handleAllItemsSkipped(goalId) {
  console.warn(`[Goal Engine] All checklist items for goal ${goalId} were skipped - consider generating new items`);

  return {
    warning: 'ALL_ITEMS_SKIPPED',
    message: 'All checklist items were skipped',
    goalId,
    suggestion: 'Generate new checklist items or mark goal as abandoned',
    impact: 'Goal will never reach completion'
  };
}

/**
 * Safe JSON parsing with fallback
 * @param {string|Object} data - Data to parse
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {any} Parsed data or fallback
 */
function safeJsonParse(data, fallback = null) {
  // Already an object
  if (typeof data === 'object' && data !== null) {
    return data;
  }

  // Not a string
  if (typeof data !== 'string') {
    return fallback;
  }

  // Empty string
  if (data.trim() === '') {
    return fallback;
  }

  try {
    return JSON.parse(data);
  } catch (error) {
    console.warn('[Goal Engine] JSON parse failed, using fallback:', error.message);
    return fallback;
  }
}

/**
 * Retry database operation with exponential backoff
 * @param {Function} operation - Async operation to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} initialDelay - Initial delay in ms
 * @returns {Promise<any>} Operation result
 */
async function retryDatabaseOperation(operation, maxRetries = 3, initialDelay = 100) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on validation errors
      if (error.code === '23503' || error.code === '23505' || error.code === '23514') {
        throw error;
      }

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1);
        console.warn(`[Goal Engine] Retry ${attempt}/${maxRetries} after ${delay}ms:`, error.message);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Log goal generation for debugging
 * @param {number} contractorId - Contractor ID
 * @param {Object} result - Generation result
 */
function logGoalGeneration(contractorId, result) {
  console.log(`[Goal Engine] Generated goals for contractor ${contractorId}:`);
  console.log(`  Goals created: ${result.goals_created}`);
  console.log(`  Checklist items: ${result.checklist_items_created}`);
  console.log(`  Data gaps: ${result.data_gaps_identified}`);

  if (result.warnings && result.warnings.length > 0) {
    console.warn(`  Warnings:`, result.warnings);
  }
}

/**
 * Log checklist execution for debugging
 * @param {number} itemId - Checklist item ID
 * @param {string} action - Action taken (tracked, completed, skipped)
 * @param {Object} context - Execution context
 */
function logChecklistExecution(itemId, action, context = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[Goal Engine] [${timestamp}] Checklist item ${itemId} ${action}`);

  if (context.conversation_id) {
    console.log(`  Conversation: ${context.conversation_id}`);
  }

  if (context.goal_id) {
    console.log(`  Goal: ${context.goal_id}`);
  }
}

module.exports = {
  validateContractorForGoalGeneration,
  handleDatabaseError,
  validateGoalData,
  validateChecklistItemData,
  handleGoalWithNoChecklist,
  handleAllItemsSkipped,
  safeJsonParse,
  retryDatabaseOperation,
  logGoalGeneration,
  logChecklistExecution
};
