// DATABASE-CHECKED: ai_interactions columns verified October 15, 2025
// ================================================================
// Guard Logger - Phase 3 Day 3
// ================================================================
// Purpose: Logs all guard checks to database for audit trail and compliance
// Stores guard check results in ai_interactions table
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractorId)
// - interaction_type (NOT interactionType) - NO CHECK constraint
// - interaction_data (NOT interactionData) - JSONB type
// - created_at (NOT createdAt) - TIMESTAMP type
// ================================================================
// VERIFIED DATA TYPES:
// - interaction_data: JSONB (pass object directly, driver handles it)
// - created_at: TIMESTAMP (use NOW())
// ================================================================
// INTERACTION TYPE NAMING CONVENTION:
// - 'guard_check_{guard_type}' format
// - Examples: 'guard_check_create_action_item_permission'
//            'guard_check_create_action_item_rate_limit'
//            'guard_check_partner_access'
// ================================================================

const { query } = require('../../config/database');

/**
 * Guard Logger
 * Logs all guard checks for compliance and debugging
 *
 * All guard checks are stored in ai_interactions table with:
 * - interaction_type: 'guard_check_{guard_type}'
 * - interaction_data: JSONB with guard result details
 */
class GuardLogger {
  /**
   * Log a guard check result to database
   * @param {number} contractorId - Contractor ID
   * @param {string} guardType - Type of guard check (e.g., 'create_action_item_permission')
   * @param {object} guardResult - Guard check result object { allowed, reason, ...metadata }
   * @returns {Promise<number>} - ID of logged interaction
   */
  static async logGuardCheck(contractorId, guardType, guardResult) {
    try {
      const interactionType = `guard_check_${guardType}`;

      // Prepare guard data for JSONB field
      const guardData = {
        guard_type: guardType,
        allowed: guardResult.allowed,
        reason: guardResult.reason,
        timestamp: new Date().toISOString(),
        // Include any additional metadata from guard result
        ...guardResult
      };

      // Remove duplicate fields to keep JSONB clean
      delete guardData.allowed; // Already in root level
      delete guardData.reason; // Already in root level

      const insertQuery = `
        INSERT INTO ai_interactions (
          contractor_id,
          interaction_type,
          interaction_data,
          created_at
        ) VALUES ($1, $2, $3, NOW())
        RETURNING id
      `;

      const result = await query(insertQuery, [
        contractorId,
        interactionType,
        guardData // JSONB - driver handles object-to-json conversion
      ]);

      const logId = result.rows[0].id;

      // Console log for development visibility
      const emoji = guardResult.allowed ? '✅' : '🚫';
      console.log(`[GuardLogger] ${emoji} ${guardType}: ${guardResult.reason} (Log ID: ${logId})`);

      return logId;

    } catch (error) {
      // Log error but don't throw - guard logging failure shouldn't break the guard check
      console.error('[GuardLogger] ⚠️  Failed to log guard check:', error.message);
      console.error('[GuardLogger] Guard type:', guardType);
      console.error('[GuardLogger] Guard result:', JSON.stringify(guardResult));

      // Return null to indicate logging failure
      return null;
    }
  }

  /**
   * Log multiple guard checks in a batch (for comprehensive checks)
   * @param {number} contractorId - Contractor ID
   * @param {string} operationType - Type of operation being guarded
   * @param {Array} guardResults - Array of guard check results
   * @returns {Promise<Array<number>>} - Array of log IDs
   */
  static async logGuardCheckBatch(contractorId, operationType, guardResults) {
    const logIds = [];

    for (const guardResult of guardResults) {
      const guardType = `${operationType}_${guardResult.name}`;
      const logId = await this.logGuardCheck(contractorId, guardType, guardResult);
      logIds.push(logId);
    }

    return logIds;
  }

  /**
   * Get recent guard violations for a contractor
   * @param {number} contractorId - Contractor ID
   * @param {number} limit - Max number of violations to return
   * @returns {Promise<Array>} - Array of guard violations
   */
  static async getRecentViolations(contractorId, limit = 50) {
    try {
      const result = await query(`
        SELECT
          id,
          interaction_type,
          interaction_data,
          created_at
        FROM ai_interactions
        WHERE contractor_id = $1
          AND interaction_type LIKE 'guard_check_%'
          AND (interaction_data->>'allowed')::boolean = false
        ORDER BY created_at DESC
        LIMIT $2
      `, [contractorId, limit]);

      return result.rows;

    } catch (error) {
      console.error('[GuardLogger] Error fetching guard violations:', error);
      return [];
    }
  }

  /**
   * Get guard check statistics for a contractor
   * @param {number} contractorId - Contractor ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<object>} - Guard statistics
   */
  static async getGuardStats(contractorId, days = 30) {
    try {
      // First get overall stats
      const statsResult = await query(`
        SELECT
          COUNT(*) as total_checks,
          COUNT(*) FILTER (WHERE (interaction_data->>'allowed')::boolean = true) as checks_passed,
          COUNT(*) FILTER (WHERE (interaction_data->>'allowed')::boolean = false) as checks_failed
        FROM ai_interactions
        WHERE contractor_id = $1
          AND interaction_type LIKE 'guard_check_%'
          AND created_at >= NOW() - INTERVAL '${days} days'
      `, [contractorId]);

      // Then get counts by type
      const typeResult = await query(`
        SELECT
          interaction_type,
          COUNT(*) as count
        FROM ai_interactions
        WHERE contractor_id = $1
          AND interaction_type LIKE 'guard_check_%'
          AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY interaction_type
      `, [contractorId]);

      const result = {
        total_checks: parseInt(statsResult.rows[0]?.total_checks || 0),
        checks_passed: parseInt(statsResult.rows[0]?.checks_passed || 0),
        checks_failed: parseInt(statsResult.rows[0]?.checks_failed || 0),
        checks_by_type: {}
      };

      // Convert array to object
      typeResult.rows.forEach(row => {
        result.checks_by_type[row.interaction_type] = parseInt(row.count);
      });

      return result;

    } catch (error) {
      console.error('[GuardLogger] Error fetching guard stats:', error);
      return {
        total_checks: 0,
        checks_passed: 0,
        checks_failed: 0,
        checks_by_type: {}
      };
    }
  }

  /**
   * Get all guard violations across all contractors (admin function)
   * @param {number} limit - Max number of violations to return
   * @param {number} hours - Number of hours to look back
   * @returns {Promise<Array>} - Array of violations with contractor details
   */
  static async getAllViolations(limit = 100, hours = 24) {
    try {
      const result = await query(`
        SELECT
          ai.id,
          ai.contractor_id,
          c.email as contractor_email,
          c.company_name,
          ai.interaction_type,
          ai.interaction_data,
          ai.created_at
        FROM ai_interactions ai
        JOIN contractors c ON c.id = ai.contractor_id
        WHERE ai.interaction_type LIKE 'guard_check_%'
          AND (ai.interaction_data->>'allowed')::boolean = false
          AND ai.created_at >= NOW() - INTERVAL '${hours} hours'
        ORDER BY ai.created_at DESC
        LIMIT $1
      `, [limit]);

      return result.rows;

    } catch (error) {
      console.error('[GuardLogger] Error fetching all violations:', error);
      return [];
    }
  }
}

module.exports = GuardLogger;
