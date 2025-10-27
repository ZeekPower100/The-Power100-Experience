# PHASE 1 - Partner Portal Real Data Integration
## Database Field Reference (Verified: October 24, 2025)

**PURPOSE**: Replace mock data with real database queries for partner dashboard

---

## DATABASE TABLES USED (Phase 1 - Dashboard Integration)

### 1. strategic_partners (124 columns - Key Fields Listed Below)
**Purpose**: Partner profile and PowerConfidence data

**Dashboard Fields:**
- `id` - integer, NOT NULL (Primary key)
- `company_name` - varchar, NULL
- `contact_email` - varchar, NULL
- `contact_phone` - varchar, NULL
- `power_confidence_score` - integer, NULL (default: 0) **⚠️ NOTE: Use this field, NOT powerconfidence_score**
- `previous_powerconfidence_score` - integer, NULL (for trend calculation)
- `score_trend` - varchar, NULL (values: 'up', 'down', 'stable')
- `industry_rank` - integer, NULL (ranking within category)
- `category_rank` - integer, NULL (category-specific ranking)
- `is_active` - boolean, NULL (default: true)
- `status` - varchar, NULL (default: 'pending_review')

**Feedback Metrics:**
- `last_feedback_update` - timestamp, NULL
- `total_feedback_responses` - integer, NULL (default: 0)
- `average_satisfaction` - numeric, NULL
- `feedback_trend` - varchar, NULL (values: 'up', 'down', 'stable')
- `next_quarterly_review` - date, NULL

**Contractor Engagement:**
- `avg_contractor_satisfaction` - numeric, NULL
- `total_contractor_engagements` - integer, NULL (default: 0)
- `completed_bookings` - integer, NULL (default: 0)
- `total_bookings` - integer, NULL (default: 0)
- `total_matches` - integer, NULL (default: 0)

**Profile Info:**
- `company_description` - text, NULL
- `value_proposition` - text, NULL
- `logo_url` - varchar, NULL
- `website` - varchar, NULL
- `focus_areas` - text, NULL (JSON array as text)
- `service_areas` - text, NULL (JSON array as text)
- `geographic_regions` - text, NULL (JSON array as text)

**Timestamps:**
- `created_at` - timestamp, NULL (default: CURRENT_TIMESTAMP)
- `updated_at` - timestamp, NULL (default: CURRENT_TIMESTAMP)

---

### 2. partner_users (13 columns)
**Purpose**: Partner authentication and user management

**Authentication Fields:**
- `id` - integer, NOT NULL (Primary key)
- `partner_id` - integer, NULL (FK to strategic_partners.id)
- `email` - varchar, NOT NULL
- `password` - varchar, NOT NULL (hashed)
- `first_name` - varchar, NULL
- `last_name` - varchar, NULL
- `role` - varchar, NULL (values: 'admin', 'viewer', 'editor')
- `is_active` - boolean, NULL (default: true)

**Session Tracking:**
- `last_login` - timestamp, NULL
- `reset_token` - varchar, NULL
- `reset_token_expires` - timestamp, NULL
- `created_at` - timestamp, NULL (default: CURRENT_TIMESTAMP)
- `updated_at` - timestamp, NULL (default: CURRENT_TIMESTAMP)

---

### 3. partner_analytics (8 columns)
**Purpose**: Time-series performance metrics

**Analytics Fields:**
- `id` - integer, NOT NULL (Primary key)
- `partner_id` - integer, NULL (FK to strategic_partners.id)
- `metric_type` - varchar, NULL (values: 'powerconfidence_score', 'satisfaction', 'response_rate', 'contractor_count', 'lead_count')
- `metric_value` - numeric, NULL
- `period_start` - date, NULL
- `period_end` - date, NULL
- `metadata` - text, NULL (JSON string with additional context)
- `created_at` - timestamp, NULL (default: CURRENT_TIMESTAMP)

**Common metric_type values:**
- `powerconfidence_score` - Quarterly PowerConfidence score snapshots
- `satisfaction` - Average contractor satisfaction per quarter
- `response_rate` - Percentage of contractor inquiries responded to
- `contractor_count` - Active contractor count per period
- `lead_count` - Number of new leads per period

---

### 4. partner_leads (10 columns)
**Purpose**: Contractor lead tracking and conversion

