// DATABASE-CHECKED: pattern_success_tracking, business_growth_patterns verified October 22, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - pattern_success_tracking.contractor_satisfaction: CHECK BETWEEN 1 AND 5
// ================================================================
// VERIFIED FIELD NAMES:
// - pattern_id (NOT patternId)
// - contractor_id (NOT contractorId)
// - goal_id (NOT goalId)
// - goal_completed (NOT goalCompleted)
// - time_to_completion_days (NOT timeToCompletionDays)
// - contractor_satisfaction (NOT contractorSatisfaction)
// - outcome_notes (NOT outcomeNotes)
// - revenue_impact (NOT revenueImpact)
// - what_worked (NOT whatWorked)
// - what_didnt_work (NOT whatDidntWork)
// - completed_at (NOT completedAt)
// - confidence_score (NOT confidenceScore)
// - sample_size (NOT sampleSize)
// - last_recalculated_at (NOT lastRecalculatedAt)
// ================================================================
// VERIFIED DATA TYPES:
// - goal_completed: BOOLEAN (success indicator)
// - time_to_completion_days: INTEGER (duration)
// - contractor_satisfaction: INTEGER (1-5 rating with CHECK constraint)
// - outcome_notes: TEXT (free-form feedback)
// - revenue_impact: VARCHAR ('positive', 'neutral', 'negative', 'too_early')
// - what_worked: TEXT (success factors)
// - what_didnt_work: TEXT (failure factors)
// - confidence_score: NUMERIC(3,2) (0.00-1.00)
// - sample_size: INTEGER (count)
// - last_recalculated_at: TIMESTAMP (tracking recalculation)
// ================================================================

/**
 * Pattern Success Tracking Service
 *
 * Phase 2: Pattern Learning & Intelligence
 * Day 6: Pattern Success Tracking & Learning Loop
 *
 * Tracks pattern effectiveness and continuously improves pattern confidence
 * based on real contractor outcomes. Closes the learning loop.
 *
 * Core Functions:
 * - trackPatternSuccess() - Record pattern outcome when goal completes
 * - collectFeedback() - Gather contractor satisfaction ratings
 * - recalculatePatternConfidence() - Update confidence based on outcomes
 * - identifyUnderperformingPatterns() - Flag patterns with low success
 * - updatePatternLibrary() - Refresh patterns with new data
 */

const { query } = require('../config/database');

/**
 * Track pattern success when a goal is completed
 * @param {Object} trackingData - Success tracking data
 * @returns {Promise<Object>} Tracking record
 */
async function trackPatternSuccess(trackingData) {
  console.log(`[Pattern Success Tracking] Recording success for pattern ${trackingData.pattern_id}`);

  try {
    const {
      pattern_id,
      contractor_id,
      goal_id,
      goal_completed,
      time_to_completion_days,
      contractor_satisfaction,
      outcome_notes,
      revenue_impact,
      what_worked,
      what_didnt_work
    } = trackingData;

    // Validate contractor_satisfaction if provided
    if (contractor_satisfaction !== undefined && contractor_satisfaction !== null) {
      if (contractor_satisfaction < 1 || contractor_satisfaction > 5) {
        throw new Error(`Contractor satisfaction must be between 1 and 5, got: ${contractor_satisfaction}`);
      }
    }

    // Validate revenue_impact if provided
    const validImpacts = ['positive', 'neutral', 'negative', 'too_early'];
    if (revenue_impact && !validImpacts.includes(revenue_impact)) {
      throw new Error(`Invalid revenue_impact: ${revenue_impact}. Must be one of: ${validImpacts.join(', ')}`);
    }

    const result = await query(`
      INSERT INTO pattern_success_tracking (
        pattern_id,
        contractor_id,
        goal_id,
        goal_completed,
        time_to_completion_days,
        contractor_satisfaction,
        outcome_notes,
        revenue_impact,
        what_worked,
        what_didnt_work,
        created_at,
        completed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11)
      RETURNING *;
    `, [
      pattern_id,
      contractor_id,
      goal_id,
      goal_completed,
      time_to_completion_days,
      contractor_satisfaction,
      outcome_notes,
      revenue_impact,
      what_worked,
      what_didnt_work,
      goal_completed ? new Date() : null
    ]);

    console.log(`[Pattern Success Tracking] ✅ Tracking record created (ID: ${result.rows[0].id})`);

    return result.rows[0];

  } catch (error) {
    console.error('[Pattern Success Tracking] Error tracking success:', error);
    throw error;
  }
}

