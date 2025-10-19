# BullMQ Event Message System

**Created**: October 17, 2025
**Purpose**: Replace database polling with BullMQ queue-based scheduling for event orchestration messages
**Database Verification**: All field names verified against production schema on 2025-10-17

---

## Overview

The event orchestration system now uses **BullMQ** (same infrastructure as contractor follow-ups) for precise message scheduling. This eliminates the need for cron jobs or n8n workflows - BullMQ handles all scheduling internally.

### Key Benefits

✅ **Precise Timing** - Messages sent at EXACT scheduled time
✅ **Automatic Retries** - Failed messages retry automatically (3 attempts)
✅ **Rate Limiting** - Built-in SMS rate limit protection (20 jobs/minute)
✅ **Priority Queue** - Important messages (check-in, speaker alerts) get priority
✅ **Monitoring** - Queue stats and job tracking built-in
✅ **No External Dependencies** - No cron jobs or n8n workflows needed
✅ **Same Redis** - Uses existing Redis instance from follow-up system

---

## Files Created

### 1. Event Message Queue
**File**: `tpe-backend/src/queues/eventMessageQueue.js`
**Database Verified**: event_messages table (28 columns)

**Exports**:
- `scheduleEventMessage(messageData)` - Schedule single message
- `scheduleBulkEventMessages(messagesArray)` - Batch schedule multiple messages
- `cancelEventMessage(message_id)` - Cancel scheduled message
- `rescheduleEventMessage(message_id, new_time, data)` - Reschedule to new time
- `clearEventMessages(event_id)` - Clear all messages for event
- `clearContractorMessages(event_id, contractor_id)` - Clear contractor's messages
- `getQueueStats()` - Get queue statistics
- `getUpcomingMessages()` - Get messages in next 24 hours

**Priority Levels**:
- Priority 1 (Highest): Event start reminders
- Priority 2: Speaker alerts
- Priority 3: 1-hour check-in reminders
- Priority 5: Sponsor recommendations
- Priority 7: PCR requests
- Priority 8: Night-before reminders
- Priority 10: Default

### 2. Event Message Worker
**File**: `tpe-backend/src/workers/eventMessageWorker.js`
**Database Verified**: event_messages, contractors, events tables

**Features**:
- Processes messages at exact scheduled time
- Sends via n8n webhook (production/dev aware)
- Updates database with send status
- Automatic message generation fallback
- Contractor name personalization
- Error handling and retry logic

**Performance Settings**:
- Concurrency: 10 jobs simultaneously
- Rate Limit: 20 jobs/minute (SMS provider friendly)
- Retry: 3 attempts with exponential backoff

---

## Database Field Alignment

### event_messages Table (28 columns)
All field names verified against production schema:

**Core Fields**:
- `id` - Primary key
- `event_id` - Foreign key to events
- `contractor_id` - Foreign key to contractors
- `message_type` - Type of message (check_in_reminder_night_before, speaker_alert, etc.)
- `message_category` - Category (pre_event, event_day, pcr, post_event)
- `scheduled_time` - When message should be sent
- `actual_send_time` - When message was actually sent
- `status` - Message status (scheduled, sent, failed, cancelled)

**Content Fields**:
- `message_content` - The actual message text
- `personalization_data` - JSONB with speaker/sponsor/session details
- `phone` - Contractor phone number
- `channel` - Delivery channel (sms, email)

**Response Fields**:
- `response_received` - Contractor's response text
- `response_time` - When response received
- `sentiment_score` - AI sentiment analysis
- `pcr_score` - PowerConfidence Rating (1-10)
- `action_taken` - Action from response

**Integration Fields**:
- `ghl_contact_id` - GoHighLevel contact ID
- `ghl_message_id` - GoHighLevel message ID
- `ghl_location_id` - GoHighLevel location ID

**Error Tracking**:
- `error_message` - Error details if failed
- `delay_minutes` - Delay from scheduled time

**Timestamps**:
- `created_at` - When record created
- `updated_at` - When record last updated

