# Phase 2: Momentum & Trust Badges - Implementation Plan

**Document Version:** 1.0
**Date:** October 30, 2025
**Status:** READY FOR IMPLEMENTATION
**Database Schema:** strategic_partners (140 columns verified October 30, 2025)

---

## 📋 Executive Summary

**Goal:** Add momentum modifiers and trust badges to the PCR scoring system, rewarding partners for consistent high performance and tier engagement.

### What Phase 2 Delivers
- ✅ Momentum modifier system (+5 hot streak, 0 stable/new, -3 declining)
- ✅ Automatic performance trend detection (improving/stable/declining/new)
- ✅ Trust badge eligibility and assignment (tier badges + performance badges)
- ✅ Quarterly tracking history for trend analysis
- ✅ Momentum-adjusted final PCR scores
- ✅ Badge display and management APIs

---

## 🗄️ Database Schema Changes

### Prerequisites Verification ✅

**CRITICAL: Run Pre-Flight Checklist BEFORE implementing**

Current strategic_partners table: **140 columns** (verified October 30, 2025)

**Existing Phase 1 Fields (REUSE - DO NOT MODIFY):**
- `quarterly_history` JSONB DEFAULT '[]'::jsonb  (use for trend analysis)
- `base_pcr_score` NUMERIC(5,2)  (track this for momentum)
- `final_pcr_score` NUMERIC(5,2)  (apply momentum to this)
- `engagement_tier` VARCHAR(20)  (use for tier badges: 'free', 'gold', 'platinum')
- `pcr_last_calculated` TIMESTAMP  (use for tracking recalculation)
- `subscription_start_date` DATE  (use for tier badge eligibility - 3+ months)
- `quarterly_feedback_score` NUMERIC(5,2)  (use for performance trend analysis)

**Legacy Fields (MAY REPURPOSE):**
- `score_trend` VARCHAR(50)  (could use for performance_trend)
- `feedback_trend` VARCHAR(50)  (legacy, probably deprecated)

---

### Migration SQL: Add Phase 2 Fields

**File:** `tpe-database/migrations/20251030_add_momentum_badges.sql`

**DATABASE-CHECKED: All field names verified against schema October 30, 2025**

```sql
-- ================================================================
-- Migration: Add Momentum & Trust Badge Fields (Phase 2)
-- Date: October 30, 2025
-- Purpose: Performance tracking and partner recognition system
-- ================================================================

-- Performance Momentum Tracking
ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS momentum_modifier INTEGER DEFAULT 0
  CHECK (momentum_modifier IN (-3, 0, 5)),
ADD COLUMN IF NOT EXISTS performance_trend VARCHAR(20) DEFAULT 'new'
  CHECK (performance_trend IN ('improving', 'stable', 'declining', 'new')),
ADD COLUMN IF NOT EXISTS quarters_tracked INTEGER DEFAULT 0
  CHECK (quarters_tracked >= 0);

-- Trust Badge System
ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS earned_badges JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS badge_last_updated TIMESTAMP;

-- ================================================================
-- Indexes for Performance
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_strategic_partners_momentum_modifier
  ON strategic_partners(momentum_modifier);

CREATE INDEX IF NOT EXISTS idx_strategic_partners_performance_trend
  ON strategic_partners(performance_trend);

CREATE INDEX IF NOT EXISTS idx_strategic_partners_earned_badges
  ON strategic_partners USING GIN(earned_badges);

-- ================================================================
-- Comments for Documentation
-- ================================================================

COMMENT ON COLUMN strategic_partners.momentum_modifier IS
  'PCR momentum boost: +5 (hot streak: 3+ quarters 85+), 0 (stable/new), -3 (declining: 3+ quarters dropping)';

COMMENT ON COLUMN strategic_partners.performance_trend IS
  'Performance trend based on quarterly history: improving, stable, declining, or new';

COMMENT ON COLUMN strategic_partners.quarters_tracked IS
  'Number of quarters with feedback data collected';

COMMENT ON COLUMN strategic_partners.earned_badges IS
  'Array of trust badges: [{type: "tier_gold", earnedAt: "2025-10-30"}, ...]';

COMMENT ON COLUMN strategic_partners.badge_last_updated IS
  'Last time badge eligibility was recalculated';

-- ================================================================
-- Data Migration: Initialize New Fields
-- ================================================================

-- Set quarters_tracked based on existing quarterly_history
UPDATE strategic_partners
SET quarters_tracked = CASE
    WHEN quarterly_history IS NOT NULL AND jsonb_array_length(quarterly_history) > 0
    THEN jsonb_array_length(quarterly_history)
    ELSE 0
  END
WHERE quarterly_history IS NOT NULL;

-- Initialize performance_trend for existing partners with data
UPDATE strategic_partners
SET performance_trend = 'stable'
WHERE quarters_tracked > 0 AND performance_trend = 'new';

-- ================================================================
-- Verification Query
-- ================================================================

SELECT
  COUNT(*) as total_partners,
  COUNT(*) FILTER (WHERE momentum_modifier = 5) as hot_streak_partners,
  COUNT(*) FILTER (WHERE momentum_modifier = 0) as stable_partners,
  COUNT(*) FILTER (WHERE momentum_modifier = -3) as declining_partners,
  COUNT(*) FILTER (WHERE performance_trend = 'improving') as improving_trend,
  COUNT(*) FILTER (WHERE performance_trend = 'stable') as stable_trend,
  COUNT(*) FILTER (WHERE performance_trend = 'declining') as declining_trend,
  COUNT(*) FILTER (WHERE performance_trend = 'new') as new_partners,
  AVG(quarters_tracked) as avg_quarters_tracked,
  COUNT(*) FILTER (WHERE jsonb_array_length(earned_badges) > 0) as partners_with_badges
FROM strategic_partners;
```