/**
 * Collect contractor feedback for a pattern
 * @param {number} patternId - Pattern ID
 * @param {number} contractorId - Contractor ID
 * @param {number} goalId - Goal ID
 * @param {number} satisfaction - Satisfaction rating (1-5)
 * @param {string} notes - Optional feedback notes
 * @returns {Promise<Object>} Updated tracking record
 */
async function collectFeedback(patternId, contractorId, goalId, satisfaction, notes = null) {
  console.log(`[Pattern Success Tracking] Collecting feedback for pattern ${patternId} from contractor ${contractorId}`);

  try {
    // Validate satisfaction rating
    if (satisfaction < 1 || satisfaction > 5) {
      throw new Error(`Satisfaction must be between 1 and 5, got: ${satisfaction}`);
    }

    // Check if tracking record exists
    const existingResult = await query(`
      SELECT id FROM pattern_success_tracking
      WHERE pattern_id = $1 AND contractor_id = $2 AND goal_id = $3;
    `, [patternId, contractorId, goalId]);

    if (existingResult.rows.length > 0) {
      // Update existing record
      const updateResult = await query(`
        UPDATE pattern_success_tracking
        SET contractor_satisfaction = $4, outcome_notes = $5, updated_at = NOW()
        WHERE id = $1 AND pattern_id = $2 AND contractor_id = $3
        RETURNING *;
      `, [existingResult.rows[0].id, patternId, contractorId, satisfaction, notes]);

      console.log(`[Pattern Success Tracking] ✅ Feedback updated for existing record`);
      return updateResult.rows[0];
    } else {
      // Create new tracking record with feedback
      return await trackPatternSuccess({
        pattern_id: patternId,
        contractor_id: contractorId,
        goal_id: goalId,
        goal_completed: false,
        contractor_satisfaction: satisfaction,
        outcome_notes: notes
      });
    }

  } catch (error) {
    console.error('[Pattern Success Tracking] Error collecting feedback:', error);
    throw error;
  }
}

/**
 * Recalculate pattern confidence based on actual outcomes
 * @param {number} patternId - Pattern ID
 * @returns {Promise<Object>} Updated pattern with new confidence
 */
async function recalculatePatternConfidence(patternId) {
  console.log(`[Pattern Success Tracking] Recalculating confidence for pattern ${patternId}`);

  try {
    // Get success tracking data for this pattern
    const trackingResult = await query(`
      SELECT
        COUNT(*) as total_attempts,
        SUM(CASE WHEN goal_completed = true THEN 1 ELSE 0 END) as successful_completions,
        AVG(contractor_satisfaction) as avg_satisfaction,
        AVG(time_to_completion_days) as avg_completion_days,
        SUM(CASE WHEN revenue_impact = 'positive' THEN 1 ELSE 0 END) as positive_impact_count
      FROM pattern_success_tracking
      WHERE pattern_id = $1;
    `, [patternId]);

    if (trackingResult.rows.length === 0 || trackingResult.rows[0].total_attempts === '0') {
      console.log(`[Pattern Success Tracking] No tracking data for pattern ${patternId}, keeping original confidence`);
      return null;
    }

    const stats = trackingResult.rows[0];
    const totalAttempts = parseInt(stats.total_attempts);
    const successfulCompletions = parseInt(stats.successful_completions || 0);
    const avgSatisfaction = parseFloat(stats.avg_satisfaction || 0);
    const positiveImpactCount = parseInt(stats.positive_impact_count || 0);

    // Calculate success rate
    const successRate = totalAttempts > 0 ? successfulCompletions / totalAttempts : 0;

    // Calculate satisfaction score (0-1 scale)
    const satisfactionScore = avgSatisfaction > 0 ? avgSatisfaction / 5 : 0;

    // Calculate revenue impact score
    const revenueImpactScore = totalAttempts > 0 ? positiveImpactCount / totalAttempts : 0;

    // New confidence formula: weighted combination of success rate, satisfaction, and impact
    // Success rate (50%), Satisfaction (30%), Revenue impact (20%)
    let newConfidence = (successRate * 0.5) + (satisfactionScore * 0.3) + (revenueImpactScore * 0.2);

    // Apply minimum sample size factor (need at least 5 outcomes for full confidence)
    const sampleSizeFactor = Math.min(1.0, totalAttempts / 5);
    newConfidence *= sampleSizeFactor;

    // Cap between 0.00 and 1.00
    newConfidence = Math.max(0, Math.min(1.0, newConfidence));
    newConfidence = Math.round(newConfidence * 100) / 100;

    // Update pattern confidence
    const updateResult = await query(`
      UPDATE business_growth_patterns
      SET confidence_score = $2, last_recalculated_at = NOW(), updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `, [patternId, newConfidence]);

    console.log(`[Pattern Success Tracking] ✅ Confidence updated: ${newConfidence} (success: ${Math.round(successRate * 100)}%, satisfaction: ${avgSatisfaction.toFixed(1)}/5, ${totalAttempts} attempts)`);

    return {
      pattern_id: patternId,
      old_confidence: updateResult.rows[0].confidence_score,
      new_confidence: newConfidence,
      total_attempts: totalAttempts,
      successful_completions: successfulCompletions,
      success_rate: Math.round(successRate * 100) / 100,
      avg_satisfaction: Math.round(avgSatisfaction * 10) / 10,
      positive_impact_count: positiveImpactCount
    };

  } catch (error) {
    console.error('[Pattern Success Tracking] Error recalculating confidence:', error);
    throw error;
  }
}

