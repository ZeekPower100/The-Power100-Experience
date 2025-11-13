# Bulk Operations - Database Field Verification
**Date**: November 12, 2025
**Table**: `contractor_partner_matches`
**Purpose**: Verify 100% field alignment before building bulk operations backend

---

## ✅ DATABASE SCHEMA VERIFIED

### Table: contractor_partner_matches

| Column Name | Data Type | Usage in Bulk Operations |
|-------------|-----------|--------------------------|
| `id` | integer | ✅ Lead identification for bulk selection |
| `contractor_id` | integer | ✅ Reference to contractor |
| `partner_id` | integer | ✅ Verify lead ownership before bulk update |
| `engagement_stage` | character varying | ✅ PRIMARY FIELD for bulk status updates |
| `status` | character varying | ✅ Additional status tracking |
| `last_contact_date` | timestamp | ✅ Auto-update on bulk status change |
| `next_follow_up_date` | timestamp | ⚠️ Optional field for future enhancements |
| `notes` | jsonb | ✅ Export to CSV |
| `updated_at` | timestamp | ✅ Auto-update on all bulk operations |
| `match_score` | integer | ✅ Export to CSV |
| `match_reasons` | text | ✅ Export to CSV |
| `is_primary_match` | boolean | ✅ Export to CSV |
| `created_at` | timestamp | ✅ Export to CSV |

---

## ✅ ENGAGEMENT_STAGE VALUES VERIFIED

### Currently Used Values in Database:
- `new` ✅
- `contacted` ✅
- `meeting_scheduled` ✅
- `proposal_sent` ✅

### Frontend Valid Values (BulkActionsToolbar.tsx):
- `new` ✅ (matches DB)
- `contacted` ✅ (matches DB)
- `meeting_scheduled` ✅ (matches DB)
- `proposal_sent` ✅ (matches DB)
- `negotiating` ✅ (valid future state)
- `won` ✅ (valid future state)
- `lost` ✅ (valid future state)
- `nurturing` ✅ (valid future state)

**Result**: ✅ All frontend stages are valid

---

## 🔧 BACKEND FUNCTIONS TO BUILD

### 1. Bulk Status Update
**Function**: `bulkUpdateLeadStatus()`
**Route**: `PUT /api/partner-portal/leads/bulk/status`

**Input**:
```javascript
{
  leadIds: [1, 2, 3],  // array of integers
  engagement_stage: 'contacted'  // character varying
}
```

**Database Operations**:
```sql
UPDATE contractor_partner_matches
SET
  engagement_stage = $1,
  last_contact_date = NOW(),
  updated_at = NOW()
WHERE
  id = ANY($2::int[])
  AND partner_id = $3
RETURNING id, engagement_stage, updated_at;
```

**Field Alignment**:
- ✅ `engagement_stage` (character varying)
- ✅ `last_contact_date` (timestamp)
- ✅ `updated_at` (timestamp)
- ✅ `id` (integer)
- ✅ `partner_id` (integer)

---

### 2. Export Leads to CSV
**Function**: `exportLeads()`
**Route**: `POST /api/partner-portal/leads/export`

**Input**:
```javascript
{
  leadIds: [1, 2, 3]  // array of integers
}
```

**Database Query**:
```sql
SELECT
  cpm.id,
  c.company_name,
  c.email,
  c.phone,
  c.revenue_tier,
  c.team_size,
  cpm.match_score,
  cpm.match_reasons,
  cpm.engagement_stage,
  cpm.is_primary_match,
  cpm.last_contact_date,
  cpm.next_follow_up_date,
  cpm.created_at
FROM contractor_partner_matches cpm
LEFT JOIN contractors c ON c.id = cpm.contractor_id
WHERE
  cpm.id = ANY($1::int[])
  AND cpm.partner_id = $2
ORDER BY cpm.created_at DESC;
```

**Field Alignment - contractor_partner_matches**:
- ✅ `id` (integer)
- ✅ `match_score` (integer)
- ✅ `match_reasons` (text)
- ✅ `engagement_stage` (character varying)
- ✅ `is_primary_match` (boolean)
- ✅ `last_contact_date` (timestamp)
- ✅ `next_follow_up_date` (timestamp)
- ✅ `created_at` (timestamp)
- ✅ `contractor_id` (integer)
- ✅ `partner_id` (integer)

**Field Alignment - contractors table**:
- ✅ `company_name` (character varying) - VERIFIED
- ✅ `email` (character varying) - VERIFIED
- ✅ `phone` (character varying) - VERIFIED
- ✅ `revenue_tier` (character varying) - VERIFIED
- ✅ `team_size` (character varying) - VERIFIED

---

## ✅ 100% DATABASE ALIGNMENT VERIFIED

All fields verified against database schema. Safe to proceed with backend implementation.

**Verification Date**: November 12, 2025
**Verified By**: Database schema query via quick-db.bat
**Tables Checked**:
- contractor_partner_matches ✅
- contractors ✅

**Status**: ✅ READY TO BUILD
