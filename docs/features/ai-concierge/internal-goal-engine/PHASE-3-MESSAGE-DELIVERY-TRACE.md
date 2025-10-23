# Phase 3 IGE - Message Delivery Flow Trace

**Date**: October 23, 2025
**Purpose**: Complete trace of message flow from scheduling to delivery
**Status**: ⚠️ **DELIVERY MECHANISM NOT YET IMPLEMENTED**

---

## 🔍 Current State Analysis

### ✅ What IS Implemented

#### **1. Message Scheduling System (COMPLETE)**
- **Service**: `proactiveMessageService.js`
- **Worker**: `igeWorker.js` (Proactive IGE Worker)
- **Queue**: `igeQueue.js` (Runs hourly at minute 0)
- **Database**: `ai_proactive_messages` table

**Flow:**
```
Every Hour (via BullMQ)
  ↓
igeWorker.js runs processIGEAutomation()
  ↓
STEP 1: proactiveMessageService.evaluateProactiveTriggers()
  ↓
Queries contractors with active goals
  ↓
Checks safeguards (frequency limits, trust scores)
  ↓
Generates message content + AI reasoning
  ↓
INSERT INTO ai_proactive_messages
  (contractor_id, message_type, message_content, ai_reasoning, context_data)
  VALUES (...)
  ↓
Message SCHEDULED (sent_at = NULL)
```

**Database Record Created:**
```sql
ai_proactive_messages
├─ id: 123
├─ contractor_id: 456
├─ message_type: 'check_in'
├─ message_content: "Hi John, how's progress on..."
├─ ai_reasoning: "Goal #5 has pending checklist items..."
├─ context_data: { goal_id: 5, milestone: "Setup" }
├─ sent_at: NULL ⚠️ (Not sent yet!)
├─ contractor_response: NULL
└─ created_at: 2025-10-23 07:00:00
```

#### **2. Other IGE Worker Steps (COMPLETE)**
- **STEP 2**: `goalEvolutionService.adjustGoalsBasedOnBehavior()` - Updates goal priorities
- **STEP 3**: `enhancedFollowUpService.autoCancelCompletedFollowUps()` - Cancels obsolete follow-ups
- **STEP 4**: `goalEvolutionService.analyzeAbandonedGoals()` - Identifies stalled goals

---

### ❌ What IS NOT Implemented

#### **Missing: Message Delivery System**

**The Problem:**
- Messages are being **scheduled** into `ai_proactive_messages` table
- NO mechanism exists to actually **send** them via SMS/Email
- `sent_at` field remains NULL forever
- Contractors never receive the messages

**Expected Flow (NOT IMPLEMENTED):**
```
Scheduled Messages Worker (DOES NOT EXIST)
  ↓
Query: SELECT * FROM ai_proactive_messages WHERE sent_at IS NULL
  ↓
For each unsent message:
  ├─ Get contractor phone/email
  ├─ Send via n8n webhook OR Twilio API
  ├─ UPDATE ai_proactive_messages SET sent_at = NOW()
  └─ Log delivery status
```

---

## 🔗 Related Systems That DO Send Messages

### **1. Proactive Scheduler Service** (Working, but different system)
- **File**: `proactiveSchedulerService.js`
- **Table**: `contractor_followup_schedules` (NOT ai_proactive_messages!)
- **Runs**: Every 5 minutes (started in server.js line 256)
- **Sends**: Via n8n webhook to SMS

**Flow:**
```javascript
startScheduler() runs every 5 minutes
  ↓
getDueFollowUps()
  → SELECT FROM contractor_followup_schedules WHERE scheduled_time <= NOW()
  ↓
personalizeMessage() (AI enhancement)
  ↓
sendFollowUpMessage()
  → POST to N8N_OUTBOUND_WEBHOOK_URL
  → Endpoint: http://localhost:5678/webhook/sms-outbound (Dev)
  → Endpoint: https://n8n.power100.io/webhook/sms-outbound (Prod)
  ↓
UPDATE contractor_followup_schedules SET sent_at = NOW()
```

**⚠️ Issue with this service:**
- Uses wrong n8n endpoint (localhost:5678 not running locally)
- Has bug in openAIService.js line 1053: `eventStatus is not defined`
- Currently failing but non-critical (different system than Phase 3)

---

## 🛠️ Required Implementation

### **Option 1: Create Dedicated Proactive Message Sender**

Create new file: `src/services/proactiveMessageSender.js`