**Lead Fields:**
- `id` - integer, NOT NULL (Primary key)
- `partner_id` - integer, NULL (FK to strategic_partners.id)
- `contractor_id` - integer, NULL (FK to contractors.id)
- `lead_status` - varchar, NULL (values: 'new', 'contacted', 'qualified', 'converted', 'lost')
- `lead_score` - integer, NULL (1-100 quality score)
- `lead_source` - varchar, NULL (values: 'matching_algorithm', 'manual_assignment', 'contractor_request')
- `notes` - text, NULL
- `converted_at` - timestamp, NULL (when lead became a customer)
- `created_at` - timestamp, NULL (default: CURRENT_TIMESTAMP)
- `updated_at` - timestamp, NULL (default: CURRENT_TIMESTAMP)

---

### 5. contractor_partner_matches (10 columns)
**Purpose**: Historical matching data and scores

**Matching Fields:**
- `id` - integer, NOT NULL (Primary key)
- `contractor_id` - integer, NULL (FK to contractors.id)
- `partner_id` - integer, NULL (FK to strategic_partners.id)
- `score` - numeric, NULL (legacy field)
- `match_score` - integer, NULL (0-100 matching score)
- `reasons` - text, NULL (legacy field)
- `match_reasons` - text, NULL (JSON array of match reasons)
- `is_primary` - boolean, NULL (default: false) (legacy field)
- `is_primary_match` - boolean, NULL (default: false)
- `created_at` - timestamp, NULL (default: CURRENT_TIMESTAMP)

**⚠️ NOTE**: This table has duplicate fields (score/match_score, reasons/match_reasons, is_primary/is_primary_match). Use the newer fields: `match_score`, `match_reasons`, `is_primary_match`.

---

### 6. feedback_surveys (4 columns)
**Purpose**: Survey campaign tracking

**Survey Fields:**
- `id` - integer, NOT NULL (Primary key)
- `partner_id` - integer, NULL (FK to strategic_partners.id)
- `survey_link` - varchar, NULL (unique survey URL)
- `created_at` - timestamp, NULL (default: CURRENT_TIMESTAMP)

---

### 7. feedback_responses (7 columns)
**Purpose**: Contractor feedback about partners

**Feedback Fields:**
- `id` - integer, NOT NULL (Primary key)
- `survey_id` - integer, NULL (FK to feedback_surveys.id)
- `contractor_name` - varchar, NULL
- `contractor_email` - varchar, NULL
- `rating` - integer, NULL (1-10 satisfaction rating)
- `comments` - text, NULL (free-form feedback text)
- `created_at` - timestamp, NULL (default: CURRENT_TIMESTAMP)

---

## PHASE 1 API ENDPOINTS (To Build)

### Partner Dashboard Data
- `GET /api/partner-portal/dashboard` - Main dashboard overview
  - Returns: partner profile, PowerConfidence score, trends, key metrics

### Performance Metrics
- `GET /api/partner-portal/analytics/quarterly` - Quarterly score history
  - Query: partner_analytics WHERE metric_type = 'powerconfidence_score'

- `GET /api/partner-portal/analytics/categories` - Category breakdown scores
  - **NOTE**: This may require new data or calculation logic - to be determined

### Feedback Data
- `GET /api/partner-portal/feedback` - Recent contractor feedback
  - Query: feedback_responses JOIN feedback_surveys ON partner_id

- `GET /api/partner-portal/feedback/summary` - Feedback statistics
  - Aggregates: AVG(rating), COUNT(*), sentiment analysis

### Lead/Contractor Data
- `GET /api/partner-portal/contractors/active` - Active contractor count
  - Query: contractor_partner_matches WHERE is_primary_match = true + contractor is active

- `GET /api/partner-portal/contractors/total` - Total contractor engagements
  - Query: COUNT(DISTINCT contractor_id) from contractor_partner_matches

---

## COMMON QUERY PATTERNS

### Dashboard Overview Query
```sql
SELECT
  sp.id,
  sp.company_name,
  sp.contact_email,
  sp.power_confidence_score,
  sp.previous_powerconfidence_score,
  sp.score_trend,
  sp.industry_rank,
  sp.category_rank,
  sp.average_satisfaction,
  sp.total_feedback_responses,
  sp.avg_contractor_satisfaction,
  sp.total_contractor_engagements,
  sp.completed_bookings,
  sp.total_bookings
FROM strategic_partners sp
WHERE sp.id = $1 AND sp.is_active = true;
```

### Active Contractors Count
```sql
SELECT COUNT(DISTINCT cpm.contractor_id) as active_contractors
FROM contractor_partner_matches cpm
INNER JOIN contractors c ON c.id = cpm.contractor_id
WHERE cpm.partner_id = $1
  AND cpm.is_primary_match = true
  AND c.last_activity_at > NOW() - INTERVAL '30 days';
```

