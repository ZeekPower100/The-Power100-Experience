# Phase 3: PowerCards Integration & Engagement Layer

**Version:** 1.1
**Date:** October 30, 2025
**Status:** Ready for Implementation
**Prerequisites:** Phase 1 (Core PCR) + Phase 2 (Momentum & Badges) COMPLETE ✅

---

## 🎯 Executive Summary

Phase 3 **integrates** the existing PowerCards quarterly feedback system with the PCR scoring engine, then adds visual engagement layers to existing partner portal. This is an **integration project**, not a build-from-scratch project.

### Key Discovery: PowerCards Already Exists! 🎉

**Existing Infrastructure:**
- ✅ `power_card_campaigns` table (11 columns - quarterly campaigns Q1-2025, Q2-2025, etc.)
- ✅ `power_card_responses` table (13 columns - actual survey responses with scores)
- ✅ `power_card_templates` table (18 columns - customizable surveys per partner)
- ✅ `power_card_recipients` table (18 columns - who gets surveys)
- ✅ `power_card_analytics` table (17 columns - aggregated quarterly data)
- ✅ Partner portal dashboard (`/partner-portal/dashboard` - existing with stats cards)
- ✅ `strategic_partners` Phase 2 fields (145 columns including momentum_modifier, earned_badges, quarterly_history)

### What Phase 3 Delivers

**Integration Layer (Days 1-2):**
- ✅ Connect PowerCards responses → `quarterly_history` JSONB array
- ✅ Trigger momentum recalculation after campaign completion (status = 'completed')
- ✅ Aggregate PowerCards scores into PCR quarterly feedback score
  - Formula: (satisfaction × 40%) + (recommendation × 30%) + (metrics × 30%)
  - Converts satisfaction_score (0-5) to 0-100 scale
  - Converts recommendation_score (-100/100) to 0-100 scale
- ✅ Badge eligibility updates based on real feedback
- ✅ Automatic PCR recalculation with new momentum

**Engagement Layer (Days 3-4):**
- ✅ Integrate badges into existing partner portal dashboard
- ✅ Add momentum and performance cards to existing stats section
- ✅ Quarterly performance chart component (last 4 quarters)
- ✅ Badge achievement showcase with icons and descriptions

**Analytics Layer (Day 5):**
- ✅ PCR evolution chart in partner portal
- ✅ Momentum history visualization
- ✅ Admin analytics enhancement (all-partner momentum overview)
- ✅ Admin "Process PowerCard Campaign" action for bulk updates

---

## 🔄 Why Phase 3 Matters

### Current State (After Phase 2):
- ✅ PCR scores calculated with momentum modifiers
- ✅ Badges awarded based on performance
- ✅ **PowerCards collecting quarterly feedback** (existing system!)
- ⚠️ **BUT:** PowerCards data **NOT connected** to momentum calculations
- ⚠️ **BUT:** Partners can't see their badges or momentum
- ⚠️ **BUT:** No visual analytics in partner portal
- ⚠️ **BUT:** No celebration/notification when badges earned

### Phase 3 Transforms This:
1. **PowerCards → Momentum Pipeline** → Real quarterly data drives momentum
2. **Badge Visibility** → Integrate into existing partner portal
3. **Visual Performance Journey** → Charts in existing dashboard
4. **Email Notifications** → Celebrate achievements
5. **Admin Analytics** → All-partner momentum/badge overview

---

## 📦 Phase 3 Components

### 1. PowerCards Integration Layer (CRITICAL)

**Why Critical:** Phase 2 momentum system needs real quarterly data. PowerCards exists but isn't connected to PCR scoring.

**Current State:**
- ✅ PowerCards tables exist with 5 tables (campaigns, responses, analytics, templates, recipients)
- ✅ Quarterly surveys sent to contractors via PowerCards system
- ✅ Responses stored in power_card_responses with satisfaction/NPS/custom metrics
- ⚠️ **BUT:** PowerCards data does NOT flow into strategic_partners.quarterly_history
- ⚠️ **BUT:** Momentum calculations use default score of 50 (not real feedback)
- ⚠️ **BUT:** No automation when campaign is marked "completed"

**What We Build:**
- PowerCards integration service (aggregation + quarterly_history population)
- Campaign completion webhook/trigger (status = 'completed')
- Automatic momentum/badge/PCR recalculation after campaign
- Score aggregation formula: (satisfaction × 40%) + (recommendation × 30%) + (metrics × 30%)
- Data conversion: satisfaction (0-5 → 0-100), recommendation (-100/100 → 0-100)

**Impact:**
- ✅ Unlock Phase 2 momentum system with REAL quarterly feedback data
- ✅ Enable hot streak and declining trend detection based on actual scores
- ✅ Make badges meaningful and achievable (real 85+ scores possible)
- ✅ Verified Excellence badges earned through real performance (88+ PCR)
- ✅ Create automated feedback loop for partner improvement

---

### 2. Frontend Badge Display UI

**Why Important:** Partners can't see badges they earned. No visibility = no engagement.

