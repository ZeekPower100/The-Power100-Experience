# Live PCRs - Database Field Verification
**Date**: November 13, 2025
**Table**: strategic_partners
**Status**: ✅ 100% VERIFIED

---

## Field Alignment Verification

### ❌ INCORRECT Field Names Used Initially:
1. `pcr_score` → **DOES NOT EXIST**
2. `revenue_tier` → **DOES NOT EXIST**
3. `slug` → **DOES NOT EXIST**
4. `last_pcr_update` → **DOES NOT EXIST**

### ✅ CORRECT Field Names (Database-Verified):
1. **PCR Score**: `final_pcr_score` (numeric)
   - Contains actual calculated PCR values
   - Example: 94.00, 34.00
   - Alternative: `base_pcr_score` (raw score before momentum)

2. **Revenue Range**: `target_revenue_range` (text)
   - Partner's target customer revenue tier
   - Note: `revenue_tiers` also exists (text)

3. **Subdomain/Slug**: `power100_subdomain` (character varying)
   - Used for partner landing pages
   - Format: company-name-slug

4. **Last PCR Calculation**: `pcr_last_calculated` (timestamp without time zone)
   - When PCR was last updated

5. **Focus Areas**: `focus_areas_served` (text)
   - JSON/text field with partner service areas

6. **Company Info**:
   - `company_name` ✓ (character varying)
   - `logo_url` ✓ (character varying)
   - `is_active` ✓ (boolean)

7. **Quarterly Tracking**:
   - `quarterly_history` (jsonb) - Historical quarterly data
   - `quarterly_feedback_score` (numeric) - Current quarter feedback
   - `last_quarterly_report` (date)
   - `next_quarterly_review` (date)
   - `quarters_tracked` (integer)

---

## SQL Query with CORRECT Field Names:

```sql
SELECT
  id,
  company_name,
  logo_url,
  final_pcr_score,
  base_pcr_score,
  focus_areas_served,
  target_revenue_range,
  power100_subdomain,
  pcr_last_calculated,
  quarterly_feedback_score,
  quarterly_history,
  is_active
FROM strategic_partners
WHERE is_active = true
  AND final_pcr_score IS NOT NULL
ORDER BY final_pcr_score DESC, company_name ASC;
```

---

## Verified Data Sample:

```
company_name       | final_pcr_score | base_pcr_score
-------------------+-----------------+----------------
Destination Motivation | 94.00      | 41.30
Video Trigger Test     | 34.00      | 35.00
Video Test Partner     | 34.00      | 35.00
```

---

## All Database Corrections Applied:

### livePCRController.js - Line-by-Line Verification:
- ✅ Line 27: `p.final_pcr_score` (was pcr_score)
- ✅ Line 28: `p.base_pcr_score` (added for reference)
- ✅ Line 30: `p.target_revenue_range` (was revenue_tier)
- ✅ Line 31: `p.power100_subdomain` (was slug)
- ✅ Line 32: `p.pcr_last_calculated` (was last_pcr_update)
- ✅ Line 37: `WHERE p.final_pcr_score IS NOT NULL`
- ✅ Line 52: `p.target_revenue_range = $${paramCount}` (filter)
- ✅ Line 58: `ORDER BY p.final_pcr_score DESC` (sort)
- ✅ Line 99: `pcr_score: parseFloat(partner.final_pcr_score)` (response)
- ✅ Line 104: `revenue_tier: partner.target_revenue_range` (response)
- ✅ Line 108: `slug: partner.power100_subdomain` (response)
- ✅ Line 135: `if (partner.target_revenue_range)` (filter options)
- ✅ Line 184: `partner.final_pcr_score?.toFixed(1)` (analysis snippet)

### Other Files:
- ✅ Documentation updated with verified schema
- ✅ Frontend expects correct API response structure
- ✅ Verification document created

**100% DATABASE ALIGNMENT VERIFIED** ✅
