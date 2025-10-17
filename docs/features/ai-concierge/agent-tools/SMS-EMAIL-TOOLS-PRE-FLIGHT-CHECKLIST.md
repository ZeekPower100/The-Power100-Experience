# SMS & Email Agent Tools: Pre-Flight Checklist

**Document Version:** 1.0
**Date:** October 17, 2025
**Status:** MANDATORY - Use before creating SMS/Email agent tools
**Purpose:** Enable AI Concierge agents to send SMS and emails during conversations

---

## 🎯 Purpose

This checklist ensures 100% database and service alignment when creating `sendSMSTool.js` and `sendEmailTool.js` for LangGraph agents. These tools will enable the AI Concierge to send real-time SMS and emails during conversations, complementing (not replacing) the existing automated Event Orchestration flow.

---

## 📋 Tool Requirements Overview

### Tool 1: `sendSMSTool.js`
**Purpose:** Send SMS messages to contractors during AI Concierge conversations
**Integration Point:** n8n webhook → GHL SMS service (ALREADY WORKING in Event Orchestration)
**Use Cases:**
- Contractor requests booth number via SMS
- AI wants to send real-time event updates
- Contractor asks for reminder to be texted
- Proactive follow-up scheduling confirmation

### Tool 2: `sendEmailTool.js`
**Purpose:** Send emails to contractors during AI Concierge conversations
**Integration Point:** `emailService.js` (ALREADY WORKING in Event Orchestration)
**Use Cases:**
- Contractor requests detailed partner information
- AI wants to send resource lists
- Contractor asks for event agenda via email
- Partner introduction emails on demand

---

## ✅ MANDATORY CHECKLIST - Before Creating Tools

### Step 1: Verify Database Tables for Logging

**Tools will log to these tables:**
1. **contractors** - To get phone/email
2. **ai_learning_events** - To track SMS/email sends
3. **event_messages** (optional) - To log event-related messages

#### Verify `contractors` Table (Phone & Email Fields)

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'phone', 'email', 'first_name', 'last_name') ORDER BY ordinal_position;\""
```

**Expected Output:**
```
column_name | data_type         | is_nullable
------------|-------------------|------------
id          | integer           | NO
email       | character varying | YES (or NO - verify!)
phone       | character varying | YES
first_name  | character varying | YES
last_name   | character varying | YES
```

**Critical Fields:**
- `phone` (VARCHAR) - Contractor's phone number
- `email` (VARCHAR) - Contractor's email address
- `first_name` (VARCHAR) - For personalization
- `last_name` (VARCHAR) - For personalization

**⚠️ VERIFICATION REQUIRED:**
- [ ] Verify `phone` field exists
- [ ] Verify `email` field exists
- [ ] Check if either can be NULL (handle gracefully if NULL)

---

#### Verify `ai_learning_events` Table (Tool Logging)

```bash
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'ai_learning_events' ORDER BY ordinal_position;\""
```

**Expected Output:**
```
column_name              | data_type                  | is_nullable
-------------------------|----------------------------|------------
id                       | integer                    | NO
event_type               | character varying          | YES
contractor_id            | integer                    | YES
context                  | text                       | YES
action_taken             | text                       | YES
outcome                  | text                       | YES
success_score            | numeric                    | YES
learned_insight          | text                       | YES
created_at               | timestamp without time zone| YES
updated_at               | timestamp without time zone| YES
... (verify other fields exist)
```

**Critical Fields for Tool Logging:**
- `event_type` (VARCHAR) - Will use 'sms_sent' or 'email_sent'
- `contractor_id` (INTEGER) - Links to contractors
- `action_taken` (TEXT) - Describes what was sent
- `outcome` (TEXT) - 'success' or error message
- `created_at` (TIMESTAMP) - Auto timestamp

**⚠️ VERIFICATION REQUIRED:**
- [ ] Verify `event_type` field exists (no CHECK constraint expected)
- [ ] Verify `contractor_id` field exists
- [ ] Verify `action_taken` field exists
- [ ] Verify `outcome` field exists

---

### Step 2: Verify Existing Services & Endpoints

#### SMS Service Integration (n8n Webhook)

**Existing Implementation:** `eventOrchestratorAutomation.js` (line 66-80)

**Verify n8n Webhooks:**
```bash
# Check environment variables for webhook URLs
# In .env or environment config:
# - Production: https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl
# - Development: https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev
```

**Expected Webhook Payload Format:**
```javascript
{
  send_via_ghl: {
    phone: string,           // Contractor phone number
    message: string,         // SMS message content
    contractor_id: number,   // Contractor ID
    event_id: number,        // Optional: Event ID if event-related
    event_name: string,      // Optional: Event name if event-related
    message_type: string     // Message type for categorization
  }
}
```

**⚠️ VERIFICATION REQUIRED:**
- [ ] Verify webhook URLs are correct and accessible
- [ ] Confirm payload format matches n8n workflow expectations
- [ ] Test webhook responds with success/error
- [ ] Verify GHL integration is working (test SMS delivery)

**Test Command:**
```bash
curl -X POST https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev \
  -H "Content-Type: application/json" \
  -d '{"send_via_ghl":{"phone":"1234567890","message":"Test SMS","contractor_id":1,"message_type":"test"}}'
