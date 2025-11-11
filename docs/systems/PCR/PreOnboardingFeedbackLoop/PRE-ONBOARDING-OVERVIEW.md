# Pre-Onboarding PowerCard Feedback Loop - System Overview

**Document Version:** 1.0
**Date:** November 10, 2025
**Status:** PHASE 3 COMPLETE, PHASES 1-2 IN PROGRESS
**Database Schema:** Verified November 10, 2025

---

## 📋 Executive Summary

**Goal:** Build a pre-onboarding feedback collection system that generates a partner's first PCR score and first quarterly report before they begin operations within TPX.

### What This System Delivers

When a partner completes their pre-onboarding (Step 8), they submit:
- 5 client demo videos (YouTube URLs)
- 5 customer references (for PowerCard feedback)
- 5 employee references (for PowerCard feedback)

This submission **automatically triggers PowerCard generation** that serves as their **first quarterly feedback loop**, creating:
- Initial PCR score from PowerCard responses
- First quarterly report for partner
- Populated landing page with real data

---

## 🎯 Business Value

### For Partners
- **Instant credibility** through landing page with real customer/employee feedback
- **Baseline PCR score** from day one (no waiting for first quarter)
- **Visibility** in partner directory immediately upon approval

### For The Power100
- **Data-driven onboarding** with verified customer satisfaction
- **Quality control** through feedback before partner goes live
- **Faster time-to-value** with pre-populated landing pages

### For Contractors
- **Trust indicators** via real testimonials and feedback
- **Informed decisions** based on actual performance data
- **Transparent metrics** before engaging with partner

---

## 🏗️ System Architecture

### Three Implementation Phases

#### **Phase 1: PowerCard Generation System** (PENDING)
Build the PowerCard email generation and response collection system
- PowerCard template system for dynamic questions
- Email delivery system for 10 recipients (5 customers + 5 employees)
- Public PowerCard response form (no auth required)
- Response tracking and campaign management

**Key Deliverables:**
- `power_card_campaigns` records for pre-onboarding submissions
- PowerCard emails sent automatically after Step 8
- Response collection form at `/powercard/respond/:token`
- Campaign status tracking (pending → active → completed)

---

#### **Phase 2: PCR Calculation & Report Generation** (PARTIALLY COMPLETE)
Aggregate PowerCard responses and generate first partner report

**Already Complete:**
- ✅ Profile-based PCR scoring (30% weight)
- ✅ Partner dashboard with feedback tracking
- ✅ `pcrCalculationService.js` with scoring formulas

**Still Pending:**
- ❌ PowerCard response aggregation (70% weight)
- ❌ Auto-update `strategic_partners.final_pcr_score` when responses collected
- ❌ Auto-generate first `partner_reports` record
- ❌ Trigger report generation when campaign reaches threshold (e.g., 5+ responses)

**Key Deliverables:**
- Automated PCR calculation from PowerCard responses
- First `partner_reports` record with Q1 data
- PCR score visible on partner dashboard
- Report data populates landing page

---

#### **Phase 3: Landing Page Auto-Population** (COMPLETE ✅)
Landing pages created immediately on approval and populate as data arrives

**Already Complete:**
- ✅ Landing pages created on partner approval
- ✅ `public_url` slug generation in `strategic_partners` table
- ✅ Placeholder text for missing sections
- ✅ Direct partner queries (not dependent on reports)
- ✅ Gradual data population as information becomes available

**Capabilities:**
- Landing page URL: `/pcr/{partner-slug}` available immediately
- Shows profile data (focus areas, value proposition)
- Displays placeholder text for testimonials/videos until data exists
- Auto-updates when PowerCard responses come in

---

## 🗄️ Database Schema

### Core Tables (All Verified November 10, 2025)

#### strategic_partners
```sql
-- Pre-Onboarding Fields
client_demos         TEXT              -- Client demo URLs from Step 8
client_references    TEXT              -- Client reference contacts
employee_references  TEXT              -- Employee reference contacts
landing_page_videos  JSONB             -- Parsed demo videos
logo_url             VARCHAR           -- Company logo
public_url           VARCHAR(100)      -- Landing page slug
final_pcr_score      NUMERIC           -- Current PCR score
focus_areas_served   TEXT              -- Focus areas from Step 1
is_active            BOOLEAN           -- Partner approval status
```

#### power_card_campaigns
```sql
-- Campaign Tracking
id                  INTEGER PRIMARY KEY
partner_id          INTEGER            -- FK to strategic_partners
campaign_name       VARCHAR            -- "Pre-Onboarding Q1 2025"
quarter             VARCHAR            -- Q1, Q2, Q3, Q4
year                INTEGER            -- 2025, 2026, etc.
status              VARCHAR            -- 'pending', 'active', 'completed'
total_sent          INTEGER            -- Always 10 for pre-onboarding
total_responses     INTEGER            -- Count of responses received
```

