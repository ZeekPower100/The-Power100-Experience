// DATABASE-CHECKED: strategic_partners columns verified October 29, 2025
// ================================================================
// PCR Calculation Service
// ================================================================
// Purpose: Calculate PowerConfidence Rating scores for strategic partners
// Formula: Final PCR = (Base PCR × 0.80) + (20 × Multiplier / 5)
// ================================================================

const { query } = require('../config/database');
const momentumService = require('./momentumCalculationService');

/**
 * Profile Completion Weights (totals 100 points)
 */
const PROFILE_WEIGHTS = {
  customer_feedbacks: 25,      // 5 customer feedbacks (HIGH - transparency)
  employee_feedbacks: 20,      // 5 employee feedbacks (HIGH - culture proof)
  demo_videos: 20,             // 5 demo videos (HIGH - process proof)
  key_differentiators: 10,     // Key differentiators (MEDIUM)
  company_description: 10,     // Company description (MEDIUM)
  unique_value: 5,             // Unique value proposition (LOW)
  contacts: 5,                 // Multiple contact points (LOW)
  additional: 5                // Additional profile elements (LOW)
};

/**
 * Quarterly Feedback Weights (totals 100%)
 */
const QUARTERLY_WEIGHTS = {
  customer_satisfaction: 0.40,  // 40%
  nps: 0.25,                    // 25%
  custom_metrics: 0.25,         // 25%
  culture: 0.10                 // 10%
};

/**
 * Payment Tier Multipliers
 */
const PAYMENT_MULTIPLIERS = {
  free: 1.5,
  gold: 2.5,      // "Power Gold" on frontend ($3,600/mo)
  platinum: 5.0   // "Power Platinum" on frontend ($6,000/mo)
};

/**
 * Calculate Profile Completion Score (0-100)
 *
 * @param {Object} partner - Partner record from database
 * @returns {number} Score from 0-100
 */
function calculateProfileCompletionScore(partner) {
  let score = 0;

  // Customer Feedbacks (25 points max) - DATABASE FIELD: customer_feedback_count
  const customerCount = Math.min(partner.customer_feedback_count || 0, 5);
  score += (customerCount / 5) * PROFILE_WEIGHTS.customer_feedbacks;

  // Employee Feedbacks (20 points max) - DATABASE FIELD: employee_feedback_count
  const employeeCount = Math.min(partner.employee_feedback_count || 0, 5);
  score += (employeeCount / 5) * PROFILE_WEIGHTS.employee_feedbacks;

  // Demo Videos (20 points max) - DATABASE FIELD: demo_videos_count
  const videoCount = Math.min(partner.demo_videos_count || 0, 5);
  score += (videoCount / 5) * PROFILE_WEIGHTS.demo_videos;

  // Key Differentiators (10 points) - DATABASE FIELD: key_differentiators
  if (partner.key_differentiators && partner.key_differentiators.length > 50) {
    score += PROFILE_WEIGHTS.key_differentiators;
  }

  // Company Description (10 points) - DATABASE FIELD: company_description
  if (partner.company_description && partner.company_description.length > 100) {
    score += PROFILE_WEIGHTS.company_description;
  }

  // Unique Value Proposition (5 points) - DATABASE FIELD: unique_value
  if (partner.unique_value && partner.unique_value.length > 50) {
    score += PROFILE_WEIGHTS.unique_value;
  }

  // Multiple Contacts (5 points) - DATABASE FIELDS: various contact fields
  let contactCount = 0;
  if (partner.primary_email) contactCount++;
  if (partner.ceo_contact_email) contactCount++;
  if (partner.cx_contact_email) contactCount++;
  if (partner.sales_contact_email) contactCount++;
  if (contactCount >= 3) {
    score += PROFILE_WEIGHTS.contacts;
  }

  // Additional Elements (5 points) - testimonials, success stories, etc.
  let additionalCount = 0;
  if (partner.testimonials && partner.testimonials.length > 50) additionalCount++;
  if (partner.success_stories && partner.success_stories.length > 50) additionalCount++;
  if (partner.client_demos && partner.client_demos.length > 50) additionalCount++;
  if (additionalCount >= 2) {
    score += PROFILE_WEIGHTS.additional;
  }

  return Math.round(score);
}

/**
 * Calculate Quarterly Feedback Score (0-100)
 *
 * NOTE: This is a PLACEHOLDER until quarterly feedback system is built
 * For now, returns default 50 or existing average_satisfaction if available
 *
 * @param {Object} partner - Partner record from database
 * @returns {number} Score from 0-100
 */
