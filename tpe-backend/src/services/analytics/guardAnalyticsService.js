// DATABASE-CHECKED: ai_interactions, contractors columns verified October 15, 2025
// ================================================================
// Guard Analytics Service - Phase 3 Day 5
// ================================================================
// Purpose: Analytics queries for Guard Monitoring Dashboard
// Provides statistics, violations, and activity feeds for guard checks
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractorId)
// - interaction_type (NOT interactionType)
// - interaction_data (NOT interactionData)
// - created_at (NOT createdAt)
// - first_name, last_name, email, company_name (contractors table)
// ================================================================
// VERIFIED DATA TYPES:
// - interaction_data: JSONB (use ->> for text, -> for json)
// - created_at: TIMESTAMP (use INTERVAL syntax for date ranges)
// ================================================================
// JSONB EXTRACTION:
// - (interaction_data->>'allowed')::boolean - Extract allowed flag
// - (interaction_data->>'reason') - Extract reason text
// - (interaction_data->>'current')::integer - Extract current count
// - (interaction_data->>'limit')::integer - Extract limit value
// ================================================================

const { query } = require('../../config/database');

/**
 * Guard Analytics Service
 * Provides analytics queries for Guard Monitoring Dashboard
 */
class GuardAnalyticsService {
  /**
   * Get overall guard statistics
   * @param {number} hours - Number of hours to look back (default: 24)
   * @returns {Promise<object>} - Guard statistics
   */
  static async getOverallStats(hours = 24) {
    try {
      const result = await query(`
        SELECT
          COUNT(*) as total_checks,
          COUNT(*) FILTER (WHERE (interaction_data->>'allowed')::boolean = true) as checks_passed,
          COUNT(*) FILTER (WHERE (interaction_data->>'allowed')::boolean = false) as checks_blocked,
          COUNT(DISTINCT contractor_id) as unique_contractors,
          AVG(CASE
            WHEN (interaction_data->>'current')::integer IS NOT NULL
            THEN (interaction_data->>'current')::integer
          END) as avg_operations_per_contractor
        FROM ai_interactions
        WHERE interaction_type LIKE 'guard_check_%'
          AND created_at >= NOW() - INTERVAL '${hours} hours'
      `);

      return {
        totalChecks: parseInt(result.rows[0].total_checks) || 0,
        checksPassed: parseInt(result.rows[0].checks_passed) || 0,
        checksBlocked: parseInt(result.rows[0].checks_blocked) || 0,
        uniqueContractors: parseInt(result.rows[0].unique_contractors) || 0,
        avgOperationsPerContractor: parseFloat(result.rows[0].avg_operations_per_contractor) || 0,
        timeWindow: `${hours} hours`
      };
    } catch (error) {
      console.error('[GuardAnalytics] Error fetching overall stats:', error);
      throw error;
    }
  }

  /**
   * Get guard violations (blocked checks) with contractor details
   * @param {number} limit - Maximum number of violations to return (default: 50)
   * @param {number} hours - Number of hours to look back (default: 24)
   * @returns {Promise<Array>} - Array of violations with details
   */
  static async getRecentViolations(limit = 50, hours = 24) {
    try {
      const result = await query(`
        SELECT
          ai.id,
          ai.contractor_id,
          c.first_name,
          c.last_name,
          c.email,
          c.company_name,
          ai.interaction_type,
          ai.interaction_data->>'reason' as reason,
          ai.interaction_data->>'current' as current_count,
          ai.interaction_data->>'limit' as limit_value,
          ai.interaction_data->>'retryAfter' as retry_after,
          ai.created_at
        FROM ai_interactions ai
        LEFT JOIN contractors c ON c.id = ai.contractor_id
        WHERE ai.interaction_type LIKE 'guard_check_%'
          AND (ai.interaction_data->>'allowed')::boolean = false
          AND ai.created_at >= NOW() - INTERVAL '${hours} hours'
        ORDER BY ai.created_at DESC
        LIMIT $1
      `, [limit]);

      return result.rows.map(row => ({
        id: row.id,
        contractorId: row.contractor_id,
        contractorName: row.first_name && row.last_name
          ? `${row.first_name} ${row.last_name}`
          : 'Unknown',
        email: row.email || 'N/A',
        companyName: row.company_name || 'N/A',
        guardType: row.interaction_type.replace('guard_check_', ''),
        reason: row.reason || 'No reason provided',
        currentCount: row.current_count ? parseInt(row.current_count) : null,
        limit: row.limit_value ? parseInt(row.limit_value) : null,
        retryAfter: row.retry_after ? parseInt(row.retry_after) : null,
        timestamp: row.created_at
      }));
    } catch (error) {
      console.error('[GuardAnalytics] Error fetching violations:', error);
      throw error;
    }
  }