---

## 🛠️ Service Layer: Momentum Calculation Service

**File:** `tpe-backend/src/services/momentumCalculationService.js`

**DATABASE-CHECKED: All field names match strategic_partners schema**

```javascript
// DATABASE-CHECKED: strategic_partners columns verified October 30, 2025
// ================================================================
// Momentum Calculation Service (Phase 2)
// ================================================================
// Purpose: Calculate momentum modifiers based on quarterly performance trends
// Modifiers: +5 (hot streak), 0 (stable/new), -3 (declining)
// ================================================================

const { query } = require('../config/database');

/**
 * Momentum Modifier Values
 */
const MOMENTUM_MODIFIERS = {
  HOT_STREAK: 5,      // 3+ consecutive quarters with 85+ quarterly score
  STABLE: 0,          // Default for new or stable performance
  DECLINING: -3       // 3+ consecutive quarters with declining scores
};

/**
 * Performance Thresholds
 */
const THRESHOLDS = {
  HOT_STREAK_SCORE: 85,           // Minimum score for hot streak qualification
  HOT_STREAK_QUARTERS: 3,         // Consecutive quarters needed for hot streak
  DECLINING_QUARTERS: 3,          // Consecutive quarters of decline needed
  MIN_QUARTERS_FOR_TREND: 2       // Minimum quarters to establish trend
};

/**
 * Analyze quarterly history to determine performance trend
 *
 * @param {Array} quarterlyHistory - Array of quarterly feedback data from JSONB field
 * @returns {string} 'improving', 'stable', 'declining', or 'new'
 */
function analyzePerformanceTrend(quarterlyHistory) {
  // DATABASE FIELD: quarterly_history (JSONB array)
  if (!quarterlyHistory || quarterlyHistory.length < THRESHOLDS.MIN_QUARTERS_FOR_TREND) {
    return 'new';
  }

  // Sort by date (most recent first)
  const sorted = [...quarterlyHistory].sort((a, b) =>
    new Date(b.date || b.created_at) - new Date(a.date || a.created_at)
  );

  // Get last 3 quarters for trend analysis
  const recent = sorted.slice(0, 3);

  if (recent.length < THRESHOLDS.MIN_QUARTERS_FOR_TREND) {
    return 'new';
  }

  // Check if scores are consistently improving
  let improving = true;
  let declining = true;

  for (let i = 0; i < recent.length - 1; i++) {
    const current = parseFloat(recent[i].score || recent[i].quarterly_score || 0);
    const previous = parseFloat(recent[i + 1].score || recent[i + 1].quarterly_score || 0);

    if (current <= previous) improving = false;
    if (current >= previous) declining = false;
  }

  if (improving) return 'improving';
  if (declining) return 'declining';
  return 'stable';
}

/**
 * Calculate momentum modifier based on quarterly history
 *
 * @param {Array} quarterlyHistory - Array of quarterly feedback data
 * @param {number} currentQuarterlyScore - Current quarterly feedback score
 * @returns {number} Momentum modifier: -3, 0, or +5
 */
function calculateMomentumModifier(quarterlyHistory, currentQuarterlyScore) {
  // DATABASE FIELD: quarterly_history (JSONB array)
  if (!quarterlyHistory || quarterlyHistory.length < THRESHOLDS.HOT_STREAK_QUARTERS) {
    return MOMENTUM_MODIFIERS.STABLE;  // Not enough data
  }

  // Sort by date (most recent first)
  const sorted = [...quarterlyHistory].sort((a, b) =>
    new Date(b.date || b.created_at) - new Date(a.date || a.created_at)
  );

  // Get last 3 quarters
  const recentQuarters = sorted.slice(0, THRESHOLDS.HOT_STREAK_QUARTERS);

  // Check for HOT STREAK: 3+ consecutive quarters with 85+ scores
  const hotStreakCount = recentQuarters.filter(q => {
    const score = parseFloat(q.score || q.quarterly_score || 0);
    return score >= THRESHOLDS.HOT_STREAK_SCORE;
  }).length;

  if (hotStreakCount >= THRESHOLDS.HOT_STREAK_QUARTERS &&
      currentQuarterlyScore >= THRESHOLDS.HOT_STREAK_SCORE) {
    console.log(`[Momentum] 🔥 HOT STREAK detected: ${hotStreakCount} quarters above ${THRESHOLDS.HOT_STREAK_SCORE}`);
    return MOMENTUM_MODIFIERS.HOT_STREAK;
  }

  // Check for DECLINING: 3+ consecutive quarters of dropping scores
  let decliningCount = 0;
  for (let i = 0; i < recentQuarters.length - 1; i++) {
    const current = parseFloat(recentQuarters[i].score || recentQuarters[i].quarterly_score || 0);
    const previous = parseFloat(recentQuarters[i + 1].score || recentQuarters[i + 1].quarterly_score || 0);

    if (current < previous) {
      decliningCount++;
    }
  }

  if (decliningCount >= THRESHOLDS.DECLINING_QUARTERS - 1) {  // -1 because we compare pairs
    console.log(`[Momentum] 📉 DECLINING trend detected: ${decliningCount + 1} quarters dropping`);
    return MOMENTUM_MODIFIERS.DECLINING;
  }

  // Default: STABLE
  return MOMENTUM_MODIFIERS.STABLE;
}

/**
 * Update momentum and performance trend for a partner
 *
 * @param {number} partnerId - Partner ID
 * @returns {Object} Updated momentum data
 */
async function updatePartnerMomentum(partnerId) {
  console.log(`[Momentum] Calculating momentum for partner ${partnerId}`);

  // Fetch partner with quarterly history
  // DATABASE FIELDS: quarterly_history, quarterly_feedback_score, quarters_tracked
  const result = await query(`
    SELECT
      id,
      company_name,
      quarterly_history,
      quarterly_feedback_score,
      quarters_tracked
    FROM strategic_partners
    WHERE id = $1
  `, [partnerId]);

  if (result.rows.length === 0) {
    throw new Error(`Partner ${partnerId} not found`);
  }

  const partner = result.rows[0];
  const quarterlyHistory = partner.quarterly_history || [];
  const currentScore = parseFloat(partner.quarterly_feedback_score || 50);

  // Calculate momentum modifier
  const momentumModifier = calculateMomentumModifier(quarterlyHistory, currentScore);

  // Analyze performance trend
  const performanceTrend = analyzePerformanceTrend(quarterlyHistory);

  // Update quarters tracked
  const quartersTracked = quarterlyHistory.length;

  console.log(`[Momentum] Partner ${partnerId}:`, {
    momentum: momentumModifier,
    trend: performanceTrend,
    quarters: quartersTracked
  });

  // Update database
  // DATABASE FIELDS: momentum_modifier, performance_trend, quarters_tracked
  await query(`
    UPDATE strategic_partners
    SET
      momentum_modifier = $1,
      performance_trend = $2,
      quarters_tracked = $3,
      updated_at = NOW()
    WHERE id = $4
  `, [momentumModifier, performanceTrend, quartersTracked, partnerId]);

  return {
    partnerId,
    companyName: partner.company_name,
    momentumModifier,
    performanceTrend,
    quartersTracked,
    currentQuarterlyScore: currentScore
  };
}

/**
 * Apply momentum modifier to final PCR score
 *
 * @param {number} finalPCR - Final PCR score before momentum
 * @param {number} momentumModifier - Momentum modifier (-3, 0, or +5)
 * @returns {number} Final PCR with momentum applied (capped at 105)
 */
function applyMomentumToPCR(finalPCR, momentumModifier) {
  const adjusted = finalPCR + momentumModifier;

  // Cap at 105 (maximum possible PCR)
  const capped = Math.min(adjusted, 105);

  // Ensure minimum of 0
  return Math.max(capped, 0);
}

module.exports = {
  calculateMomentumModifier,
  analyzePerformanceTrend,
  updatePartnerMomentum,
  applyMomentumToPCR,
  MOMENTUM_MODIFIERS,
  THRESHOLDS
};
```

