# Phase 1: Core PCR Calculation Engine - Implementation Plan

**Document Version:** 1.0
**Date:** October 29, 2025
**Status:** READY FOR IMPLEMENTATION
**Database Schema:** strategic_partners (124 columns verified October 29, 2025)

---

## 📋 Executive Summary

**Goal:** Build the foundation of the PCR scoring system that calculates scores based on profile completion, quarterly feedback, and payment tier multipliers.

### What Phase 1 Delivers
- ✅ Database schema extensions for PCR fields
- ✅ Profile completion scoring logic (weighted elements)
- ✅ Quarterly feedback score management (default 50, updates with real data)
- ✅ Base PCR calculation (30% profile + 70% quarterly)
- ✅ Payment tier multiplier system (1.5x, 2.5x, 5.0x)
- ✅ Final PCR formula implementation
- ✅ PCR calculation service layer
- ✅ Automatic score recalculation triggers

---

## 🗄️ Database Schema Changes

### Prerequisites Verification ✅

**CRITICAL: Run Pre-Flight Checklist BEFORE implementing**

Current strategic_partners table: **124 columns** (verified October 29, 2025)

**Existing Relevant Fields (DO NOT MODIFY):**
- `powerconfidence_score` INTEGER DEFAULT 0
- `power_confidence_score` INTEGER DEFAULT 0  (NOTE: Duplicate field exists!)
- `previous_powerconfidence_score` INTEGER
- `landing_page_videos` JSONB  (use for demo video count)
- `client_testimonials` JSONB DEFAULT '[]'::jsonb  (use for customer feedback count)
- `employee_references` TEXT  (use for employee feedback count)
- `completed_steps` INTEGER DEFAULT 8
- `last_quarterly_report` DATE
- `total_feedback_responses` INTEGER DEFAULT 0
- `average_satisfaction` NUMERIC
- `feedback_trend` VARCHAR(50)

---

### Migration SQL: Add PCR Fields

**File:** `tpe-database/migrations/20251029_add_pcr_fields.sql`

**DATABASE-CHECKED: All field names verified against schema October 29, 2025**

