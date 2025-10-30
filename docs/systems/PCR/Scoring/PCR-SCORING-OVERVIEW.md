# PowerConfidence Rating (PCR) Scoring System - Complete Overview

**Document Version:** 1.0
**Date:** October 29, 2025
**Status:** READY FOR IMPLEMENTATION
**Owner:** Greg Cummings & Development Team

---

## 🎯 Vision & Purpose

### The Problem
Strategic partners need a **trust-based ranking system** that rewards:
- Quality performance (customer satisfaction)
- Transparency (complete profiles with social proof)
- Engagement (commitment to the Power100 platform)
- Consistency (sustained excellence over time)

Current system only measures quarterly feedback, creating a "cold start" problem where new partners can't get ranked until they have customer data.

### The Solution
**PCR Scoring System**: A multi-component trust algorithm that:
- Gives immediate scores based on profile completion
- Evolves over time with real customer feedback
- Rewards platform engagement with payment-tier multipliers
- Recognizes performance trends with momentum modifiers
- Provides visual trust indicators through badges

### Core Vision

> "At the end of the day it is all about **trust**. And, the more we trust, the higher an entity's score should be."
> — Greg Cummings, October 29, 2025

The system combines:
1. **What partners show us** (profile completion)
2. **What customers tell us** (quarterly feedback)
3. **How engaged they are** (payment tiers)
4. **How they're trending** (momentum)

---

## 🧠 Core Concept

### What Is PCR?

PCR (PowerConfidence Rating) is a **0-100 score** that determines:
- Partner ranking in contractor matching algorithm
- Visibility in AI Concierge recommendations
- Search result ordering
- Trust badge eligibility

### Complete Formula

```
Step 1: Profile Completion Score (0-100)
  = Weighted sum of profile elements

Step 2: Quarterly Feedback Score (0-100)
  = (Customer Satisfaction × 40%) + (NPS × 25%) + (Custom Metrics × 25%) + (Culture × 10%)
  = Defaults to 50 until first quarterly feedback

Step 3: Base PCR (0-100)
  = (Profile Completion × 30%) + (Quarterly Feedback × 70%)

Step 4: Final PCR (0-100)
  = (Base PCR × 0.80) + (20 × Payment Multiplier / 5) ± Momentum Modifier

Where:
  Payment Multiplier = 1.5 (Free) | 2.5 (Verified) | 5.0 (Gold)
  Momentum Modifier = +5 (hot streak) | 0 (stable) | -3 (declining)
```

---

## 📊 System Components

### Component 1: Profile Completion Score (30% of Base PCR)

**Purpose:** Give immediate score to new partners based on transparency

**Weighted Elements (totals 100 points):**
- **5 Customer Feedbacks**: 25 points (HIGH - transparency)
- **5 Employee Feedbacks**: 20 points (HIGH - culture proof)
- **5 Demo Videos**: 20 points (HIGH - process proof)
- **Key Differentiators**: 10 points (MEDIUM)
- **Company Description**: 10 points (MEDIUM)
- **Unique Value Proposition**: 5 points (LOW)
- **Contact Information (multiple)**: 5 points (LOW)
- **Additional Profile Elements**: 5 points (LOW)

**Example:**
```
Partner with complete 5/5/5: 65 points
Partner with 5 customer + 5 employee: 45 points
Partner with basic info only: 20 points
```

---

### Component 2: Quarterly Feedback Score (70% of Base PCR)

**Purpose:** Measure actual performance with real customer data

**Formula:**
```javascript
Quarterly Score =
  (Customer Satisfaction × 0.40) +  // Most important
  (NPS × 0.25) +
  (Custom Metrics Average × 0.25) +
  (Culture Score × 0.10)
```

**Default Behavior:**
- **New partners (no data yet)**: Score = 50 (neutral baseline)
- **After first quarter**: Score = calculated from real data
- **Every quarter**: Score updated with latest feedback

**Data Sources:**
- Customer satisfaction calls (quarterly Power Card campaigns)
- NPS surveys
- Custom performance metrics
- Culture assessments

