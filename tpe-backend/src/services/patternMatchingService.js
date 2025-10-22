// DATABASE-CHECKED: contractor_pattern_matches, business_growth_patterns, contractors verified October 22, 2025
// ================================================================
// VERIFIED CONSTRAINTS:
// - contractor_pattern_matches.match_score: CHECK BETWEEN 0 AND 1 (NUMERIC)
// ================================================================
// VERIFIED FIELD NAMES:
// - contractor_id (NOT contractorId)
// - pattern_id (NOT patternId)
// - match_score (NOT matchScore)
// - match_reason (NOT matchReason)
// - pattern_result (NOT patternResult)
// - goals_generated (NOT goalsGenerated)
// - checklist_items_generated (NOT checklistItemsGenerated)
// - pattern_applied_at (NOT patternAppliedAt)
// ================================================================
// VERIFIED DATA TYPES:
// - match_score: NUMERIC (0.00-1.00, CHECK constraint enforced)
// - match_reason: TEXT (human-readable explanation)
// - pattern_result: VARCHAR(50) (use: 'pending', 'successful', 'unsuccessful', 'in_progress')
// - goals_generated: INTEGER (count)
// - checklist_items_generated: INTEGER (count)
// - pattern_applied_at: TIMESTAMP
// ================================================================
// PATTERN MATCHING OPERATIONS:
// - findMatchingPatterns: Query patterns WHERE revenue_tier matches
// - calculateMatchScore: Revenue tier (30%) + Focus areas (40%) + Team size (15%) + Stage (15%)
// - applyPatternToContractor: INSERT with match_score 0.00-1.00
// - rankPatternsByRelevance: ORDER BY match_score DESC
// ================================================================

/**
 * Pattern Matching Service
 *
 * Phase 2: Pattern Learning & Intelligence
 * Day 2: Pattern Matching Engine
 *
 * Matches contractors to relevant patterns based on their profile.
 * Calculates match scores using weighted algorithm (60/20/10/10) and stores matches
 * in contractor_pattern_matches table.
 *
 * Core Functions:
 * - findMatchingPatterns(contractorId) - Find patterns contractor fits
 * - calculateMatchScore() - Score pattern fit (0.00-1.00)
 * - rankPatternsByRelevance() - Sort patterns by match quality
 * - applyPatternToContractor() - Link pattern to contractor
 */

const { query } = require('../config/database');

/**
 * Match scoring weights
 * Revenue tier: 30%, Focus areas: 40%, Team size: 15%, Current stage: 15%
 */
const MATCH_WEIGHTS = {
  revenueTier: 0.30,
  focusAreas: 0.40,
  teamSize: 0.15,
  currentStage: 0.15
};

/**
 * Find matching patterns for a contractor
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Array>} Matched patterns with scores
 */
async function findMatchingPatterns(contractorId) {
  console.log(`[Pattern Matching] Finding patterns for contractor ${contractorId}`);

  try {
    // Get contractor profile
    const contractorResult = await query(`
      SELECT
        id,
        revenue_tier,
        team_size,
        focus_areas,
        current_stage
      FROM contractors
      WHERE id = $1;
    `, [contractorId]);

    if (contractorResult.rows.length === 0) {
      console.log(`[Pattern Matching] Contractor ${contractorId} not found`);
      return [];
    }

    const contractor = contractorResult.rows[0];

    // Get all patterns with minimum sample size
    const patternsResult = await query(`
      SELECT *
      FROM business_growth_patterns
      WHERE sample_size >= 5
      ORDER BY confidence_score DESC;
    `);

    const patterns = patternsResult.rows;

    if (patterns.length === 0) {
      console.log(`[Pattern Matching] No patterns found in database`);
      return [];
    }

    console.log(`[Pattern Matching] Evaluating ${patterns.length} pattern(s)`);

    // Calculate match score for each pattern
    const matchedPatterns = [];

    for (const pattern of patterns) {
      const matchScore = calculateMatchScore(contractor, pattern);

      // Only include patterns with match score >= 0.30 (30%)
      if (matchScore >= 0.30) {
        const matchReason = generateMatchReason(contractor, pattern, matchScore);

        matchedPatterns.push({
          pattern_id: pattern.id,
          pattern_name: pattern.pattern_name,
          pattern_description: pattern.pattern_description,
          from_revenue_tier: pattern.from_revenue_tier,
          to_revenue_tier: pattern.to_revenue_tier,
          sample_size: pattern.sample_size,
          confidence_score: pattern.confidence_score,
          match_score: matchScore,
          match_reason: matchReason,
          common_focus_areas: pattern.common_focus_areas,
          common_milestones: pattern.common_milestones,
          avg_time_to_level_up_months: pattern.avg_time_to_level_up_months
        });
      }
    }

    // Sort by match score (highest first)
    matchedPatterns.sort((a, b) => b.match_score - a.match_score);

    console.log(`[Pattern Matching] Found ${matchedPatterns.length} matching pattern(s)`);

    return matchedPatterns;

  } catch (error) {
    console.error('[Pattern Matching] Error finding patterns:', error);
    throw error;
  }
}

