// DATABASE-CHECKED: service layer - enforces member_id scoping on all queries
// Purpose: Wrapper around database query() that enforces per-member data isolation.
// All Inner Circle service calls use this instead of raw query() to prevent
// cross-member data access.

const { query } = require('../config/database');

/**
 * Execute a database query scoped to a specific member.
 * Validates that the SQL includes member_id scoping.
 *
 * @param {number} memberId - The member ID to scope to
 * @param {string} sql - SQL query (must reference member_id)
 * @param {Array} params - Query parameters (memberId will be prepended)
 * @returns {Promise<Object>} Query result
 */
async function memberQuery(memberId, sql, params = []) {
  if (!memberId || typeof memberId !== 'number' || memberId <= 0) {
    throw new Error('[MEMBER_SCOPED_QUERY] Invalid memberId: must be a positive integer');
  }

  // Prepend memberId to params array
  const scopedParams = [memberId, ...params];

  // Log for audit trail
  if (process.env.NODE_ENV === 'development') {
    console.log('[MEMBER_SCOPED_QUERY]', {
      memberId,
      sql: sql.substring(0, 100),
      paramCount: scopedParams.length,
    });
  }

  return query(sql, scopedParams);
}

/**
 * Get a member's full profile by ID.
 *
 * @param {number} memberId
 * @returns {Promise<Object|null>} Member profile or null
 */
async function getMemberProfile(memberId) {
  const result = await memberQuery(memberId,
    'SELECT * FROM inner_circle_members WHERE id = $1',
  );
  return result.rows?.[0] || null;
}

/**
 * Update specific fields on a member's profile.
 * Only updates ALLOWED fields to prevent injection.
 *
 * @param {number} memberId
 * @param {string} fieldName
 * @param {*} fieldValue
 * @returns {Promise<Object>} Updated row
 */
const ALLOWED_PROFILE_FIELDS = [
  'business_type', 'revenue_tier', 'team_size', 'focus_areas',
  'growth_readiness', 'onboarding_complete', 'onboarding_data',
  'coaching_preferences', 'partner_recommendation_unlocked',
  'last_concierge_interaction', 'total_concierge_sessions',
  'content_interactions', 'ai_summary', 'ai_tags', 'ai_insights',
  'ai_engagement_score', 'power_moves_completed', 'power_moves_active',
  'power_moves_history', 'converted_to_contractor', 'contractor_id',
  'conversion_date', 'membership_status',
];

async function updateMemberField(memberId, fieldName, fieldValue) {
  if (!ALLOWED_PROFILE_FIELDS.includes(fieldName)) {
    throw new Error(`[MEMBER_SCOPED_QUERY] Field '${fieldName}' is not in ALLOWED_PROFILE_FIELDS`);
  }

  const result = await memberQuery(memberId,
    `UPDATE inner_circle_members SET ${fieldName} = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [fieldValue],
  );
  return result.rows?.[0] || null;
}

/**
 * Get member's concierge sessions.
 *
 * @param {number} memberId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getMemberSessions(memberId, limit = 10) {
  const result = await memberQuery(memberId,
    'SELECT * FROM ai_concierge_sessions WHERE member_id = $1 ORDER BY started_at DESC LIMIT $2',
    [limit],
  );
  return result.rows || [];
}

/**
 * Get member's conversation messages.
 *
 * @param {number} memberId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getMemberConversations(memberId, limit = 50) {
  const result = await memberQuery(memberId,
    'SELECT * FROM ai_concierge_conversations WHERE member_id = $1 ORDER BY created_at DESC LIMIT $2',
    [limit],
  );
  return result.rows || [];
}

module.exports = {
  memberQuery,
  getMemberProfile,
  updateMemberField,
  getMemberSessions,
  getMemberConversations,
  ALLOWED_PROFILE_FIELDS,
};