```

---

#### Email Service Integration

**Existing Implementation:** `emailService.js`

**Verify Email Service Exists:**
```bash
# Check if emailService.js exists and has sendEmail function
ls tpe-backend/src/services/emailService.js
```

**Expected Email Service Function:**
```javascript
// Expected function signature in emailService.js:
async function sendEmail({
  to: string,        // Recipient email address
  subject: string,   // Email subject line
  html: string,      // HTML email body
  text?: string      // Optional: Plain text version
})
```

**⚠️ VERIFICATION REQUIRED:**
- [ ] Verify `emailService.js` exists
- [ ] Verify `sendEmail` function signature
- [ ] Check what email provider is configured (SendGrid, AWS SES, etc.)
- [ ] Test email delivery works
- [ ] Verify FROM address is configured

**Test Email Delivery:**
```javascript
// In Node.js REPL or test script:
const { sendEmail } = require('./tpe-backend/src/services/emailService');
await sendEmail({
  to: 'test@example.com',
  subject: 'Test Email from AI Concierge',
  html: '<p>This is a test email</p>'
});
```

---

### Step 3: Verify Agent Tool Requirements (LangChain/LangGraph)

#### Tool Schema Requirements (Zod)

**Verify Zod is Installed:**
```bash
cd tpe-backend
npm list zod
```

**Expected Output:**
```
zod@3.22.4 (or similar version)
```

**⚠️ VERIFICATION REQUIRED:**
- [ ] Verify `zod` is in package.json dependencies
- [ ] Verify version is 3.x or higher
- [ ] If missing, install: `npm install zod`

---

#### LangChain Tool Pattern (DynamicStructuredTool)

**Verify LangChain Core is Installed:**
```bash
cd tpe-backend
npm list @langchain/core
```

**Expected Output:**
```
@langchain/core@0.1.x (or similar)
```

**Verify Existing Tool Pattern:**
```bash
# Check an existing tool to verify pattern:
cat tpe-backend/src/services/agents/tools/partnerMatchTool.js
```

**Expected Tool Structure:**
```javascript
const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');

const toolName = new DynamicStructuredTool({
  name: 'tool_name',
  description: 'Tool description for AI',
  schema: z.object({
    param1: z.string().describe('Parameter description'),
    param2: z.number().describe('Parameter description')
  }),
  func: async ({ param1, param2 }) => {
    // Tool implementation
    return JSON.stringify({ result: 'success' });
  }
});