#### power_card_responses
```sql
-- Response Collection
id                   INTEGER PRIMARY KEY
campaign_id          INTEGER            -- FK to power_card_campaigns
contractor_id        INTEGER            -- NULL for pre-onboarding
template_id          INTEGER            -- FK to power_card_templates
satisfaction_score   INTEGER            -- 1-10 rating
recommendation_score INTEGER            -- NPS: -100 to 100
metric_1_score       INTEGER            -- Custom metric 1
metric_2_score       INTEGER            -- Custom metric 2
metric_3_score       INTEGER            -- Custom metric 3
metric_1_response    TEXT               -- Qualitative feedback
metric_2_response    TEXT
metric_3_response    TEXT
submitted_at         TIMESTAMP
```

#### partner_reports
```sql
-- First Report Storage
id                  INTEGER PRIMARY KEY
partner_id          INTEGER            -- FK to strategic_partners
campaign_id         INTEGER            -- FK to power_card_campaigns
report_type         VARCHAR            -- 'quarterly' for pre-onboarding
quarter             VARCHAR            -- Q1, Q2, Q3, Q4
year                INTEGER
report_data         JSONB              -- Full report structure
avg_satisfaction    NUMERIC            -- Avg from PowerCard responses
avg_nps             INTEGER            -- Avg NPS from responses
total_responses     INTEGER            -- Count of responses
status              VARCHAR            -- 'draft', 'generated', 'delivered'
```

---

## 📊 Data Flow

### Partner Approval → Landing Page Created
```
1. Admin approves partner
   ↓
2. `autoGenerateLandingPage()` in partnerController.js
   ↓
3. Generates slug from company name
   ↓
4. Sets `strategic_partners.public_url` = slug
   ↓
5. Landing page immediately accessible at /pcr/{slug}
   ↓
6. Shows profile data + placeholder text for missing sections
```

### Step 8 Submission → PowerCard Generation (PENDING Phase 1)
```
1. Partner completes Step 8 (5 demos + 5 customers + 5 employees)
   ↓
2. Frontend saves to `strategic_partners`:
   - client_demos (TEXT)
   - client_references (TEXT)
   - employee_references (TEXT)
   - landing_page_videos (JSONB)
   ↓
3. Backend triggers PowerCard campaign creation
   ↓
4. Creates `power_card_campaigns` record:
   - campaign_name: "{Company Name} Pre-Onboarding Q1 2025"
   - quarter: Current quarter
   - year: Current year
   - status: 'pending'
   - total_sent: 10
   ↓
5. Generates 10 unique PowerCard tokens
   ↓
6. Sends 10 PowerCard emails:
   - 5 to customer references
   - 5 to employee references
   ↓
7. Updates campaign status: 'active'
```

### PowerCard Response → PCR Update (PENDING Phase 2)
```
1. Recipient clicks PowerCard email link
   ↓
2. Opens /powercard/respond/:token (public form, no auth)
   ↓
3. Submits satisfaction scores + custom metrics
   ↓
4. Saves to `power_card_responses`:
   - campaign_id
   - satisfaction_score (1-10)
   - recommendation_score (NPS)
   - metric_1/2/3_score
   - qualitative responses
   ↓
5. Increments `power_card_campaigns.total_responses`
   ↓
6. If total_responses >= threshold (5):
   - Aggregate all responses
   - Calculate PCR score (profile 30% + responses 70%)
   - Update `strategic_partners.final_pcr_score`
   - Generate first `partner_reports` record
   - Update campaign status: 'completed'
   ↓
7. Landing page auto-populates with:
   - PCR score (replaces "N/A")
   - Testimonials (from qualitative responses)
   - Performance metrics
```

---

## 🎨 Landing Page States

### State 1: Newly Approved (No Pre-Onboarding Yet)
```
URL: /pcr/{partner-slug} ✅ ACTIVE
├─ Hero Section: Company name, logo, value proposition
├─ Focus Areas: "This partner doesn't have enough data..."
├─ Videos: "This partner doesn't have enough data..."
├─ Testimonials: "This partner doesn't have enough data..."
└─ PCR Score: Initial score based on profile completion (30%)
```

### State 2: Pre-Onboarding Complete (Awaiting PowerCard Responses)
```
URL: /pcr/{partner-slug} ✅ ACTIVE
├─ Hero Section: Fully populated
├─ Focus Areas: ✅ Shows focus areas from Step 1
├─ Videos: ✅ Shows 5 demo videos from Step 8
├─ Testimonials: "This partner doesn't have enough data..."
└─ PCR Score: Updated score based on profile + videos
```