/**
 * Recalculate confidence for all patterns
 * Should be run periodically (e.g., monthly)
 * @returns {Promise<Array>} Updated patterns
 */
async function recalculateAllPatternConfidence() {
  console.log(`[Pattern Success Tracking] Recalculating confidence for all patterns`);

  try {
    // Get all pattern IDs
    const patternsResult = await query(`SELECT id FROM business_growth_patterns;`);

    const updates = [];

    for (const pattern of patternsResult.rows) {
      const update = await recalculatePatternConfidence(pattern.id);
      if (update) {
        updates.push(update);
      }
    }

    console.log(`[Pattern Success Tracking] ✅ Updated ${updates.length} pattern(s)`);

    return updates;

  } catch (error) {
    console.error('[Pattern Success Tracking] Error recalculating all confidence scores:', error);
    throw error;
  }
}

/**
 * Identify underperforming patterns
 * @param {number} minConfidence - Minimum confidence threshold (default 0.3)
 * @param {number} minAttempts - Minimum attempts to be considered (default 5)
 * @returns {Promise<Array>} Underperforming patterns
 */
async function identifyUnderperformingPatterns(minConfidence = 0.3, minAttempts = 5) {
  console.log(`[Pattern Success Tracking] Identifying underperforming patterns (confidence < ${minConfidence}, attempts >= ${minAttempts})`);

  try {
    const result = await query(`
      SELECT
        bgp.id,
        bgp.pattern_name,
        bgp.confidence_score,
        bgp.sample_size,
        COUNT(pst.id) as tracking_count,
        SUM(CASE WHEN pst.goal_completed = true THEN 1 ELSE 0 END) as successful_count,
        AVG(pst.contractor_satisfaction) as avg_satisfaction
      FROM business_growth_patterns bgp
      LEFT JOIN pattern_success_tracking pst ON bgp.id = pst.pattern_id
      GROUP BY bgp.id, bgp.pattern_name, bgp.confidence_score, bgp.sample_size
      HAVING COUNT(pst.id) >= $2 AND bgp.confidence_score < $1
      ORDER BY bgp.confidence_score ASC;
    `, [minConfidence, minAttempts]);

    console.log(`[Pattern Success Tracking] Found ${result.rows.length} underperforming pattern(s)`);

    return result.rows.map(row => ({
      pattern_id: row.id,
      pattern_name: row.pattern_name,
      confidence_score: parseFloat(row.confidence_score),
      sample_size: row.sample_size,
      tracking_count: parseInt(row.tracking_count),
      successful_count: parseInt(row.successful_count || 0),
      success_rate: parseInt(row.tracking_count) > 0
        ? Math.round((parseInt(row.successful_count || 0) / parseInt(row.tracking_count)) * 100) / 100
        : 0,
      avg_satisfaction: row.avg_satisfaction ? Math.round(parseFloat(row.avg_satisfaction) * 10) / 10 : null
    }));

  } catch (error) {
    console.error('[Pattern Success Tracking] Error identifying underperforming patterns:', error);
    throw error;
  }
}

/**
 * Get pattern success statistics
 * @param {number} patternId - Pattern ID
 * @returns {Promise<Object>} Success statistics
 */