/**
 * Calculate match score between contractor and pattern
 * @param {Object} contractor - Contractor profile
 * @param {Object} pattern - Pattern data
 * @returns {number} Match score 0.00-1.00
 */
function calculateMatchScore(contractor, pattern) {
  let totalScore = 0;

  // 1. Revenue Tier Match (30% weight)
  const revenueTierScore = calculateRevenueTierScore(contractor.revenue_tier, pattern.from_revenue_tier);
  totalScore += revenueTierScore * MATCH_WEIGHTS.revenueTier;

  // 2. Focus Areas Overlap (40% weight)
  const focusAreasScore = calculateFocusAreasScore(contractor.focus_areas, pattern.common_focus_areas);
  totalScore += focusAreasScore * MATCH_WEIGHTS.focusAreas;

  // 3. Team Size Similarity (15% weight)
  const teamSizeScore = calculateTeamSizeScore(contractor.team_size, pattern);
  totalScore += teamSizeScore * MATCH_WEIGHTS.teamSize;

  // 4. Current Stage Alignment (15% weight)
  const currentStageScore = calculateCurrentStageScore(contractor.current_stage, pattern);
  totalScore += currentStageScore * MATCH_WEIGHTS.currentStage;

  // Ensure score is between 0.00 and 1.00
  const finalScore = Math.min(1.0, Math.max(0.0, totalScore));

  // Round to 2 decimal places
  return Math.round(finalScore * 100) / 100;
}

/**
 * Calculate revenue tier match score
 * @param {string} contractorTier - Contractor's revenue tier
 * @param {string} patternFromTier - Pattern's from_revenue_tier
 * @returns {number} Score 0.00-1.00
 */
function calculateRevenueTierScore(contractorTier, patternFromTier) {
  if (!contractorTier) return 0;

  // Exact match
  if (contractorTier === patternFromTier) {
    return 1.0;
  }

  // Define tier progression
  const tiers = [
    '0_5_million',
    '5_10_million',
    '11_20_million',
    '21_30_million',
    '31_50_million',
    '51_75_million',
    '76_100_million',
    '101_150_million',
    '151_300_million',
    '300_plus_million'
  ];

  const contractorIndex = tiers.indexOf(contractorTier);
  const patternIndex = tiers.indexOf(patternFromTier);

  if (contractorIndex === -1 || patternIndex === -1) {
    return 0;
  }

  // Calculate distance (closer tiers = higher score)
  const distance = Math.abs(contractorIndex - patternIndex);

  if (distance === 1) return 0.7; // Adjacent tier
  if (distance === 2) return 0.4; // 2 tiers away
  if (distance === 3) return 0.2; // 3 tiers away

  return 0; // Too far apart
}

/**
 * Calculate focus areas overlap score
 * @param {string|Array} contractorFocusAreas - Contractor's focus areas
 * @param {Array} patternFocusAreas - Pattern's common_focus_areas
 * @returns {number} Score 0.00-1.00
 */
function calculateFocusAreasScore(contractorFocusAreas, patternFocusAreas) {
  if (!contractorFocusAreas || !patternFocusAreas || patternFocusAreas.length === 0) {
    return 0;
  }

  // Parse contractor focus areas
  let contractorAreas = [];
  if (typeof contractorFocusAreas === 'string') {
    // CSV format
    contractorAreas = contractorFocusAreas.split(',').map(a => a.trim());
  } else if (Array.isArray(contractorFocusAreas)) {
    contractorAreas = contractorFocusAreas;
  }

  if (contractorAreas.length === 0) {
    return 0;
  }

  // Count overlapping focus areas
  let overlapCount = 0;
  for (const area of contractorAreas) {
    if (patternFocusAreas.includes(area)) {
      overlapCount++;
    }
  }

  // Score based on overlap percentage
  const overlapPercentage = overlapCount / Math.max(contractorAreas.length, patternFocusAreas.length);

  return overlapPercentage;
}