**Example:**
```
Customer Sat: 85/100
NPS: 78/100
Custom Metrics: 80/100
Culture: 75/100

Quarterly Score = (85 × 0.40) + (78 × 0.25) + (80 × 0.25) + (75 × 0.10)
                = 34 + 19.5 + 20 + 7.5
                = 81
```

---

### Component 3: Payment Tier Multipliers

**Purpose:** Reward transparency and deep due diligence with trust boost

**Three Tiers:**

#### 1.5x - Free Tier
- **Cost**: Free
- **Description**: Basic listing (claimed or unclaimed)
- **Profile**: Any level of completion
- **Boost**: +6 points at 80 Base PCR

#### 2.5x - Power100 Verified
- **Cost**: $3,600/month (12-month commitment)
- **Description**: Content & storytelling package with due diligence
- **Requirements**: Paid tier (profile completion not required)
- **Boost**: +10 points at 80 Base PCR
- **Badge**: "Power100 Verified"

#### 5x - Power100 Verified Gold
- **Cost**: $6,000/month (12-month commitment)
- **Description**: Premium package with maximum transparency
- **Requirements**: Paid premium tier
- **Boost**: +20 points at 80 Base PCR
- **Badge**: "Power100 Verified Gold"

**Philosophy:**
> "You're paying us to prove to the world that you are legit and stand by your people and processes."

Partners paying for deeper scrutiny demonstrate confidence in their business, earning higher trust scores.

---

### Component 4: Momentum Modifier (±5 Points)

**Purpose:** Recognize performance trends and reward sustained excellence

**Calculation:**
```javascript
// Analyze last 3-4 quarterly scores
const trend = analyzeQuarterlyTrend(partner);

if (trend === 'improving_3_quarters') {
  momentum = +5;  // Hot streak
} else if (trend === 'declining_2_quarters') {
  momentum = -3;  // Needs attention
} else {
  momentum = 0;   // Stable
}

Final PCR = Base PCR + momentum;
```

**Trend Definitions:**
- **Hot Streak (+5)**: Base PCR improved for 3+ consecutive quarters
- **Stable (0)**: Fluctuations within ±5 points
- **Declining (-3)**: Base PCR dropped for 2+ consecutive quarters
- **New Partner (0)**: < 2 quarters of data

**Example Impact:**
```
Partner with Base 80, 2.5x tier = 74 Final PCR

Hot streak:  74 + 5 = 79 Final PCR
Declining:   74 - 3 = 71 Final PCR
```

---

### Component 5: Trust Badges (Visual Layer)

**Purpose:** Provide visual trust indicators without score inflation

**Badge Types:**

#### Tier Badges (Mutually Exclusive)
- **"Unverified"**: Free tier, unclaimed listing
- **"Verified"**: Free tier, claimed and verified listing
- **"Power100 Verified"**: $3,600/mo tier
- **"Power100 Verified Gold"**: $6,000/mo tier

#### Performance Badges (Can Stack with Tier Badges)
- **🔥 "Hot Partner"**: 3+ quarters of consistent improvement
- **⭐ "Consistent Performer"**: PCR 90+ for 4+ consecutive quarters
- **📈 "Rising Star"**: Base PCR improved 20+ points in 2 quarters
- **🏆 "Top Rated"**: Top 10% in category by Final PCR

**Display:**
```
┌──────────────────────────────────────────┐
│  ABC Contracting Software                │
│  ⭐ Power100 Verified Gold  🔥 Hot Partner │
│  PCR: 91 | Category: CRM Tools           │
└──────────────────────────────────────────┘
```

---

## 🔄 Complete System Flow

### Scenario 1: New Partner Joins (Day 1)

**Profile Created:**
- Company description: ✅ (10 pts)
- Key differentiators: ✅ (10 pts)
- 5 demo videos: ✅ (20 pts)
- 5 employee feedbacks: ✅ (20 pts)
- 5 customer feedbacks: ❌ (0 pts)
- Contact info: ✅ (5 pts)