async function getPatternSuccessStats(patternId) {
  console.log(`[Pattern Success Tracking] Getting success stats for pattern ${patternId}`);

  try {
    const result = await query(`
      SELECT
        COUNT(*) as total_attempts,
        SUM(CASE WHEN goal_completed = true THEN 1 ELSE 0 END) as successful_completions,
        AVG(time_to_completion_days) as avg_completion_days,
        AVG(contractor_satisfaction) as avg_satisfaction,
        SUM(CASE WHEN revenue_impact = 'positive' THEN 1 ELSE 0 END) as positive_impact,
        SUM(CASE WHEN revenue_impact = 'neutral' THEN 1 ELSE 0 END) as neutral_impact,
        SUM(CASE WHEN revenue_impact = 'negative' THEN 1 ELSE 0 END) as negative_impact,
        SUM(CASE WHEN revenue_impact = 'too_early' THEN 1 ELSE 0 END) as too_early
      FROM pattern_success_tracking
      WHERE pattern_id = $1;
    `, [patternId]);

    if (result.rows.length === 0) {
      return {
        pattern_id: patternId,
        has_data: false
      };
    }

    const stats = result.rows[0];
    const totalAttempts = parseInt(stats.total_attempts);
    const successfulCompletions = parseInt(stats.successful_completions || 0);

    return {
      pattern_id: patternId,
      has_data: totalAttempts > 0,
      total_attempts: totalAttempts,
      successful_completions: successfulCompletions,
      success_rate: totalAttempts > 0 ? Math.round((successfulCompletions / totalAttempts) * 100) / 100 : 0,
      avg_completion_days: stats.avg_completion_days ? Math.round(parseFloat(stats.avg_completion_days)) : null,
      avg_satisfaction: stats.avg_satisfaction ? Math.round(parseFloat(stats.avg_satisfaction) * 10) / 10 : null,
      revenue_impact: {
        positive: parseInt(stats.positive_impact || 0),
        neutral: parseInt(stats.neutral_impact || 0),
        negative: parseInt(stats.negative_impact || 0),
        too_early: parseInt(stats.too_early || 0)
      }
    };

  } catch (error) {
    console.error('[Pattern Success Tracking] Error getting success stats:', error);
    throw error;
  }
}

/**
 * Update pattern library with new contractor data
 * Identifies new patterns and updates existing ones
 * Should be run monthly
 * @returns {Promise<Object>} Update summary
 */
async function updatePatternLibrary() {
  console.log(`[Pattern Success Tracking] Updating pattern library with new data`);

  try {
    const summary = {
      patterns_recalculated: 0,
      patterns_flagged: 0,
      timestamp: new Date()
    };

    // Step 1: Recalculate all pattern confidence scores
    const updates = await recalculateAllPatternConfidence();
    summary.patterns_recalculated = updates.length;

    // Step 2: Identify underperforming patterns
    const underperforming = await identifyUnderperformingPatterns(0.3, 5);
    summary.patterns_flagged = underperforming.length;

    console.log(`[Pattern Success Tracking] ✅ Library update complete: ${summary.patterns_recalculated} recalculated, ${summary.patterns_flagged} flagged`);

    return {
      ...summary,
      underperforming_patterns: underperforming
    };

  } catch (error) {
    console.error('[Pattern Success Tracking] Error updating pattern library:', error);
    throw error;
  }
}

/**
 * Mark pattern result in contractor_pattern_matches
 * Updates the pattern_result field when outcome is known
 * @param {number} matchId - Match ID from contractor_pattern_matches
 * @param {string} result - Result ('successful', 'unsuccessful', 'in_progress')
 * @returns {Promise<Object>} Updated match
 */
async function updatePatternMatchResult(matchId, result) {
  console.log(`[Pattern Success Tracking] Updating match ${matchId} result to: ${result}`);

  try {
    const validResults = ['pending', 'successful', 'unsuccessful', 'in_progress'];
    if (!validResults.includes(result)) {
      throw new Error(`Invalid result: ${result}. Must be one of: ${validResults.join(', ')}`);
    }

    const updateResult = await query(`
      UPDATE contractor_pattern_matches
      SET pattern_result = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `, [matchId, result]);

    if (updateResult.rows.length === 0) {
      throw new Error(`Match ${matchId} not found`);
    }

    console.log(`[Pattern Success Tracking] ✅ Match result updated to: ${result}`);

    return updateResult.rows[0];

  } catch (error) {
    console.error('[Pattern Success Tracking] Error updating match result:', error);
    throw error;
  }
}

module.exports = {
  trackPatternSuccess,
  collectFeedback,
  recalculatePatternConfidence,
  recalculateAllPatternConfidence,
  identifyUnderperformingPatterns,
  getPatternSuccessStats,
  updatePatternLibrary,
  updatePatternMatchResult
};