### contractors Table (Joined Fields)
- `id` - Contractor ID
- `phone` - Phone number
- `name` - Full name
- `first_name` - First name
- `last_name` - Last name
- `email` - Email address
- `company_name` - Company name

### events Table (Joined Fields)
- `id` - Event ID
- `name` - Event name
- `date` - Event date
- `location` - Event location/venue

---

## How It Works

### 1. Message Scheduling Flow

```javascript
// When agenda is generated or contractor registers:

const eventMessageQueue = require('./queues/eventMessageQueue');

// Single message
await eventMessageQueue.scheduleEventMessage({
  id: 123,                    // event_messages.id
  event_id: 41,
  contractor_id: 56,
  message_type: 'speaker_alert',
  message_category: 'event_day',
  scheduled_time: '2025-10-17T19:07:00',
  message_content: 'Your session starts in 15 minutes!',
  personalization_data: { speaker_name: 'John Doe', session_title: 'AI in Business' },
  phone: '+18108934075',
  ghl_contact_id: 'abc123',
  ghl_location_id: 'loc456'
});

// Bulk messages (efficient)
await eventMessageQueue.scheduleBulkEventMessages([
  { id: 123, event_id: 41, contractor_id: 56, ... },
  { id: 124, event_id: 41, contractor_id: 56, ... },
  { id: 125, event_id: 41, contractor_id: 56, ... }
]);
```

### 2. Worker Processing

The worker automatically:
1. Picks up jobs at exact `scheduled_time`
2. Queries database for full message details
3. Checks if already sent or cancelled (skip if true)
4. Personalizes message with contractor name
5. Sends via n8n webhook (prod or dev)
6. Updates database: `status = 'sent'`, `actual_send_time = NOW()`
7. On failure: Updates `status = 'failed'`, `error_message`, retries 3 times

### 3. Message Status Lifecycle

```
scheduled → (worker picks up) → sent
         ↓                      ↓
      cancelled              failed
```

**Status Values**:
- `scheduled` - Queued in BullMQ, waiting for scheduled_time
- `sent` - Successfully sent via webhook
- `failed` - All retry attempts exhausted
- `cancelled` - Manually cancelled or skipped

---

## Starting the Worker

### Development
```bash
# In separate terminal from backend server:
node tpe-backend/src/workers/eventMessageWorker.js
```

### Production (PM2)
```bash
# Add to PM2 ecosystem
pm2 start tpe-backend/src/workers/eventMessageWorker.js --name "event-message-worker"
pm2 save
```

**IMPORTANT**: Worker must be running for messages to be sent!

---

## Integration Points

### 1. Agenda Generation → Message Scheduling

**File**: `tpe-backend/src/services/agendaGenerationService.js`

After generating agenda, schedule all messages:

```javascript
const { scheduleAllEventMessages } = require('./eventOrchestrator/eventMessageSchedulerService');

// After agenda generation completes
if (result.success) {
  await scheduleAllEventMessages(eventId);
}
```

### 2. Contractor Registration → Message Scheduling

**File**: `tpe-backend/src/services/eventOrchestrator/eventRegistrationService.js`

After contractor registers, schedule their messages:

```javascript
const { scheduleMessagesForContractor } = require('./eventMessageSchedulerService');

// After registration
await scheduleMessagesForContractor(eventId, contractorId);
```

### 3. Event Cancellation → Clear Messages

```javascript
const { clearEventMessages } = require('./queues/eventMessageQueue');

// Cancel all messages for event
await clearEventMessages(eventId);
```

### 4. Contractor Cancellation → Clear Messages

```javascript
const { clearContractorMessages } = require('./queues/eventMessageQueue');

// Cancel messages for specific contractor
await clearContractorMessages(eventId, contractorId);
```

---

## Monitoring & Debugging

### Get Queue Stats
```javascript
const { getQueueStats } = require('./queues/eventMessageQueue');

const stats = await getQueueStats();
console.log(stats);
// {
//   waiting: 5,
//   active: 2,
//   completed: 150,
//   failed: 3,
//   delayed: 50,
//   total: 57
// }
```