**Calculations:**
```
Profile Completion Score: 65/100

Quarterly Feedback Score: 50/100 (default - no data yet)

Base PCR = (65 × 0.30) + (50 × 0.70)
         = 19.5 + 35
         = 54.5

Payment Tier: Free (1.5x multiplier)

Final PCR = (54.5 × 0.80) + (20 × 1.5 / 5) + 0
          = 43.6 + 6 + 0
          = 49.6

Badge: "Unverified" (if unclaimed) or "Verified" (if claimed)
```

**Result:** Partner ranked with PCR 50, searchable, but lower visibility than established partners.

---

### Scenario 2: Same Partner After First Quarter

**Quarterly Feedback Collected:**
- Customer Satisfaction: 82/100
- NPS: 75/100
- Custom Metrics: 78/100
- Culture: 80/100

**Calculations:**
```
Profile Completion Score: 65/100 (unchanged)

Quarterly Feedback Score = (82 × 0.40) + (75 × 0.25) + (78 × 0.25) + (80 × 0.10)
                         = 32.8 + 18.75 + 19.5 + 8
                         = 79.05

Base PCR = (65 × 0.30) + (79.05 × 0.70)
         = 19.5 + 55.34
         = 74.84

Payment Tier: Still Free (1.5x)

Final PCR = (74.84 × 0.80) + (20 × 1.5 / 5) + 0
          = 59.87 + 6 + 0
          = 65.87

Badge: "Verified"
```

**Result:** PCR jumped from 50 to 66 based on strong customer feedback.

---

### Scenario 3: Same Partner Upgrades to Power100 Verified ($3,600/mo)

**No Other Changes:**
```
Base PCR: 74.84 (same as before)

Payment Tier: Power100 Verified (2.5x multiplier)

Final PCR = (74.84 × 0.80) + (20 × 2.5 / 5) + 0
          = 59.87 + 10 + 0
          = 69.87

Badge: "Power100 Verified"
```

**Result:** +4 point boost from tier upgrade (66 → 70).

---

### Scenario 4: High Performer with Hot Streak + Gold Tier

**Profile:**
- Profile Completion: 95/100 (missing 1 customer feedback)
- Quarterly Feedback: 88/100 (excellent performance)
- Payment Tier: Power100 Verified Gold (5x)
- Momentum: +5 (3 quarters of improvement)

**Calculations:**
```
Base PCR = (95 × 0.30) + (88 × 0.70)
         = 28.5 + 61.6
         = 90.1

Final PCR = (90.1 × 0.80) + (20 × 5 / 5) + 5
          = 72.08 + 20 + 5
          = 97.08

Badges: "Power100 Verified Gold" + "Hot Partner" + "Consistent Performer"
```

**Result:** Near-perfect score (97) achievable through excellence + engagement + consistency.

---

## 🎯 Two-Phase Implementation

### Phase 1: Core PCR Calculation Engine
**Duration:** 5-7 days
**Goal:** Calculate and display PCR scores based on profile + quarterly + multipliers

**What Gets Built:**
- Database schema additions (engagement tiers, profile scoring, quarterly defaults)
- Profile completion scoring logic (weighted elements)
- Base PCR calculation service
- Payment tier multiplier system
- Final PCR formula implementation
- Database field alignment verification

**Deliverable:** Partners have accurate PCR scores that update with data changes

---

### Phase 2: Performance Intelligence Layer
**Duration:** 3-5 days
**Goal:** Add momentum tracking, badges, and AI learning integration

**What Gets Built:**
- Quarterly performance trend analysis
- Momentum modifier calculation (+5/-3)
- Badge eligibility logic (tier + performance badges)
- Badge display in UI components
- Integration with AI Concierge recommendations
- Performance pattern tracking (connects to AI learning loop from earlier discussion)

**Deliverable:** Complete trust-based ranking with visual indicators and AI insights

---

## 📊 Database Requirements

### New Fields for strategic_partners Table

