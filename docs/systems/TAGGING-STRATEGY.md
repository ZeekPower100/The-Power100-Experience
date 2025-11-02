# GHL Tagging Strategy - Comprehensive Implementation

**Date:** November 1, 2025
**Status:** ACTIVE - Being Implemented
**Purpose:** Standardized tagging for all communications through n8n → GHL

---

## 🎯 Executive Summary

All messages sent through n8n webhooks will include a `tags` array in the payload. This allows GHL to automatically tag contacts based on:
- Communication type (email, SMS)
- Message category (event, report, PowerCard)
- Recipient type (contractor, partner, admin)
- Action status (sent, opened, clicked)
- Time period (quarter, year)

---

## 🏷️ Tag Naming Convention

**Format:** `category:subcategory:detail`

**Examples:**
- `report:executive:Q1-2025`
- `report:contractor:Q4-2025`
- `powercard:sent:Q3-2025`
- `powercard:completed:Q3-2025`
- `event:registration:confirmed`
- `event:checkin:completed`

---

## 📋 Tag Categories

### 1. Report Communications

#### Executive Reports (Partners)
```javascript
tags: [
  'report:executive',           // Report type
  'recipient:partner',          // Who receives it
  'status:sent',                // Delivery status
  'Q1-2025',                    // Time period
  'email'                       // Channel
]
```

#### Contractor Reports (Contractors)
```javascript
tags: [
  'report:contractor',          // Report type
  'recipient:contractor',       // Who receives it
  'status:sent',                // Delivery status
  'Q1-2025',                    // Time period
  'email'                       // Channel
]
```

#### Public PCR (Landing Page - N/A for tagging)
- Not sent via email/SMS, so no tags needed

---

### 2. PowerCard Communications

#### PowerCard SMS Invite
```javascript
tags: [
  'powercard:invite',           // PowerCard phase
  'recipient:contractor',       // Who receives it
  'status:sent',                // Delivery status
  'Q3-2025',                    // Survey quarter
  'sms',                        // Channel
  'partner:PARTNER_ID'          // Which partner
]
```

#### PowerCard Email Reminder
```javascript
tags: [
  'powercard:reminder',         // PowerCard phase
  'recipient:contractor',       // Who receives it
  'status:sent',                // Delivery status
  'Q3-2025',                    // Survey quarter
  'email',                      // Channel
  'partner:PARTNER_ID'          // Which partner
]
```

#### PowerCard Completed Confirmation
```javascript
tags: [
  'powercard:completed',        // PowerCard phase
  'recipient:contractor',       // Who receives it
  'status:confirmed',           // Completion status
  'Q3-2025',                    // Survey quarter
  'feedback:positive'           // Sentiment (optional)
]
```

---

### 3. Event Communications

#### Registration Confirmation
```javascript
tags: [
  'event:registration',         // Event phase
  'recipient:contractor',       // Who receives it
  'status:confirmed',           // Registration status
  'event:EVENT_ID',             // Which event
  'email'                       // Channel
]
```

#### Check-In Reminders
```javascript
tags: [
  'event:checkin',              // Event phase
  'recipient:contractor',       // Who receives it
  'status:sent',                // Delivery status
  'event:EVENT_ID',             // Which event
  'email'                       // Channel
]
```

---

## 🔧 Implementation Pattern

### Backend Service (JavaScript/Node.js)

```javascript
// Standard tag builder function
function buildTags(options) {
  const {
    category,        // 'report', 'powercard', 'event'
    type,            // 'executive', 'contractor', 'invite', etc.
    recipient,       // 'partner', 'contractor', 'admin'
    channel,         // 'email', 'sms'
    quarter,         // 'Q1', 'Q2', 'Q3', 'Q4'
    year,            // 2025
    status,          // 'sent', 'confirmed', 'completed'
    entityId         // partner ID, event ID, etc.
  } = options;

  const tags = [];

  // Core tags (always include)
  if (category && type) tags.push(`${category}:${type}`);
  if (recipient) tags.push(`recipient:${recipient}`);
  if (status) tags.push(`status:${status}`);

  // Channel tag
  if (channel) tags.push(channel);

  // Time period tag
  if (quarter && year) tags.push(`${quarter}-${year}`);

  // Entity reference (if applicable)
  if (entityId && category === 'event') tags.push(`event:${entityId}`);
  if (entityId && category === 'powercard') tags.push(`partner:${entityId}`);

  return tags;
}

// Usage Example
const n8nPayload = {
  to_email: recipient.email,
  to_name: recipient.name,
  subject: emailSubject,
  body: emailBody,
  template: 'executive_report',
  tags: buildTags({
    category: 'report',
    type: 'executive',
    recipient: 'partner',
    channel: 'email',
    quarter: 'Q1',
    year: 2025,
    status: 'sent'
  }),
  // ... other fields
};
```

---

## 📊 Tag Usage by System