  /**
   * Get guard check activity over time (hourly breakdown)
   * @param {number} hours - Number of hours to look back (default: 24)
   * @returns {Promise<Array>} - Array of hourly activity data
   */
  static async getActivityOverTime(hours = 24) {
    try {
      const result = await query(`
        SELECT
          DATE_TRUNC('hour', created_at) as hour,
          COUNT(*) as total_checks,
          COUNT(*) FILTER (WHERE (interaction_data->>'allowed')::boolean = true) as checks_passed,
          COUNT(*) FILTER (WHERE (interaction_data->>'allowed')::boolean = false) as checks_blocked
        FROM ai_interactions
        WHERE interaction_type LIKE 'guard_check_%'
          AND created_at >= NOW() - INTERVAL '${hours} hours'
        GROUP BY DATE_TRUNC('hour', created_at)
        ORDER BY hour ASC
      `);

      return result.rows.map(row => ({
        hour: row.hour,
        totalChecks: parseInt(row.total_checks),
        checksPassed: parseInt(row.checks_passed),
        checksBlocked: parseInt(row.checks_blocked)
      }));
    } catch (error) {
      console.error('[GuardAnalytics] Error fetching activity over time:', error);
      throw error;
    }
  }

  /**
   * Get top violators (contractors with most blocked checks)
   * @param {number} limit - Maximum number of contractors to return (default: 10)
   * @param {number} hours - Number of hours to look back (default: 24)
   * @returns {Promise<Array>} - Array of contractors with violation counts
   */
  static async getTopViolators(limit = 10, hours = 24) {
    try {
      const result = await query(`
        SELECT
          ai.contractor_id,
          c.first_name,
          c.last_name,
          c.email,
          c.company_name,
          COUNT(*) as violation_count,
          MAX(ai.created_at) as last_violation
        FROM ai_interactions ai
        LEFT JOIN contractors c ON c.id = ai.contractor_id
        WHERE ai.interaction_type LIKE 'guard_check_%'
          AND (ai.interaction_data->>'allowed')::boolean = false
          AND ai.created_at >= NOW() - INTERVAL '${hours} hours'
        GROUP BY ai.contractor_id, c.first_name, c.last_name, c.email, c.company_name
        ORDER BY violation_count DESC
        LIMIT $1
      `, [limit]);

      return result.rows.map(row => ({
        contractorId: row.contractor_id,
        contractorName: row.first_name && row.last_name
          ? `${row.first_name} ${row.last_name}`
          : 'Unknown',
        email: row.email || 'N/A',
        companyName: row.company_name || 'N/A',
        violationCount: parseInt(row.violation_count),
        lastViolation: row.last_violation
      }));
    } catch (error) {
      console.error('[GuardAnalytics] Error fetching top violators:', error);
      throw error;
    }
  }

