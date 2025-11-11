# Pre-Onboarding PowerCard Workflow

## Overview

When a partner completes their pre-onboarding (Step 8), the system triggers PowerCard generation that serves as their **first quarterly feedback loop**. This creates their initial PCR score and first report, which immediately populates their landing page.

## Partner Approval Flow

### 1. Partner Profile Creation (Steps 1-7)
- Partner completes initial profile fields (company info, contacts, focus areas, etc.)
- Partner status: `pending`
- **Landing Page URL**: Generated and assigned immediately upon approval
- **Landing Page State**: Active but shows placeholder text for sections without data

### 2. Pre-Onboarding Option Point
After Step 7 completion, partners reach `/partner/onboarding/delegation` and choose:

**Option A: Complete Pre-Onboarding Now**
- Continue to Step 8
- Upload logo, demos, and provide references themselves

**Option B: Delegate to Team Member**
- Select team member from Step 2 contacts
- System sends delegation email with unique link
- Delegate completes Step 8 on partner's behalf

### 3. Pre-Onboarding Submission (Step 8)

Partner (or their delegate) provides:

1. **Company Logo** - For landing page branding
2. **5 Client Demo Videos** - YouTube URLs showcasing work
3. **5 Client References** - For PowerCard customer feedback
4. **5 Employee References** - For PowerCard culture assessment

**Critical**: This submission triggers PowerCard generation, which counts as Q1 feedback.

### 4. PowerCard Generation (Automatic)

System automatically generates **10 PowerCards**:
- 5 PowerCards → Client references (customer feedback)
- 5 PowerCards → Employee references (culture assessment)

**PowerCard Fields Collected:**
- Overall satisfaction rating (1-10)
- NPS score
- Specific performance metrics
- Qualitative feedback and testimonials

### 5. PowerCard Responses & PCR Calculation

As PowerCard responses come in:
- System aggregates feedback scores
- Calculates initial PCR (PowerConfidence Rating)
- Generates first quarterly report
- **Updates `strategic_partners.final_pcr_score`**
- **Creates first `partner_reports` record**

### 6. Landing Page Population

Once first report exists:
- Landing page at `/pcr/{partner-slug}` immediately updates
- Replaces placeholder text with actual data:
  - PCR score (replaces "N/A")
  - Client testimonials (from PowerCard feedback)
  - Performance metrics
  - Engagement tier

## Landing Page States

### State 1: Newly Approved (No Pre-Onboarding)
```
URL: /pcr/partner-name (active)
- Focus Areas: "This partner doesn't have enough data..."
- Videos: "This partner doesn't have enough data..."
- Testimonials: "This partner doesn't have enough data..."
- PCR Score: Initial score based on profile completion (30% of base PCR)
```

### State 2: Pre-Onboarding Complete (Waiting for PowerCard Responses)
```
URL: /pcr/partner-name (active)
- Focus Areas: ✅ Populated from Step 1
- Videos: ✅ Shows 5 demo videos from Step 8
- Testimonials: "This partner doesn't have enough data..."
- PCR Score: Updated score based on profile + demo videos (higher than State 1)
```

### State 3: First PowerCards Submitted (Report Generated)
```
URL: /pcr/partner-name (active, fully populated)
- Focus Areas: ✅ Populated
- Videos: ✅ Populated
- Testimonials: ✅ Populated from PowerCard feedback
- PCR Score: ✅ Displays calculated score (e.g., "87")
```

## Database Schema Requirements

### strategic_partners Table
```sql
-- Core fields
public_url VARCHAR(100) UNIQUE  -- Landing page slug (generated on approval)
final_pcr_score NUMERIC         -- Current PCR score (updated when reports generated)
is_active BOOLEAN               -- Partner approval status
landing_page_videos JSONB       -- Videos from Step 8
focus_areas_served JSONB        -- Focus areas from Step 1

-- Pre-onboarding tracking
client_demos TEXT               -- Client demo URLs (Step 8)
client_references TEXT          -- Client reference contacts (Step 8)
employee_references TEXT        -- Employee reference contacts (Step 8)
```

### partner_reports Table
```sql
id SERIAL PRIMARY KEY
partner_id INTEGER              -- FK to strategic_partners
report_type VARCHAR             -- 'quarterly', 'annual'
quarter VARCHAR                 -- 'Q1', 'Q2', 'Q3', 'Q4'
year INTEGER
generation_date TIMESTAMP
report_data JSONB               -- Aggregated PowerCard data
avg_satisfaction NUMERIC        -- Average from PowerCards
avg_nps INTEGER                 -- Average NPS from PowerCards
status VARCHAR                  -- 'draft', 'generated', 'delivered'
```

