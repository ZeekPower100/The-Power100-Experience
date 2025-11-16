# Phase 2: Badge System Clarifications

**Date:** October 30, 2025
**Context:** User questions about pattern services and badge logic

---

## Question 1: Momentum & Existing Pattern Services

### Question:
> "When it comes to where we are analyzing the momentum performance trends, will that be from the pattern tracking and detection services we already have built?"

### Answer: **No - Separate Systems**

**Existing Pattern Services** (for contractors):
- `patternAnalysisService.js` - Analyzes **contractor** business growth patterns (revenue tier transitions)
- `patternSuccessTrackingService.js` - Tracks how well patterns work for **contractors**
- **Purpose**: Contractor lifecycle tracking and business pattern discovery

**Phase 2 Momentum Service** (for partners):
- `momentumCalculationService.js` - Analyzes **partner** PCR score trends over time
- **Data Source**: `quarterly_history` JSONB field in `strategic_partners` table
- **Purpose**: Partner performance tracking (hot streaks, declining performance)

**Why Separate?**
- Different data sources (contractors vs partners)
- Different purposes (business growth patterns vs performance scoring)
- Different tables and schemas
- Should NOT be mixed

---

## Question 2: Badge System - Verified vs Verified Excellence

### User's Excellent Clarification:

> "For the 'verified excellence' badge, I am assuming this is to cover the 'verified' badge I mentioned before. I think 'verified excellence' should be reserved for those who actually buy a package and make it out on the other side green but also reflecting in their PCRs. But, there should also be a regular 'verified' and quite frankly an 'unverified' badge as well. Or it may be cleaner to have no badge on the unverified listings. That could work. Nonetheless, we need the differentiation between the verified listings. Anyone can have verified. Whether they are on subscription or not. That just means they took the time to fill out the profile so the info didn't just only come from us without confirmation from the listed company. The verified excellence should replace the regular verified if and only if a subscription company has an 88 overall PCR score or higher."

---

## Updated Badge System Design

### 1. **"Verified" Badge (Regular)** ✓

**Who Gets It:**
- **ANY partner** (free, gold, or platinum tier)
- Who has completed and confirmed their profile

**Criteria:**
```javascript
profile_completion_score >= 70
```

**Purpose:**
- Indicates profile data has been confirmed by the company
- Shows the info didn't just come from us without confirmation
- **Independent of subscription tier or PCR score**

**Icon:** ✓ (simple checkmark)

---

### 2. **"Verified Excellence" Badge** ✅

**Who Gets It:**
- **ONLY paid subscribers** (gold OR platinum tier)
- Who maintain high PCR performance

**Criteria:**
```javascript
(engagement_tier === 'gold' OR engagement_tier === 'platinum')
AND final_pcr_score >= 88
AND subscription_status === 'active'
```

**Purpose:**
- Reserved for partners who:
  - Bought a package (paid subscription)
  - Made it out on the other side green (active status)
  - Reflecting excellence in their PCRs (88+ score)

**Badge Replacement Logic:**
- When earned, **REPLACES** the regular "Verified" badge
- Partner shows "Verified Excellence" (✅) instead of "Verified" (✓)

**Icon:** ✅ (bold checkmark)

---

### 3. **"Unverified" (No Badge)**

**Who Gets This:**
- Partners with `profile_completion_score < 70`
- Simply **no badge displayed** (cleaner approach)

**Purpose:**
- Indicates profile not yet confirmed or incomplete
- No visual badge clutter

---

## Badge Hierarchy Visual

```
┌─────────────────────────────────────────────────────────┐
│                   Badge Decision Tree                    │
└─────────────────────────────────────────────────────────┘

Profile Completion < 70?
│
├─ YES → No badge (unverified)
│
└─ NO → Check subscription tier...
    │
    ├─ FREE Tier
    │   └─ Profile >= 70 → "Verified" ✓
    │
    ├─ GOLD Tier (Active)
    │   ├─ PCR < 88 → "Verified" ✓
    │   └─ PCR >= 88 → "Verified Excellence" ✅ (replaces Verified)
    │
    └─ PLATINUM Tier (Active)
        ├─ PCR < 88 → "Verified" ✓
        └─ PCR >= 88 → "Verified Excellence" ✅ (replaces Verified)
```

