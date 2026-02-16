// DATABASE-CHECKED: inner_circle_members, member_watch_history, power_moves, ai_concierge_conversations verified 2026-02-16
// ================================================================
// Engagement Score Service — Inner Circle Phase 2
// ================================================================
// Purpose: Calculate ai_engagement_score for Inner Circle members
// Weights: Watch 30%, PowerMoves 30%, Interaction 20%, Profile 10%, Recency 10%
// Range: 0.00 — 100.00
// Updated: After each concierge interaction and via heartbeat daily scan
// ================================================================

const { query } = require('../config/database');

/**
 * Calculate engagement score for a member
 * @param {number} memberId
 * @returns {number} Score 0.00-100.00
 */
async function calculateEngagementScore(memberId) {
  try {
    // 1. Watch behavior (30%)
    const watchScore = await calculateWatchScore(memberId);

    // 2. PowerMove activity (30%)
    const pmScore = await calculatePowerMoveScore(memberId);

    // 3. Concierge interaction frequency (20%)
    const interactionScore = await calculateInteractionScore(memberId);

    // 4. Profile completeness (10%)
    const profileScore = await calculateProfileScore(memberId);

    // 5. Recency decay (10%)
    const recencyScore = await calculateRecencyScore(memberId);

    const totalScore = Math.min(100, Math.max(0,
      (watchScore * 0.30) +
      (pmScore * 0.30) +
      (interactionScore * 0.20) +
      (profileScore * 0.10) +
      (recencyScore * 0.10)
    ));

    const rounded = Math.round(totalScore * 100) / 100;

    // Persist score
    await query(
      'UPDATE inner_circle_members SET ai_engagement_score = $1, updated_at = NOW() WHERE id = $2',
      [rounded, memberId]
    );

    console.log(`[Engagement Score] Member ${memberId}: ${rounded}/100 (watch=${watchScore.toFixed(1)}, pm=${pmScore.toFixed(1)}, interact=${interactionScore.toFixed(1)}, profile=${profileScore.toFixed(1)}, recency=${recencyScore.toFixed(1)})`);

    return rounded;
  } catch (error) {
    console.error(`[Engagement Score] Failed for member ${memberId}:`, error.message);
    return 0;
  }
}

/**
 * Watch behavior score (0-100)
 * - Total content pieces watched
 * - Average completion %
 * - Watch frequency (sessions per week)
 * - Show diversity
 */
async function calculateWatchScore(memberId) {
  try {
    const result = await query(`
      SELECT
        COUNT(*) as total_watched,
        AVG(watch_progress) as avg_progress,
        COUNT(DISTINCT show_id) as show_diversity,
        SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as completed_count,
        SUM(watch_count) as total_rewatches
      FROM member_watch_history
      WHERE member_id = $1 AND last_watched_at > NOW() - INTERVAL '30 days'
    `, [memberId]);

    const row = result.rows[0];
    if (!row || parseInt(row.total_watched) === 0) return 0;

    let score = 0;
    score += Math.min(30, parseInt(row.total_watched) * 5);    // Up to 30 for 6+ pieces
    score += (parseFloat(row.avg_progress) / 100) * 30;        // Up to 30 for high completion
    score += Math.min(20, parseInt(row.show_diversity) * 10);   // Up to 20 for diversity
    score += Math.min(20, parseInt(row.total_rewatches) * 3);   // Up to 20 for rewatches

    return Math.min(100, score);
  } catch (e) {
    return 0;
  }
}

/**
 * PowerMove activity score (0-100)
 */
async function calculatePowerMoveScore(memberId) {
  try {
    const result = await query(`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('active', 'in_progress')) as active_count,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE status = 'abandoned') as abandoned_count,
        MAX(streak_weeks) as max_streak,
        SUM(total_checkins) as total_checkins
      FROM power_moves
      WHERE member_id = $1
    `, [memberId]);

    const row = result.rows[0];
    let score = 0;

    score += Math.min(25, parseInt(row.active_count || 0) * 15);   // Active PowerMoves
    score += Math.min(30, parseInt(row.completed_count || 0) * 15); // Completed
    score += Math.min(20, parseInt(row.max_streak || 0) * 5);       // Streak
    score += Math.min(25, parseInt(row.total_checkins || 0) * 3);   // Check-ins
    score -= parseInt(row.abandoned_count || 0) * 5;                 // Penalty for abandoned

    return Math.min(100, Math.max(0, score));
  } catch (e) {
    return 0;
  }
}