```sql
-- ================================================================
-- Migration: Add PCR Scoring System Fields
-- Date: October 29, 2025
-- Purpose: Core PCR calculation engine (Profile + Quarterly + Multipliers)
-- ================================================================

-- Payment Tier & Engagement Fields
ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS engagement_tier VARCHAR(20) DEFAULT 'free'
  CHECK (engagement_tier IN ('free', 'verified', 'gold')),
ADD COLUMN IF NOT EXISTS payment_multiplier NUMERIC(3,1) DEFAULT 1.5
  CHECK (payment_multiplier IN (1.5, 2.5, 5.0)),
ADD COLUMN IF NOT EXISTS subscription_start_date DATE,
ADD COLUMN IF NOT EXISTS subscription_end_date DATE,
ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50) DEFAULT 'inactive'
  CHECK (subscription_status IN ('active', 'cancelled', 'expired', 'inactive'));

-- Profile Completion Tracking
ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS profile_completion_score INTEGER DEFAULT 0
  CHECK (profile_completion_score >= 0 AND profile_completion_score <= 100),
ADD COLUMN IF NOT EXISTS demo_videos_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS employee_feedback_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_feedback_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS profile_last_updated TIMESTAMP DEFAULT NOW();

-- Quarterly Feedback Tracking
ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS quarterly_feedback_score NUMERIC(5,2) DEFAULT 50.00
  CHECK (quarterly_feedback_score >= 0 AND quarterly_feedback_score <= 100),
ADD COLUMN IF NOT EXISTS has_quarterly_data BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS quarterly_history JSONB DEFAULT '[]'::jsonb;

-- PCR Scores
ALTER TABLE strategic_partners
ADD COLUMN IF NOT EXISTS base_pcr_score NUMERIC(5,2)
  CHECK (base_pcr_score IS NULL OR (base_pcr_score >= 0 AND base_pcr_score <= 100)),
ADD COLUMN IF NOT EXISTS final_pcr_score NUMERIC(5,2)
  CHECK (final_pcr_score IS NULL OR (final_pcr_score >= 0 AND final_pcr_score <= 105)),
ADD COLUMN IF NOT EXISTS pcr_last_calculated TIMESTAMP;

-- ================================================================
-- Indexes for Performance
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_strategic_partners_engagement_tier
  ON strategic_partners(engagement_tier);

CREATE INDEX IF NOT EXISTS idx_strategic_partners_final_pcr_score
  ON strategic_partners(final_pcr_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_strategic_partners_base_pcr_score
  ON strategic_partners(base_pcr_score DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_strategic_partners_subscription_status
  ON strategic_partners(subscription_status)
  WHERE subscription_status = 'active';

-- ================================================================
-- Comments for Documentation
-- ================================================================

COMMENT ON COLUMN strategic_partners.engagement_tier IS
  'Payment tier: free (1.5x), verified ($3,600/mo - 2.5x), gold ($6,000/mo - 5.0x)';

COMMENT ON COLUMN strategic_partners.payment_multiplier IS
  'PCR boost multiplier based on engagement tier';

COMMENT ON COLUMN strategic_partners.profile_completion_score IS
  'Weighted score (0-100) based on profile element completion';

COMMENT ON COLUMN strategic_partners.quarterly_feedback_score IS
  'Quarterly customer feedback score (defaults to 50 until first quarter)';

COMMENT ON COLUMN strategic_partners.base_pcr_score IS
  'Base PCR = (Profile 30%) + (Quarterly 70%) before multiplier';

COMMENT ON COLUMN strategic_partners.final_pcr_score IS
  'Final PCR = (Base × 0.80) + (20 × Multiplier / 5) after all adjustments';

-- ================================================================
-- Data Migration: Populate Counts from Existing Data
-- ================================================================

-- Count demo videos from landing_page_videos JSONB
UPDATE strategic_partners
SET demo_videos_count = CASE
    WHEN landing_page_videos IS NOT NULL
    THEN jsonb_array_length(landing_page_videos)
    ELSE 0
  END,
  profile_last_updated = NOW()
WHERE landing_page_videos IS NOT NULL;

-- Count customer feedbacks from client_testimonials JSONB
UPDATE strategic_partners
SET customer_feedback_count = CASE
    WHEN client_testimonials IS NOT NULL
    THEN jsonb_array_length(client_testimonials)
    ELSE 0
  END,
  profile_last_updated = NOW()
WHERE client_testimonials IS NOT NULL;

-- Note: employee_references is TEXT field - manual count needed
-- Will be populated by service layer on first PCR calculation

-- ================================================================
-- Verification Query
-- ================================================================

SELECT
  COUNT(*) as total_partners,
  AVG(demo_videos_count) as avg_demos,
  AVG(customer_feedback_count) as avg_customer_feedback,
  COUNT(*) FILTER (WHERE engagement_tier = 'free') as free_tier,
  COUNT(*) FILTER (WHERE engagement_tier = 'verified') as verified_tier,
  COUNT(*) FILTER (WHERE engagement_tier = 'gold') as gold_tier
FROM strategic_partners;
```

---

## 🛠️ Service Layer: PCR Calculation Service

**File:** `tpe-backend/src/services/pcrCalculationService.js`

**DATABASE-CHECKED: All field names match strategic_partners schema**