module.exports = toolName;
```

**⚠️ VERIFICATION REQUIRED:**
- [ ] Verify `@langchain/core` is installed
- [ ] Verify existing tools follow DynamicStructuredTool pattern
- [ ] Verify tools return JSON.stringify() results
- [ ] Confirm async/await pattern is used

---

### Step 4: Check Tool Integration Points (Agent Files)

#### Event Agent Integration

**File:** `tpe-backend/src/services/agents/aiConciergeEventAgent.js`

**Verify Tool Import Section:**
```bash
# Check line ~32-36 in aiConciergeEventAgent.js
grep -n "require('./tools/" tpe-backend/src/services/agents/aiConciergeEventAgent.js
```

**Expected Output:**
```
32:const partnerMatchTool = require('./tools/partnerMatchTool');
33:const eventSponsorMatchTool = require('./tools/eventSponsorMatchTool');
34:const eventSessionsTool = require('./tools/eventSessionsTool');
35:const captureNoteTool = require('./tools/captureNoteTool');
36:const scheduleFollowupTool = require('./tools/scheduleFollowupTool');
```

**Verify Tool Binding Section:**
```bash
# Check line ~110-116 in aiConciergeEventAgent.js
grep -A 8 "model.bindTools" tpe-backend/src/services/agents/aiConciergeEventAgent.js
```

**Expected Output:**
```javascript
const modelWithTools = model.bindTools([
  partnerMatchTool,
  eventSponsorMatchTool,
  eventSessionsTool,
  captureNoteTool,
  scheduleFollowupTool
]);
```

**⚠️ VERIFICATION REQUIRED:**
- [ ] Verify import pattern at line ~32-36
- [ ] Verify bindTools pattern at line ~110-116
- [ ] Confirm same pattern exists in `aiConciergeStandardAgent.js`
- [ ] Check if tools folder structure exists: `tpe-backend/src/services/agents/tools/`

---

#### Standard Agent Integration

**File:** `tpe-backend/src/services/agents/aiConciergeStandardAgent.js`

**Verify Same Pattern:**
```bash
# Check tool imports
grep -n "require('./tools/" tpe-backend/src/services/agents/aiConciergeStandardAgent.js

