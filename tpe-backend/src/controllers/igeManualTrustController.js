// ============================================================================
// DATABASE-CHECKED: ai_trust_indicators
// DATE: October 24, 2025
// REFERENCE: PHASE-3A-FIELD-REFERENCE.md
// ============================================================================

const { query } = require('../config/database');

/**
 * Manually adjust a contractor's trust score
 * POST /api/ige-monitor/contractor/:id/trust-adjustment
 */
async function adjustTrust(req, res) {
  try {
    const { id: contractor_id } = req.params;
    const {
      adjustment,      // REQUIRED: +/- value to add to current score
      reason,          // REQUIRED: why the adjustment is being made
      context_data
    } = req.body;

    // Validate required fields
    if (adjustment === undefined || !reason) {
      return res.status(400).json({
        success: false,
        error: 'adjustment and reason are required'
      });
    }

    // Validate adjustment is a number
    if (typeof adjustment !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'adjustment must be a number'
      });
    }

    // Verify contractor exists
    const contractorCheck = await query(
      'SELECT id, first_name, last_name FROM contractors WHERE id = $1',
      [contractor_id]
    );

    if (contractorCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Contractor not found'
      });
    }

    // Get current trust score (latest record for this contractor)
    const currentTrustQuery = `
      SELECT cumulative_trust_score
      FROM ai_trust_indicators
      WHERE contractor_id = $1
      ORDER BY recorded_at DESC
      LIMIT 1
    `;

    const currentTrustResult = await query(currentTrustQuery, [contractor_id]);
    const currentScore = currentTrustResult.rows.length > 0
      ? parseFloat(currentTrustResult.rows[0].cumulative_trust_score)
      : 50;  // Default starting score if no history

    // Calculate new score
    const newScore = Math.max(0, Math.min(100, currentScore + adjustment));  // Clamp between 0-100

    // Insert new trust indicator with EXACT field names from database
    const insertQuery = `
      INSERT INTO ai_trust_indicators (
        contractor_id,
        indicator_type,
        indicator_description,
        context_data,
        confidence_impact,
        cumulative_trust_score
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    // Determine indicator_type based on adjustment direction
    const indicatorType = adjustment >= 0 ? 'positive_feedback' : 'negative_feedback';

    const values = [
      contractor_id,
      indicatorType,        // indicator_type: positive_feedback or negative_feedback
      reason,               // indicator_description
      context_data ? JSON.stringify(context_data) : null,
      adjustment,           // confidence_impact (the delta)
      newScore             // cumulative_trust_score (the new total)
    ];

    const result = await query(insertQuery, values);

    res.json({
      success: true,
      trustIndicator: result.rows[0],
      previousScore: currentScore,
      adjustment: adjustment,
      newScore: newScore,
      message: `Trust score adjusted from ${currentScore} to ${newScore} (${adjustment >= 0 ? '+' : ''}${adjustment})`
    });

  } catch (error) {
    console.error('Error adjusting trust score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to adjust trust score',
      details: error.message
    });
  }
}

/**
 * Get trust score history for a contractor
 * GET /api/ige-monitor/contractor/:id/trust-history
 */
async function getTrustHistory(req, res) {
  try {
    const { id: contractor_id } = req.params;
    const { limit = 50 } = req.query;

    const historyQuery = `
      SELECT
        id,
        indicator_type,
        indicator_description,
        confidence_impact,
        cumulative_trust_score,
        recorded_at,
        created_at
      FROM ai_trust_indicators
      WHERE contractor_id = $1
      ORDER BY recorded_at DESC
      LIMIT $2
    `;

    const result = await query(historyQuery, [contractor_id, limit]);

    res.json({
      success: true,
      history: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('Error fetching trust history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trust history',
      details: error.message
    });
  }
}

module.exports = {
  adjustTrust,
  getTrustHistory
};
