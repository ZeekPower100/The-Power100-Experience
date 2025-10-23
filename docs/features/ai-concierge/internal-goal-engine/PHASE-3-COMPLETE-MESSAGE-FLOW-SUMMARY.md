# Phase 3 IGE - Complete Message Flow Implementation

**Date**: October 23, 2025
**Status**: ✅ **MESSAGE DELIVERY MECHANISM COMPLETE**

---

## 🎉 What We Built Today

### **Problem Identified**
During Phase 3 IGE monitoring dashboard development, we discovered that while messages were being **scheduled**, they were never being **delivered** to contractors. The `ai_proactive_messages` table was accumulating records with `sent_at = NULL`.

### **Solution Implemented**
Created complete end-to-end message delivery system using BullMQ workers.

---

## 📊 Complete Message Flow

### **STEP 1: Message Scheduling** (Every Hour)
**Worker**: `igeWorker.js` (Proactive IGE Worker)
**Queue**: `igeQueue.js`
**Schedule**: Runs every hour at minute 0 (cron: `0 * * * *`)

**What It Does:**
1. Evaluates proactive message triggers via `proactiveMessageService.evaluateProactiveTriggers()`
2. Generates AI-powered message content with reasoning
3. Checks safeguards (frequency limits, trust scores)
4. **Schedules messages** by inserting into `ai_proactive_messages` table
5. Sets `sent_at = NULL` (not sent yet)

**Database Record Created:**
```sql
INSERT INTO ai_proactive_messages (
  contractor_id,
  message_type,
  message_content,
  ai_reasoning,
  context_data,
  sent_at  -- NULL = scheduled but not sent
) VALUES (...);
```

---

### **STEP 2: Message Delivery** (Every 5 Minutes) ✅ **NEW!**
**Worker**: `proactiveMessageWorker.js` (Proactive Message Delivery Worker)
**Queue**: `proactiveMessageQueue.js`
**Schedule**: Runs every 5 minutes (cron: `*/5 * * * *`)

**What It Does:**
1. Queries unsent messages: `SELECT * FROM ai_proactive_messages WHERE sent_at IS NULL`
2. Processes up to 20 messages per cycle
3. Sends each message via n8n webhook
4. Updates `sent_at = NOW()` after successful delivery
5. Logs delivery status and errors

**n8n Webhook Payload:**
```javascript
{
  phone: "555-0123",
  message: "Hi John, how's progress on...",
  contractor_id: 456,
  message_type: "check_in",
  message_id: 123,
  contractor_name: "John Doe",
  ai_reasoning: "Goal #5 has pending checklist items..."
}
```

---

## 🔧 Files Created/Modified

### **New Files Created:**
1. ✅ `src/workers/proactiveMessageWorker.js` - BullMQ worker for sending messages
2. ✅ `src/queues/proactiveMessageQueue.js` - Queue scheduler (every 5 minutes)
3. ✅ `docs/features/ai-concierge/internal-goal-engine/PHASE-3-MESSAGE-DELIVERY-TRACE.md` - Complete trace documentation
4. ✅ `docs/features/ai-concierge/internal-goal-engine/PHASE-3-COMPLETE-MESSAGE-FLOW-SUMMARY.md` - This file

### **Modified Files:**
1. ✅ `src/workers/startAll.js` - Added Proactive Message Delivery Worker
2. ✅ `src/server.js` - Added queue initialization

---

## ⚙️ Environment Configuration

### **CRITICAL: Environment Variable Required**

The worker looks for: `N8N_OUTBOUND_WEBHOOK_URL`

**Current State:**
- ❌ `.env.development` - **NOT CONFIGURED** (variable missing)
- ⚠️ `.env.production` - **DIFFERENT NAME** (uses `N8N_WEBHOOK_URL`)

### **Required Action:**

**Option 1 - Add New Variable (Recommended):**
```bash
# Add to .env.development
N8N_OUTBOUND_WEBHOOK_URL=https://n8n.srv918843.hstgr.cloud/webhook/sms-outbound

# Add to .env.production
N8N_OUTBOUND_WEBHOOK_URL=https://n8n.srv918843.hstgr.cloud/webhook/sms-outbound
```

**Option 2 - Modify Worker to Use Existing Variable:**
Change `proactiveMessageWorker.js` line 100 from:
```javascript
const n8nWebhookUrl = process.env.N8N_OUTBOUND_WEBHOOK_URL;
```
To:
```javascript
const n8nWebhookUrl = process.env.N8N_OUTBOUND_WEBHOOK_URL || process.env.N8N_WEBHOOK_URL;
```

---

## 🚀 What's Running Now

### **Active Workers (5 Total):**
1. ✅ **Follow-up Worker** - Handles contractor follow-up schedules
2. ✅ **Event Message Worker** - Event-related messaging
3. ✅ **Event Orchestration Worker** - Event flow management
4. ✅ **Proactive IGE Worker** - Schedules Phase 3 proactive messages (hourly)
5. ✅ **Proactive Message Delivery Worker** - Sends Phase 3 messages (every 5 minutes)

### **Active Queues (3 Total):**
1. ✅ **event-orchestration** - Event message queue (every minute)
2. ✅ **ige-automation** - Phase 3 IGE automation (hourly)
3. ✅ **proactive-messages** - Phase 3 message delivery (every 5 minutes)

