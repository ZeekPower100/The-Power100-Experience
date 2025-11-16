# PowerCards Actual Schema Documentation

**Date:** October 30, 2025
**Status:** VERIFIED via database queries
**Purpose:** Document ACTUAL PowerCards schema (not assumptions)

---

## 🔍 Key Discovery: Schema Differences from Initial Assumptions

### ❌ What I ASSUMED (in initial docs):
- `power_card_responses.partner_id` → `strategic_partners.id` (WRONG!)
- Satisfaction score: 0-5 scale (WRONG!)
- Recommendation score: -100 to 100 NPS scale (WRONG!)
- Score data type: NUMERIC(5,2) (WRONG!)

### ✅ What ACTUALLY EXISTS:
- `power_card_responses.contractor_id` → `contractors.id` (contractor fills out survey)
- Satisfaction score: 0-10 scale (INTEGER)
- Recommendation score: 0-10 scale (INTEGER, NOT NPS!)
- Score data type: INTEGER (whole numbers only)
- Partner relationship: Through `contractor_partner_matches` table

---

## 📊 Actual Table Structures

### power_card_responses (13 columns)
```sql
column_name            | data_type   | notes
-----------------------|-------------|------------------
id                     | integer     | Primary key
campaign_id            | integer     | FK to power_card_campaigns.id
template_id            | integer     | FK to power_card_templates.id
contractor_id          | integer     | FK to contractors.id (NOT partner!)
metric_1_response      | text        | Text response for metric 1
metric_1_score         | integer     | Score 0-10 (not 0-5!)
metric_2_response      | text        | Text response for metric 2
metric_2_score         | integer     | Score 0-10
metric_3_response      | text        | Text response for metric 3
metric_3_score         | integer     | Score 0-10
satisfaction_score     | integer     | Score 0-10 (not 0-5!)
recommendation_score   | integer     | Score 0-10 (NOT -100 to 100 NPS!)
submitted_at           | timestamp   | Response submission time
```

**Sample Data:**
```
contractor_id: 1
satisfaction_score: 10 (on 0-10 scale)
recommendation_score: 10 (on 0-10 scale, NOT NPS)
metric_1_score: 5
metric_2_score: 5
metric_3_score: 5
```

### power_card_templates (18 columns)
```sql
column_name                   | data_type   | notes
------------------------------|-------------|------------------
id                            | integer     | Primary key
partner_id                    | integer     | FK to strategic_partners.id ✅
partner_type                  | varchar(50) | 'strategic_partner'
metric_1_name                 | varchar(255)| Custom metric name
metric_1_question             | text        | Survey question
metric_1_type                 | varchar(50) | 'rating' (all are ratings)
metric_2_name                 | varchar(255)|
metric_2_question             | text        |
metric_2_type                 | varchar(50) | 'rating'
metric_3_name                 | varchar(255)|
metric_3_question             | text        |
metric_3_type                 | varchar(50) | 'rating'
include_satisfaction_score    | boolean     | true
include_recommendation_score  | boolean     | true
is_active                     | boolean     | true
created_at                    | timestamp   |
include_culture_questions     | boolean     | false
updated_at                    | timestamp   |
```

**Key Finding:** partner_id is in TEMPLATES, not in RESPONSES!

### power_card_campaigns (11 columns)
```sql
column_name   | data_type   | column_default | notes
--------------|-------------|----------------|------------------
id            | integer     | nextval(...)   | Primary key
campaign_name | varchar(255)|                |
quarter       | varchar(10) |                | 'Q1', 'Q2', 'Q3', 'Q4'
year          | integer     |                |
start_date    | date        |                |
end_date      | date        |                |
status        | varchar(50) | 'draft'        | 'draft', 'active', 'completed', 'archived'
created_by    | integer     |                |
created_at    | timestamp   | CURRENT_TIMESTAMP |
updated_at    | timestamp   | CURRENT_TIMESTAMP |
description   | text        |                |
```

### power_card_analytics (17 columns)
```sql
column_name                 | data_type   | notes
----------------------------|-------------|------------------
id                          | integer     |
campaign_id                 | integer     | FK to campaigns
revenue_tier                | varchar     | Segment aggregation
industry_segment            | varchar     | Segment aggregation
geographic_region           | varchar     | Segment aggregation
total_responses             | integer     |
avg_satisfaction            | numeric     |
avg_nps                     | integer     |
avg_metric_1                | numeric     |
avg_metric_2                | numeric     |
avg_metric_3                | numeric     |
variance_from_last_quarter  | numeric     |
trend_direction             | varchar     | 'up', 'down', 'stable'
percentile_25               | numeric     |
percentile_50               | numeric     |
percentile_75               | numeric     |
created_at                  | timestamp   |
```