### Quarterly PowerConfidence Trend
```sql
SELECT
  period_start,
  period_end,
  metric_value as score,
  metadata
FROM partner_analytics
WHERE partner_id = $1
  AND metric_type = 'powerconfidence_score'
ORDER BY period_end DESC
LIMIT 4;
```

### Recent Feedback Summary
```sql
SELECT
  COUNT(*) as total_responses,
  AVG(fr.rating) as avg_rating,
  COUNT(CASE WHEN fr.rating >= 8 THEN 1 END) as positive_count,
  COUNT(CASE WHEN fr.rating <= 5 THEN 1 END) as negative_count
FROM feedback_responses fr
INNER JOIN feedback_surveys fs ON fs.id = fr.survey_id
WHERE fs.partner_id = $1
  AND fr.created_at > NOW() - INTERVAL '90 days';
```

### Category Scores Calculation (TBD)
**NOTE**: The dashboard shows scores for categories like "Service Quality", "Communication", "Results Delivered", etc. These may need to be:
1. Stored in a new table (e.g., `partner_category_scores`)
2. Calculated from feedback comments using AI/NLP
3. Manually entered by admins during quarterly reviews

**Decision needed**: How are category scores determined?

---

## CRITICAL FIELD NAMING NOTES

### ⚠️ PowerConfidence Score Field Name
**CORRECT**: `power_confidence_score` (with underscores)
**INCORRECT**: `powerconfidence_score` (no underscores)

The database has BOTH fields for backwards compatibility:
- `powerconfidence_score` - Legacy field (may be deprecated)
- `power_confidence_score` - Current/primary field

**ALWAYS USE**: `power_confidence_score` in new code

### ⚠️ Duplicate Match Fields
The `contractor_partner_matches` table has duplicate fields:
- OLD: `score`, `reasons`, `is_primary`
- NEW: `match_score`, `match_reasons`, `is_primary_match`

**ALWAYS USE**: The newer fields (`match_score`, `match_reasons`, `is_primary_match`)

### ⚠️ Timestamp Field Naming
- `created_at` (NOT createdAt, creation_date, or create_date)
- `updated_at` (NOT updatedAt, modification_date, or update_date)
- `last_login` (NOT last_login_at or lastLogin)

---

## FIELD NAMING STANDARDS (Database is Source of Truth)

**Always use these EXACT field names:**
- ✅ `partner_id` (NOT partnerId, partner_ID)
- ✅ `power_confidence_score` (NOT powerconfidence_score, powerConfidenceScore)
- ✅ `contractor_id` (NOT contractorId, contractor_ID)
- ✅ `metric_type` (NOT metricType, metric_category)
- ✅ `lead_status` (NOT leadStatus, status)
- ✅ `is_active` (NOT isActive, active)
- ✅ `created_at` (NOT createdAt, creation_date)

**Common Mistakes to Avoid:**
- ❌ Using camelCase (database uses snake_case)
- ❌ Abbreviating field names (avg vs average_satisfaction)
- ❌ Guessing field names without checking database
- ❌ Using old/legacy field names instead of current ones

---

## PHASE 1 IMPLEMENTATION CHECKLIST

### Before Writing Any Code
- [ ] Verify partner_id exists in strategic_partners table
- [ ] Confirm power_confidence_score field exists (with underscores)
- [ ] Check if category scores data exists or needs to be calculated
- [ ] Verify feedback_surveys links to strategic_partners correctly
- [ ] Confirm contractor_partner_matches has data for target partner

### When Building Endpoints
- [ ] Always add `DATABASE-CHECKED: [table_name]` comment to controllers
- [ ] Use parameterized queries with $1, $2 syntax
- [ ] Handle NULL values appropriately
- [ ] Return JSON with success/error status
- [ ] Add proper error handling and logging

### When Testing
- [ ] Test with real partner_id from database
- [ ] Verify all fields return correct data types
- [ ] Check NULL handling for optional fields
- [ ] Test with partners who have no feedback/leads
- [ ] Verify calculations (averages, counts) are correct

---

## NOTES

1. **Read-Only Operations**: Phase 1 is data fetching only - NO INSERT/UPDATE/DELETE
2. **Performance**: Use indexes on partner_id, contractor_id for join queries
3. **Time Zones**: All timestamps stored without timezone (assume UTC)
4. **NULL Handling**: Many fields can be NULL - use COALESCE or IS NOT NULL filters
5. **JSON Fields**: Some TEXT fields contain JSON strings - parse carefully
6. **Category Scores**: Decision needed on how to calculate/store these
7. **Response Rate**: Not stored - needs to be calculated from lead data or contractor interactions

---

**Document Created**: October 24, 2025
**Database Verified**: October 24, 2025
**Status**: Ready for Phase 1 Implementation