### powercard_responses Table (Future)
```sql
-- To be implemented
id SERIAL PRIMARY KEY
partner_id INTEGER
report_id INTEGER
respondent_type VARCHAR         -- 'customer', 'employee'
respondent_email VARCHAR
response_data JSONB
submitted_at TIMESTAMP
```

## Implementation Checklist

### Phase 1: Pre-Onboarding PowerCard Trigger (PENDING)
- [ ] Create PowerCard generation endpoint
- [ ] Trigger PowerCard creation after Step 8 submission
- [ ] Send PowerCard emails to 5 customers + 5 employees
- [ ] Build PowerCard response collection form

### Phase 2: PCR Score Calculation (PARTIALLY COMPLETE)
- [x] Calculate initial PCR score from profile completion (30% weight)
- [x] Profile scoring system (`pcrCalculationService.js`)
- [ ] Aggregate PowerCard responses for quarterly scoring (70% weight)
- [ ] Update `strategic_partners.final_pcr_score` when PowerCards collected
- [ ] Create first `partner_reports` record from PowerCard data

### Phase 3: Landing Page Auto-Update (COMPLETE)
- [x] Landing pages created on partner approval
- [x] Show placeholder text for missing sections
- [x] Query partners directly (not via reports)
- [x] Auto-populate when data becomes available

## Key Business Logic

### PowerCard = First Quarterly Feedback
The pre-onboarding PowerCards serve a dual purpose:
1. **Immediate Value**: Provide initial data to populate landing page
2. **Quarterly Cycle**: Count as Q1 feedback (subsequent quarters use traditional quarterly calls)

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

### Data Flow Summary
```
Partner Approval
  ↓
Landing Page URL Generated (slug assigned)
  ↓
Pre-Onboarding Submitted (Step 8)
  ↓
10 PowerCards Generated & Sent
  ↓
PowerCard Responses Collected
  ↓
Initial PCR Score Calculated
  ↓
First Report Created (partner_reports)
  ↓
Landing Page Auto-Populated with Real Data
```

## Current Capabilities (Already Implemented)

1. **Profile-Based PCR Scoring**: Initial scores calculated from profile completion (30% of base PCR)
   - Implementation: `tpe-backend/src/services/pcrCalculationService.js`
   - Profile weights: Customer feedbacks (25 pts), employee feedbacks (20 pts), demo videos (20 pts), differentiators (10 pts), description (10 pts), contacts (5 pts)
   - Formula: Base PCR = (Profile Score × 30%) + (Quarterly Score × 70%)

2. **Partner Response Dashboard**: Multi-tab interface for tracking feedback and performance
   - Implementation: `tpe-front-end/src/app/partner/dashboard/page.tsx`
   - Tabs: Overview, Performance, Feedback, Insights, Reports
   - Shows customer feedback highlights, strengths, areas for improvement, and response counts

3. **Workflow Automation**: n8n integration for automated processes
   - Implementation: `n8n-workflows/` directory
   - Handles email automation, booking confirmations, and follow-ups

4. **AI-Enhanced Data Processing**: Sentiment analysis and knowledge extraction
   - Implementation: `tpe-backend/src/services/aiProcessingService.js`, `aiKnowledgeService.js`
   - AI-enhanced database columns with `ai_` prefix auto-discovered by AI Concierge

## Future Enhancements (Pending Implementation)

1. **PowerCard Reminders**: Automated follow-ups for non-responders
2. **Real-Time PowerCard Progress**: Live tracking of response collection status
3. **Advanced Analytics**: Trend analysis and predictive scoring based on response patterns

## Related Documentation

- `docs/partner-onboarding-powerconfidence-rating-system.md` - PowerConfidence scoring system
- `docs/PARTNER-BOOKING-SYSTEM-GHL-IMPLEMENTATION.md` - Quarterly feedback workflow
- `tpe-backend/src/services/pcrCalculationService.js` - Profile-based PCR scoring implementation
- `tpe-front-end/src/app/partner/dashboard/page.tsx` - Partner response dashboard
- `tpe-front-end/src/components/partner/PartnerOnboardingForm.tsx` - Step 8 implementation
- `tpe-backend/src/services/publicPCRService.js` - Landing page data retrieval
- `tpe-backend/src/services/aiProcessingService.js` - AI-enhanced data processing

---

**Last Updated**: November 10, 2025
**Status**: Phase 3 Complete, Phase 2 Partially Complete (profile scoring done, PowerCard aggregation pending), Phase 1 Pending Implementation
