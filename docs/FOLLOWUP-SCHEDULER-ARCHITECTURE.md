# Follow-Up Scheduler Architecture

**Date**: October 23, 2025
**Status**: ✅ **CLARIFIED AND OPTIMIZED**

---

## 🎯 Executive Summary

The contractor follow-up system uses **BullMQ-based scheduling** via `followUpWorker.js`.
The interval-based scheduler in `proactiveSchedulerService.js` has been **DISABLED** to eliminate redundancy.

---

## 📊 System Architecture (CORRECT)

### **How Follow-Ups Work:**

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Schedule a Follow-Up                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  followUpService.scheduleFollowUp()                         │
│  - Creates record in contractor_followup_schedules          │
│  - Status: 'scheduled'                                      │
│  - scheduled_time: Future timestamp                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  enqueueBullJob() (from followUpQueue.js)                   │
│  - Adds job to BullMQ 'contractor-followups' queue          │
│  - Job scheduled for EXACT scheduled_time                   │
│  - Redis-backed, persistent, with retry logic               │
└─────────────────────────────────────────────────────────────┘
                           ↓
                   ⏰ Wait until scheduled_time ⏰
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  followUpWorker.js (BullMQ Worker)                          │
│  - Processes job at EXACT scheduled_time                    │
│  - Concurrency: 5 jobs simultaneously                       │
│  - Rate limit: 10 jobs/minute (SMS respect)                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  proactiveSchedulerService.personalizeMessage()             │
│  - Uses OpenAI to personalize message if ai_should_personalize │
│  - Incorporates ai_context_hints and action_item details    │
│  - Fallback to message_template if AI fails                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  proactiveSchedulerService.sendFollowUpMessage()            │
│  - Sends to n8n webhook (N8N_OUTBOUND_WEBHOOK_URL)          │
│  - Payload: phone, message, contractor_id, followup_id      │
│  - n8n routes to GoHighLevel for SMS delivery               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  followUpService.markFollowUpSent()                         │
│  - Updates status to 'sent'                                 │
│  - Sets sent_at = NOW()                                     │
│  - Records sent_by = 'bull_worker'                          │
│  - If recurring: schedules next occurrence                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
                ✅ Follow-Up Delivered to Contractor
```

---

## 🔧 File Roles & Responsibilities

### **followUpService.js** - API Layer
**Purpose**: Public interface for scheduling and managing follow-ups
**Functions**:
- `scheduleFollowUp()` - Creates DB record + adds to Bull queue
- `markFollowUpSent()` - Updates status, handles recurring
- `cancelFollowUp()` - Cancels DB record + removes from Bull queue
- `getPendingFollowUps()` - Query helper
- `getContractorFollowUps()` - Query helper
- `recordFollowUpResponse()` - Stores contractor responses

**Used By**: Controllers, AI Concierge, admin endpoints

---

### **followUpWorker.js** (BullMQ Worker) - Execution Layer ✅ ACTIVE
**Purpose**: Process scheduled follow-ups at exact scheduled time
**Architecture**: BullMQ worker listening to 'contractor-followups' queue
**Configuration**:
- Concurrency: 5 jobs simultaneously
- Rate Limit: 10 jobs/minute
- Retry Logic: Built-in via BullMQ
- Job Tracking: Complete history in Redis

**Process Flow**:
1. Job triggered at `scheduled_time`
2. Query DB for full follow-up details
3. Check status (skip if sent/cancelled)
4. Check action item completion (skip if `skip_if_completed = true` and item done)
5. Call `proactiveSchedulerService.personalizeMessage()`
6. Call `proactiveSchedulerService.sendFollowUpMessage()`
7. Call `followUpService.markFollowUpSent()`

**Uses**: `proactiveSchedulerService` as utility library (NOT as scheduler)

---

### **proactiveSchedulerService.js** - Utility Library (Hybrid)
**Purpose**: Provides utility functions for follow-up processing
**Architecture**: Service module with helper functions + DISABLED scheduler

**ACTIVE Functions** (Used by followUpWorker.js):
- ✅ `personalizeMessage(followUp, contractor)` - AI-powered message personalization
- ✅ `sendFollowUpMessage(followUp, message)` - n8n webhook integration
- ✅ `getDueFollowUps()` - Database query helper
- ✅ `getSchedulerStats()` - Statistics helper

**DISABLED Functions** (Redundant with BullMQ):
- ❌ `startScheduler()` - Interval-based scheduler (runs every 5 minutes)
- ❌ `stopScheduler()` - Scheduler shutdown
- ❌ `processDueFollowUps()` - Bulk processing loop

**Why Disabled**:
- Redundant with followUpWorker.js (both query same DB table)
- BullMQ provides superior job scheduling:
  - Exact timing (vs 5-minute interval checks)
  - Built-in retry logic
  - Job persistence across restarts
  - Concurrency control
  - Rate limiting
- Caused errors:
  - Wrong n8n endpoint (`http://localhost:5678` vs production URL)
  - `eventStatus is not defined` bug in OpenAI service

---

### **followUpQueue.js** - Queue Management
**Purpose**: Bull queue configuration and job enqueueing
**Functions**:
- `scheduleFollowUp(followUp)` - Adds job to Bull queue with delay
- `cancelFollowUp(followup_id)` - Removes job from queue
- Queue initialization and Redis connection

**Configuration**:
- Queue name: `'contractor-followups'`
- Default job options: attempts=3, backoff, removeOnComplete

---

## 🚨 What Changed (October 23, 2025)