**Key Finding:** Analytics are BY SEGMENT (revenue tier, industry), NOT by individual partner!

---

## 🔗 Correct Relationship Mapping

### Response → Partner Relationship:
```
power_card_responses.contractor_id
  ↓
contractors.id
  ↓
contractor_partner_matches.contractor_id
  ↓
contractor_partner_matches.partner_id (WHERE is_primary_match = true)
  ↓
strategic_partners.id
```

### Response → Template → Partner Relationship:
```
power_card_responses.template_id
  ↓
power_card_templates.id
  ↓
power_card_templates.partner_id
  ↓
strategic_partners.id
```

**BEST APPROACH:** Use **template_id** to find partner! This is direct and avoids joins through contractors.

---

## 📐 Correct Score Conversions

### From Database (0-10 scale) → PCR System (0-100 scale):

```javascript
// ALL scores are 0-10 integers in PowerCards database
// Convert to 0-100 for PCR system:

// Satisfaction Score: 0-10 → 0-100
const satisfactionPCR = (satisfaction_score / 10) * 100;
// Example: 10 → 100, 9 → 90, 5 → 50

// Recommendation Score: 0-10 → 0-100 (NOT NPS conversion!)
const recommendationPCR = (recommendation_score / 10) * 100;
// Example: 10 → 100, 8 → 80, 5 → 50

// Metric Scores: 0-10 → 0-100
const metric1PCR = (metric_1_score / 10) * 100;
const metric2PCR = (metric_2_score / 10) * 100;
const metric3PCR = (metric_3_score / 10) * 100;

// Aggregate formula (same as before, just different input scale):
const avgMetrics = (metric1PCR + metric2PCR + metric3PCR) / 3;
const quarterlyScore = (satisfactionPCR * 0.40) + (recommendationPCR * 0.30) + (avgMetrics * 0.30);
```

---

## ✅ Corrected Integration Query

```sql
-- Get all responses for a campaign with partner information
SELECT
  r.id,
  r.campaign_id,
  r.contractor_id,
  t.partner_id,  -- Get partner from template!
  r.satisfaction_score,  -- INTEGER 0-10
  r.recommendation_score,  -- INTEGER 0-10 (NOT NPS!)
  r.metric_1_score,  -- INTEGER 0-10
  r.metric_2_score,  -- INTEGER 0-10
  r.metric_3_score,  -- INTEGER 0-10
  r.submitted_at
FROM power_card_responses r
JOIN power_card_templates t ON r.template_id = t.id
WHERE r.campaign_id = $1
  AND r.submitted_at IS NOT NULL
  AND t.partner_id IS NOT NULL;
```

**Alternative (through contractor matches):**
```sql
-- If we need contractor-partner relationship
SELECT
  r.id,
  r.campaign_id,
  r.contractor_id,
  m.partner_id,  -- Get partner from contractor match
  r.satisfaction_score,
  r.recommendation_score,
  r.metric_1_score,
  r.metric_2_score,
  r.metric_3_score,
  r.submitted_at
FROM power_card_responses r
JOIN contractor_partner_matches m ON r.contractor_id = m.contractor_id
WHERE r.campaign_id = $1
  AND r.submitted_at IS NOT NULL
  AND m.is_primary_match = true;
```

---

## 🚨 Critical Implementation Changes Needed

1. **Join through templates OR contractor_matches** (no direct partner_id in responses)
2. **Use INTEGER data type** (not NUMERIC(5,2))
3. **Convert 0-10 → 0-100** (divide by 10, multiply by 100)
4. **NO NPS conversion** (recommendation_score is already 0-10, not -100/100)
5. **Handle NULL scores** (some metrics might not be answered)

---

## 📋 Verification Commands Used

```bash
# Check actual columns
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'power_card_responses' ORDER BY ordinal_position;\""

# Check score ranges
powershell -Command ".\quick-db.bat \"SELECT MIN(satisfaction_score), MAX(satisfaction_score), AVG(satisfaction_score) FROM power_card_responses WHERE submitted_at IS NOT NULL;\""

# Check relationships
powershell -Command ".\quick-db.bat \"SELECT c.id, c.company_name, m.partner_id, sp.company_name FROM contractors c JOIN contractor_partner_matches m ON c.id = m.contractor_id JOIN strategic_partners sp ON m.partner_id = sp.id WHERE m.is_primary_match = true LIMIT 5;\""
```

---

**Last Updated:** October 30, 2025
**Status:** VERIFIED - Ready for corrected implementation
**Next Step:** Update Phase 3 implementation with correct schema