/**
 * Calculate team size similarity score
 * @param {string} contractorTeamSize - Contractor's team size
 * @param {Object} pattern - Pattern data
 * @returns {number} Score 0.00-1.00
 */
function calculateTeamSizeScore(contractorTeamSize, pattern) {
  if (!contractorTeamSize) return 0.5; // Neutral if unknown

  // Extract team size from success indicators
  const commonTeamSize = pattern.success_indicators?.common_team_size;

  if (!commonTeamSize) {
    return 0.5; // Neutral if pattern has no team size data
  }

  // Exact match
  if (contractorTeamSize === commonTeamSize) {
    return 1.0;
  }

  // Adjacent team sizes get partial credit
  const teamSizes = ['1_10', '11_50', '51_200', '201_plus'];
  const contractorIndex = teamSizes.indexOf(contractorTeamSize);
  const patternIndex = teamSizes.indexOf(commonTeamSize);

  if (contractorIndex === -1 || patternIndex === -1) {
    return 0.5; // Neutral
  }

  const distance = Math.abs(contractorIndex - patternIndex);

  if (distance === 1) return 0.7; // Adjacent
  if (distance === 2) return 0.4; // 2 away

  return 0.2; // Further apart
}

/**
 * Calculate current stage alignment score
 * @param {string} contractorStage - Contractor's current stage
 * @param {Object} pattern - Pattern data
 * @returns {number} Score 0.00-1.00
 */
function calculateCurrentStageScore(contractorStage, pattern) {
  if (!contractorStage) return 0.5; // Neutral if unknown

  // Map stages to growth trajectory
  const stageMap = {
    'startup': 1,
    'growth': 2,
    'scaling': 3,
    'mature': 4,
    'enterprise': 5
  };

  const contractorStageLevel = stageMap[contractorStage?.toLowerCase()] || 0;

  if (contractorStageLevel === 0) {
    return 0.5; // Neutral if unknown stage
  }

  // Growth patterns are most relevant for contractors in growth/scaling stages
  if (pattern.pattern_type === 'revenue_growth') {
    if (contractorStageLevel >= 2 && contractorStageLevel <= 3) {
      return 1.0; // Perfect for growth/scaling
    } else if (contractorStageLevel === 1 || contractorStageLevel === 4) {
      return 0.7; // Good for startup/mature
    }
  }

  return 0.5; // Neutral
}

/**
 * Generate human-readable match reason
 * @param {Object} contractor - Contractor profile
 * @param {Object} pattern - Pattern data
 * @param {number} matchScore - Calculated match score
 * @returns {string} Match reason
 */
function generateMatchReason(contractor, pattern, matchScore) {
  const reasons = [];

  // Revenue tier
  if (contractor.revenue_tier === pattern.from_revenue_tier) {
    reasons.push('Revenue tier matches exactly');
  } else if (contractor.revenue_tier) {
    reasons.push('Revenue tier is similar');
  }

  // Focus areas
  let contractorAreas = [];
  if (typeof contractor.focus_areas === 'string') {
    contractorAreas = contractor.focus_areas.split(',').map(a => a.trim());
  } else if (Array.isArray(contractor.focus_areas)) {
    contractorAreas = contractor.focus_areas;
  }

  if (contractorAreas.length > 0 && pattern.common_focus_areas && pattern.common_focus_areas.length > 0) {
    const overlaps = contractorAreas.filter(area => pattern.common_focus_areas.includes(area));
    if (overlaps.length > 0) {
      reasons.push(`${overlaps.length} focus area(s) align: ${overlaps.join(', ')}`);
    }
  }

  // Confidence
  if (pattern.confidence_score >= 0.8) {
    reasons.push(`High confidence pattern (${pattern.sample_size} contractors)`);
  } else if (pattern.confidence_score >= 0.5) {
    reasons.push(`Medium confidence pattern (${pattern.sample_size} contractors)`);
  }

  if (reasons.length === 0) {
    return `${Math.round(matchScore * 100)}% match based on profile similarity`;
  }

  return reasons.join('; ');
}

/**
 * Rank patterns by relevance
 * @param {Array} patterns - Matched patterns
 * @returns {Array} Patterns sorted by match score and confidence
 */