### **Before:**
```
TWO SYSTEMS running simultaneously:

1. followUpWorker.js (BullMQ) - Processing individual jobs ✅
2. proactiveSchedulerService.startScheduler() - Bulk checking every 5 min ❌

RESULT: Both competing for same records, duplicate processing risk
```

### **After:**
```
ONE SYSTEM:

1. followUpWorker.js (BullMQ) - ONLY execution mechanism ✅
2. proactiveSchedulerService - Utility functions ONLY ✅

RESULT: Clean architecture, no duplication, better reliability
```

### **Code Change:**
**File**: `tpe-backend/src/server.js` (lines 275-298)
**Action**: Commented out `proactiveScheduler.startScheduler()` call
**Condition**: Disabled by default, can re-enable with `ENABLE_FOLLOWUP_SCHEDULER=true` env var

---

## 🔍 How to Verify It's Working

### **Check BullMQ Worker Status:**
```bash
# Should see followUpWorker in running workers
tail -f tpe-backend/backend-live.log | grep -i followup
```

**Expected Output:**
```
[FollowUpWorker] ✅ Worker ready and listening for jobs
[FollowUpWorker] Redis: localhost
[FollowUpWorker] Concurrency: 5
[FollowUpWorker] Rate limit: 10 jobs/minute
```

### **Check Scheduled Follow-Ups:**
```sql
-- View upcoming follow-ups
SELECT id, contractor_id, followup_type, scheduled_time, status
FROM contractor_followup_schedules
WHERE status = 'scheduled'
ORDER BY scheduled_time ASC
LIMIT 10;
```

### **Check Sent Follow-Ups:**
```sql
-- View recently sent follow-ups
SELECT id, contractor_id, followup_type, sent_at, sent_by
FROM contractor_followup_schedules
WHERE status = 'sent'
ORDER BY sent_at DESC
LIMIT 10;
```

**Expected `sent_by` value**: `'bull_worker'` (not `'scheduler'`)

### **Monitor Worker Logs:**
```bash
# Watch for follow-up processing
tail -f tpe-backend/backend-live.log | grep "\[FollowUpWorker\]"
```

**Expected Events:**
```
[FollowUpWorker] 🚀 Processing follow-up 123 for contractor 456
[FollowUpWorker] ✅ Follow-up 123 processed successfully
[FollowUpWorker] ✅ Job abc123 completed successfully
```

---

## 📋 Database Schema Reference

### **contractor_followup_schedules** (21 columns)
```sql
- id                        -- Primary key
- contractor_id             -- FK to contractors
- action_item_id            -- Optional FK to contractor_action_items
- event_id                  -- Optional FK to events
- scheduled_time            -- TIMESTAMP - when to send
- followup_type             -- Type of follow-up
- message_template          -- Base message text
- message_tone              -- AI personalization tone
- status                    -- 'scheduled' | 'sent' | 'cancelled'
- sent_at                   -- TIMESTAMP - when actually sent
- sent_by                   -- 'bull_worker' | 'scheduler' | 'ai_concierge'
- response_received_at      -- Contractor response time
- response_text             -- Contractor response content
- ai_should_personalize     -- Boolean - use AI personalization
- ai_context_hints          -- JSONB - context for AI
- skip_if_completed         -- Boolean - skip if action item done
- is_recurring              -- Boolean - auto-schedule next
- recurrence_interval_days  -- Days between recurrences
- next_occurrence_id        -- FK to next scheduled occurrence
- created_at                -- Creation timestamp
- updated_at                -- Last update timestamp
```

---

## 🎯 Best Practices

### **When Scheduling Follow-Ups:**
✅ **DO**: Use `followUpService.scheduleFollowUp()` (handles both DB and queue)
❌ **DON'T**: Manually insert into DB or queue separately

### **When Cancelling Follow-Ups:**
✅ **DO**: Use `followUpService.cancelFollowUp()` (handles both DB and queue)
❌ **DON'T**: Just update DB status (leaves orphaned queue jobs)

### **When Testing:**
✅ **DO**: Check both DB status AND Bull queue
✅ **DO**: Monitor logs for `[FollowUpWorker]` messages
✅ **DO**: Verify `sent_by = 'bull_worker'`

### **Performance Considerations:**
- BullMQ handles up to 5 concurrent follow-ups
- Rate limit: 10 per minute (respects SMS carrier limits)
- Redis-backed: Jobs persist across server restarts
- Automatic retry: 3 attempts with exponential backoff

---

## 🚀 Future Enhancements

### **Potential Improvements:**
1. **Dynamic Rate Limiting**: Adjust based on SMS carrier feedback
2. **Priority Queues**: VIP contractors get faster processing
3. **A/B Testing**: Test different message personalization strategies
4. **Response Tracking**: Auto-link contractor SMS replies to follow-ups
5. **Analytics Dashboard**: Follow-up effectiveness metrics

### **Not Recommended:**
❌ Re-enabling `proactiveSchedulerService.startScheduler()`
❌ Hybrid approach (mixing interval + BullMQ)
❌ Direct database polling instead of BullMQ

---

## 🔗 Related Documentation

- `docs/features/ai-concierge/CONTRACTOR-FOLLOWUP-SCHEDULES.md` - Follow-up scheduling guide
- `tpe-backend/src/services/followUpService.js` - API reference
- `tpe-backend/src/workers/followUpWorker.js` - Worker implementation
- `tpe-backend/src/queues/followUpQueue.js` - Queue configuration

---

**Created**: October 23, 2025
**Last Updated**: October 23, 2025
**Status**: System clarified, redundancy eliminated, BullMQ-only architecture
**Next Action**: Monitor production logs to verify followUpWorker processing
