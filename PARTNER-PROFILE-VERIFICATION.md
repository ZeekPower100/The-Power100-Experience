# Partner Profile Completion System - Database Verification

## ✅ Verified Database Fields

### strategic_partners table - ALL VERIFIED ✅

| Field Name | Data Type | Status | Notes |
|------------|-----------|--------|-------|
| `company_name` | VARCHAR(255) | ✅ Verified | Primary identifier |
| `company_description` | TEXT | ✅ Verified | What they do |
| `primary_contact` | VARCHAR(255) | ✅ Verified | Contact person name |
| `primary_email` | VARCHAR(255) | ✅ Verified | Email address |
| `primary_phone` | VARCHAR(50) | ✅ Verified | Phone number |
| `value_proposition` | TEXT | ✅ Verified | Why they're valuable |
| `focus_areas` | TEXT | ✅ Verified | **JSON string format**: `["Area 1","Area 2"]` |
| `service_areas` | TEXT | ✅ Verified | **JSON string format**: `["Service 1","Service 2"]` |
| `target_revenue_audience` | TEXT | ✅ Verified | Who they serve |
| `key_differentiators` | TEXT | ✅ Verified | What makes them unique |
| `ai_generated_differentiators` | TEXT | ✅ Verified | AI-generated differentiators |
| `website` | VARCHAR(500) | ✅ Verified | Company website |

### event_sponsors table - ALL VERIFIED ✅

| Field Name | Data Type | Status | Notes |
|------------|-----------|--------|-------|
| `id` | INTEGER | ✅ Verified | Primary key |
| `event_id` | INTEGER | ✅ Verified | Links to events table |
| `partner_id` | INTEGER | ✅ Verified | **Links to strategic_partners** |
| `sponsor_name` | VARCHAR | ✅ Verified | Display name |
| `sponsor_tier` | VARCHAR | ✅ Verified | Sponsorship level |

### event_messages table - VERIFIED WITH LIMITATION ⚠️

| Field Name | Data Type | Status | Notes |
|------------|-----------|--------|-------|
| `id` | INTEGER | ✅ Verified | Primary key |
| `event_id` | INTEGER | ✅ Verified | Links to events |
| `contractor_id` | INTEGER | ✅ Verified | **Only for contractors** |
| `message_type` | VARCHAR | ✅ Verified | Type of message |
| `direction` | VARCHAR | ✅ Verified | outbound/inbound |
| `channel` | VARCHAR | ✅ Verified | email/sms |
| `personalization_data` | JSONB | ✅ Verified | **Store partner_id here** |
| `message_content` | TEXT | ✅ Verified | Email HTML body |
| `status` | VARCHAR | ✅ Verified | pending/sent/failed |

## ⚠️ CRITICAL FINDING: event_messages Structure

### Issue
`event_messages` table has **NO `partner_id` column**. It only has `contractor_id`.

### Impact on Design
- Cannot directly link partner emails via foreign key
- Must store partner information in `personalization_data` JSONB field
- `contractor_id` will be NULL for partner emails

### Solution Pattern (Used Throughout System)
```javascript
// For partner emails, contractor_id = NULL
await query(`
  INSERT INTO event_messages (
    event_id,
    contractor_id,        -- Will be NULL for partners
    message_type,
    direction,
    channel,
    personalization_data, -- Store partner info here
    message_content,
    status
  ) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7)
`, [
  eventId,
  'partner_profile_completion_request',
  'outbound',
  'email',
  JSON.stringify({
    partner_id: partnerId,           // Store here
    company_name: partner.company_name,
    email_subject: emailSubject
  }),
  emailBody,
  'pending'
]);
```

## ✅ Verified Data Formats

### JSON String Fields
Both `focus_areas` and `service_areas` are stored as JSON strings in TEXT fields:

```sql
-- Example actual data from database:
focus_areas: '["Growth Acceleration","Digital Transformation"]'
service_areas: '["Technology","Marketing"]'
```

### Parsing Required
```javascript
// When checking completeness:
const focusAreas = JSON.parse(partner.focus_areas || '[]');
if (!Array.isArray(focusAreas) || focusAreas.length === 0) {
  return false; // Incomplete
}
```

## ✅ Verified Webhook Endpoints

### n8n Email Webhook - VERIFIED ✅
```javascript
const N8N_WEBHOOK_BASE = process.env.N8N_WEBHOOK_BASE || 'https://n8n.srv918843.hstgr.cloud';
const N8N_ENV = process.env.NODE_ENV === 'production' ? '' : '-dev';

// Endpoint used throughout system:
const n8nWebhook = `${N8N_WEBHOOK_BASE}/webhook/email-outbound${N8N_ENV}`;

// Development: https://n8n.srv918843.hstgr.cloud/webhook/email-outbound-dev
// Production:  https://n8n.srv918843.hstgr.cloud/webhook/email-outbound
```

### Payload Structure - VERIFIED ✅
```javascript
const n8nPayload = {
  message_id: messageId,
  to_email: partner.primary_email,
  to_name: partner.primary_contact || partner.company_name,
  subject: emailSubject,
  body: emailBody,
  template: 'partner_profile_completion_request',
  event_id: eventId,
  partner_id: partnerId  // Custom field, not in contractor emails
};
```

## 🔧 Required Updates to Design Document

### 1. Update event_messages INSERT
**BEFORE:**
```javascript
INSERT INTO event_messages (
  contractor_id, event_id, message_type, ...
) VALUES ($1, $2, $3, ...)
```

**AFTER:**
```javascript
INSERT INTO event_messages (
  event_id, contractor_id, message_type, personalization_data, ...
) VALUES ($1, NULL, $2, $3, ...)
-- contractor_id = NULL for partner emails
-- partner_id stored in personalization_data
```

### 2. Update Profile Completeness Check
**CORRECT CODE:**
```javascript
function checkPartnerProfileCompleteness(partner) {
  const requiredFields = [
    'company_name',
    'company_description',
    'primary_contact',
    'primary_email',
    'primary_phone',
    'value_proposition',
    'focus_areas',
    'service_areas',
    'target_revenue_audience'
  ];

  for (const field of requiredFields) {
    const value = partner[field];

    if (!value || value === '' || value === 'null') {
      return false;
    }

    // JSON string fields - parse and check
    if (field === 'focus_areas' || field === 'service_areas') {
      try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed) || parsed.length === 0) {
          return false;
        }
      } catch (e) {
        return false; // Invalid JSON
      }
    }
  }

  // Check differentiators (either field)
  const hasDifferentiators =
    (partner.key_differentiators && partner.key_differentiators !== '') ||
    (partner.ai_generated_differentiators && partner.ai_generated_differentiators !== '');

  return hasDifferentiators;
}
```

### 3. Update personalization_data Structure
**CORRECT STRUCTURE:**
```javascript
personalization_data: {
  partner_id: partnerId,           // PRIMARY: Link to strategic_partners
  company_name: partner.company_name,
  email_subject: emailSubject,
  event_name: event.name,
  template: 'partner_profile_completion_request'
}
```

## ✅ Verification Complete

All database field names, data types, and webhook endpoints have been verified against:
- Actual database schema (`information_schema.columns`)
- Actual data samples (JSON format verification)
- Existing codebase patterns (`emailScheduler.js`)

**Ready to proceed with implementation.**

---

## Next Steps
1. ✅ Update design document with corrections
2. ✅ Implement partner profile completeness check
3. ✅ Create email template using verified patterns
4. ✅ Add email scheduler function
5. ✅ Enhance syncEventSponsors to trigger checks