### Reports System (Phase 2)
| Communication | Tags |
|---------------|------|
| Executive Report Email | `report:executive`, `recipient:partner`, `status:sent`, `Q1-2025`, `email` |
| Contractor Report Email | `report:contractor`, `recipient:contractor`, `status:sent`, `Q1-2025`, `email` |

### PowerCard System (Phase 3)
| Communication | Tags |
|---------------|------|
| PowerCard SMS Invite | `powercard:invite`, `recipient:contractor`, `status:sent`, `Q3-2025`, `sms`, `partner:ID` |
| PowerCard Email Reminder | `powercard:reminder`, `recipient:contractor`, `status:sent`, `Q3-2025`, `email`, `partner:ID` |
| PowerCard Completion | `powercard:completed`, `recipient:contractor`, `status:confirmed`, `Q3-2025` |

### Event System (Existing)
| Communication | Tags |
|---------------|------|
| Registration Email | `event:registration`, `recipient:contractor`, `status:confirmed`, `event:ID`, `email` |
| Check-In Reminder | `event:checkin`, `recipient:contractor`, `status:sent`, `event:ID`, `email` |
| Agenda Ready | `event:agenda`, `recipient:contractor`, `status:sent`, `event:ID`, `email` |

---

## 🔌 n8n Configuration

### Overview
The backend now sends a `tags` array in every n8nPayload. Your n8n workflow needs to:
1. Receive the tags from the webhook payload
2. Send the email (existing functionality)
3. Find the contact in GHL by email
4. Apply the tags to the contact
5. Log the result for tracking

---

### Step 1: Update Webhook Node (Already Exists)
Your existing `/webhook/email-outbound{-dev}` webhook already receives payloads. The backend now includes a `tags` field:

**Example Payload from Backend:**
```json
{
  "to_email": "partner@example.com",
  "to_name": "Acme Corp",
  "subject": "Your Q1 2025 Executive Performance Report",
  "body": "<html>...</html>",
  "template": "executive_report",
  "tags": [
    "report:executive",
    "recipient:partner",
    "status:sent",
    "Q1-2025",
    "email"
  ],
  "report_id": 123,
  "quarter": "Q1",
  "year": 2025
}
```

**Webhook Configuration:**
- Method: POST
- Path: `/webhook/email-outbound` (production) or `/webhook/email-outbound-dev` (development)
- Response Mode: "Wait for webhook response" (optional)
- No authentication changes needed

---

### Step 2: Send Email (Existing Node - No Changes)
Your existing email send node continues to work as-is:
- Use `{{ $json.to_email }}` for recipient
- Use `{{ $json.subject }}` for subject
- Use `{{ $json.body }}` for HTML body
- Email provider (SendGrid/AWS SES/etc.) unchanged

---

### Step 3: Find Contact in GHL
After the email is sent successfully, add a "GoHighLevel" node to find the contact:

**Node: "Find Contact by Email"**
- **Operation:** Find Contact
- **Search Field:** Email
- **Search Value:** `{{ $json.to_email }}`
- **Return All:** No (return first match)

**If Contact Not Found:**
- Create contact first (optional, or skip tagging)
- Log warning: "Contact not found in GHL for {{ $json.to_email }}"

---

### Step 4: Add Tags to Contact
Add another "GoHighLevel" node to apply tags:

**Node: "Add Tags to Contact"**
- **Operation:** Update Contact
- **Contact ID:** `{{ $node["Find Contact by Email"].json.id }}`
- **Tags:** `{{ $json.tags }}` (n8n will handle array formatting)
- **Action:** Add tags (don't replace existing tags)

**Important:**
- GHL expects tags as an array of strings
- Backend already sends in correct format: `["tag1", "tag2", "tag3"]`
- Use "Add" mode to preserve existing tags on the contact

---

### Step 5: Log Tagging Result (Optional but Recommended)
Add a "Set" node to log the tagging operation:

**Node: "Log Tagging Success"**
```json
{
  "timestamp": "{{ $now }}",
  "contact_email": "{{ $json.to_email }}",
  "contact_id": "{{ $node["Find Contact by Email"].json.id }}",
  "tags_applied": "{{ $json.tags }}",
  "template": "{{ $json.template }}",
  "status": "success"
}
```

Store this in a database table or send to logging service for analytics.

---

### Complete n8n Flow
```
┌─────────────────────────┐
│ Webhook Trigger         │ ← Receives payload with tags array
│ /webhook/email-outbound │
└─────────┬───────────────┘
          ↓
┌─────────────────────────┐
│ Send Email              │ ← Existing email send node
│ (SendGrid/SES/etc)      │
└─────────┬───────────────┘
          ↓
┌─────────────────────────┐
│ Find Contact in GHL     │ ← Search by to_email
│ by Email                │
└─────────┬───────────────┘
          ↓
┌─────────────────────────┐
│ Add Tags to Contact     │ ← Apply tags array to contact
└─────────┬───────────────┘
          ↓
┌─────────────────────────┐
│ Log Success             │ ← Track tagging for analytics
│ (Optional)              │
└─────────────────────────┘
```

---

### Error Handling
Add error handling nodes between each step:

**If Email Send Fails:**
- Don't attempt to tag
- Log error with payload details
- Return error response to backend

**If Contact Not Found:**
- Option 1: Create contact, then tag
- Option 2: Log warning, skip tagging
- Don't fail the entire workflow

**If Tagging Fails:**
- Log error but don't re-send email
- Alert admin for manual tagging
- Continue workflow (email was already sent)

---

### Testing the n8n Configuration

**Test 1: Manual Webhook Test**
```bash
curl -X POST https://n8n.srv918843.hstgr.cloud/webhook/email-outbound-dev \
  -H "Content-Type: application/json" \
  -d '{
    "to_email": "test@example.com",
    "to_name": "Test User",
    "subject": "Test Email",
    "body": "<html><body>Test</body></html>",
    "template": "executive_report",
    "tags": ["test:tag", "recipient:partner", "status:sent"]
  }'
```

**Expected Result:**
1. Email sent to test@example.com
2. Contact found in GHL (or created)
3. Tags applied: `test:tag`, `recipient:partner`, `status:sent`
4. Success logged

**Test 2: Backend API Test**
Use the backend `/api/reports/:reportId/send` endpoint (requires generated report)

---

### Monitoring & Analytics

**Track These Metrics in n8n:**
1. Total emails sent with tags
2. Successful tagging operations
3. Failed tagging operations (contact not found)
4. Most commonly applied tags
5. Tagging errors by template type

**GHL Analytics:**
- Go to GHL → Contacts → Filter by tag
- Verify contacts are being tagged correctly
- Check tag counts match backend logs

---

## 📈 Benefits

### For Marketing
- Segment by report recipients
- Track PowerCard participation rates
- Event attendance analysis
- Multi-quarter engagement tracking

### For Analytics
- Email open rates by category
- PowerCard completion trends
- Quarterly engagement metrics
- Partner-specific response rates

### For Operations
- Automated follow-up workflows
- Missed PowerCard reminders
- Report delivery confirmation
- Engagement health scores

---

## 🎯 Priority Implementation Order

### Phase 1: Reports (NOW)
- ✅ Executive report emails
- ✅ Contractor report emails

### Phase 2: PowerCard (NEXT)
- PowerCard SMS invites
- PowerCard email reminders
- Completion confirmations

### Phase 3: Events (RETROFIT)
- Registration confirmations
- Check-in reminders
- Agenda notifications

---

## 📝 Tag Maintenance

### Adding New Tags
1. Document in this file first
2. Update backend service
3. Configure n8n workflow
4. Test with sample contact
5. Deploy to production

### Tag Cleanup
- Tags are never removed automatically
- Use GHL bulk operations for cleanup
- Archive old quarter tags annually

---

## 🧪 Testing Checklist

### Backend Testing
- [ ] Tags array properly formatted
- [ ] All required tags included
- [ ] Dynamic values (quarter, year) correct
- [ ] Entity IDs included when applicable

### n8n Testing
- [ ] Webhook receives tags array
- [ ] Tags extracted correctly
- [ ] GHL contact found by email
- [ ] Tags applied to contact
- [ ] No duplicate tags

### GHL Testing
- [ ] Tags appear in contact record
- [ ] Tags are searchable
- [ ] Segments work with tags
- [ ] Automation triggers fire

---

## 🚨 Important Notes

### DO:
- ✅ Use consistent tag format (`category:type`)
- ✅ Include time period for all reports/PowerCards
- ✅ Tag both email and SMS communications
- ✅ Include status tags for tracking

### DON'T:
- ❌ Use spaces in tags (use hyphens or colons)
- ❌ Create duplicate tags with different casing
- ❌ Omit time period for time-based communications
- ❌ Use PII (names, emails) in tag names

---

## 📚 Related Documents

- `tpe-backend/src/services/emailDeliveryService.js` - Report email tags
- `tpe-backend/src/services/eventOrchestrator/emailScheduler.js` - Event email tags
- `docs/systems/PCR/PowerCard/POWERCARD-COMMUNICATIONS.md` - PowerCard tag strategy

---

**Last Updated:** November 1, 2025
**Next Review:** After Phase 2 completion
**Status:** Being Implemented

---

## Quick Reference

**Report Tags:**
```javascript
// Executive
['report:executive', 'recipient:partner', 'status:sent', 'Q1-2025', 'email']

// Contractor
['report:contractor', 'recipient:contractor', 'status:sent', 'Q1-2025', 'email']
```

**PowerCard Tags:**
```javascript
// Invite
['powercard:invite', 'recipient:contractor', 'status:sent', 'Q3-2025', 'sms', 'partner:4']

// Reminder
['powercard:reminder', 'recipient:contractor', 'status:sent', 'Q3-2025', 'email', 'partner:4']

// Completed
['powercard:completed', 'recipient:contractor', 'status:confirmed', 'Q3-2025', 'partner:4']
```