/**
 * Concierge interaction score (0-100)
 */
async function calculateInteractionScore(memberId) {
  try {
    const result = await query(`
      SELECT COUNT(*) as msg_count
      FROM ai_concierge_conversations
      WHERE member_id = $1
        AND created_at > NOW() - INTERVAL '30 days'
        AND message_type = 'user'
    `, [memberId]);

    const count = parseInt(result.rows[0].msg_count);
    // 0 messages = 0, 1-5 = 20-50, 6-10 = 60-80, 11+ = 90-100
    if (count === 0) return 0;
    if (count <= 5) return count * 10;
    if (count <= 10) return 50 + (count - 5) * 6;
    return Math.min(100, 80 + (count - 10) * 2);
  } catch (e) {
    return 0;
  }
}

/**
 * Profile completeness score (0-100)
 */
async function calculateProfileScore(memberId) {
  try {
    const result = await query(`
      SELECT
        onboarding_complete,
        business_type IS NOT NULL as has_business_type,
        revenue_tier IS NOT NULL as has_revenue,
        team_size IS NOT NULL as has_team_size,
        focus_areas IS NOT NULL AND focus_areas != '[]'::jsonb as has_focus_areas,
        coaching_preferences IS NOT NULL AND coaching_preferences != '{}'::jsonb as has_coaching_prefs
      FROM inner_circle_members WHERE id = $1
    `, [memberId]);

    if (result.rows.length === 0) return 0;

    const row = result.rows[0];
    let score = 0;
    if (row.onboarding_complete) score += 30;
    if (row.has_business_type) score += 15;
    if (row.has_revenue) score += 15;
    if (row.has_team_size) score += 10;
    if (row.has_focus_areas) score += 15;
    if (row.has_coaching_prefs) score += 15;

    return score;
  } catch (e) {
    return 0;
  }
}

/**
 * Recency score (0-100) — decays with inactivity
 */
async function calculateRecencyScore(memberId) {
  try {
    const result = await query(`
      SELECT
        GREATEST(
          COALESCE(last_concierge_interaction, '2020-01-01'),
          COALESCE((SELECT MAX(last_watched_at) FROM member_watch_history WHERE member_id = $1), '2020-01-01')
        ) as last_activity
      FROM inner_circle_members WHERE id = $1
    `, [memberId]);

    if (result.rows.length === 0) return 0;

    const lastActivity = new Date(result.rows[0].last_activity);
    const daysSince = Math.floor((new Date() - lastActivity) / (1000 * 60 * 60 * 24));

    // Full score within 3 days, linear decay to 0 at 30 days
    if (daysSince <= 3) return 100;
    if (daysSince >= 30) return 0;
    return Math.round(100 * (1 - (daysSince - 3) / 27));
  } catch (e) {
    return 0;
  }
}

/**
 * Batch update engagement scores for all active members
 * Called by heartbeat daily scan
 */
async function updateAllEngagementScores() {
  try {
    const members = await query(
      "SELECT id FROM inner_circle_members WHERE membership_status = 'active'"
    );

    console.log(`[Engagement Score] Batch updating ${members.rows.length} members`);
    let updated = 0;

    for (const member of members.rows) {
      await calculateEngagementScore(member.id);
      updated++;
    }

    console.log(`[Engagement Score] Batch update complete: ${updated} members`);
    return updated;
  } catch (error) {
    console.error('[Engagement Score] Batch update failed:', error.message);
    return 0;
  }
}

module.exports = {
  calculateEngagementScore,
  updateAllEngagementScores
};