### Get Upcoming Messages
```javascript
const { getUpcomingMessages } = require('./queues/eventMessageQueue');

const upcoming = await getUpcomingMessages();
// Returns next 24 hours of scheduled messages with details
```

### Check Worker Status
```bash
# Worker logs show all activity:
[EventMessageWorker] ✅ Worker ready and listening for jobs
[EventMessageWorker] 🚀 Processing message 123 (speaker_alert) for contractor 56
[EventMessageWorker] ✅ SMS sent via webhook: { phone: '+18108934075' }
[EventMessageWorker] ✅ Job event-message-123 completed successfully
```

### Redis Queue Inspection

BullMQ stores jobs in Redis with keys:
- `bull:event-messages:*` - Queue data
- `bull:event-messages:delayed` - Delayed jobs (scheduled messages)
- `bull:event-messages:active` - Currently processing
- `bull:event-messages:completed` - Completed jobs
- `bull:event-messages:failed` - Failed jobs

---

## Message Type Reference

### Pre-Event Messages
- `registration_confirmation` - Immediate after registration
- `personalized_agenda` - After profile complete
- `check_in_reminder_night_before` - 8 PM night before event
- `check_in_reminder_1_hour` - 1 hour before event start
- `check_in_reminder_event_start` - At event start time

### Event Day Messages
- `speaker_alert` - 15 min before session
- `sponsor_recommendation` - During breaks
- `peer_match_notification` - During networking time

### PCR Collection
- `pcr_request` - 7 min after session/interaction

### Post-Event
- `post_event_wrap_up` - 2 hours after event ends

---

## Error Handling

### Automatic Retry
- 3 attempts total
- Exponential backoff (5s, 10s, 20s)
- Status updated to `failed` after all retries

### Common Errors
1. **No phone number** - Marked as failed immediately, no retry
2. **Webhook timeout** - Retried up to 3 times
3. **Message not found** - Skipped, marked as error
4. **Already sent** - Skipped gracefully

### Failed Message Recovery
```javascript
// Query failed messages
const failed = await query(`
  SELECT * FROM event_messages
  WHERE status = 'failed'
  AND scheduled_time > NOW() - INTERVAL '24 hours'
`);

// Reschedule if needed
for (const msg of failed.rows) {
  await rescheduleEventMessage(msg.id, new Date(), msg);
}
```

---

## Performance Optimization

### Database
- Index on `event_messages.scheduled_time` for fast queries
- Index on `event_messages.status` for filtering
- Compound index on `(event_id, contractor_id, message_type)` for deduplication

### Bulk Scheduling
- Use `scheduleBulkEventMessages()` for batch inserts
- Faster than individual `scheduleEventMessage()` calls
- Recommended when scheduling full event (100+ messages)

### Rate Limiting
- Worker limited to 20 jobs/minute
- Prevents SMS provider throttling
- Adjust in worker configuration if needed

---

## Next Steps

1. ✅ Create `eventMessageSchedulerService.js` - Service to create scheduled messages
2. ✅ Integrate with `agendaGenerationService.js` - Auto-schedule on agenda creation
3. ✅ Start worker in development - Test with accelerated event
4. ⏭️ Add to PM2 in production - Ensure worker runs continuously
5. ⏭️ Monitor queue stats - Track message delivery performance

---

## Comparison: Old vs New

### OLD (Database Polling)
- ❌ Required cron job or n8n workflow
- ❌ Poll every minute (inefficient)
- ❌ No automatic retry
- ❌ No rate limiting
- ❌ No priority queue
- ❌ Manual error handling

### NEW (BullMQ)
- ✅ Self-contained scheduling
- ✅ Event-driven (efficient)
- ✅ Automatic retry (3 attempts)
- ✅ Built-in rate limiting
- ✅ Priority-based processing
- ✅ Comprehensive error handling
- ✅ Monitoring and stats included
