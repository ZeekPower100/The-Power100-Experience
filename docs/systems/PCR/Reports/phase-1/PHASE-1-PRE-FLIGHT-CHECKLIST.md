# Phase 1 Pre-Flight Checklist - Reports System

**Date:** October 31, 2025
**Purpose:** Verify database schema alignment before implementing Reports Phase 1
**Status:** MANDATORY - Must complete before any code changes

---

## 🔴 CRITICAL: This Checklist is MANDATORY

**DO NOT SKIP THIS STEP**

This checklist prevents hours of debugging by ensuring:
1. All database field names are verified
2. Existing tables have expected columns
3. New tables won't conflict with existing schema
4. Data types match expectations

**Estimated Time:** 15-20 minutes
**Consequence of Skipping:** Hours of debugging field name mismatches

---

## ✅ Pre-Flight Checklist

### Step 1: Verify Strategic Partners Table

```bash
# Check strategic_partners exists and has required fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, column_default FROM information_schema.columns WHERE table_name = 'strategic_partners' AND column_name IN ('id', 'company_name', 'description', 'value_proposition', 'final_pcr_score', 'base_pcr_score', 'momentum_modifier', 'performance_trend', 'earned_badges', 'quarterly_history', 'quarterly_feedback_score', 'logo_url', 'website', 'engagement_tier', 'key_differentiators', 'client_testimonials', 'landing_page_videos', 'video_metadata') ORDER BY column_name;\""
```

**Expected Output:**
```
base_pcr_score           | numeric          |
client_testimonials      | jsonb            | '[]'::jsonb
company_name             | character varying|
description              | text             |
earned_badges            | jsonb            | '[]'::jsonb
engagement_tier          | character varying| 'free'::character varying
final_pcr_score          | numeric          |
id                       | integer          | nextval('strategic_partners_id_seq')
key_differentiators      | text             |
landing_page_videos      | text             |
logo_url                 | character varying|
momentum_modifier        | integer          | 0
performance_trend        | character varying| 'new'::character varying
quarterly_feedback_score | numeric          | 50.00
quarterly_history        | jsonb            | '[]'::jsonb
value_proposition        | text             |
video_metadata           | text             |
website                  | character varying|
```

**Verification:**
- [ ] All 18 fields exist
- [ ] Data types match (NUMERIC, JSONB, TEXT, VARCHAR, INTEGER)
- [ ] Default values are correct

---

### Step 2: Verify PowerCard Analytics Table

```bash
# Check power_card_analytics exists and has required fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'power_card_analytics' ORDER BY column_name;\""
```

**Expected Fields:**
```
avg_metric_1               | numeric
avg_metric_2               | numeric
avg_metric_3               | numeric
avg_nps                    | integer
avg_satisfaction           | numeric
campaign_id                | integer
created_at                 | timestamp without time zone
geographic_region          | character varying
id                         | integer
industry_segment           | character varying
percentile_25              | numeric
percentile_50              | numeric
percentile_75              | numeric
revenue_tier               | character varying
total_responses            | integer
trend_direction            | character varying
variance_from_last_quarter | numeric
```

**Verification:**
- [ ] Table exists
- [ ] All 17 fields present
- [ ] Numeric fields for metrics and percentiles
- [ ] campaign_id foreign key exists

---

### Step 3: Verify PowerCard Templates Table

```bash
# Check power_card_templates exists and has metric fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'power_card_templates' AND (column_name LIKE '%metric%' OR column_name LIKE '%partner%') ORDER BY column_name;\""
```

**Expected Fields:**
```
metric_1_name     | character varying
metric_1_question | text
metric_1_type     | character varying
metric_2_name     | character varying
metric_2_question | text
metric_2_type     | character varying
metric_3_name     | character varying
metric_3_question | text
metric_3_type     | character varying
partner_id        | integer
partner_type      | character varying
```

**Verification:**
- [ ] Table exists
- [ ] All 11 metric fields present
- [ ] partner_id foreign key exists

---

### Step 4: Verify PowerCard Campaigns Table

```bash
# Check power_card_campaigns exists
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'power_card_campaigns' ORDER BY column_name;\""
```

**Expected Fields:**
```
campaign_name   | character varying
created_at      | timestamp without time zone
end_date        | date
id              | integer
partner_id      | integer
quarter         | character varying
response_rate   | numeric
start_date      | date
status          | character varying
total_responses | integer
total_sent      | integer
year            | integer
```

**Verification:**
- [ ] Table exists
- [ ] 12 fields present
- [ ] quarter and year fields for report grouping
- [ ] status field for campaign completion tracking

---

### Step 5: Verify PowerCard Responses Table

```bash
# Check power_card_responses exists
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'power_card_responses' ORDER BY column_name;\""
```

**Expected Fields:**
```
campaign_id          | integer
contractor_id        | integer
id                   | integer
metric_1_response    | text
metric_1_score       | integer
metric_2_response    | text
metric_2_score       | integer
metric_3_response    | text
metric_3_score       | integer
recommendation_score | integer
satisfaction_score   | integer
submitted_at         | timestamp without time zone
template_id          | integer
```

**Verification:**
- [ ] Table exists
- [ ] 13 fields present
- [ ] metric_1/2/3_score fields for dynamic metrics
- [ ] contractor_id for contractor reports

---

### Step 6: Verify Contractors Table

```bash
# Check contractors table for report fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND (column_name IN ('id', 'name', 'company_name', 'email', 'revenue_tier', 'annual_revenue')) ORDER BY column_name;\""
```

**Expected Fields:**
```
annual_revenue | character varying
company_name   | character varying
email          | character varying
id             | integer
name           | character varying
revenue_tier   | character varying
```