```sql
-- Payment Tier & Engagement
engagement_tier VARCHAR(20) DEFAULT 'free',  -- 'free', 'verified', 'gold'
payment_multiplier NUMERIC(3,1) DEFAULT 1.5,  -- 1.5, 2.5, 5.0
subscription_start_date DATE,
subscription_end_date DATE,
subscription_status VARCHAR(50),  -- 'active', 'cancelled', 'expired'

-- Profile Completion Tracking
profile_completion_score INTEGER DEFAULT 0,  -- 0-100
demo_videos_count INTEGER DEFAULT 0,
employee_feedback_count INTEGER DEFAULT 0,
customer_feedback_count INTEGER DEFAULT 0,
profile_completeness_percent INTEGER DEFAULT 0,  -- For UI display
profile_last_updated TIMESTAMP,

-- Quarterly Feedback Tracking
quarterly_feedback_score NUMERIC(5,2) DEFAULT 50.00,  -- Defaults to 50
last_quarterly_update DATE,
quarterly_history JSONB,  -- [{quarter: 'Q1-2025', score: 78}, ...]
has_quarterly_data BOOLEAN DEFAULT false,

-- PCR Scores
base_pcr_score NUMERIC(5,2),  -- Before multiplier
final_pcr_score NUMERIC(5,2),  -- After multiplier + momentum
previous_pcr_score NUMERIC(5,2),  -- For trend calculation
pcr_last_calculated TIMESTAMP,

-- Momentum & Trends
momentum_modifier INTEGER DEFAULT 0,  -- -3, 0, or +5
performance_trend VARCHAR(50),  -- 'improving', 'stable', 'declining', 'new'
quarters_tracked INTEGER DEFAULT 0,

-- Badges
earned_badges JSONB,  -- ['hot_partner', 'consistent_performer', etc.]
badge_last_updated TIMESTAMP
```

---

## 🎯 Success Metrics

### System Performance
- **Calculation Speed**: < 100ms to calculate all PCR components
- **Data Freshness**: Scores update within 5 minutes of profile/feedback changes
- **Accuracy**: 100% alignment between database fields and calculation logic

### Business Impact
- **Cold Start Solution**: New partners get immediate ranking (no waiting for quarterly)
- **Trust Transparency**: Contractors see why partners are ranked (badges + scores)
- **Engagement Incentive**: Partners upgrade tiers for visibility boost
- **Quality Recognition**: Top performers maintain high scores despite free tier

### Partner Experience
- **Score Understanding**: Partners know what drives their score
- **Actionable Feedback**: Clear path to improvement (complete profile, get feedback, perform well)
- **Fair Competition**: Quality partners can compete with paid tiers through excellence

---

## 🎨 Key Features

### 1. Fair Baseline for New Partners

**Problem Solved:** New partners no longer stuck at 0 score waiting for quarterly feedback

**Solution:**
```
New partner with complete profile: PCR ~65 (free tier)
Established partner with poor performance: PCR ~50

Result: Quality new partners can outrank poor performers immediately
```

---

### 2. Quarterly Feedback Evolves Score Over Time

**Pattern:**
```
Month 1:  Profile 80, Quarterly 50 (default) → Base PCR 65
Month 4:  Profile 80, Quarterly 75 (1st quarter) → Base PCR 77.5  (+12.5)
Month 7:  Profile 80, Quarterly 82 (2nd quarter) → Base PCR 81.4  (+3.9)
Month 10: Profile 80, Quarterly 85 (3rd quarter) → Base PCR 83.5  (+2.1)
```

Real performance data increasingly dominates the score over time (70% weight).

---

### 3. Payment Tiers Reward Transparency

**Trust Philosophy:**
```
"Partners who pay for deeper due diligence have nothing to hide"

Free Tier (1.5x):      "I'm here, basic profile"
Verified Tier (2.5x):  "Investigate my business thoroughly"
Gold Tier (5.0x):      "Maximum transparency, I'm confident"
```

---