---

## 🏆 Service Layer: Badge Eligibility Service

**File:** `tpe-backend/src/services/badgeEligibilityService.js`

**DATABASE-CHECKED: All field names match strategic_partners schema**

```javascript
// DATABASE-CHECKED: strategic_partners columns verified October 30, 2025
// ================================================================
// Badge Eligibility Service (Phase 2)
// ================================================================
// Purpose: Determine and award trust badges to strategic partners
// Badge Types: Tier badges (gold, platinum) + Performance badges (rising star, consistent performer)
// ================================================================

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
```

---

## 🔧 Integration: Update PCR Calculation Service

**File:** `tpe-backend/src/services/pcrCalculationService.js` (UPDATE)

**Add momentum integration to existing Phase 1 service:**

```javascript
// Add to top of file
const momentumService = require('./momentumCalculationService');

// Update calculatePartnerPCR function (add after final PCR calculation):

async function calculatePartnerPCR(partnerId) {
  // ... existing Phase 1 code ...

  // Step 4: Calculate Final PCR with multiplier
  const finalPCR = calculateFinalPCR(basePCR, partner.engagement_tier);
  console.log(`[PCR Calculation] Final PCR (before momentum): ${finalPCR}/105`);

  // ⭐ NEW: Phase 2 Momentum Integration
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
```