### State 3: PowerCards Submitted (First Report Generated)
```
URL: /pcr/{partner-slug} ✅ FULLY POPULATED
├─ Hero Section: Fully populated
├─ Focus Areas: ✅ Populated
├─ Videos: ✅ Populated
├─ Testimonials: ✅ Shows real customer/employee feedback
└─ PCR Score: ✅ Full score (profile 30% + PowerCard 70%)
```

---

## ⚙️ Technical Implementation

### Phase 1: PowerCard Generation
**Files to Create/Update:**
- `tpe-backend/src/services/powercardGenerationService.js` (NEW)
- `tpe-backend/src/services/emailService.js` (UPDATE)
- `tpe-backend/src/routes/powercard.js` (NEW)
- `tpe-front-end/src/app/powercard/respond/[token]/page.tsx` (NEW)

### Phase 2: Response Aggregation & PCR Calculation
**Files to Update:**
- `tpe-backend/src/services/pcrCalculationService.js` (UPDATE - add PowerCard aggregation)
- `tpe-backend/src/services/reportGenerationService.js` (UPDATE - trigger on campaign completion)
- `tpe-backend/src/controllers/partnerController.js` (UPDATE - auto-calculate PCR)

### Phase 3: Landing Page (COMPLETE ✅)
**Files Already Updated:**
- `tpe-backend/src/services/publicPCRService.js` ✅
- `tpe-backend/src/controllers/partnerController.js` ✅
- `tpe-front-end/src/components/reports/PublicPCRLandingV2.tsx` ✅
- `tpe-backend/migrations/add-partner-slugs.js` ✅

---

## 📅 Implementation Timeline

### Phase 1: PowerCard Generation (5-7 days)
- Day 1-2: PowerCard template system and email generation
- Day 3-4: Public response form and token validation
- Day 5: Campaign management and tracking
- Day 6-7: Testing and error handling

### Phase 2: PCR Calculation (3-5 days)
- Day 1-2: Response aggregation logic
- Day 3: PCR calculation integration
- Day 4: Report generation automation
- Day 5: Testing and validation

### Phase 3: Landing Page (COMPLETE ✅)
- Already implemented and tested
- Landing pages live for all 50 partners

---

## 🎯 Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **PowerCard Delivery Rate** | 95%+ | Emails successfully sent / total campaigns |
| **PowerCard Response Rate** | 40%+ | Responses received / emails sent |
| **PCR Calculation Accuracy** | 100% | Matches manual calculation |
| **Report Generation Speed** | < 2 seconds | Time to generate first report |
| **Landing Page Population** | 100% | All sections populated after responses |

---

## 📚 Related Documentation

- **Phase 1 Implementation:** `./phase-1/PHASE-1-IMPLEMENTATION-PLAN.md`
- **Phase 1 Pre-Flight:** `./phase-1/PHASE-1-PRE-FLIGHT-CHECKLIST.md`
- **Phase 2 Implementation:** `./phase-2/PHASE-2-IMPLEMENTATION-PLAN.md`
- **Phase 2 Pre-Flight:** `./phase-2/PHASE-2-PRE-FLIGHT-CHECKLIST.md`
- **PCR Calculation Service:** `tpe-backend/src/services/pcrCalculationService.js`
- **Public PCR Service:** `tpe-backend/src/services/publicPCRService.js`
- **Partner Controller:** `tpe-backend/src/controllers/partnerController.js`

---

## 🚨 Critical Business Logic

### PowerCard = First Quarterly Feedback
The pre-onboarding PowerCards serve a dual purpose:
1. **Immediate Value:** Provide initial data to populate landing page
2. **Quarterly Cycle:** Count as Q1 feedback (subsequent quarters use traditional quarterly calls)

### Landing Page Availability
Partners get landing pages **immediately on approval**, not when reports exist. This allows:
- Searchability before full data is available
- Early exposure in partner directory
- Gradual population as data comes in

### Initial PCR Score Calculation
Partners receive an **automatic initial PCR score upon approval** based on profile completion:
- PCR calculated from profile elements (30% weight): description, differentiators, contacts, etc.
- Score increases as more profile data is added (demo videos, client feedback, employee feedback)
- Quarterly PowerCard responses add the remaining 70% weight to the base score
- Implementation: `pcrCalculationService.js` provides `calculatePartnerPCR()` function

---

**Last Updated:** November 10, 2025
**Status:** Phase 3 Complete, Phase 2 Partially Complete, Phase 1 Pending
**Next Step:** Begin Phase 1 Pre-Flight Checklist