```javascript
/**
 * Send scheduled proactive messages from ai_proactive_messages table
 * Similar to proactiveSchedulerService but for Phase 3 IGE messages
 */

async function sendPendingProactiveMessages() {
  // 1. Get unsent messages
  const unsent = await query(`
    SELECT pm.*, c.phone, c.first_name, c.email
    FROM ai_proactive_messages pm
    JOIN contractors c ON c.id = pm.contractor_id
    WHERE pm.sent_at IS NULL
    ORDER BY pm.created_at ASC
    LIMIT 10
  `);

  for (const message of unsent.rows) {
    try {
      // 2. Send via n8n webhook
      await fetch(process.env.N8N_OUTBOUND_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: message.phone,
          message: message.message_content,
          contractor_id: message.contractor_id,
          message_type: message.message_type
        })
      });

      // 3. Mark as sent
      await query(`
        UPDATE ai_proactive_messages
        SET sent_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [message.id]);

      console.log(`[ProactiveMessageSender] ✅ Sent message ${message.id}`);
    } catch (error) {
      console.error(`[ProactiveMessageSender] ❌ Failed to send ${message.id}:`, error);
    }
  }
}

// Run every 5 minutes
function startSender() {
  setInterval(sendPendingProactiveMessages, 5 * 60 * 1000);
}

module.exports = { sendPendingProactiveMessages, startSender };
```

**Then add to server.js:**
```javascript
const proactiveMessageSender = require('./services/proactiveMessageSender');
proactiveMessageSender.startSender();
```

---

### **Option 2: Add to Existing Proactive Scheduler**

Modify `proactiveSchedulerService.js` to handle BOTH tables:
- `contractor_followup_schedules` (existing)
- `ai_proactive_messages` (Phase 3)

---

### **Option 3: Create BullMQ Worker (Recommended)**

Create `src/workers/proactiveMessageWorker.js`

Benefits:
- Consistent with other workers
- Better error handling and retries
- Scalable queue-based processing
- Matches existing architecture

---

## 📋 Environment Variables Required

**Check these are set correctly:**

```bash
# Development (.env.development)
N8N_OUTBOUND_WEBHOOK_URL=https://n8n.power100.io/webhook/sms-outbound

# Production (.env.production)
N8N_OUTBOUND_WEBHOOK_URL=https://n8n.power100.io/webhook/sms-outbound
```

**⚠️ Current Issue:**
- `proactiveSchedulerService.js` line 127 defaults to:
  - `http://localhost:5678/webhook/sms-outbound`
  - This localhost endpoint doesn't exist and causes ECONNREFUSED errors

---

## 🎯 Recommended Next Steps

1. **Immediate (Critical):**
   - [ ] Create `proactiveMessageSender.js` service
   - [ ] Add scheduler to server.js
   - [ ] Test message delivery locally
   - [ ] Verify n8n webhook endpoint is correct

2. **Short-term:**
   - [ ] Fix `proactiveSchedulerService.js` n8n endpoint bug
   - [ ] Fix `openAIService.js` line 1053 eventStatus bug
   - [ ] Add message delivery tracking/metrics

3. **Medium-term:**
   - [ ] Implement web chat delivery (not just SMS)
   - [ ] Add email delivery option
   - [ ] Build delivery preferences per contractor

---

## 📊 Current Message Flow Summary

```
✅ WORKING: Message Scheduling
  Every hour → Evaluate triggers → Schedule messages → Store in DB

❌ NOT WORKING: Message Delivery
  No process reads from ai_proactive_messages and sends via SMS/Email

✅ WORKING: Different System (contractor_followup_schedules)
  Every 5 minutes → Check due follow-ups → Send via n8n
  (But has bugs: wrong endpoint, eventStatus error)
```

---

## 🔧 Files Involved

### **Working (Scheduling):**
- ✅ `src/workers/igeWorker.js` - Phase 3 hourly automation
- ✅ `src/queues/igeQueue.js` - BullMQ queue setup
- ✅ `src/services/proactiveMessageService.js` - Message scheduling logic
- ✅ `src/services/proactiveSafeguardsService.js` - Rate limiting
- ✅ `src/services/messageTemplateService.js` - Message generation

### **Needs Implementation (Delivery):**
- ❌ `src/services/proactiveMessageSender.js` - **DOES NOT EXIST**
- ❌ OR `src/workers/proactiveMessageWorker.js` - **DOES NOT EXIST**

### **Related (Different System):**
- ⚠️ `src/services/proactiveSchedulerService.js` - Works but has bugs

---

## 🚨 Production Impact

**Current Production Status:**
- ✅ Phase 3 IGE Worker is running hourly in production
- ✅ Messages ARE being scheduled into database
- ❌ Messages are NOT being delivered to contractors
- ❌ Contractors are NOT receiving proactive check-ins
- ⚠️ Database is accumulating unsent messages

**Query to check unsent messages:**
```sql
SELECT COUNT(*) as unsent_messages
FROM ai_proactive_messages
WHERE sent_at IS NULL;
```

---

**Created**: October 23, 2025
**Last Updated**: October 23, 2025
**Next Action**: Implement message delivery mechanism (Option 1 or Option 3 recommended)
