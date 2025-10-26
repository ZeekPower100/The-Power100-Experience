// ============================================================================
// DATABASE-CHECKED: contractor_action_items, ai_concierge_goals,
//                   ai_proactive_messages, ai_trust_indicators, contractors
// ============================================================================
// IGE Contractor Search Functionality
// Purpose: Search and filter contractors with IGE metrics for Phase 2 Dashboard
// ============================================================================

const { query } = require('../config/database');

/**
 * Search and filter contractors with IGE data
 * Supports: name, email, trust score range, action status, goal count
 */
async function searchContractors(req, res) {
  try {
    const {
      search = '',
      trust_min = 0,
      trust_max = 100,
      has_active_goals = null,
      has_action_items = null,
      action_status = null,
      limit = 50,
      offset = 0,
      sort_by = 'name',
      sort_order = 'ASC'
    } = req.query;

    // Build WHERE conditions
    const conditions = [];
    const params = [];
    let paramCount = 0;

    // Search filter (name or email)
    if (search && search.trim() !== '') {
      paramCount++;
      conditions.push(`(
        LOWER(c.first_name || ' ' || c.last_name) LIKE LOWER($${paramCount})
        OR LOWER(c.email) LIKE LOWER($${paramCount})
      )`);
      params.push(`%${search.trim()}%`);
    }

    // Build main query with subqueries for IGE data
    const baseQuery = `
      WITH contractor_trust AS (
        SELECT DISTINCT ON (contractor_id)
          contractor_id,
          cumulative_trust_score as trust_score
        FROM ai_trust_indicators
        ORDER BY contractor_id, recorded_at DESC
      ),
      contractor_goals AS (
        SELECT
          contractor_id,
          COUNT(*) FILTER (WHERE status = 'active') as active_goals,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_goals
        FROM ai_concierge_goals
        GROUP BY contractor_id
      ),
      contractor_actions AS (
        SELECT
          contractor_id,
          COUNT(*) as total_actions,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_actions,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_actions
        FROM contractor_action_items
        GROUP BY contractor_id
      ),
      contractor_messages AS (
        SELECT
          contractor_id,
          COUNT(*) as messages_sent,
          MAX(sent_at) as last_message_at
        FROM ai_proactive_messages
        WHERE sent_at IS NOT NULL
        GROUP BY contractor_id
      )
      SELECT
        c.id,
        c.first_name,
        c.last_name,
        c.email,
        c.phone,
        c.company_name,
        c.revenue_tier,
        c.created_at,
        c.last_activity_at,
        COALESCE(ct.trust_score, 50) as trust_score,
        COALESCE(cg.active_goals, 0) as active_goals,
        COALESCE(cg.completed_goals, 0) as completed_goals,
        COALESCE(ca.total_actions, 0) as total_actions,
        COALESCE(ca.pending_actions, 0) as pending_actions,
        COALESCE(ca.completed_actions, 0) as completed_actions,
        COALESCE(cm.messages_sent, 0) as messages_sent,
        cm.last_message_at
      FROM contractors c
      LEFT JOIN contractor_trust ct ON ct.contractor_id = c.id
      LEFT JOIN contractor_goals cg ON cg.contractor_id = c.id
      LEFT JOIN contractor_actions ca ON ca.contractor_id = c.id
      LEFT JOIN contractor_messages cm ON cm.contractor_id = c.id
    `;

    // Trust score range filter
    paramCount++;
    conditions.push(`COALESCE(ct.trust_score, 50) >= $${paramCount}`);
    params.push(trust_min);

    paramCount++;
    conditions.push(`COALESCE(ct.trust_score, 50) <= $${paramCount}`);
    params.push(trust_max);

    // Active goals filter
    if (has_active_goals === 'true') {
      conditions.push(`COALESCE(cg.active_goals, 0) > 0`);
    } else if (has_active_goals === 'false') {
      conditions.push(`COALESCE(cg.active_goals, 0) = 0`);
    }

    // Action items filter
    if (has_action_items === 'true') {
      conditions.push(`COALESCE(ca.total_actions, 0) > 0`);
    } else if (has_action_items === 'false') {
      conditions.push(`COALESCE(ca.total_actions, 0) = 0`);
    }

    // Action status filter
    if (action_status === 'pending') {
      conditions.push(`COALESCE(ca.pending_actions, 0) > 0`);
    } else if (action_status === 'completed') {
      conditions.push(`COALESCE(ca.completed_actions, 0) > 0`);
    }

    // Build complete query
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sorting
    const sortColumn = {
      'name': 'c.first_name, c.last_name',
      'trust_score': 'trust_score',
      'active_goals': 'active_goals',
      'total_actions': 'total_actions',
      'last_activity': 'c.last_activity_at'
    }[sort_by] || 'c.first_name, c.last_name';

    const sortDirection = sort_order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Add pagination
    paramCount++;
    const limitParam = paramCount;
    params.push(limit);

    paramCount++;
    const offsetParam = paramCount;
    params.push(offset);

    const finalQuery = `
      ${baseQuery}
      ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection} NULLS LAST
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    // Get count for pagination
    const countQuery = `
      ${baseQuery}
      ${whereClause}
    `;

    const countResult = await query(`SELECT COUNT(*) as total FROM (${countQuery}) subquery`, params.slice(0, -2));
    const contractorsResult = await query(finalQuery, params);

    res.json({
      success: true,
      contractors: contractorsResult.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + contractorsResult.rows.length < parseInt(countResult.rows[0].total)
      }
    });
  } catch (error) {
    console.error('Error searching contractors:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  searchContractors
};
