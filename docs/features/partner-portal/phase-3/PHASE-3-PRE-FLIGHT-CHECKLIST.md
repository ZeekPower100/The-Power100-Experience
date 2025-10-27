# PHASE 3 - Lead Management & Contractor Pipeline
## Pre-Flight Checklist

**Purpose**: Verify all prerequisites before starting Phase 3 development
**Date**: October 25, 2025

---

## PHASE 2 COMPLETION VERIFICATION

### Phase 2 Status
- [ ] Phase 2 COMPLETE (Partner profile management working)
- [ ] All Phase 2 endpoints working
- [ ] Partner can edit profile successfully
- [ ] Unified authentication (protectPartnerOrAdmin) working

**Verification Commands:**
```bash
# Test Phase 2 profile endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/partner-portal/profile

# Should return partner profile data
```

---

## DATABASE VERIFICATION

### contractor_partner_matches Table Verification

#### Core Match Fields
- [ ] `id` field exists (primary key)
- [ ] `partner_id` field exists (references strategic_partners)
- [ ] `contractor_id` field exists (references contractors)
- [ ] `match_score` field exists
- [ ] `match_reasons` field exists (JSON text)
- [ ] `is_primary_match` field exists (boolean)
- [ ] `created_at` field exists

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_partner_matches' AND column_name IN ('id', 'partner_id', 'contractor_id', 'match_score', 'match_reasons', 'is_primary_match', 'created_at') ORDER BY column_name;\""
```

#### Engagement Tracking Fields
- [ ] `engagement_stage` field exists (new, contacted, meeting_scheduled, etc.)
- [ ] `status` field exists (active, inactive, converted, rejected)
- [ ] `last_contact_date` field exists (timestamp)
- [ ] `next_follow_up_date` field exists (timestamp)
- [ ] `notes` field exists (JSON text array)

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractor_partner_matches' AND column_name IN ('engagement_stage', 'status', 'last_contact_date', 'next_follow_up_date', 'notes') ORDER BY column_name;\""
```

**Expected Results:**
```
     column_name       | data_type
-----------------------+-----------
 engagement_stage      | text
 last_contact_date     | timestamp without time zone
 next_follow_up_date   | timestamp without time zone
 notes                 | text
 status                | text
```

#### Missing Fields Migration
If any engagement tracking fields are missing, run:

```sql
-- Add engagement tracking fields
ALTER TABLE contractor_partner_matches
  ADD COLUMN IF NOT EXISTS engagement_stage VARCHAR(50) DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS next_follow_up_date TIMESTAMP,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add updated_at if missing
ALTER TABLE contractor_partner_matches
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Create index for partner lookups
CREATE INDEX IF NOT EXISTS idx_cpm_partner_id ON contractor_partner_matches(partner_id);
CREATE INDEX IF NOT EXISTS idx_cpm_status ON contractor_partner_matches(status);
CREATE INDEX IF NOT EXISTS idx_cpm_stage ON contractor_partner_matches(engagement_stage);
```

**Run Migration:**
```bash
powershell -Command ".\quick-db.bat \"ALTER TABLE contractor_partner_matches ADD COLUMN IF NOT EXISTS engagement_stage VARCHAR(50) DEFAULT 'new', ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active', ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP, ADD COLUMN IF NOT EXISTS next_follow_up_date TIMESTAMP, ADD COLUMN IF NOT EXISTS notes TEXT;\""
```

### contractors Table Verification

#### Required Contractor Fields
- [ ] `id` field exists
- [ ] `first_name` field exists
- [ ] `last_name` field exists
- [ ] `email` field exists
- [ ] `phone` field exists
- [ ] `company_name` field exists
- [ ] `company_size` field exists
- [ ] `revenue_tier` field exists
- [ ] `industry` field exists
- [ ] `focus_areas` field exists (JSON text)
- [ ] `business_challenges` field exists (JSON text)
- [ ] `goals_12_months` field exists (JSON text)
- [ ] `stage` field exists

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'first_name', 'last_name', 'email', 'phone', 'company_name', 'company_size', 'revenue_tier', 'industry', 'focus_areas', 'business_challenges', 'goals_12_months', 'stage') ORDER BY column_name;\""
```

---

## TEST DATA VERIFICATION

### Match Data Existence
- [ ] At least one contractor-partner match exists in database
- [ ] Demo partner (ID 94) has contractor matches
- [ ] Contractor data is complete enough for display

**Verification Command:**
```bash
# Check total matches
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as total_matches FROM contractor_partner_matches;\""

# Check demo partner's matches
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as demo_partner_matches FROM contractor_partner_matches WHERE partner_id = 94;\""