function calculateQuarterlyFeedbackScore(partner) {
  // DATABASE FIELD: has_quarterly_data
  if (!partner.has_quarterly_data) {
    return 50.0;  // Default until first quarterly feedback
  }

  // DATABASE FIELD: quarterly_feedback_score
  if (partner.quarterly_feedback_score) {
    return parseFloat(partner.quarterly_feedback_score);
  }

  // Fallback to average_satisfaction if available
  // DATABASE FIELD: average_satisfaction
  if (partner.average_satisfaction) {
    return parseFloat(partner.average_satisfaction) * 100;  // Assumes 0-1 scale
  }

  return 50.0;  // Default
}

/**
 * Calculate Base PCR Score
 * Formula: (Profile Completion × 30%) + (Quarterly Feedback × 70%)
 *
 * @param {number} profileScore - Profile completion score (0-100)
 * @param {number} quarterlyScore - Quarterly feedback score (0-100)
 * @returns {number} Base PCR score (0-100)
 */
function calculateBasePCR(profileScore, quarterlyScore) {
  const base = (profileScore * 0.30) + (quarterlyScore * 0.70);
  return Math.round(base * 100) / 100;  // Round to 2 decimals
}

/**
 * Calculate Final PCR Score
 * Formula: (Base PCR × 0.80) + (20 × Multiplier / 5)
 *
 * @param {number} basePCR - Base PCR score (0-100)
 * @param {string} engagementTier - 'free', 'verified', or 'gold'
 * @returns {number} Final PCR score (0-105)
 */
function calculateFinalPCR(basePCR, engagementTier) {
  const multiplier = PAYMENT_MULTIPLIERS[engagementTier] || 1.5;
  const final = (basePCR * 0.80) + (20 * multiplier / 5);
  return Math.round(final * 100) / 100;  // Round to 2 decimals
}

/**
 * Calculate and update PCR scores for a partner
 *
 * @param {number} partnerId - Partner ID
 * @returns {Object} Calculated scores and updated partner record
 */
async function calculatePartnerPCR(partnerId) {
  console.log(`[PCR Calculation] Starting for partner ${partnerId}`);

  // Fetch partner record with all necessary fields
  // DATABASE FIELDS: All verified against strategic_partners schema
  const result = await query(`
    SELECT
      id,
      company_name,
      demo_videos_count,
      employee_feedback_count,
      customer_feedback_count,
      key_differentiators,
      company_description,
      unique_value,
      primary_email,
      ceo_contact_email,
      cx_contact_email,
      sales_contact_email,
      testimonials,
      success_stories,
      client_demos,
      has_quarterly_data,
      quarterly_feedback_score,
      average_satisfaction,
      engagement_tier,
      payment_multiplier
    FROM strategic_partners
    WHERE id = $1
  `, [partnerId]);

  if (result.rows.length === 0) {
    throw new Error(`Partner ${partnerId} not found`);
  }

  const partner = result.rows[0];

  // Step 1: Calculate Profile Completion Score
  const profileScore = calculateProfileCompletionScore(partner);
  console.log(`[PCR Calculation] Profile score: ${profileScore}/100`);

  // Step 2: Calculate Quarterly Feedback Score
  const quarterlyScore = calculateQuarterlyFeedbackScore(partner);
  console.log(`[PCR Calculation] Quarterly score: ${quarterlyScore}/100`);

  // Step 3: Calculate Base PCR
  const basePCR = calculateBasePCR(profileScore, quarterlyScore);
  console.log(`[PCR Calculation] Base PCR: ${basePCR}/100`);

  // Step 4: Calculate Final PCR with multiplier
  const finalPCR = calculateFinalPCR(basePCR, partner.engagement_tier);
  console.log(`[PCR Calculation] Final PCR (before momentum): ${finalPCR}/105 (tier: ${partner.engagement_tier})`);

  // ⭐ Phase 2: Momentum Integration
  // Update momentum modifier based on quarterly history
  const momentumData = await momentumService.updatePartnerMomentum(partnerId);

  // Apply momentum to final PCR
  const finalPCRWithMomentum = momentumService.applyMomentumToPCR(
    finalPCR,
    momentumData.momentumModifier
  );

  console.log(`[PCR Calculation] Momentum modifier: ${momentumData.momentumModifier > 0 ? '+' : ''}${momentumData.momentumModifier}`);
  console.log(`[PCR Calculation] Final PCR (with momentum): ${finalPCRWithMomentum}/105`);

  // Update partner record (use finalPCRWithMomentum instead of finalPCR)
  // DATABASE FIELDS: profile_completion_score, base_pcr_score, final_pcr_score, pcr_last_calculated
  await query(`
    UPDATE strategic_partners
    SET
      profile_completion_score = $1,
      base_pcr_score = $2,
      final_pcr_score = $3,
      pcr_last_calculated = NOW(),
      updated_at = NOW()
    WHERE id = $4
  `, [profileScore, basePCR, finalPCRWithMomentum, partnerId]);

  console.log(`[PCR Calculation] ✅ Scores updated for partner ${partnerId}`);

  return {
    partnerId,
    companyName: partner.company_name,
    profileScore,
    quarterlyScore,
    basePCR,
    finalPCR: finalPCRWithMomentum,  // Return momentum-adjusted score
    momentumModifier: momentumData.momentumModifier,
    performanceTrend: momentumData.performanceTrend,
    engagementTier: partner.engagement_tier,
    multiplier: PAYMENT_MULTIPLIERS[partner.engagement_tier]
  };
}

