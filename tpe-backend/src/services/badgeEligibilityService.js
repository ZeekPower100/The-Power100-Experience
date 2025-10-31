// DATABASE-CHECKED: strategic_partners columns verified October 30, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - earned_badges (NOT earnedBadges)
// - badge_last_updated (NOT badgeLastUpdated)
// - engagement_tier (NOT engagementTier) - EXISTING FROM PHASE 1
// - subscription_status (NOT subscriptionStatus) - EXISTING FROM PHASE 1
// - subscription_start_date (NOT subscriptionStartDate) - EXISTING FROM PHASE 1
// - performance_trend (NOT performanceTrend)
// - momentum_modifier (NOT momentumModifier)
// - quarters_tracked (NOT quartersTracked)
// - quarterly_history (NOT quarterlyHistory) - EXISTING FROM PHASE 1
// - final_pcr_score (NOT finalPcrScore) - EXISTING FROM PHASE 1
// - profile_completion_score (NOT profileCompletionScore) - EXISTING FROM PHASE 1
// ================================================================
// VERIFIED DATA TYPES:
// - earned_badges: JSONB (array of badge objects)
// - badge_last_updated: TIMESTAMP (nullable)
// - engagement_tier: VARCHAR ('free', 'gold', 'platinum')
// - subscription_status: VARCHAR ('active', 'cancelled', 'expired', 'inactive')
// - performance_trend: VARCHAR ('improving', 'stable', 'declining', 'new')
// - momentum_modifier: INTEGER (-3, 0, or 5)
// - quarters_tracked: INTEGER (>= 0)
// - final_pcr_score: NUMERIC(5,2)
// - profile_completion_score: INTEGER (0-100)
// ================================================================

/**
 * Badge Eligibility Service (Phase 2)
 *
 * Purpose: Determine and award trust badges to strategic partners
 * Badge Types:
 * - Verification: "Verified" (any tier, profile complete) + "Verified Excellence" (paid tier + 88+ PCR)
 * - Tier: "Power Gold", "Power Platinum" (active paid subscriptions)
 * - Performance: "Rising Star", "Hot Streak", "Consistent Performer"
 */

const { query } = require('../config/database');

/**
 * Badge Definitions
 */
const BADGE_TYPES = {
  // Profile Verification Badges
  VERIFIED: {
    id: 'verified',
    name: 'Verified',
    description: 'Confirmed and completed partner profile (any tier)',
    category: 'verification',
    icon: '✓'
  },
  VERIFIED_EXCELLENCE: {
    id: 'verified_excellence',
    name: 'Verified Excellence',
    description: 'Paid subscriber (Gold/Platinum) with 88+ PCR score (replaces regular Verified)',
    category: 'verification',
    icon: '✅'
  },

  // Tier Badges (based on engagement tier)
  TIER_GOLD: {
    id: 'tier_gold',
    name: 'Power Gold Partner',
    description: 'Active Power Gold subscription (2.5x multiplier)',
    category: 'tier',
    icon: '🥇'
  },
  TIER_PLATINUM: {
    id: 'tier_platinum',
    name: 'Power Platinum Partner',
    description: 'Active Power Platinum subscription (5.0x multiplier)',
    category: 'tier',
    icon: '💎'
  },

  // Performance Badges
  RISING_STAR: {
    id: 'rising_star',
    name: 'Rising Star',
    description: '3+ consecutive quarters of improving scores',
    category: 'performance',
    icon: '⭐'
  },
  HOT_STREAK: {
    id: 'hot_streak',
    name: 'Hot Streak',
    description: '3+ quarters with 85+ quarterly scores',
    category: 'performance',
    icon: '🔥'
  },
  CONSISTENT_PERFORMER: {
    id: 'consistent_performer',
    name: 'Consistent Performer',
    description: '12+ months of stable 70+ scores',
    category: 'performance',
    icon: '🎯'
  }
};

/**
 * Badge Eligibility Criteria
 */
const ELIGIBILITY_RULES = {
  // Profile Verification Badges
  verified: {
    check: (partner) => {
      // ANY partner (free, gold, or platinum) with completed profile
      // Profile completion score >= 70 indicates sufficient completion
      return partner.profile_completion_score >= 70;
    },
    minMonths: 0  // No time requirement
  },
  verified_excellence: {
    check: (partner) => {
      // ONLY paid subscribers (gold OR platinum) with 88+ PCR
      const isPaidTier = partner.engagement_tier === 'gold' || partner.engagement_tier === 'platinum';
      const hasHighPCR = partner.final_pcr_score >= 88;
      const isActive = partner.subscription_status === 'active';

      return isPaidTier && hasHighPCR && isActive;
    },
    minMonths: 0,  // No minimum time, but must maintain 88+ PCR
    replaceBadge: 'verified'  // Replaces regular "Verified" badge when earned
  },

  // Tier Badges
  tier_gold: {
    check: (partner) => partner.engagement_tier === 'gold' && partner.subscription_status === 'active',
    minMonths: 3  // Must be active for 3+ months
  },
  tier_platinum: {
    check: (partner) => partner.engagement_tier === 'platinum' && partner.subscription_status === 'active',
    minMonths: 3  // Must be active for 3+ months
  },

  // Performance Badges
  rising_star: {
    check: (partner) => partner.performance_trend === 'improving' && partner.quarters_tracked >= 3,
    minMonths: 0
  },
  hot_streak: {
    check: (partner) => partner.momentum_modifier === 5,  // Hot streak momentum
    minMonths: 0
  },
  consistent_performer: {
    check: (partner) => {
      // 12+ months (4+ quarters) with stable 70+ scores
      const history = partner.quarterly_history || [];
      if (history.length < 4) return false;

      const recent12Months = history.slice(0, 4);
      return recent12Months.every(q => parseFloat(q.score || q.quarterly_score || 0) >= 70);
    },
    minMonths: 12
  }
};