# Check bindTools
grep -A 5 "model.bindTools" tpe-backend/src/services/agents/aiConciergeStandardAgent.js
```

**⚠️ VERIFICATION REQUIRED:**
- [ ] Verify Standard Agent has similar tool import pattern
- [ ] Verify Standard Agent has similar bindTools pattern
- [ ] Check if Standard Agent uses fewer tools (confirm which tools it has)

---

### Step 5: Check Tools Folder Structure

**Verify Tools Directory Exists:**
```bash
ls tpe-backend/src/services/agents/tools/
```

**Expected Output (Existing Tools):**
```
partnerMatchTool.js
eventSponsorMatchTool.js
eventSessionsTool.js
captureNoteTool.js
scheduleFollowupTool.js
```

**⚠️ VERIFICATION REQUIRED:**
- [ ] Verify tools folder exists at correct path
- [ ] Verify existing tools are present
- [ ] Check naming convention (camelCase with "Tool" suffix)
- [ ] Confirm tools are JavaScript files (.js extension)

---

### Step 6: Verify Error Handling Patterns

#### Check Existing Tool Error Handling

**Read an Existing Tool:**
```bash
cat tpe-backend/src/services/agents/tools/captureNoteTool.js
```

**Expected Error Handling Pattern:**
```javascript
func: async ({ param1, param2 }) => {
  try {
    // Tool implementation
    const result = await someOperation();

    return JSON.stringify({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Tool error:', error);
    return JSON.stringify({
      success: false,
      error: error.message
    });
  }
}
```

**⚠️ VERIFICATION REQUIRED:**
- [ ] Verify existing tools use try/catch
- [ ] Verify tools return JSON.stringify()
- [ ] Verify success/error object format
- [ ] Check if tools log errors to console
- [ ] Confirm tools don't throw errors (return error objects instead)

---

### Step 7: Environment Variables Verification

**Check Required Environment Variables:**
```bash
# In .env or environment config:
cat .env | grep -E "(N8N_|EMAIL_|FRONTEND_URL)"
```

**Expected Variables:**
```bash
# SMS/n8n webhooks:
NODE_ENV=development  # or production
# N8N webhook URLs (may be hardcoded - verify)

# Email service:
EMAIL_FROM=noreply@power100.io  # Verify actual FROM address
SENDGRID_API_KEY=xxx            # Or AWS SES credentials
EMAIL_PROVIDER=sendgrid         # Or aws-ses

# Frontend URL for link generation:
FRONTEND_URL=http://localhost:3002  # Development
# FRONTEND_URL=https://tpx.power100.io  # Production
```

**⚠️ VERIFICATION REQUIRED:**
- [ ] Verify NODE_ENV is set correctly
- [ ] Verify FRONTEND_URL for link generation in messages
- [ ] Check email provider credentials (SendGrid or AWS SES)
- [ ] Verify EMAIL_FROM address is configured
- [ ] Confirm n8n webhook URLs (may be hardcoded in code)

---

### Step 8: Check Axios Dependency (for n8n Webhook)

**Verify Axios is Installed:**
```bash
cd tpe-backend
npm list axios
```

**Expected Output:**
```
axios@1.x.x (or similar)
```

**⚠️ VERIFICATION REQUIRED:**
- [ ] Verify `axios` is in package.json dependencies
- [ ] If missing, install: `npm install axios`
- [ ] Verify axios is used in existing code (eventOrchestratorAutomation.js)

---

## 📝 Pre-Creation Documentation Template

**Create this documentation block at the top of BOTH tool files:**

### For `sendSMSTool.js`:
```javascript
// DATABASE-CHECKED: contractors, ai_learning_events verified October 17, 2025
// ================================================================
// INTEGRATION: n8n webhook → GHL SMS service (ALREADY WORKING)
// WEBHOOK URL: https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl
// ================================================================
// VERIFIED DATABASE FIELDS:
// - contractors.phone (VARCHAR) - Contractor phone number
// - contractors.first_name (VARCHAR) - For personalization
// - contractors.id (INTEGER) - Contractor ID
// - ai_learning_events.event_type (VARCHAR) - Will use 'sms_sent'
// - ai_learning_events.contractor_id (INTEGER) - Links to contractors
// - ai_learning_events.action_taken (TEXT) - Describes SMS sent
// - ai_learning_events.outcome (TEXT) - 'success' or error
// ================================================================
// VERIFIED WEBHOOK PAYLOAD:
// {
//   send_via_ghl: {
//     phone: string,
//     message: string,
//     contractor_id: number,
//     message_type: string
//   }
// }
// ================================================================
// TOOL SCHEMA (Zod):
// - contractor_id: number (required)
// - message: string (required)
// - message_type: enum ['event_info', 'sponsor_info', 'session_alert', 'general']
// ================================================================
```

### For `sendEmailTool.js`:
```javascript
// DATABASE-CHECKED: contractors, ai_learning_events verified October 17, 2025
// ================================================================
// INTEGRATION: emailService.js → SendGrid/AWS SES (ALREADY WORKING)
// SERVICE FILE: tpe-backend/src/services/emailService.js
// ================================================================
// VERIFIED DATABASE FIELDS:
// - contractors.email (VARCHAR) - Contractor email address
// - contractors.first_name (VARCHAR) - For personalization
// - contractors.last_name (VARCHAR) - For personalization
// - contractors.id (INTEGER) - Contractor ID
// - ai_learning_events.event_type (VARCHAR) - Will use 'email_sent'
// - ai_learning_events.contractor_id (INTEGER) - Links to contractors
// - ai_learning_events.action_taken (TEXT) - Describes email sent
// - ai_learning_events.outcome (TEXT) - 'success' or error
// ================================================================
// VERIFIED EMAIL SERVICE FUNCTION:
// sendEmail({
//   to: string,
//   subject: string,
//   html: string
// })
// ================================================================
// TOOL SCHEMA (Zod):
// - contractor_id: number (required)
// - subject: string (required)
// - message: string (required) - Will be wrapped in HTML template
// - email_type: enum ['event_info', 'partner_intro', 'resource_list', 'general']
// ================================================================
```

---

## 🚨 Critical Verification Points

### Before Writing ANY Code:

1. **SMS Webhook Verification:**
   ```bash
   # Test n8n webhook is accessible:
   curl -X POST https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev \
     -H "Content-Type: application/json" \
     -d '{"send_via_ghl":{"phone":"1234567890","message":"Test","contractor_id":1,"message_type":"test"}}'
   ```
   **Expected:** HTTP 200 response from n8n

2. **Email Service Verification:**
   ```javascript
   // Test emailService.js works:
   const { sendEmail } = require('./tpe-backend/src/services/emailService');
   await sendEmail({
     to: 'your-test-email@example.com',
     subject: 'Test Email',
     html: '<p>Test</p>'
   });
   ```
   **Expected:** Email received successfully

3. **Database Field Verification:**
   ```bash
   # Verify phone field exists and has data:
   powershell -Command ".\quick-db.bat \"SELECT id, phone, email, first_name FROM contractors WHERE phone IS NOT NULL LIMIT 5;\""
   ```
   **Expected:** Rows with phone numbers returned

4. **Tool Pattern Verification:**
   ```bash
   # Verify existing tools follow expected pattern:
   cat tpe-backend/src/services/agents/tools/captureNoteTool.js | grep -A 5 "DynamicStructuredTool"
   ```
   **Expected:** See DynamicStructuredTool import and usage

---

## 📋 Implementation Checklist

### Before Creating `sendSMSTool.js`:
- [ ] Verified `contractors.phone` field exists
- [ ] Verified `contractors.first_name` field exists
- [ ] Verified `ai_learning_events` table has required fields
- [ ] Tested n8n webhook responds successfully
- [ ] Verified axios is installed
- [ ] Checked existing tool pattern in `captureNoteTool.js`
- [ ] Confirmed tools folder path: `tpe-backend/src/services/agents/tools/`
- [ ] Verified NODE_ENV environment variable

### Before Creating `sendEmailTool.js`:
- [ ] Verified `contractors.email` field exists
- [ ] Verified `contractors.first_name` and `last_name` fields exist
- [ ] Verified `ai_learning_events` table has required fields
- [ ] Tested `emailService.js` sends emails successfully
- [ ] Verified email provider credentials (SendGrid/AWS SES)
- [ ] Checked EMAIL_FROM environment variable
- [ ] Confirmed HTML email template format
- [ ] Verified tools folder path exists

### Before Integrating into Agents:
- [ ] Verified `aiConciergeEventAgent.js` tool import pattern (line ~32-36)
- [ ] Verified `aiConciergeEventAgent.js` bindTools pattern (line ~110-116)
- [ ] Verified `aiConciergeStandardAgent.js` follows same pattern
- [ ] Confirmed both agents will get both tools (or document which gets which)
- [ ] Verified no naming conflicts with existing tools

---

## 🎯 Quick Start Commands

**Run ALL these commands before starting implementation:**

```bash
# 1. Verify contractors table fields
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contractors' AND column_name IN ('id', 'phone', 'email', 'first_name', 'last_name') ORDER BY ordinal_position;\""

# 2. Verify ai_learning_events table
powershell -Command ".\quick-db.bat \"SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'ai_learning_events' AND column_name IN ('event_type', 'contractor_id', 'action_taken', 'outcome') ORDER BY ordinal_position;\""

# 3. Check sample contractor data
powershell -Command ".\quick-db.bat \"SELECT id, phone, email, first_name FROM contractors WHERE phone IS NOT NULL LIMIT 3;\""

# 4. Verify tools folder exists
ls tpe-backend/src/services/agents/tools/

# 5. Check existing tool pattern
cat tpe-backend/src/services/agents/tools/captureNoteTool.js

# 6. Verify axios installed
cd tpe-backend && npm list axios

# 7. Verify zod installed
npm list zod

# 8. Test n8n webhook (optional - may fail in dev if GHL not configured)
curl -X POST https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev \
  -H "Content-Type: application/json" \
  -d '{"send_via_ghl":{"phone":"1234567890","message":"Test SMS from Pre-Flight Check","contractor_id":1,"message_type":"test"}}'
```

**Document ALL results before proceeding to tool creation!**

---

## 📚 Related Documents

- **Phase 4 Pre-Flight Checklist:** `../phase-4/PHASE-4-PRE-FLIGHT-CHECKLIST.md` (pattern reference)
- **Database Source of Truth:** `../../../../DATABASE-SOURCE-OF-TRUTH.md` (project root)
- **Event Orchestration SMS:** `../../../tpe-backend/src/services/eventOrchestratorAutomation.js` (existing SMS implementation)
- **Email Service:** `../../../tpe-backend/src/services/emailService.js` (existing email implementation)
- **AI First Strategy:** `../../AI-FIRST-STRATEGY.md` (roadmap reference)

---

## 🚀 Next Steps (After Pre-Flight Complete)

1. **Create `sendSMSTool.js`** (estimated 45 minutes)
2. **Create `sendEmailTool.js`** (estimated 45 minutes)
3. **Integrate into Event Agent** (estimated 15 minutes)
4. **Integrate into Standard Agent** (estimated 15 minutes)
5. **Test in Development** (estimated 1 hour)
6. **Deploy to Production** (estimated 30 minutes)

**Total Estimated Time: ~4 hours**

---

**Document Status:** PRE-FLIGHT CHECKLIST
**Author:** Development Team
**Created:** October 17, 2025
**Last Updated:** October 17, 2025
**Next Review:** Before tool creation begins

---

## ✅ Sign-Off

**Checklist Completed By:** _________________
**Date:** _________________
**All Verifications Passed:** YES / NO
**Ready to Proceed:** YES / NO

**Notes:**
_____________________________________________________________________
_____________________________________________________________________
_____________________________________________________________________