  /**
   * Get guard check breakdown by type
   * @param {number} hours - Number of hours to look back (default: 24)
   * @returns {Promise<Array>} - Array of guard types with counts
   */
  static async getGuardTypeBreakdown(hours = 24) {
    try {
      const result = await query(`
        SELECT
          interaction_type,
          COUNT(*) as total_checks,
          COUNT(*) FILTER (WHERE (interaction_data->>'allowed')::boolean = true) as checks_passed,
          COUNT(*) FILTER (WHERE (interaction_data->>'allowed')::boolean = false) as checks_blocked
        FROM ai_interactions
        WHERE interaction_type LIKE 'guard_check_%'
          AND created_at >= NOW() - INTERVAL '${hours} hours'
        GROUP BY interaction_type
        ORDER BY total_checks DESC
      `);

      return result.rows.map(row => ({
        guardType: row.interaction_type.replace('guard_check_', ''),
        totalChecks: parseInt(row.total_checks),
        checksPassed: parseInt(row.checks_passed),
        checksBlocked: parseInt(row.checks_blocked),
        blockRate: (parseInt(row.checks_blocked) / parseInt(row.total_checks) * 100).toFixed(2)
      }));
    } catch (error) {
      console.error('[GuardAnalytics] Error fetching guard type breakdown:', error);
      throw error;
    }
  }

  /**
   * Get recent guard activity feed (all checks, passed and blocked)
   * @param {number} limit - Maximum number of activities to return (default: 100)
   * @returns {Promise<Array>} - Array of recent activities
   */
  static async getRecentActivity(limit = 100) {
    try {
      const result = await query(`
        SELECT
          ai.id,
          ai.contractor_id,
          c.first_name,
          c.last_name,
          c.email,
          ai.interaction_type,
          (ai.interaction_data->>'allowed')::boolean as allowed,
          ai.interaction_data->>'reason' as reason,
          ai.created_at
        FROM ai_interactions ai
        LEFT JOIN contractors c ON c.id = ai.contractor_id
        WHERE ai.interaction_type LIKE 'guard_check_%'
        ORDER BY ai.created_at DESC
        LIMIT $1
      `, [limit]);

      return result.rows.map(row => ({
        id: row.id,
        contractorId: row.contractor_id,
        contractorName: row.first_name && row.last_name
          ? `${row.first_name} ${row.last_name}`
          : 'Unknown',
        email: row.email || 'N/A',
        guardType: row.interaction_type.replace('guard_check_', ''),
        allowed: row.allowed !== null ? row.allowed : null,
        reason: row.reason || 'No reason provided',
        timestamp: row.created_at
      }));
    } catch (error) {
      console.error('[GuardAnalytics] Error fetching recent activity:', error);
      throw error;
    }
  }

  /**
   * Get contractor-specific guard statistics
   * @param {number} contractorId - Contractor ID
   * @param {number} days - Number of days to look back (default: 30)
   * @returns {Promise<object>} - Contractor guard statistics
   */
  static async getContractorStats(contractorId, days = 30) {
    try {
      const statsResult = await query(`
        SELECT
          COUNT(*) as total_checks,
          COUNT(*) FILTER (WHERE (interaction_data->>'allowed')::boolean = true) as checks_passed,
          COUNT(*) FILTER (WHERE (interaction_data->>'allowed')::boolean = false) as checks_blocked
        FROM ai_interactions
        WHERE contractor_id = $1
          AND interaction_type LIKE 'guard_check_%'
          AND created_at >= NOW() - INTERVAL '${days} days'
      `, [contractorId]);

      const typeResult = await query(`
        SELECT
          interaction_type,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE (interaction_data->>'allowed')::boolean = false) as blocked_count
        FROM ai_interactions
        WHERE contractor_id = $1
          AND interaction_type LIKE 'guard_check_%'
          AND created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY interaction_type
        ORDER BY count DESC
      `, [contractorId]);

      const stats = statsResult.rows[0];
      const checksByType = {};

      typeResult.rows.forEach(row => {
        const guardType = row.interaction_type.replace('guard_check_', '');
        checksByType[guardType] = {
          total: parseInt(row.count),
          blocked: parseInt(row.blocked_count)
        };
      });

      return {
        contractorId,
        totalChecks: parseInt(stats.total_checks) || 0,
        checksPassed: parseInt(stats.checks_passed) || 0,
        checksBlocked: parseInt(stats.checks_blocked) || 0,
        checksByType,
        timeWindow: `${days} days`
      };
    } catch (error) {
      console.error('[GuardAnalytics] Error fetching contractor stats:', error);
      throw error;
    }
  }
}

module.exports = GuardAnalyticsService;