**What We Build:**
- Badge showcase on partner profile pages
- Badge icons/tooltips in partner directory listings
- "Earned Badges" section with hover details
- Responsive badge grid for mobile/desktop
- Badge categories (verification, tier, performance)

**Impact:**
- Partners see their achievements immediately
- Social proof in directory (builds trust)
- Visual recognition motivates improvement
- Clear differentiation between partner tiers

---

### 3. Badge Achievement Timeline

**Why Important:** Gamification drives behavior. Seeing progress over time creates engagement.

**What We Build:**
- Chronological timeline of badge achievements
- Visual milestones (first badge, tier upgrades, hot streaks)
- "Next Badge" suggestions with progress bars
- Celebration animations when badges are earned
- Shareable badge achievements (social media ready)

**Impact:**
- Partners stay engaged with their progress
- Clear path to next achievement
- Gamification increases tier upgrades
- Creates sticky engagement loop

---

### 4. Badge Notifications & Email Alerts

**Why Important:** Real-time feedback creates emotional connection and drives action.

**What We Build:**
- Email alerts when badges are earned
- Congratulations emails with badge details
- "You're close to..." reminder emails
- Declining performance alert emails
- Quarterly review invitation emails

**Email Types:**
1. **Achievement Emails** → "🎉 You earned Hot Streak badge!"
2. **Milestone Emails** → "⭐ You've earned 5 badges!"
3. **Encouragement Emails** → "📈 You're 2 points away from Verified Excellence"
4. **Alert Emails** → "⚠️ Your performance trend is declining"
5. **Review Invitation** → "📊 Time for your quarterly review"

**Impact:**
- Partners feel recognized and valued
- Immediate feedback loop
- Proactive alerts prevent churn
- Drives engagement with platform

---

### 5. Momentum History Tracking & Analytics

**Why Important:** Data without visualization is invisible. Partners need to see their journey.

**What We Build:**
- Momentum history chart (line graph over time)
- Quarterly score comparison (bar chart)
- Performance trend heatmap (color-coded quarters)
- Badge progress dashboard
- PCR score evolution timeline

**Visualizations:**
1. **Momentum Chart** → Shows +5/-3/0 modifiers over time
2. **Quarterly Trend** → Line graph of quarterly scores
3. **PCR Evolution** → How final PCR changed over time
4. **Badge Timeline** → When each badge was earned
5. **Performance Heatmap** → Green/yellow/red quarters at a glance

**Impact:**
- Partners understand their performance patterns
- Visual feedback is more engaging than numbers
- Easy to identify improvement opportunities
- Data-driven conversations in quarterly reviews

---

## 🗓️ Implementation Timeline (5 Days)

### Day 1-2: Quarterly Feedback Collection (CRITICAL PATH)
**Priority:** HIGHEST - Enables all momentum/badge features

**Day 1:**
- Database migration for quarterly_feedback_records table
- Feedback collection API endpoints
- Basic admin UI for adding feedback

**Day 2:**
- Quarterly review workflow UI
- Automated reminder system
- Integration with momentum recalculation
- Testing with sample feedback data

**Deliverable:** Real quarterly feedback data flowing into momentum calculations

---

### Day 3: Frontend Badge Display
**Priority:** HIGH - Makes badges visible and valuable

**Tasks:**
- Partner profile badge showcase component
- Directory listing badge icons
- Badge tooltip/modal with details
- Responsive design for mobile
- Integration with badge API

**Deliverable:** Badges visible on all partner touchpoints

---

### Day 4: Badge Timeline & Notifications
**Priority:** MEDIUM - Drives engagement and stickiness

**Morning:**
- Badge achievement timeline component
- "Next badge" progress indicators
- Celebration animations

**Afternoon:**
- Email notification service integration
- Badge achievement email templates
- Declining performance alert emails
- Quarterly review invitation system

**Deliverable:** Full engagement loop with notifications

---

### Day 5: Momentum History & Analytics
**Priority:** MEDIUM - Analytics and insights layer

**Morning:**
- Momentum history chart (Chart.js/Recharts)
- Quarterly score line graph
- Performance trend heatmap

**Afternoon:**
- PCR evolution timeline
- Badge analytics dashboard
- Admin analytics overview

**Deliverable:** Visual analytics across admin and partner dashboards

---

## 🎯 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Quarterly Feedback Collection** | 100% of active partners | Admin can add feedback for any partner |
| **Badge Display Speed** | < 200ms load time | Frontend badge component performance |
| **Email Delivery Rate** | 95%+ | Email service delivery confirmation |
| **Momentum Accuracy** | 100% | Test with real quarterly data scenarios |
| **Chart Render Time** | < 500ms | Analytics dashboard load time |
| **Partner Engagement** | 50%+ open rate on emails | Email analytics tracking |

---

## 🗂️ Database Schema Changes (Phase 3)

### New Tables:

