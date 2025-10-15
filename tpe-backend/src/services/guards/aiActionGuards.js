// DATABASE-CHECKED: contractor_action_items, contractors, ai_interactions, strategic_partners verified October 15, 2025
// ================================================================
// AI Action Guards - Phase 3 Day 3
// ================================================================
// Purpose: Permission-based safety checks for all AI operations
// Prevents AI from performing unauthorized database operations
// ================================================================
// VERIFIED CONSTRAINTS:
// - contractor_action_items.status: CHECK IN ('pending', 'in_progress', 'completed', 'cancelled', 'deferred')
// - contractor_action_items.action_type: CHECK IN ('follow_up', 'demo_prep', 'email_intro', 'implement_tool', 'contact_peer', 'research_partner', 'schedule_meeting', 'review_content', 'other')
// - contractor_action_items.priority: CHECK ((priority >= 1) AND (priority <= 10))
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractorId)
// - ai_generated (NOT ai_created, NOT aiGenerated)
// - ai_coach_opt_in (NOT aiCoachOptIn)
// - has_ai_access (NOT hasAiAccess)
// - opted_in_coaching (NOT optedInCoaching)
// - interaction_type (NOT interactionType)
// - interaction_data (NOT interactionData)
// - is_active (NOT isActive)
// ================================================================
// VERIFIED DATA TYPES:
// - has_ai_access: BOOLEAN (true/false NOT 'true'/'false')
// - ai_coach_opt_in: BOOLEAN (true/false NOT 'true'/'false')
// - opted_in_coaching: BOOLEAN (true/false NOT 'true'/'false')
// - ai_generated: BOOLEAN (true/false NOT 'true'/'false')
// - interaction_data: JSONB (do NOT JSON.stringify)
// - conversation_context: JSONB (do NOT JSON.stringify)
// - extraction_confidence: NUMERIC (0.85 NOT '85%')
// ================================================================
// GUARD RATE LIMITS:
// - action_item_create: 10 per hour (3600 seconds)
// - message_send: 50 per hour (3600 seconds)
// - partner_lookup: 100 per hour (3600 seconds)
// ================================================================

const { query } = require('../../config/database');

/**
 * AI Action Guards - Permission-based safety checks
 * Prevents AI from performing unauthorized operations
 *
 * All guard methods return: { allowed: boolean, reason: string, ...metadata }
 */
class AIActionGuards {
  /**
   * Check if contractor has permission for AI to create action items
   * @param {number} contractorId - Contractor ID
   * @returns {Promise<{allowed: boolean, reason: string}>}
   */
  static async canCreateActionItem(contractorId) {
    try {
      const result = await query(`
        SELECT
          has_ai_access,
          ai_coach_opt_in,
          opted_in_coaching
        FROM contractors
        WHERE id = $1
      `, [contractorId]);

      if (result.rows.length === 0) {
        return { allowed: false, reason: 'Contractor not found' };
      }

      const contractor = result.rows[0];

      // Check AI access flag
      if (!contractor.has_ai_access) {
        return {
          allowed: false,
          reason: 'AI access not enabled for this contractor'
        };
      }

      // Check if contractor has opted into AI coaching
      if (!contractor.ai_coach_opt_in && !contractor.opted_in_coaching) {
        return {
          allowed: false,
          reason: 'Contractor has not opted in to AI coaching'
        };
      }

      return {
        allowed: true,
        reason: 'Permission granted - contractor has AI access and coaching opt-in'
      };

    } catch (error) {
      console.error('[AIActionGuards] Error checking action item permission:', error);
      return {
        allowed: false,
        reason: `Database error: ${error.message}`
      };
    }
  }

  /**
   * Check if contractor has reached action item limit
   * @param {number} contractorId - Contractor ID
   * @returns {Promise<{allowed: boolean, reason: string, current: number, max: number}>}
   */
  static async checkActionItemLimit(contractorId) {
    const MAX_ACTIVE_ITEMS = 25; // Configurable limit to prevent overwhelming contractors

    try {
      const result = await query(`
        SELECT COUNT(*) as active_count
        FROM contractor_action_items
        WHERE contractor_id = $1
          AND status NOT IN ('completed', 'cancelled')
      `, [contractorId]);

      const activeCount = parseInt(result.rows[0].active_count);

      if (activeCount >= MAX_ACTIVE_ITEMS) {
        return {
          allowed: false,
          reason: `Maximum active action items reached (${MAX_ACTIVE_ITEMS})`,
          current: activeCount,
          max: MAX_ACTIVE_ITEMS
        };
      }

      return {
        allowed: true,
        reason: 'Within action item limit',
        current: activeCount,
        max: MAX_ACTIVE_ITEMS
      };

    } catch (error) {
      console.error('[AIActionGuards] Error checking action item limit:', error);
      return {
        allowed: false,
        reason: `Database error: ${error.message}`,
        current: 0,
        max: MAX_ACTIVE_ITEMS
      };
    }
  }

