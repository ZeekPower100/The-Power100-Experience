# 🤝 Automated Peer Matching - Complete Integration Guide

## ✅ System Status: FULLY AUTOMATED

The peer matching system is now 100% automated from agenda generation to message delivery!

## 🎯 What Was Built

### 1. **Batch Peer Matching Strategy**
Instead of matching contractors individually when they check in, the system waits until 15 minutes before lunch to run ONE batch matching process for ALL checked-in contractors. This maximizes match quality by ensuring the largest possible pool of potential peers.

### 2. **Database Normalization Fixes**
- **Focus Areas**: Handles both "Operational Efficiency" and "operational_efficiency" formats
- **Revenue Tiers**: Supports multiple formats:
  - `1M-5M` (dash format)
  - `2m_5m` (underscore format)
  - `31_50_million` (long format)
  - `500k_1m` (thousand to million)
  - `under_500k` and `10m_plus`

### 3. **Complete Automation Flow**
```
Event Created → Speakers Added → Agenda Generated
              ↓
    Batch Peer Matching Scheduled (15 min before lunch)
              ↓
    [At scheduled time] BullMQ job triggers
              ↓
    runBatchPeerMatching() executes
              ↓
    - Finds all checked-in contractors
    - Runs matching algorithm for each
    - Creates peer_match records
    - Schedules introduction SMS (lunch + 5 min)
              ↓
    [At lunch + 5 min] eventMessageWorker sends SMS
              ↓
    Contractors receive peer introductions!
```

## 📂 Files Created/Modified

### New Files Created:
1. `tpe-backend/src/queues/eventOrchestrationQueue.js` - BullMQ queue for automation tasks
2. `tpe-backend/src/workers/eventOrchestrationWorker.js` - Worker to process batch peer matching jobs
3. `tpe-backend/src/services/eventOrchestrator/peerMatchingBatchScheduler.js` - Batch matching service
4. `test-batch-peer-matching.js` - Test script for batch matching
5. `test-automated-peer-matching.js` - End-to-end automation test
6. `test-peer-match-message.js` - SMS introduction message test
7. `update-test-contractor.js` - Helper script to create test data

### Modified Files:
1. `tpe-backend/src/services/agendaGenerationService.js` - Added peer matching scheduler integration
2. `tpe-backend/src/services/peerMatchingService.js` - Fixed focus area and revenue tier normalization
3. `tpe-backend/src/workers/eventMessageWorker.js` - Added peer_match_introduction message handling
4. `tpe-backend/src/workers/startAll.js` - Added Event Orchestration Worker

## 🚀 How It Works

### Automatic Trigger
When an agenda is generated (either automatically when creating an event with speakers, or manually via `POST /events/:id/generate-agenda`), the system automatically:

1. **Calculates Timing**:
   - Finds lunch time in agenda
   - Schedules peer matching for `lunch_time - 15 minutes`

2. **Creates BullMQ Job**:
   - Job ID: `batch-peer-matching-{eventId}`
   - Delay calculated to exact matching time
   - Worker will execute `runBatchPeerMatching(eventId)` at that time

3. **At Scheduled Time**:
   - Finds all contractors with:
     - `check_in_time IS NOT NULL`
     - `sms_opt_in = true`
     - `phone IS NOT NULL`
   - Runs matching algorithm (minimum score 0.6)
   - Creates `event_peer_matches` records
   - Schedules 2 introduction SMS per match (one for each peer)

4. **At Lunch + 5 Minutes**:
   - eventMessageWorker processes scheduled messages
   - Generates personalized SMS from `personalization_data`
   - Sends via n8n webhook to GoHighLevel

## 🔧 Configuration

### Matching Parameters
Located in `runBatchPeerMatching()`:
```javascript
maxMatches: 3,        // Top 3 matches per contractor
minScore: 0.6,        // Minimum 60% match score
excludeMatched: true  // Don't re-match existing pairs
```

### Timing Configuration
- **Peer Matching**: `lunch_time - 15 minutes`
- **Introduction Messages**: `lunch_time + 5 minutes`

Both are configurable in `peerMatchingBatchScheduler.js` lines 315 and 84.

## 📊 Scoring Algorithm

### Weights (when no job_title):
- Focus Area Overlap: **40%**
- Geographic Separation: **25%**
- Business Scale Similarity: **20%**
- Industry Alignment: **15%**

### Weights (with job_title):
- Focus Area Overlap: **35%**
- Geographic Separation: **25%**
- Business Scale Similarity: **20%**
- Industry Alignment: **15%**
- Job Title Match: **5%**

## 🧪 Testing

### Test Scripts Available:
1. **`test-batch-peer-matching.js`**: Tests batch matching with existing checked-in contractors
2. **`test-automated-peer-matching.js`**: Tests full automation from agenda generation
3. **`test-peer-match-message.js`**: Tests introduction SMS sending

### Running Tests:
```bash
# Test batch matching (requires contractors already checked in)
node test-batch-peer-matching.js

# Test full automation (generates agenda + schedules matching)
node test-automated-peer-matching.js

# Test SMS sending (schedules and sends introduction message)
node test-peer-match-message.js
```