/**
 * Recalculate PCR scores for all active partners
 *
 * @returns {Object} Summary of recalculation results
 */
async function recalculateAllPCR() {
  console.log('[PCR Calculation] Starting bulk recalculation...');

  // Get all active partners
  // DATABASE FIELD: is_active
  const result = await query(`
    SELECT id
    FROM strategic_partners
    WHERE is_active = true
    ORDER BY id
  `);

  const partnerIds = result.rows.map(r => r.id);
  console.log(`[PCR Calculation] Found ${partnerIds.length} active partners`);

  const results = {
    total: partnerIds.length,
    succeeded: 0,
    failed: 0,
    errors: []
  };

  // Calculate PCR for each partner
  for (const partnerId of partnerIds) {
    try {
      await calculatePartnerPCR(partnerId);
      results.succeeded++;
    } catch (error) {
      console.error(`[PCR Calculation] ❌ Failed for partner ${partnerId}:`, error.message);
      results.failed++;
      results.errors.push({
        partnerId,
        error: error.message
      });
    }
  }

  console.log(`[PCR Calculation] ✅ Bulk recalculation complete: ${results.succeeded} succeeded, ${results.failed} failed`);
  return results;
}

/**
 * Update engagement tier for a partner
 *
 * @param {number} partnerId - Partner ID
 * @param {string} newTier - 'free', 'verified', or 'gold'
 * @param {Date} subscriptionStart - Subscription start date (optional)
 * @param {Date} subscriptionEnd - Subscription end date (optional)
 * @returns {Object} Updated PCR scores
 */
async function updateEngagementTier(partnerId, newTier, subscriptionStart = null, subscriptionEnd = null) {
  console.log(`[PCR Calculation] Updating engagement tier for partner ${partnerId} to ${newTier}`);

  // Validate tier
  if (!['free', 'gold', 'platinum'].includes(newTier)) {
    throw new Error(`Invalid engagement tier: ${newTier}`);
  }

  const multiplier = PAYMENT_MULTIPLIERS[newTier];
  const subscriptionStatus = newTier === 'free' ? 'inactive' : 'active';

  // Update tier and subscription info
  // DATABASE FIELDS: engagement_tier, payment_multiplier, subscription_start_date, subscription_end_date, subscription_status
  await query(`
    UPDATE strategic_partners
    SET
      engagement_tier = $1,
      payment_multiplier = $2,
      subscription_status = $3,
      subscription_start_date = $4,
      subscription_end_date = $5,
      updated_at = NOW()
    WHERE id = $6
  `, [newTier, multiplier, subscriptionStatus, subscriptionStart, subscriptionEnd, partnerId]);

  // Recalculate PCR with new tier
  return await calculatePartnerPCR(partnerId);
}

module.exports = {
  calculatePartnerPCR,
  recalculateAllPCR,
  updateEngagementTier,
  calculateProfileCompletionScore,
  calculateQuarterlyFeedbackScore,
  calculateBasePCR,
  calculateFinalPCR,
  PROFILE_WEIGHTS,
  QUARTERLY_WEIGHTS,
  PAYMENT_MULTIPLIERS
};