---

## 📋 Complete Timeline

```
Every Hour (minute 0)
  ↓
[Proactive IGE Worker runs]
  ↓
Evaluate triggers → Generate messages → Save to DB
  ↓
ai_proactive_messages table updated (sent_at = NULL)
  ↓
⏰ Wait up to 5 minutes ⏰
  ↓
[Proactive Message Delivery Worker runs]
  ↓
Query unsent messages → Send via n8n → Update sent_at
  ↓
✅ Contractor receives SMS via n8n workflow
```

**Total Delay**: Maximum 5 minutes from scheduling to delivery

---

## 🔍 Testing & Verification

### **Check Scheduled Messages:**
```sql
-- View unsent messages
SELECT id, contractor_id, message_type, message_content, created_at
FROM ai_proactive_messages
WHERE sent_at IS NULL
ORDER BY created_at DESC;
```

### **Check Sent Messages:**
```sql
-- View sent messages
SELECT id, contractor_id, message_type, sent_at, contractor_response
FROM ai_proactive_messages
WHERE sent_at IS NOT NULL
ORDER BY sent_at DESC
LIMIT 10;
```

### **Monitor Worker Status:**
```bash
# Check backend logs for worker initialization
tail -f tpe-backend/backend-live.log | grep -E "(ProactiveMessageWorker|ProactiveMessageQueue|IGEWorker)"
```

### **Expected Log Messages:**
```
[ProactiveMessageQueue] ✅ Proactive message delivery scheduler initialized successfully
[ProactiveMessageQueue] 📅 Schedule: Every 5 minutes
[ProactiveMessageWorker] 🚀 Proactive Message Worker started and ready
[ProactiveMessageWorker] Queue: proactive-messages
[ProactiveMessageWorker] n8n Webhook: https://n8n.srv918843.hstgr.cloud/webhook/sms-outbound
```

---

## ⚠️ Known Issues to Fix

### **1. N8N_OUTBOUND_WEBHOOK_URL Not Configured**
**Impact**: Worker will fail to send messages
**Status**: Environment variable needs to be added
**Priority**: **CRITICAL** - must be fixed before production testing

### **2. ProactiveScheduler Service Bugs (Different System)**
**Impact**: Non-critical, different system than Phase 3
**Issues**:
- Wrong endpoint: `http://localhost:5678/webhook/sms-outbound` (should be production URL)
- Bug in `openAIService.js` line 1053: `eventStatus is not defined`

**Status**: Deferred until after Phase 3 complete
**Priority**: Low (affects `contractor_followup_schedules`, not Phase 3 IGE)

---

## 🎯 Next Steps

### **Immediate (Before Testing):**
1. [ ] Add `N8N_OUTBOUND_WEBHOOK_URL` to `.env.development`
2. [ ] Add `N8N_OUTBOUND_WEBHOOK_URL` to `.env.production`
3. [ ] Restart backend to pick up new environment variable
4. [ ] Verify worker shows correct webhook URL in logs

### **Testing:**
1. [ ] Create test contractor with active goals
2. [ ] Wait for hourly IGE worker to schedule a message
3. [ ] Verify message appears in `ai_proactive_messages` with `sent_at = NULL`
4. [ ] Wait up to 5 minutes for delivery worker to run
5. [ ] Verify `sent_at` is updated and message was sent via n8n
6. [ ] Check contractor receives SMS

### **Production Deployment:**
1. [ ] Push all changes to production via auto-deployment
2. [ ] Verify all 5 workers start successfully
3. [ ] Monitor logs for first few cycles
4. [ ] Check production database for message delivery

---

## 📊 Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     Phase 3 IGE System                      │
└─────────────────────────────────────────────────────────────┘

Every Hour:
┌──────────────────────────┐
│  Proactive IGE Worker    │  ← Evaluates triggers
│  (igeWorker.js)          │  ← Schedules messages
└────────────┬─────────────┘
             │
             ↓
┌────────────────────────────────┐
│  ai_proactive_messages table   │
│  sent_at = NULL                │
└────────────┬───────────────────┘
             │
             ↓
Every 5 Minutes:
┌──────────────────────────────────┐
│  Proactive Message Worker        │  ← Queries unsent
│  (proactiveMessageWorker.js)     │  ← Sends via n8n
└────────────┬─────────────────────┘
             │
             ↓
┌──────────────────────────────────┐
│  n8n Webhook                     │
│  → SMS to Contractor             │
└──────────────────────────────────┘
```

---

## ✅ Success Criteria

- [x] Worker created and added to startAll.js
- [x] Queue created with 5-minute schedule
- [x] Server initialization added
- [x] Database field names verified
- [x] n8n webhook payload structured
- [x] Error handling implemented
- [x] Rate limiting added (2 seconds between messages)
- [ ] Environment variable configured (**PENDING**)
- [ ] End-to-end test passed (**PENDING**)
- [ ] Production deployment successful (**PENDING**)

---

**Created**: October 23, 2025
**Last Updated**: October 23, 2025
**Status**: Implementation complete, awaiting environment configuration and testing
**Next Action**: Configure `N8N_OUTBOUND_WEBHOOK_URL` in environment files