/**
 * Check if partner meets time requirement for badge
 *
 * @param {Date} subscriptionStartDate - Subscription start date
 * @param {number} minMonths - Minimum months required
 * @returns {boolean}
 */
function meetsTimeRequirement(subscriptionStartDate, minMonths) {
  if (minMonths === 0) return true;
  if (!subscriptionStartDate) return false;

  const startDate = new Date(subscriptionStartDate);
  const now = new Date();
  const monthsDiff = (now - startDate) / (1000 * 60 * 60 * 24 * 30);

  return monthsDiff >= minMonths;
}

/**
 * Calculate eligible badges for a partner
 *
 * @param {Object} partner - Partner record from database
 * @returns {Array} Array of earned badges
 */
function calculateEligibleBadges(partner) {
  const earnedBadges = [];
  const badgesToReplace = new Set();

  // First pass: Calculate all eligible badges
  for (const [badgeId, badge] of Object.entries(BADGE_TYPES)) {
    const rule = ELIGIBILITY_RULES[badgeId];

    if (!rule) continue;

    // Check eligibility criteria
    const meetsEligibility = rule.check(partner);

    // Check time requirement
    const meetsTime = meetsTimeRequirement(
      partner.subscription_start_date,
      rule.minMonths
    );

    if (meetsEligibility && meetsTime) {
      earnedBadges.push({
        type: badgeId,
        name: badge.name,
        description: badge.description,
        category: badge.category,
        icon: badge.icon,
        earnedAt: new Date().toISOString()
      });

      // Track badges that should be replaced
      if (rule.replaceBadge) {
        badgesToReplace.add(rule.replaceBadge);
      }
    }
  }

  // Second pass: Remove badges that should be replaced
  // Example: If "verified_excellence" is earned, remove "verified"
  const finalBadges = earnedBadges.filter(badge => !badgesToReplace.has(badge.type));

  return finalBadges;
}

/**
 * Update badges for a partner
 *
 * @param {number} partnerId - Partner ID
 * @returns {Object} Updated badge data
 */
async function updatePartnerBadges(partnerId) {
  console.log(`[Badges] Calculating badges for partner ${partnerId}`);

  // Fetch partner with all necessary fields
  // DATABASE FIELDS: All verified against strategic_partners schema
  const result = await query(`
    SELECT
      id,
      company_name,
      engagement_tier,
      subscription_status,
      subscription_start_date,
      performance_trend,
      momentum_modifier,
      quarters_tracked,
      quarterly_history,
      final_pcr_score,
      profile_completion_score
    FROM strategic_partners
    WHERE id = $1
  `, [partnerId]);

  if (result.rows.length === 0) {
    throw new Error(`Partner ${partnerId} not found`);
  }

  const partner = result.rows[0];

  // Calculate eligible badges
  const earnedBadges = calculateEligibleBadges(partner);

  console.log(`[Badges] Partner ${partnerId} earned ${earnedBadges.length} badges:`,
    earnedBadges.map(b => b.name).join(', '));

  // Update database
  // DATABASE FIELDS: earned_badges, badge_last_updated
  await query(`
    UPDATE strategic_partners
    SET
      earned_badges = $1::jsonb,
      badge_last_updated = NOW(),
      updated_at = NOW()
    WHERE id = $2
  `, [JSON.stringify(earnedBadges), partnerId]);

  return {
    partnerId,
    companyName: partner.company_name,
    badges: earnedBadges,
    badgeCount: earnedBadges.length
  };
}

/**
 * Recalculate badges for all partners
 *
 * @returns {Object} Summary of badge recalculation
 */
async function recalculateAllBadges() {
  console.log('[Badges] Starting bulk badge recalculation...');

  // Get all active partners
  // DATABASE FIELD: is_active
  const result = await query(`
    SELECT id
    FROM strategic_partners
    WHERE is_active = true
    ORDER BY id
  `);

  const partnerIds = result.rows.map(r => r.id);
  console.log(`[Badges] Found ${partnerIds.length} active partners`);

  const results = {
    total: partnerIds.length,
    succeeded: 0,
    failed: 0,
    errors: []
  };

  for (const partnerId of partnerIds) {
    try {
      await updatePartnerBadges(partnerId);
      results.succeeded++;
    } catch (error) {
      console.error(`[Badges] ❌ Failed for partner ${partnerId}:`, error.message);
      results.failed++;
      results.errors.push({
        partnerId,
        error: error.message
      });
    }
  }

  console.log(`[Badges] ✅ Bulk recalculation complete: ${results.succeeded} succeeded, ${results.failed} failed`);
  return results;
}

module.exports = {
  calculateEligibleBadges,
  updatePartnerBadges,
  recalculateAllBadges,
  BADGE_TYPES,
  ELIGIBILITY_RULES
};