---

## 🌐 API Endpoints: Phase 2 Routes

**File:** `tpe-backend/src/routes/partnerRoutes.js` (UPDATE)

**Add these new routes:**

```javascript
// DATABASE-CHECKED: All field names verified against strategic_partners schema
const momentumService = require('../services/momentumCalculationService');
const badgeService = require('../services/badgeEligibilityService');

/**
 * POST /api/partners/:id/recalculate-momentum
 * Recalculate momentum modifier and performance trend for a partner
 */
router.post('/:id/recalculate-momentum',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const momentumData = await momentumService.updatePartnerMomentum(parseInt(id));

      res.json({
        success: true,
        message: 'Momentum recalculated successfully',
        data: momentumData
      });
    } catch (error) {
      console.error('[API] Momentum recalculation failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/partners/:id/recalculate-badges
 * Recalculate trust badges for a partner
 */
router.post('/:id/recalculate-badges',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      const badgeData = await badgeService.updatePartnerBadges(parseInt(id));

      res.json({
        success: true,
        message: 'Badges recalculated successfully',
        data: badgeData
      });
    } catch (error) {
      console.error('[API] Badge recalculation failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/partners/momentum/recalculate-all
 * Recalculate momentum for all active partners (bulk operation)
 */
router.post('/momentum/recalculate-all',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      // Get all active partners
      const partnersResult = await query(`
        SELECT id FROM strategic_partners WHERE is_active = true
      `);

      const results = {
        total: partnersResult.rows.length,
        succeeded: 0,
        failed: 0,
        errors: []
      };

      for (const partner of partnersResult.rows) {
        try {
          await momentumService.updatePartnerMomentum(partner.id);
          results.succeeded++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            partnerId: partner.id,
            error: error.message
          });
        }
      }

      res.json({
        success: true,
        message: 'Bulk momentum recalculation complete',
        data: results
      });
    } catch (error) {
      console.error('[API] Bulk momentum recalculation failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * POST /api/partners/badges/recalculate-all
 * Recalculate badges for all active partners (bulk operation)
 */
router.post('/badges/recalculate-all',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    try {
      const results = await badgeService.recalculateAllBadges();

      res.json({
        success: true,
        message: 'Bulk badge recalculation complete',
        data: results
      });
    } catch (error) {
      console.error('[API] Bulk badge recalculation failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);

/**
 * GET /api/partners/:id/badges
 * Get current badges for a partner
 */
router.get('/:id/badges',
  requireAuth,
  async (req, res) => {
    try {
      const { id } = req.params;

      const result = await query(`
        SELECT earned_badges, badge_last_updated
        FROM strategic_partners
        WHERE id = $1
      `, [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Partner not found'
        });
      }

      res.json({
        success: true,
        data: {
          badges: result.rows[0].earned_badges || [],
          lastUpdated: result.rows[0].badge_last_updated
        }
      });
    } catch (error) {
      console.error('[API] Get badges failed:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
);
```