```javascript
// DATABASE-CHECKED: strategic_partners columns verified October 29, 2025
// ================================================================
// PCR Calculation Service
// ================================================================
// Purpose: Calculate PowerConfidence Rating scores for strategic partners
// Formula: Final PCR = (Base PCR × 0.80) + (20 × Multiplier / 5)
// ================================================================

const { query } = require('../config/database');

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
  verified: 2.5,
  gold: 5.0
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
  console.log(`[PCR Calculation] Final PCR: ${finalPCR}/105 (tier: ${partner.engagement_tier})`);

  // Update partner record
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
  `, [profileScore, basePCR, finalPCR, partnerId]);

  console.log(`[PCR Calculation] ✅ Scores updated for partner ${partnerId}`);

  return {
    partnerId,
    companyName: partner.company_name,
    profileScore,
    quarterlyScore,
    basePCR,
    finalPCR,
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
  if (!['free', 'verified', 'gold'].includes(newTier)) {
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
```

---

## 📅 Implementation Timeline (5-7 Days)

### Day 1: Database Migration & Verification ✅
**Tasks:**
1. ✅ Complete Pre-Flight Checklist (database field verification)
2. ✅ Create migration SQL file
3. ✅ Test migration on local development database
4. ✅ Verify field additions with `\d strategic_partners`
5. ✅ Test data migration for existing counts (videos, testimonials)
6. ✅ Apply to production database

**Deliverable:** Database ready with all PCR fields

---

### Day 2: Core Calculation Service ✅
**Tasks:**
1. ✅ Create `pcrCalculationService.js`
2. ✅ Implement profile completion scoring logic
3. ✅ Implement quarterly feedback scoring (placeholder with default 50)
4. ✅ Implement Base PCR formula
5. ✅ Implement Final PCR formula with multipliers
6. ✅ Unit tests for calculation functions

**Deliverable:** Working PCR calculation service

---

### Day 3: Integration & Triggers ✅
**Tasks:**
1. ✅ Create API endpoint: `POST /api/partners/:id/calculate-pcr`
2. ✅ Create API endpoint: `POST /api/partners/recalculate-all-pcr`
3. ✅ Create API endpoint: `PATCH /api/partners/:id/engagement-tier`
4. ✅ Add automatic PCR recalculation on profile updates
5. ✅ Test end-to-end PCR calculation flow

**Deliverable:** PCR scores update automatically on profile changes

---

### Day 4: Admin Dashboard Integration ✅
**Tasks:**
1. ✅ Display Final PCR scores in partner list
2. ✅ Add PCR score details modal (profile score, quarterly score, base, final)
3. ✅ Add engagement tier selector (free/verified/gold)
4. ✅ Add "Recalculate PCR" button for individual partners
5. ✅ Add "Recalculate All PCR" button for bulk updates
6. ✅ Visual indicators for engagement tiers

**Deliverable:** Admin can view and manage PCR scores

---

### Day 5: Testing & Documentation ✅
**Tasks:**
1. ✅ Test all calculation scenarios (new partner, established, tier changes)
2. ✅ Verify score ranges (0-100 base, 0-105 final)
3. ✅ Performance testing (calculation speed < 100ms)
4. ✅ Document API endpoints
5. ✅ Update partner management documentation

**Deliverable:** Phase 1 complete and tested

---

## 🎯 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Calculation Speed** | < 100ms | Time to calculate single partner PCR |
| **Data Accuracy** | 100% | Profile scores match manual calculation |
| **Score Range** | Base 0-100, Final 0-105 | All scores within valid ranges |
| **Automatic Updates** | 100% | PCR recalculates on profile changes |
| **Admin Visibility** | 100% | All partners show current PCR scores |

---

## 📚 Related Documents

- **Overview:** [PCR Scoring System Overview](../PCR-SCORING-OVERVIEW.md)
- **Pre-Flight Checklist:** [Phase 1 Pre-Flight Checklist](./PHASE-1-PRE-FLIGHT-CHECKLIST.md)
- **Phase 2 Plan:** [Phase 2 Implementation Plan](../phase-2/PHASE-2-IMPLEMENTATION-PLAN.md)
- **Database Schema:** Check `quick-db.bat` before implementation

---

## 🎉 Phase 1 Deliverables

**When Phase 1 is Complete:**
1. ✅ All partners have calculated PCR scores
2. ✅ Scores update automatically on profile changes
3. ✅ Admin dashboard shows PCR scores
4. ✅ Engagement tiers can be assigned/changed
5. ✅ API endpoints for PCR management

**What's NOT in Phase 1:**
- ❌ Momentum modifiers (Phase 2)
- ❌ Trust badges (Phase 2)
- ❌ Performance trend analysis (Phase 2)
- ❌ Quarterly feedback system (future - uses placeholder default 50)

---

**Last Updated:** October 29, 2025
**Status:** Ready for Day 1 (Pre-Flight Checklist)
**Next Step:** Complete Phase 1 Pre-Flight Checklist