**Verification:**
- [ ] Table exists
- [ ] 6 key fields present
- [ ] revenue_tier exists (critical for peer benchmarking)

---

### Step 7: Verify Admin Users Table

```bash
# Check admin_users table exists (for report tracking)
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'admin_users' AND column_name IN ('id', 'email', 'name') ORDER BY column_name;\""
```

**Expected Fields:**
```
email | character varying
id    | integer
name  | character varying
```

**Verification:**
- [ ] Table exists
- [ ] Can reference admin_users(id) in partner_reports

---

### Step 8: Check for Existing partner_reports Table

```bash
# Check if partner_reports already exists
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_name = 'partner_reports';\""
```

**Expected Output:** (empty or error)
```
(0 rows)
```

**Verification:**
- [ ] partner_reports table does NOT exist yet
- [ ] If it exists, check if migration already ran

---

### Step 9: Verify Foreign Key References

```bash
# Check that all referenced tables can be linked
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_name IN ('strategic_partners', 'contractors', 'power_card_campaigns', 'admin_users') ORDER BY table_name;\""
```

**Expected Output:**
```
admin_users
contractors
power_card_campaigns
strategic_partners
```

**Verification:**
- [ ] All 4 tables exist
- [ ] Can create foreign keys to these tables

---

### Step 10: Test Data Availability

```bash
# Check how many partners have quarterly history
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as total_partners, COUNT(*) FILTER (WHERE quarterly_history IS NOT NULL AND jsonb_array_length(quarterly_history) > 0) as partners_with_history FROM strategic_partners WHERE is_active = true;\""
```

**Expected Output:**
```
total_partners | partners_with_history
---------------+----------------------
24             | 1
```

**Verification:**
- [ ] At least 1 partner has quarterly_history data for testing
- [ ] Can generate test reports from existing data

---

### Step 11: Check PowerCard Campaign Data

```bash
# Check for completed PowerCard campaigns
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as total_campaigns, COUNT(*) FILTER (WHERE status = 'completed') as completed_campaigns FROM power_card_campaigns;\""
```

**Expected Output:**
```
total_campaigns | completed_campaigns
----------------+--------------------
X               | Y
```

**Verification:**
- [ ] At least 1 completed campaign exists for testing
- [ ] Campaign data links to partners

---

### Step 12: Verify JSONB Field Structure

```bash
# Sample a quarterly_history JSONB field
powershell -Command ".\quick-db.bat \"SELECT id, company_name, quarterly_history FROM strategic_partners WHERE jsonb_array_length(quarterly_history) > 0 LIMIT 1;\""
```

**Expected Structure:**
```json
[
  {
    "quarter": "Q4",
    "year": 2025,
    "score": 86.14,
    "date": "2025-10-31",
    "response_count": 8,
    "source": "powercard"
  }
]
```

**Verification:**
- [ ] JSONB array structure is correct
- [ ] Has quarter, year, score fields
- [ ] Can parse for report generation

---

### Step 13: Check for Report Generation Service File

```bash
# Check if reportGenerationService.js exists
ls "C:\Users\broac\CascadeProjects\The-Power100-Experience\tpe-backend\src\services\reportGenerationService.js"
```

**Expected:** File exists (currently has mock data)

**Verification:**
- [ ] File exists and can be updated
- [ ] Service already has basic structure

---

### Step 14: Verify Report Routes Exist

```bash
# Check if reports routes exist
ls "C:\Users\broac\CascadeProjects\The-Power100-Experience\tpe-backend\src\routes\reports.js"
```

**Expected:** File exists

**Verification:**
- [ ] Routes file exists
- [ ] Currently has 3 mock endpoints (contractor, executive, pcr)

---

## 📋 Final Pre-Flight Checklist Summary

Before proceeding to Phase 1 implementation, verify ALL items are checked:

### Database Verification
- [ ] strategic_partners table has all 18 required fields
- [ ] power_card_analytics table exists with 17 fields
- [ ] power_card_templates table has metric fields
- [ ] power_card_campaigns table exists with quarter/year tracking
- [ ] power_card_responses table has metric_1/2/3_score fields
- [ ] contractors table has revenue_tier field
- [ ] admin_users table exists
- [ ] partner_reports table does NOT exist yet (ready for migration)

### Data Verification
- [ ] At least 1 partner has quarterly_history data
- [ ] At least 1 completed PowerCard campaign exists
- [ ] JSONB structures are correct and parseable
- [ ] Foreign key references are valid

### Code Verification
- [ ] reportGenerationService.js exists (ready for updates)
- [ ] reports.js routes exist (ready for expansion)
- [ ] Can create new partner_reports table without conflicts

---

## 🚨 If ANY Checks Fail

**DO NOT PROCEED WITH IMPLEMENTATION**

If any verification fails:

1. **Missing Fields:** Run database migration to add fields
2. **Missing Tables:** Check if migrations were applied
3. **Wrong Data Types:** Consult DATABASE-SOURCE-OF-TRUTH.md
4. **Missing Data:** Generate test data before implementing
5. **File Missing:** Check file paths and project structure

---

## ✅ Pre-Flight Complete

Once all checks pass:
- [ ] Document any discrepancies found and resolved
- [ ] Take database backup before migration
- [ ] Proceed to Phase 1 Implementation Plan
- [ ] Reference this checklist if field name issues arise

---

## 📚 Related Documents

- **Implementation Plan:** `./PHASE-1-IMPLEMENTATION-PLAN.md`
- **Reports Overview:** `../PCR-REPORTS-OVERVIEW.md`
- **Database Source of Truth:** `/DATABASE-SOURCE-OF-TRUTH.md`

---

**Status:** Ready for verification
**Next Step:** Run all verification commands and check all boxes
**Estimated Time:** 15-20 minutes
**Last Updated:** October 31, 2025