---

## 📅 Implementation Timeline (3-5 Days)

### Day 1: Database Migration & Verification ✅
**Tasks:**
1. ✅ Complete Pre-Flight Checklist (Phase 2 field verification)
2. ✅ Create migration SQL file (`20251030_add_momentum_badges.sql`)
3. ✅ Test migration on local development database
4. ✅ Verify field additions with `\d strategic_partners`
5. ✅ Test data migration for existing quarters_tracked
6. ✅ Apply to production database

**Deliverable:** Database ready with all Phase 2 fields (145 columns total)

---

### Day 2: Momentum Calculation Service ✅
**Tasks:**
1. ✅ Create `momentumCalculationService.js`
2. ✅ Implement quarterly history trend analysis
3. ✅ Implement momentum modifier calculation logic
4. ✅ Implement momentum application to final PCR
5. ✅ Unit tests for momentum functions
6. ✅ Test with real quarterly data scenarios

**Deliverable:** Working momentum calculation service

---

### Day 3: Badge Eligibility Service ✅
**Tasks:**
1. ✅ Create `badgeEligibilityService.js`
2. ✅ Define all badge types (tier + performance)
3. ✅ Implement eligibility rules for each badge
4. ✅ Implement badge calculation and assignment
5. ✅ Unit tests for badge eligibility logic
6. ✅ Test with various partner scenarios

**Deliverable:** Working badge system

---

### Day 4: Integration & API Endpoints ✅
**Tasks:**
1. ✅ Update `pcrCalculationService.js` to integrate momentum
2. ✅ Create momentum API endpoints (`/recalculate-momentum`, `/momentum/recalculate-all`)
3. ✅ Create badge API endpoints (`/recalculate-badges`, `/badges/recalculate-all`, `/badges`)
4. ✅ Test end-to-end PCR calculation with momentum
5. ✅ Test badge recalculation flow
6. ✅ Integration tests

**Deliverable:** Phase 2 fully integrated with Phase 1

---

### Day 5: Testing & Documentation ✅
**Tasks:**
1. ✅ Test all momentum scenarios (hot streak, declining, stable)
2. ✅ Test all badge types (tier badges, performance badges)
3. ✅ Verify momentum-adjusted PCR scores (max 105)
4. ✅ Performance testing (calculation speed < 150ms)
5. ✅ Update API documentation
6. ✅ Update admin dashboard to display momentum and badges

