# Phase 2 Pre-Flight Checklist - CEO PCR Reporting & Intelligence

**Document Version:** 1.0
**Date:** November 14, 2025
**Purpose:** Verify Phase 1 completion and prepare for Phase 2 implementation

---

## ✅ Phase 1 Completion Verification

### Step 1: Verify Phase 1 Database Tables Exist

```sql
-- Verify company_employees table exists
SELECT count(*) as employee_count
FROM company_employees;
-- Expected: >= 0 (table exists, may be empty)

-- Verify ceo_pcr_scores table exists
SELECT count(*) as score_count
FROM ceo_pcr_scores;
-- Expected: >= 0 (table exists, may be empty)

-- Verify contractors table has CEO PCR fields
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'contractors'
  AND column_name IN ('current_ceo_pcr', 'previous_ceo_pcr', 'ceo_pcr_trend', 'total_employees');
-- Expected: 4 rows (all fields exist)
```

**Verification Results:**
- [ ] company_employees table exists
- [ ] ceo_pcr_scores table exists
- [ ] contractors has all CEO PCR fields
- [ ] Tables have data (at least test data)

---

### Step 2: Verify Phase 1 Backend Services Work

```bash
# Test employee API endpoints
curl http://localhost:5000/api/employees/contractor/1
# Expected: JSON response with employees array

# Test CEO PCR calculation
curl -X POST http://localhost:5000/api/ceo-pcr/calculate \
  -H "Content-Type: application/json" \
  -d '{"contractor_id": 1, "campaign_id": 1, "quarter": "Q1", "year": 2025}'
# Expected: JSON response with calculated scores
```

**Verification Results:**
- [ ] Employee endpoints respond correctly
- [ ] CEO PCR calculation service works
- [ ] Database records are created properly
- [ ] Scores calculate to expected values

---

## 📊 Data Readiness Check

### Step 3: Verify Test Data Exists

```sql
-- Check for test contractor with CEO PCR score
SELECT
  id,
  company_name,
  current_ceo_pcr,
  total_employees
FROM contractors
WHERE current_ceo_pcr IS NOT NULL
LIMIT 5;
-- Expected: At least 1 contractor with CEO PCR score

-- Check for quarterly history data
SELECT
  contractor_id,
  quarter,
  year,
  final_ceo_pcr
FROM ceo_pcr_scores
ORDER BY contractor_id, year DESC, quarter DESC
LIMIT 5;
-- Expected: At least 1-2 quarters of data for testing trends
```

**Data Verification:**
- [ ] At least 1 contractor has CEO PCR score
- [ ] At least 1 quarter of scores in ceo_pcr_scores
- [ ] Test data includes multiple quarters (for trend testing)
- [ ] Category scores are populated

---

## 🎨 Frontend Prerequisites

### Step 4: Verify Frontend Dependencies

```bash
cd tpe-front-end

# Check for charting library
npm list recharts  # or chart.js
# Expected: Package installed

# Check for PDF generation library (if needed)
npm list jspdf
# Expected: Package installed or will install
```

**Frontend Dependencies:**
- [ ] Charting library installed (recharts or chart.js)
- [ ] UI components available (shadcn/ui)
- [ ] Icons available (lucide-react)
- [ ] PDF library available (if client-side PDFs needed)

**Install missing packages if needed:**
```bash
npm install recharts  # For charts
npm install jspdf jspdf-autotable  # For PDFs (if needed)
```

---

## 🤖 AI Integration Prerequisites

### Step 5: Verify AI Concierge System

```sql
-- Check if AI Concierge knowledge base includes culture resources
SELECT COUNT(*) as book_count
FROM books
WHERE focus_areas_covered @> '["leadership"]'::jsonb
  OR focus_areas_covered @> '["culture"]'::jsonb;
-- Expected: >= 1 book about leadership/culture

SELECT COUNT(*) as partner_count
FROM strategic_partners
WHERE is_active = true
  AND (focus_areas_served @> '["leadership"]'::jsonb
    OR focus_areas_served @> '["business_development"]'::jsonb);
-- Expected: >= 1 partner for leadership development
```

**AI Resources Verified:**
- [ ] Books database has culture/leadership titles
- [ ] Partners database has development-focused partners
- [ ] Podcasts database has leadership content
- [ ] AI Concierge API endpoints accessible

---

## 🔧 Backend Service Structure

### Step 6: Verify Backend Files from Phase 1

Check these files exist and work:

**Services:**
- [ ] `tpe-backend/src/services/ceoPcrService.js` exists
- [ ] `ceoPcrService.calculateCeoPCR()` function works
- [ ] `ceoPcrService.calculateTrendModifier()` function works

**Controllers:**
- [ ] `tpe-backend/src/controllers/employeeController.js` exists
- [ ] Employee CRUD endpoints respond correctly

**Routes:**
- [ ] `tpe-backend/src/routes/employeeRoutes.js` exists
- [ ] Routes registered in server.js
- [ ] All endpoints accessible

---

## 📋 Phase 2 Specific Checks

### Step 7: Prepare Phase 2 Files

Create these new files for Phase 2:

**Backend Services:**
- [ ] Create `tpe-backend/src/services/ceoPcrReportingService.js`
- [ ] Create `tpe-backend/src/services/aiCeoCultureService.js`
- [ ] Create `tpe-backend/src/services/ceoPcrPdfReportService.js` (optional)

**Backend Controllers:**
- [ ] Create `tpe-backend/src/controllers/ceoDashboardController.js`
- [ ] Create `tpe-backend/src/controllers/ceoPcrReportsController.js`

**Backend Routes:**
- [ ] Create `tpe-backend/src/routes/ceoDashboardRoutes.js`
- [ ] Wire routes into server.js

**Frontend Pages:**
- [ ] Create `tpe-front-end/src/app/contractor/ceo-dashboard/page.tsx`
- [ ] Create chart components as needed

---

## 🧪 Testing Environment Setup

### Step 8: Prepare Test Scenarios

Create varied test data for comprehensive testing:

```sql
-- Create contractor with improving trend
INSERT INTO ceo_pcr_scores (contractor_id, quarter, year, base_score, trend_modifier, final_ceo_pcr)
VALUES
  (1, 'Q1', 2025, 70.0, 0, 70.0),
  (1, 'Q2', 2025, 75.0, 0, 75.0),
  (1, 'Q3', 2025, 80.0, 5, 85.0);

-- Create contractor with declining trend
INSERT INTO ceo_pcr_scores (contractor_id, quarter, year, base_score, trend_modifier, final_ceo_pcr)
VALUES
  (2, 'Q1', 2025, 85.0, 0, 85.0),
  (2, 'Q2', 2025, 80.0, 0, 80.0),
  (2, 'Q3', 2025, 75.0, -5, 70.0);

-- Create contractor with low category scores
INSERT INTO ceo_pcr_scores (
  contractor_id, quarter, year,
  leadership_score, culture_score, growth_score, satisfaction_score, nps_score,
  base_score, final_ceo_pcr
)
VALUES (3, 'Q1', 2025, 65.0, 70.0, 60.0, 75.0, 68.0, 67.6, 67.6);
```

**Test Data Ready:**
- [ ] Contractor with improving trend (3+ quarters up)
- [ ] Contractor with declining trend (2+ quarters down)
- [ ] Contractor with low category scores (<70 in some areas)
- [ ] Contractor with high response rate (>80%)
- [ ] Contractor with low response rate (<70%)

---

## 🔐 API Endpoint Planning

### Step 9: Plan Phase 2 API Endpoints

**Dashboard Endpoints:**
```
GET /api/ceo-dashboard/:contractorId
  → Returns full dashboard data (current score, trends, categories)

GET /api/ceo-dashboard/:contractorId/alerts
  → Returns performance alerts based on scores

GET /api/ceo-dashboard/:contractorId/history
  → Returns quarterly history for charting
```

**AI Recommendations:**
```
GET /api/ai/ceo-culture/:contractorId
  → Returns AI-generated culture recommendations

GET /api/ai/ceo-resources/:contractorId
  → Returns suggested books/partners/podcasts based on scores
```

**Reporting:**
```
GET /api/ceo-reports/:contractorId/quarterly/:quarter/:year
  → Returns quarterly report data

POST /api/ceo-reports/:contractorId/generate-pdf
  → Generates and returns PDF report
```

**Endpoints Planned:**
- [ ] Dashboard data endpoint designed
- [ ] Alerts endpoint designed
- [ ] AI recommendations endpoint designed
- [ ] PDF generation endpoint designed

---

## 📧 Email Integration Check

### Step 10: Verify Email Service Ready

```bash
# Check email service exists
ls tpe-backend/src/services/emailService.js
# Expected: File exists

# Verify email templates directory
ls tpe-backend/src/templates/
# Expected: Directory exists
```

**Email System Ready:**
- [ ] Email service configured
- [ ] SMTP credentials set in environment
- [ ] Email templates directory exists
- [ ] Test email sends successfully

---

## 🎯 Implementation Readiness Checklist

### Final Pre-Flight Checks

**Phase 1 Complete:**
- [ ] All Phase 1 database tables exist
- [ ] All Phase 1 backend services work
- [ ] Employee management functional
- [ ] CEO PCR calculation working
- [ ] Test data available

**Phase 2 Ready:**
- [ ] Frontend dependencies installed
- [ ] Charting library available
- [ ] AI resources verified
- [ ] Test scenarios prepared
- [ ] API endpoints planned

**Environment:**
- [ ] Development servers running
- [ ] Database connections stable
- [ ] Email service configured
- [ ] AI Concierge accessible

---

## 🚀 Ready to Proceed?

### Green Light Criteria

All checkboxes above must be ✅ before proceeding with Phase 2 implementation.

**If ANY item is ❌:**
1. Complete missing Phase 1 items first
2. Resolve environment issues
3. Prepare missing test data
4. Only proceed when all items ✅

---

## 📝 Sign-Off

**Phase 1 Completion Verified By:** _______________
**Date:** _______________
**Phase 2 Ready:** [ ] YES / [ ] NO

**Notes:**
_______________________________________________________________________________
_______________________________________________________________________________
_______________________________________________________________________________

---

**Next Step:** [Begin Phase 2 Implementation](./PHASE-2-IMPLEMENTATION-PLAN.md)