function rankPatternsByRelevance(patterns) {
  return patterns.sort((a, b) => {
    // Primary sort: match score
    if (b.match_score !== a.match_score) {
      return b.match_score - a.match_score;
    }

    // Secondary sort: confidence score
    if (b.confidence_score !== a.confidence_score) {
      return b.confidence_score - a.confidence_score;
    }

    // Tertiary sort: sample size
    return b.sample_size - a.sample_size;
  });
}

/**
 * Apply pattern to contractor (store match in database)
 * @param {number} contractorId - Contractor ID
 * @param {number} patternId - Pattern ID
 * @param {number} matchScore - Match score
 * @param {string} matchReason - Match reason
 * @returns {Promise<Object>} Created match record
 */
async function applyPatternToContractor(contractorId, patternId, matchScore, matchReason) {
  console.log(`[Pattern Matching] Applying pattern ${patternId} to contractor ${contractorId} (score: ${matchScore})`);

  try {
    // Check if match already exists
    const existingCheck = await query(`
      SELECT id
      FROM contractor_pattern_matches
      WHERE contractor_id = $1 AND pattern_id = $2;
    `, [contractorId, patternId]);

    if (existingCheck.rows.length > 0) {
      console.log(`[Pattern Matching] Match already exists (ID: ${existingCheck.rows[0].id}), updating`);

      // Update existing match
      const updateResult = await query(`
        UPDATE contractor_pattern_matches
        SET
          match_score = $3,
          match_reason = $4,
          updated_at = NOW()
        WHERE contractor_id = $1 AND pattern_id = $2
        RETURNING *;
      `, [contractorId, patternId, matchScore, matchReason]);

      console.log(`[Pattern Matching] ✅ Match updated (ID: ${updateResult.rows[0].id})`);
      return updateResult.rows[0];
    }

    // Insert new match
    const result = await query(`
      INSERT INTO contractor_pattern_matches (
        contractor_id,
        pattern_id,
        match_score,
        match_reason,
        pattern_result
      ) VALUES ($1, $2, $3, $4, 'pending')
      RETURNING *;
    `, [contractorId, patternId, matchScore, matchReason]);

    console.log(`[Pattern Matching] ✅ Match created (ID: ${result.rows[0].id})`);

    return result.rows[0];

  } catch (error) {
    console.error('[Pattern Matching] Error applying pattern:', error);
    throw error;
  }
}

/**
 * Get contractor's pattern matches
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Array>} Contractor's pattern matches with pattern details
 */
async function getContractorPatternMatches(contractorId) {
  try {
    const result = await query(`
      SELECT
        cpm.*,
        bgp.pattern_name,
        bgp.pattern_description,
        bgp.from_revenue_tier,
        bgp.to_revenue_tier,
        bgp.common_focus_areas,
        bgp.common_milestones,
        bgp.confidence_score,
        bgp.sample_size
      FROM contractor_pattern_matches cpm
      JOIN business_growth_patterns bgp ON cpm.pattern_id = bgp.id
      WHERE cpm.contractor_id = $1
      ORDER BY cpm.match_score DESC, bgp.confidence_score DESC;
    `, [contractorId]);

    return result.rows;

  } catch (error) {
    console.error('[Pattern Matching] Error fetching contractor matches:', error);
    throw error;
  }
}

/**
 * Update pattern result (success tracking)
 * @param {number} matchId - contractor_pattern_matches ID
 * @param {string} result - Result status ('pending', 'successful', 'unsuccessful', 'in_progress')
 * @param {number} goalsGenerated - Number of goals generated
 * @param {number} checklistItemsGenerated - Number of checklist items generated
 * @returns {Promise<Object>} Updated match record
 */
async function updatePatternResult(matchId, result, goalsGenerated = 0, checklistItemsGenerated = 0) {
  try {
    const updateResult = await query(`
      UPDATE contractor_pattern_matches
      SET
        pattern_result = $2,
        goals_generated = $3,
        checklist_items_generated = $4,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `, [matchId, result, goalsGenerated, checklistItemsGenerated]);

    if (updateResult.rows.length > 0) {
      console.log(`[Pattern Matching] ✅ Pattern result updated (match ID: ${matchId}, result: ${result})`);
    }

    return updateResult.rows[0];

  } catch (error) {
    console.error('[Pattern Matching] Error updating pattern result:', error);
    throw error;
  }
}

module.exports = {
  findMatchingPatterns,
  calculateMatchScore,
  rankPatternsByRelevance,
  applyPatternToContractor,
  getContractorPatternMatches,
  updatePatternResult,
  MATCH_WEIGHTS
};