### 4. Momentum Recognizes Sustained Excellence

**Hot Streak Example:**
```
Q1 2025: Base PCR 75
Q2 2025: Base PCR 78  (+3)
Q3 2025: Base PCR 81  (+3)
Q4 2025: Base PCR 81 + 5 momentum = 86 Final PCR

Badge Earned: "Hot Partner" 🔥
```

---

### 5. Badges Provide Visual Trust Signals

**Contractor View:**
```
Search Results:

1. ⭐ BuildPro CRM - Power100 Verified Gold  🔥 Hot Partner
   PCR: 94 | "Outstanding platform with proven track record"

2. 📊 ContractorPro - Power100 Verified
   PCR: 82 | "Reliable solution with strong customer satisfaction"

3. 📈 NewTech Solutions - Verified  Rising Star
   PCR: 76 | "Rapidly improving platform with great potential"
```

---

## 🔗 Integration Points

### AI Concierge Recommendations

PCR scores directly influence AI Concierge behavior:

```javascript
// AI checks PCR when recommending partners
const topMatches = partners
  .filter(p => focusAreaMatch(p, contractor))
  .sort((a, b) => b.final_pcr_score - a.final_pcr_score)
  .slice(0, 3);

// AI mentions trust indicators naturally
AI: "Based on your lead generation focus, I recommend BuildPro CRM
     (PCR 94, Power100 Verified Gold). They've been on a hot streak
     with 3 quarters of improvement and have strong customer feedback."
```

### AI Learning Loop Integration

**Remember our earlier discussion about performance patterns?**

PCR data feeds into the AI learning system:
```sql
-- Find patterns: What drives high PCR?
SELECT
  focus_areas,
  AVG(final_pcr_score) as avg_pcr,
  COUNT(*) as partner_count
FROM strategic_partners
WHERE engagement_tier = 'gold'
  AND performance_trend = 'improving'
GROUP BY focus_areas
ORDER BY avg_pcr DESC;
```

AI learns: "Partners focused on X with Gold tier average PCR 92, while partners focused on Y average 78"

This connects to partner success patterns for contractor recommendations.

---

## 📚 Related Documents

**Phase Implementation Plans:**
- [Phase 1: Core PCR Calculation Engine](./phase-1/PHASE-1-IMPLEMENTATION-PLAN.md)
- [Phase 2: Performance Intelligence Layer](./phase-2/PHASE-2-IMPLEMENTATION-PLAN.md)

**Pre-Flight Checklists:**
- [Phase 1 Pre-Flight Checklist](./phase-1/PHASE-1-PRE-FLIGHT-CHECKLIST.md)
- [Phase 2 Pre-Flight Checklist](./phase-2/PHASE-2-PRE-FLIGHT-CHECKLIST.md)

**Reference Documents:**
- Quarterly Feedback System: `tpe-backend/src/services/powerConfidenceService.js`
- Partner Profile Schema: Check database before implementation
- AI Concierge Integration: `docs/features/ai-concierge/`

---

## 🎉 Expected Outcomes

### For Contractors
- **Better Matches**: Trust-based ranking surfaces highest quality partners first
- **Transparency**: Understand why partners are recommended (badges + scores visible)
- **Confidence**: PCR score provides objective quality signal

### For Partners
- **Fair Start**: New partners can compete immediately with complete profiles
- **Growth Path**: Clear actions to improve score (performance + engagement)
- **Recognition**: Excellence rewarded through high scores and badges
- **Differentiation**: Premium tiers provide visibility boost

### For Power100 Business
- **Revenue Driver**: Payment tiers incentivize partner upgrades ($3,600 or $6,000/mo)
- **Quality Signal**: High PCR partners deliver better contractor experiences
- **Data Intelligence**: PCR patterns inform platform improvements
- **Trust Building**: Objective scoring system builds platform credibility

---

**Last Updated:** October 29, 2025
**Status:** Ready for Phase 1 Implementation
**Next Step:** Complete Phase 1 Pre-Flight Checklist (Database Verification)