---

## Example Scenarios

### Scenario 1: Free Tier Partner
- **Profile Completion:** 85
- **Tier:** Free
- **PCR:** 75
- **Result:** Earns "Verified" ✓ badge
- **Why:** Profile confirmed, but not eligible for excellence (not paid tier)

### Scenario 2: Gold Partner - Good but Not Excellent
- **Profile Completion:** 90
- **Tier:** Gold (Active, 6 months)
- **PCR:** 82
- **Result:** Earns "Verified" ✓ badge
- **Why:** Profile confirmed, but PCR < 88 (doesn't qualify for excellence)

### Scenario 3: Gold Partner - Excellence Achieved
- **Profile Completion:** 90
- **Tier:** Gold (Active, 6 months)
- **PCR:** 92
- **Result:** Earns "Verified Excellence" ✅ badge
- **Why:** Paid subscriber with 88+ PCR - replaces regular Verified

### Scenario 4: Platinum Partner - Excellence Achieved
- **Profile Completion:** 95
- **Tier:** Platinum (Active, 8 months)
- **PCR:** 88
- **Result:** Earns "Verified Excellence" ✅ badge
- **Why:** Paid subscriber with exactly 88 PCR - qualifies for excellence

### Scenario 5: Incomplete Profile
- **Profile Completion:** 50
- **Tier:** Any
- **PCR:** Any
- **Result:** No badge displayed
- **Why:** Profile not sufficiently completed/confirmed

---

## Code Implementation

### Badge Definitions:
```javascript
const BADGE_TYPES = {
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
    description: 'Paid subscriber (Gold/Platinum) with 88+ PCR score',
    category: 'verification',
    icon: '✅'
  }
};
```

### Eligibility Rules:
```javascript
const ELIGIBILITY_RULES = {
  verified: {
    check: (partner) => partner.profile_completion_score >= 70,
    minMonths: 0
  },
  verified_excellence: {
    check: (partner) => {
      const isPaidTier = partner.engagement_tier === 'gold' ||
                        partner.engagement_tier === 'platinum';
      const hasHighPCR = partner.final_pcr_score >= 88;
      const isActive = partner.subscription_status === 'active';

      return isPaidTier && hasHighPCR && isActive;
    },
    minMonths: 0,
    replaceBadge: 'verified'  // Replaces regular verified when earned
  }
};
```

### Badge Calculation Logic:
```javascript
function calculateEligibleBadges(partner) {
  const earnedBadges = [];
  const badgesToReplace = new Set();

  // First pass: Calculate all eligible badges
  for (const [badgeId, badge] of Object.entries(BADGE_TYPES)) {
    const rule = ELIGIBILITY_RULES[badgeId];

    if (rule && rule.check(partner)) {
      earnedBadges.push({
        type: badgeId,
        name: badge.name,
        icon: badge.icon
      });

      // Track badges that should be replaced
      if (rule.replaceBadge) {
        badgesToReplace.add(rule.replaceBadge);
      }
    }
  }

  // Second pass: Remove replaced badges
  // If "verified_excellence" is earned, remove "verified"
  return earnedBadges.filter(badge => !badgesToReplace.has(badge.type));
}
```

---

## Key Takeaways

1. ✅ **Momentum service is SEPARATE** from contractor pattern tracking services
2. ✅ **Regular "Verified"** = Profile confirmation (any tier, any PCR)
3. ✅ **"Verified Excellence"** = Paid subscribers ONLY with 88+ PCR
4. ✅ **Verified Excellence REPLACES regular Verified** when earned
5. ✅ **Unverified** = No badge displayed (cleaner approach)
6. ✅ **Profile completion >= 70** required for any verification badge

---

**Status:** Documentation updated with corrected badge logic
**Implementation Plan:** Updated (`PHASE-2-IMPLEMENTATION-PLAN.md`)
**Next Step:** Ready to proceed with Phase 2 implementation
