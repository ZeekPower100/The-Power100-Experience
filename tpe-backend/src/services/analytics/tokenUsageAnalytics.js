// DATABASE-CHECKED: ai_interactions verified October 14, 2025
// ================================================================
// Token Usage Analytics - Phase 3 Day 2
// ================================================================
// Purpose: Query and analyze OpenAI token usage from ai_interactions table
// Provides: Per-contractor analytics, time-based trends, cost estimation
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractorId)
// - interaction_type (NOT interactionType)
// - interaction_data (NOT interactionData) - JSONB type
// - created_at (NOT createdAt)
// ================================================================
// JSON FIELD EXTRACTION SYNTAX:
// - interaction_data->>'prompt_tokens' (returns text)
// - (interaction_data->>'prompt_tokens')::int (cast to integer)
// - interaction_data ? 'total_tokens' (check if field exists)
// ================================================================

const { query } = require('../../config/database');

/**
 * Get token usage statistics for a contractor
 *
 * @param {number} contractorId - Contractor ID
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Promise<object>} - Token usage statistics
 */
async function getContractorTokenUsage(contractorId, days = 30) {
  try {
    const result = await query(`
      SELECT
        contractor_id,
        COUNT(*) as interaction_count,
        SUM((interaction_data->>'prompt_tokens')::int) FILTER (WHERE interaction_data ? 'prompt_tokens') as total_prompt_tokens,
        SUM((interaction_data->>'completion_tokens')::int) FILTER (WHERE interaction_data ? 'completion_tokens') as total_completion_tokens,
        SUM((interaction_data->>'total_tokens')::int) FILTER (WHERE interaction_data ? 'total_tokens') as total_tokens,
        AVG((interaction_data->>'duration_ms')::int) FILTER (WHERE interaction_data ? 'duration_ms') as avg_duration_ms,
        MIN(created_at) as first_interaction,
        MAX(created_at) as last_interaction
      FROM ai_interactions
      WHERE contractor_id = $1
        AND created_at >= NOW() - INTERVAL '${days} days'
        AND interaction_type LIKE 'ai_concierge_%'
      GROUP BY contractor_id
    `, [contractorId]);

    if (result.rows.length === 0) {
      return {
        contractor_id: contractorId,
        interaction_count: 0,
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        total_tokens: 0,
        avg_duration_ms: 0,
        estimated_cost_usd: 0,
        first_interaction: null,
        last_interaction: null
      };
    }

    const stats = result.rows[0];

    // Estimate cost (GPT-4 pricing: ~$0.03/1K prompt tokens, ~$0.06/1K completion tokens)
    const estimatedCost = (
      (stats.total_prompt_tokens || 0) * 0.00003 +
      (stats.total_completion_tokens || 0) * 0.00006
    );

    return {
      contractor_id: stats.contractor_id,
      interaction_count: parseInt(stats.interaction_count),
      total_prompt_tokens: parseInt(stats.total_prompt_tokens) || 0,
      total_completion_tokens: parseInt(stats.total_completion_tokens) || 0,
      total_tokens: parseInt(stats.total_tokens) || 0,
      avg_duration_ms: Math.round(parseFloat(stats.avg_duration_ms)) || 0,
      estimated_cost_usd: parseFloat(estimatedCost.toFixed(4)),
      first_interaction: stats.first_interaction,
      last_interaction: stats.last_interaction
    };

  } catch (error) {
    console.error('[Token Analytics] Error fetching contractor usage:', error);
    throw error;
  }
}

/**
 * Get token usage trends over time
 *
 * @param {number} contractorId - Contractor ID (optional - if null, returns system-wide)
 * @param {number} days - Number of days to look back (default: 7)
 * @returns {Promise<Array>} - Daily token usage statistics
 */
async function getTokenUsageTrends(contractorId = null, days = 7) {
  try {
    const whereClause = contractorId
      ? `WHERE contractor_id = $1 AND created_at >= NOW() - INTERVAL '${days} days'`
      : `WHERE created_at >= NOW() - INTERVAL '${days} days'`;

    const params = contractorId ? [contractorId] : [];

    const result = await query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as interaction_count,
        SUM((interaction_data->>'prompt_tokens')::int) FILTER (WHERE interaction_data ? 'prompt_tokens') as prompt_tokens,
        SUM((interaction_data->>'completion_tokens')::int) FILTER (WHERE interaction_data ? 'completion_tokens') as completion_tokens,
        SUM((interaction_data->>'total_tokens')::int) FILTER (WHERE interaction_data ? 'total_tokens') as total_tokens,
        AVG((interaction_data->>'duration_ms')::int) FILTER (WHERE interaction_data ? 'duration_ms') as avg_duration_ms
      FROM ai_interactions
      ${whereClause}
        AND interaction_type LIKE 'ai_concierge_%'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, params);

    return result.rows.map(row => ({
      date: row.date,
      interaction_count: parseInt(row.interaction_count),
      prompt_tokens: parseInt(row.prompt_tokens) || 0,
      completion_tokens: parseInt(row.completion_tokens) || 0,
      total_tokens: parseInt(row.total_tokens) || 0,
      avg_duration_ms: Math.round(parseFloat(row.avg_duration_ms)) || 0
    }));

  } catch (error) {
    console.error('[Token Analytics] Error fetching usage trends:', error);
    throw error;
  }
}

/**
 * Get system-wide token usage statistics
 *
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Promise<object>} - System-wide statistics
 */
async function getSystemTokenUsage(days = 30) {
  try {
    const result = await query(`
      SELECT
        COUNT(DISTINCT contractor_id) as unique_contractors,
        COUNT(*) as total_interactions,
        SUM((interaction_data->>'prompt_tokens')::int) FILTER (WHERE interaction_data ? 'prompt_tokens') as total_prompt_tokens,
        SUM((interaction_data->>'completion_tokens')::int) FILTER (WHERE interaction_data ? 'completion_tokens') as total_completion_tokens,
        SUM((interaction_data->>'total_tokens')::int) FILTER (WHERE interaction_data ? 'total_tokens') as total_tokens,
        AVG((interaction_data->>'duration_ms')::int) FILTER (WHERE interaction_data ? 'duration_ms') as avg_duration_ms
      FROM ai_interactions
      WHERE created_at >= NOW() - INTERVAL '${days} days'
        AND interaction_type LIKE 'ai_concierge_%'
    `);

    const stats = result.rows[0];

    const estimatedCost = (
      (stats.total_prompt_tokens || 0) * 0.00003 +
      (stats.total_completion_tokens || 0) * 0.00006
    );

    return {
      unique_contractors: parseInt(stats.unique_contractors) || 0,
      total_interactions: parseInt(stats.total_interactions) || 0,
      total_prompt_tokens: parseInt(stats.total_prompt_tokens) || 0,
      total_completion_tokens: parseInt(stats.total_completion_tokens) || 0,
      total_tokens: parseInt(stats.total_tokens) || 0,
      avg_duration_ms: Math.round(parseFloat(stats.avg_duration_ms)) || 0,
      estimated_cost_usd: parseFloat(estimatedCost.toFixed(4))
    };

  } catch (error) {
    console.error('[Token Analytics] Error fetching system usage:', error);
    throw error;
  }
}

module.exports = {
  getContractorTokenUsage,
  getTokenUsageTrends,
  getSystemTokenUsage
};