  /**
   * Check if AI can modify existing action item
   * @param {number} actionItemId - Action item ID
   * @param {number} contractorId - Contractor ID
   * @returns {Promise<{allowed: boolean, reason: string}>}
   */
  static async canModifyActionItem(actionItemId, contractorId) {
    try {
      const result = await query(`
        SELECT
          contractor_id,
          ai_generated,
          status,
          completed_at
        FROM contractor_action_items
        WHERE id = $1
      `, [actionItemId]);

      if (result.rows.length === 0) {
        return { allowed: false, reason: 'Action item not found' };
      }

      const item = result.rows[0];

      // Check ownership
      if (item.contractor_id !== contractorId) {
        return {
          allowed: false,
          reason: 'Action item belongs to different contractor'
        };
      }

      // Check if completed
      if (item.status === 'completed' && item.completed_at) {
        return {
          allowed: false,
          reason: 'Cannot modify completed action items'
        };
      }

      // Check if AI-generated (only allow modifying AI-created items)
      if (!item.ai_generated) {
        return {
          allowed: false,
          reason: 'Cannot modify manually created action items'
        };
      }

      return {
        allowed: true,
        reason: 'Permission granted - AI-generated item, not completed, correct owner'
      };

    } catch (error) {
      console.error('[AIActionGuards] Error checking action item modification:', error);
      return {
        allowed: false,
        reason: `Database error: ${error.message}`
      };
    }
  }

  /**
   * Check if contractor can access partner information
   * @param {number} contractorId - Contractor ID
   * @param {number} partnerId - Partner ID
   * @returns {Promise<{allowed: boolean, reason: string}>}
   */
  static async canAccessPartner(contractorId, partnerId) {
    try {
      // Check if contractor has been matched with this partner
      const matchResult = await query(`
        SELECT id
        FROM contractor_partner_matches
        WHERE contractor_id = $1
          AND partner_id = $2
      `, [contractorId, partnerId]);

      if (matchResult.rows.length > 0) {
        return {
          allowed: true,
          reason: 'Contractor matched with partner'
        };
      }

      // Check if partner is active/public
      const partnerResult = await query(`
        SELECT is_active
        FROM strategic_partners
        WHERE id = $1
      `, [partnerId]);

      if (partnerResult.rows.length === 0) {
        return {
          allowed: false,
          reason: 'Partner not found'
        };
      }

      const partner = partnerResult.rows[0];

      // Only allow access to active partners
      if (!partner.is_active) {
        return {
          allowed: false,
          reason: 'Partner is not active'
        };
      }

      // Allow access to active partners (they are public in TPX ecosystem)
      return {
        allowed: true,
        reason: 'Partner is active and available to all contractors'
      };

    } catch (error) {
      console.error('[AIActionGuards] Error checking partner access:', error);
      return {
        allowed: false,
        reason: `Database error: ${error.message}`
      };
    }
  }

  /**
   * Rate limit check for AI operations
   * @param {number} contractorId - Contractor ID
   * @param {string} operationType - Type of operation ('action_item_create', 'message_send', 'partner_lookup')
   * @returns {Promise<{allowed: boolean, reason: string, retryAfter: number}>}
   */
  static async checkRateLimit(contractorId, operationType) {
    const RATE_LIMITS = {
      'action_item_create': { limit: 10, window: 3600 }, // 10 per hour
      'message_send': { limit: 50, window: 3600 }, // 50 per hour
      'partner_lookup': { limit: 100, window: 3600 } // 100 per hour
    };

    const config = RATE_LIMITS[operationType];
    if (!config) {
      // No rate limit defined for this operation - allow by default
      return {
        allowed: true,
        reason: 'No rate limit defined for this operation',
        retryAfter: 0
      };
    }

    try {
      const result = await query(`
        SELECT COUNT(*) as operation_count
        FROM ai_interactions
        WHERE contractor_id = $1
          AND interaction_type = $2
          AND created_at >= NOW() - INTERVAL '${config.window} seconds'
      `, [contractorId, operationType]);

      const count = parseInt(result.rows[0].operation_count);

      if (count >= config.limit) {
        return {
          allowed: false,
          reason: `Rate limit exceeded for ${operationType} (${count}/${config.limit} in last hour)`,
          retryAfter: config.window,
          current: count,
          limit: config.limit
        };
      }

      return {
        allowed: true,
        reason: `Within rate limit (${count}/${config.limit} in last hour)`,
        retryAfter: 0,
        current: count,
        limit: config.limit
      };

    } catch (error) {
      console.error('[AIActionGuards] Error checking rate limit:', error);
      return {
        allowed: false,
        reason: `Database error: ${error.message}`,
        retryAfter: 0
      };
    }
  }

  /**
   * Comprehensive guard check for creating action items
   * Runs all relevant checks in sequence
   * @param {number} contractorId - Contractor ID
   * @returns {Promise<{allowed: boolean, reason: string, checksRun: Array, checksPassed: number, checksFailed: number}>}
   */
  static async canCreateActionItemComprehensive(contractorId) {
    const checks = [];
    let checksPassed = 0;
    let checksFailed = 0;

    // Check 1: Permission
    const permissionCheck = await this.canCreateActionItem(contractorId);
    checks.push({ name: 'permission', ...permissionCheck });
    if (permissionCheck.allowed) checksPassed++;
    else checksFailed++;

    // Check 2: Rate Limit
    const rateLimitCheck = await this.checkRateLimit(contractorId, 'action_item_create');
    checks.push({ name: 'rate_limit', ...rateLimitCheck });
    if (rateLimitCheck.allowed) checksPassed++;
    else checksFailed++;

    // Check 3: Item Limit
    const itemLimitCheck = await this.checkActionItemLimit(contractorId);
    checks.push({ name: 'item_limit', ...itemLimitCheck });
    if (itemLimitCheck.allowed) checksPassed++;
    else checksFailed++;

    // Overall result - ALL checks must pass
    const allPassed = checksFailed === 0;
    const failedCheck = checks.find(check => !check.allowed);

    return {
      allowed: allPassed,
      reason: allPassed
        ? `All checks passed (${checksPassed}/${checksPassed + checksFailed})`
        : failedCheck.reason,
      checksRun: checks,
      checksPassed,
      checksFailed
    };
  }
}

module.exports = AIActionGuards;