**Deliverable:** Phase 2 complete and tested

---

## 🎯 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Momentum Calculation Speed** | < 50ms | Time to calculate momentum for single partner |
| **Badge Calculation Speed** | < 100ms | Time to calculate badges for single partner |
| **Trend Accuracy** | 100% | Trends match manual quarterly analysis |
| **Badge Accuracy** | 100% | Badges awarded match eligibility rules |
| **Momentum Integration** | 100% | Final PCR properly adjusted by momentum |
| **Admin Visibility** | 100% | All momentum and badges visible in dashboard |

---

## 🧪 Test Scenarios

### Momentum Testing
1. **Hot Streak**: Partner with 3+ quarters of 85+ scores → Expect +5 modifier
2. **Declining**: Partner with 3+ quarters of dropping scores → Expect -3 modifier
3. **Stable**: Partner with consistent 70-80 scores → Expect 0 modifier
4. **New Partner**: Partner with < 2 quarters → Expect 0 modifier, trend = 'new'

### Badge Testing

**Profile Verification Badges:**
1. **Verified Badge (Regular)**: Free tier partner with profile completion >= 70 → Earns "Verified" badge (✓)
2. **Verified Badge (Regular)**: Gold partner with profile completion >= 70 BUT PCR < 88 → Earns "Verified" badge (✓)
3. **Verified Excellence**: Gold partner with PCR >= 88 → Earns "Verified Excellence" (✅), regular "Verified" is REPLACED
4. **Verified Excellence**: Platinum partner with PCR >= 88 → Earns "Verified Excellence" (✅), regular "Verified" is REPLACED
5. **Unverified**: Partner with profile completion < 70 → No badge displayed

**Tier Badges:**
6. **Tier Badge**: Gold partner with 3+ months active → Earns "Power Gold Partner" badge (🥇)
7. **Tier Badge**: Platinum partner with 3+ months active → Earns "Power Platinum Partner" badge (💎)

**Performance Badges:**
8. **Hot Streak Badge**: Partner with momentum +5 → Earns "Hot Streak" badge (🔥)
9. **Rising Star Badge**: Partner with 'improving' trend and 3+ quarters → Earns "Rising Star" badge (⭐)
10. **Consistent Performer**: Partner with 4+ quarters of 70+ scores → Earns badge (🎯)

### PCR Integration Testing
1. **Base 80 + Hot Streak**: 80 base PCR + 5 momentum = 85 final PCR (before tier multiplier)
2. **Base 90 + Declining**: 90 base PCR - 3 momentum = 87 final PCR
3. **Cap at 105**: Any score that would exceed 105 is capped at 105
4. **Minimum 0**: Any score below 0 is set to 0

---

## 📚 Related Documents

- **Overview:** [PCR Scoring System Overview](../PCR-SCORING-OVERVIEW.md)
- **Pre-Flight Checklist:** [Phase 2 Pre-Flight Checklist](./PHASE-2-PRE-FLIGHT-CHECKLIST.md)
- **Phase 1 Plan:** [Phase 1 Implementation Plan](../phase-1/PHASE-1-IMPLEMENTATION-PLAN.md)
- **Database Schema:** Check `quick-db.bat` before implementation

---

## 🎉 Phase 2 Deliverables

**When Phase 2 is Complete:**
1. ✅ All partners have momentum modifiers calculated
2. ✅ Performance trends tracked (improving/stable/declining/new)
3. ✅ Trust badges assigned based on eligibility
4. ✅ Final PCR scores include momentum adjustments
5. ✅ Admin dashboard shows momentum and badges
6. ✅ API endpoints for momentum and badge management

**What's NOT in Phase 2:**
- ❌ Quarterly feedback collection system (future)
- ❌ Automated quarterly report generation (future)
- ❌ Partner-facing badge display (Phase 3: Partner Portal)
- ❌ Badge achievements timeline view (future enhancement)

---

**Last Updated:** October 30, 2025
**Status:** Ready for Day 1 (Pre-Flight Checklist Complete)
**Next Step:** Begin Day 1 - Database Migration