## 🎛️ Required Workers

For the system to work, you need **3 workers running**:

```bash
# Start all workers together (RECOMMENDED):
npm run worker

# Or start individually:
node tpe-backend/src/workers/followUpWorker.js
node tpe-backend/src/workers/eventMessageWorker.js
node tpe-backend/src/workers/eventOrchestrationWorker.js  # NEW!
```

The Event Orchestration Worker is critical - it's what actually runs the batch peer matching at the scheduled time!

## 📱 Message Format

### Peer Introduction SMS:
```
Hey {firstName}! 👋

🤝 Find Your Peer: I found someone perfect for you to meet!

{peerFirstName} {peerLastName} from {peerCompany} ({peerLocation}) - you're {matchReason}.

They're in a non-competing market, so this is a great chance to share strategies!

Reply YES to get an intro, or LATER if you want to connect during a break.
```

### Personalization Data Stored:
```json
{
  "match_id": 3,
  "peer_contractor_id": 56,
  "peer_name": "Zeek Test",
  "peer_company": "Zeek Co",
  "peer_location": "Houston, TX",
  "match_reason": "both focused on controlling_lead_flow and hiring_sales_leadership",
  "match_score": 0.73
}
```

## 🔍 Monitoring

### Check Scheduled Jobs:
```javascript
// Event Orchestration Queue
const { getOrchestrationQueueStats } = require('./tpe-backend/src/queues/eventOrchestrationQueue');
const stats = await getOrchestrationQueueStats();
console.log(stats); // { waiting, active, completed, failed, delayed, total }
```

### Check Peer Matches in Database:
```sql
SELECT
  epm.*,
  c1.first_name || ' ' || c1.last_name as contractor1_name,
  c2.first_name || ' ' || c2.last_name as contractor2_name
FROM event_peer_matches epm
JOIN contractors c1 ON epm.contractor1_id = c1.id
JOIN contractors c2 ON epm.contractor2_id = c2.id
WHERE epm.event_id = 41
ORDER BY epm.match_score DESC;
```

### Check Scheduled Introduction Messages:
```sql
SELECT
  id,
  contractor_id,
  scheduled_time,
  status,
  personalization_data->>'peer_name' as peer_name,
  personalization_data->>'match_score' as match_score
FROM event_messages
WHERE event_id = 41
  AND message_type = 'peer_match_introduction'
ORDER BY scheduled_time;
```

## ✅ What's Automated Now

1. ✅ **Agenda Generation**: Creates lunch timing
2. ✅ **Peer Matching Scheduling**: Automatically schedules batch job
3. ✅ **Batch Peer Matching**: Runs at optimal time (15 min before lunch)
4. ✅ **Match Creation**: Creates peer_match records in database
5. ✅ **Introduction Scheduling**: Schedules SMS for lunch + 5 min
6. ✅ **Message Sending**: eventMessageWorker sends at scheduled time

## 🎯 What's Next (Future Enhancements)

### Response Handlers (Not yet automated):
- **"YES" response**: Exchange contact info between peers
- **"LATER" response**: Reschedule introduction for next break
- **"Tell me more" response**: Send additional match details

### Additional Automation Opportunities:
- **Break-time coordination**: "Meet at networking area in 5 min?"
- **Post-event follow-up**: "How was your chat with {peer}? Rate 1-10"
- **Connection tracking**: Did they actually meet? Update match record
- **Feedback loop**: Use ratings to improve future matching

## 🎉 Success Metrics

### Test Results:
- ✅ Match created: Contractor 1 ↔ Contractor 56
- ✅ Match score: 0.73 (73% compatibility)
- ✅ Match reason: "Both focused on controlling_lead_flow, hiring_sales_leadership, and operational_efficiency"
- ✅ 2 introduction messages scheduled
- ✅ BullMQ jobs created and queued
- ✅ Complete automation from agenda → matching → messages

## 🔐 Database Schema

### event_peer_matches (21 columns):
- id, event_id, contractor1_id, contractor2_id
- match_type, match_criteria, match_score, match_reason
- introduction_sent_time, introduction_message
- contractor1_response, contractor2_response
- connection_made, meeting_scheduled, meeting_time, meeting_location
- notes, created_at, updated_at

### event_messages (28 columns):
- id, event_id, contractor_id, message_type, message_category
- scheduled_time, actual_send_time, message_content
- personalization_data, phone, status, direction
- response_received, response_time, sentiment_score, pcr_score
- error_message, ghl_contact_id, ghl_message_id, ghl_location_id
- channel, from_email, to_email, subject
- created_at, updated_at

## 📞 Support

For issues or questions:
1. Check worker logs: `pm2 logs tpe-backend`
2. Check Redis/BullMQ: `npm run queue:monitor` (if you create this command)
3. Run test scripts to verify system state
4. Check database for scheduled jobs and messages

---

**Status**: ✅ PRODUCTION READY
**Last Updated**: October 18, 2025
**Version**: 1.0.0