**1. quarterly_feedback_records**
```sql
CREATE TABLE quarterly_feedback_records (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES strategic_partners(id),
  quarter VARCHAR(10),  -- 'Q1-2025', 'Q2-2025', etc.
  year INTEGER,

  -- Feedback scores
  customer_satisfaction NUMERIC(3,2),  -- 0-5 scale
  nps_score INTEGER,  -- -100 to 100
  custom_metric_1 NUMERIC(5,2),
  custom_metric_2 NUMERIC(5,2),

  -- Calculated aggregate
  aggregate_score NUMERIC(5,2),  -- 0-100 scale for momentum

  -- Metadata
  collected_by INTEGER REFERENCES admin_users(id),
  collected_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,

  -- Status
  is_finalized BOOLEAN DEFAULT false,
  finalized_at TIMESTAMP
);
```

**2. badge_notifications**
```sql
CREATE TABLE badge_notifications (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES strategic_partners(id),
  badge_type VARCHAR(50),
  badge_name VARCHAR(100),

  -- Notification details
  sent_at TIMESTAMP DEFAULT NOW(),
  email_sent BOOLEAN DEFAULT false,
  email_opened BOOLEAN DEFAULT false,
  email_clicked BOOLEAN DEFAULT false,

  -- Content
  subject TEXT,
  body TEXT
);
```

### Modified Tables:

**strategic_partners** (additional fields)
```sql
ALTER TABLE strategic_partners
ADD COLUMN next_quarterly_review DATE,
ADD COLUMN last_notification_sent TIMESTAMP,
ADD COLUMN email_notifications_enabled BOOLEAN DEFAULT true;
```

---

## 🔗 Integration Points

### Phase 1 & 2 Dependencies:
1. **PCR Calculation** → Updated when quarterly feedback added
2. **Momentum Service** → Uses quarterly_feedback_records for trend analysis
3. **Badge Service** → Triggered after quarterly feedback finalization
4. **Email Service** → Used for all notification types

### External Services:
1. **Email Service** → SendGrid/AWS SES for badge notifications
2. **Chart Library** → Chart.js or Recharts for analytics visualizations
3. **Date Scheduler** → Node-cron for quarterly reminder automation

---

## 📊 Phase 3 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Phase 3 Architecture                      │
└─────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│  1. Quarterly Feedback Collection                          │
├────────────────────────────────────────────────────────────┤
│  Admin UI → Feedback API → Database → Momentum Recalc     │
│  Email Reminders → Review Workflow → Finalization         │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│  2. Frontend Badge Display                                 │
├────────────────────────────────────────────────────────────┤
│  Partner Profile → Badge API → Badge Component            │
│  Directory Listing → Badge Icons → Tooltips               │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│  3. Badge Timeline & Notifications                         │
├────────────────────────────────────────────────────────────┤
│  Badge Earned → Email Service → Partner Notification      │
│  Timeline Component → Achievement History → Next Goals    │
└────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────┐
│  4. Momentum History & Analytics                           │
├────────────────────────────────────────────────────────────┤
│  Quarterly Data → Chart Components → Visual Dashboard     │
│  Trend Analysis → Heatmaps → Performance Insights         │
└────────────────────────────────────────────────────────────┘
```

---

## 🎨 UI/UX Mockups (Conceptual)

### Badge Display Component:
```
┌─────────────────────────────────────────┐
│  Destination Motivation                 │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  PCR Score: 89/105 📈                   │
│                                         │
│  Earned Badges (3):                     │
│  ┌────┐  ┌────┐  ┌────┐                │
│  │ ✅ │  │ 🥇 │  │ ⭐ │                │
│  └────┘  └────┘  └────┘                │
│  Verified Power   Rising                │
│  Excellence Gold   Star                 │
│                                         │
│  Next Badge: Hot Streak (2 quarters)   │
│  Progress: ████████░░ 80%              │
└─────────────────────────────────────────┘
```

### Momentum History Chart:
```
Momentum Modifier Over Time
 +5 |     ●──────●
  0 |  ●──╯      └──●──●
 -3 |                    ●
    └─────────────────────────
     Q1  Q2  Q3  Q4  Q1  Q2
    2024           2025
```

---

## 📚 Related Documents

- **Phase 1:** [Phase 1 Implementation Plan](../phase-1/PHASE-1-IMPLEMENTATION-PLAN.md)
- **Phase 2:** [Phase 2 Implementation Plan](../phase-2/PHASE-2-IMPLEMENTATION-PLAN.md)
- **PCR Overview:** [PCR Scoring System Overview](../PCR-SCORING-OVERVIEW.md)
- **Partner Payments:** [Partner Payments Overview](../../Partner-Payments/PARTNER-PAYMENTS-OVERVIEW.md)

---

## 🚀 Ready to Build?

**Next Steps:**
1. ✅ Review this overview document
2. ✅ Complete Pre-Flight Checklist (Phase 3 database verification)
3. ✅ Review detailed Implementation Plan
4. ✅ Begin Day 1 - Quarterly Feedback Collection

**Estimated Timeline:** 5 days (full-time) or 2 weeks (part-time)
**Complexity:** Medium (building on Phase 1 & 2 foundation)
**Impact:** HIGH (unlocks all momentum features + drives engagement)

---

**Last Updated:** October 30, 2025
**Status:** Ready for implementation
**Prerequisites:** Phase 1 & 2 complete ✅