# View sample match
powershell -Command ".\quick-db.bat \"SELECT cpm.id, cpm.contractor_id, cpm.match_score, c.first_name, c.last_name, c.company_name FROM contractor_partner_matches cpm JOIN contractors c ON c.id = cpm.contractor_id WHERE cpm.partner_id = 94 LIMIT 3;\""
```

### Create Test Data (if needed)
If no matches exist for testing:

```sql
-- Create test contractor match for demo partner
INSERT INTO contractor_partner_matches (
  partner_id,
  contractor_id,
  match_score,
  match_reasons,
  is_primary_match,
  engagement_stage,
  status
) VALUES (
  94, -- Demo partner ID
  1,  -- Contractor ID (adjust as needed)
  85.5,
  '["Strong fit for growth acceleration services", "Geographic alignment", "Revenue tier match"]',
  true,
  'new',
  'active'
);
```

---

## WORKFLOW DECISIONS

### Lead Stage Workflow
- [ ] **Decision made**: Lead stages defined

**Proposed Stages:**
1. `new` - Newly matched, not yet contacted
2. `contacted` - Initial contact made
3. `meeting_scheduled` - Demo or discovery call scheduled
4. `proposal_sent` - Proposal/quote provided
5. `negotiating` - In active negotiations
6. `won` - Converted to customer
7. `lost` - Opportunity lost
8. `nurturing` - Long-term nurture track

**Confirm**: Are these stages appropriate for your sales process?

### Lead Status Values
- [ ] **Decision made**: Status values defined

**Proposed Statuses:**
- `active` - Currently being pursued
- `inactive` - No longer pursuing
- `converted` - Won, became customer
- `rejected` - Lead declined or disqualified

### Note/Activity Tracking
- [ ] **Decision made**: What activities to track?

**Proposed Activities:**
- Manual notes (text entry)
- Email sent (if email integration added)
- Call logged (if phone integration added)
- Meeting held (manual entry)
- Proposal sent (manual entry)

**For Phase 3 MVP**: Start with manual text notes only

---

## FRONTEND UI DECISIONS

### View Mode Preference
- [ ] **Decision made**: Default view for leads

**Options:**
- Option A: Kanban board (visual, drag-and-drop)
- Option B: List view (compact, sortable)
- Option C: Both with toggle (more work, better UX)

**Recommended**: Option C (both views with toggle)

### Lead Card Information
- [ ] **Decision made**: What to show on lead cards

**Proposed Minimum:**
- Contractor name
- Company name
- Match score
- Engagement stage
- Last contact date
- Quick actions (view details, add note)

**Proposed Maximum:**
- All minimum fields
- Focus areas (tags)
- Next follow-up date
- Primary match indicator
- Contact info (email, phone)

### Filter Options
- [ ] **Decision made**: Available filters

**Proposed Filters:**
- By engagement stage (dropdown)
- By status (dropdown)
- By match score range (slider)
- By date range (contacted/matched)
- Text search (name, company, email)
- Primary matches only (checkbox)

---

## INTEGRATION DECISIONS

### Email Integration
- [ ] **Decision needed**: Click-to-email functionality?

**Options:**
- Option A: Simple `mailto:` links (no tracking)
- Option B: Track when emails sent (requires email service)
- Option C: Phase 4 feature (defer for now)

**Recommended**: Option A for Phase 3 MVP

### Calendar Integration
- [ ] **Decision needed**: Schedule follow-ups in calendar?

**Options:**
- Option A: Manual date selection only
- Option B: Create calendar events (requires integration)
- Option C: Phase 4 feature (defer for now)

**Recommended**: Option A for Phase 3 MVP

### Notification System
- [ ] **Decision needed**: Follow-up reminders?

**Options:**
- Option A: Show overdue count in stats (no notifications)
- Option B: Email reminders for overdue follow-ups
- Option C: Phase 4 feature (defer for now)

**Recommended**: Option A for Phase 3 MVP

---

## EXISTING CODE VERIFICATION

### Backend Files
- [ ] `tpe-backend/src/routes/partnerPortalRoutes.js` exists
- [ ] `tpe-backend/src/controllers/partnerPortalController.js` exists
- [ ] `tpe-backend/src/middleware/partnerAuth.js` exists
- [ ] Database connection working

**Verification Commands:**
```bash
# Check if files exist
ls tpe-backend/src/routes/partnerPortalRoutes.js
ls tpe-backend/src/controllers/partnerPortalController.js
ls tpe-backend/src/middleware/partnerAuth.js
```

### Frontend Files
- [ ] `tpe-front-end/src/app/partner/dashboard/page.tsx` exists
- [ ] `tpe-front-end/src/utils/jsonHelpers.ts` exists
- [ ] Partner portal navigation working

**Verification Commands:**
```bash
# Check if files exist
ls tpe-front-end/src/app/partner/dashboard/page.tsx
ls tpe-front-end/src/utils/jsonHelpers.ts
```

---

## DEPENDENCIES & PACKAGES

### Backend Dependencies
- [ ] All Phase 2 dependencies installed (express-validator, multer)
- [ ] No new backend dependencies needed

**Check Existing Packages:**
```bash
cd tpe-backend && npm list express-validator
```

### Frontend Dependencies (Optional)
- [ ] Drag-and-drop library (if implementing kanban)
  - `@dnd-kit/core` and `@dnd-kit/sortable` (recommended)
  - OR `react-beautiful-dnd` (alternative)

**Installation Command (if needed):**
```bash
cd tpe-front-end
npm install @dnd-kit/core @dnd-kit/sortable
```

### Date Handling
- [ ] Date formatting library available
  - `date-fns` (recommended, lightweight)
  - OR use native `Intl.DateTimeFormat`

**Check if installed:**
```bash
cd tpe-front-end && npm list date-fns
```

**Install if needed:**
```bash
cd tpe-front-end && npm install date-fns
```

---

## DEVELOPMENT ENVIRONMENT

### Backend Server
- [ ] Backend server starts without errors
- [ ] Port 5000 is available
- [ ] Database connection working
- [ ] All Phase 2 endpoints responding

**Verification Command:**
```bash
node dev-manager.js status
```

### Frontend Server
- [ ] Frontend server starts without errors
- [ ] Port 3002 is available
- [ ] Can navigate to partner dashboard
- [ ] Partner authentication working

**Verification:**
Navigate to http://localhost:3002/partner/dashboard

### Database Connection
- [ ] PostgreSQL database accessible
- [ ] quick-db.bat script working
- [ ] Can query contractor_partner_matches table

**Verification Command:**
```bash
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) FROM contractor_partner_matches;\""
```

---

## SECURITY CONSIDERATIONS

### Authorization Checks
- [ ] Partners can ONLY see their own leads
- [ ] Partner ID verified from JWT token
- [ ] Cannot access other partners' contractor data
- [ ] Cannot modify match scores (read-only)

### Data Privacy
- [ ] Contractor email/phone only visible to matched partners
- [ ] Notes are private to each partner
- [ ] No cross-partner data leakage

---

## PERFORMANCE CONSIDERATIONS

### Pagination
- [ ] **Decision made**: Page size for leads list

**Recommended**: 50 leads per page (adjustable)

### Caching
- [ ] Stats cached to reduce database queries?

**Options:**
- Option A: Query on every request (simple, always fresh)
- Option B: Cache for 5 minutes (better performance)
- Option C: Phase 4 optimization (defer for now)

**Recommended**: Option A for Phase 3 MVP

---

## DOCUMENTATION

### Phase 3 Documents to Create
- [ ] `PHASE-3-FIELD-REFERENCE.md` - Database field descriptions
- [ ] `PHASE-3-IMPLEMENTATION-PLAN.md` - This document
- [ ] `PHASE-3-PRE-FLIGHT-CHECKLIST.md` - Current checklist

**Reference Documents:**
- [ ] Read `PHASE-2-COMPLETE.md` for context
- [ ] Read `DATABASE-SOURCE-OF-TRUTH.md`
- [ ] Read `STORAGE-AND-JSON-GUIDELINES.md`

---

## FINAL CHECKLIST

### Before Starting Development
- [ ] Phase 2 complete and working ✅
- [ ] Database schema verified and updated ✅
- [ ] Test data exists or created ✅
- [ ] Lead stages defined ✅
- [ ] UI decisions made ✅
- [ ] Integration approach decided ✅

### Before Writing Code
- [ ] Read `PHASE-3-IMPLEMENTATION-PLAN.md` completely
- [ ] Understand lead workflow stages
- [ ] Know which fields are editable vs read-only
- [ ] Understand JSON field handling for notes

### Before Testing
- [ ] Backend server running
- [ ] Frontend server running
- [ ] Database connection active
- [ ] Test contractor matches exist
- [ ] Demo partner credentials ready

---

## READY TO BEGIN?

**All items above should be checked ✅ before starting Phase 3 development.**

If any items are ❌, resolve them first before proceeding.

---

## QUICK START GUIDE

Once all prerequisites are met:

### Step 1: Database Setup (15 minutes)
1. Run field verification commands above
2. Add missing engagement tracking fields
3. Create test match data if needed
4. Verify data with sample queries

### Step 2: Backend API (6-8 hours)
1. Add `getPartnerLeads()` function
2. Add `getLeadDetails()` function
3. Add `updateLeadStatus()` function
4. Add `addLeadNote()` function
5. Add `getLeadStats()` function
6. Update routes file
7. Test all endpoints

### Step 3: Frontend UI (6-8 hours)
1. Create leads page
2. Create kanban board component
3. Create lead details modal
4. Create stats cards
5. Add search and filters
6. Connect to backend APIs
7. Test complete flow

### Step 4: Integration Testing (2 hours)
1. Test as partner user
2. Verify all CRUD operations
3. Test edge cases
4. Document any issues

---

**Checklist Created**: October 25, 2025
**Last Updated**: October 25, 2025
**Status**: Ready for Review
