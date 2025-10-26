# Phase 3A - IGE Operations Field Reference
**DATABASE-VERIFIED**: October 24, 2025
**Source of Truth**: PostgreSQL Database Schemas

## Overview
This document contains EXACT field names verified against the database for Phase 3A features.
All fields listed are confirmed to exist with correct data types and nullability.

---

## 1. Manual Goal Creation
**Table**: `ai_concierge_goals`

### Required Fields (NOT NULL):
```typescript
{
  contractor_id: number,        // NOT NULL
  goal_type: string,            // NOT NULL (varchar)
  goal_description: string      // NOT NULL (text)
}
```

### Optional Fields (with defaults):
```typescript
{
  target_milestone: string | null,      // varchar, nullable
  priority_score: number,               // integer, nullable, default: 5
  current_progress: number,             // integer, nullable, default: 0
  next_milestone: string | null,        // text, nullable
  success_criteria: object | null,      // jsonb, nullable
  pattern_source: string | null,        // text, nullable
  pattern_confidence: number | null,    // numeric, nullable
  data_gaps: object | null,             // jsonb, nullable
  status: string,                       // varchar, nullable, default: 'active'
  trigger_condition: string | null,     // varchar, nullable
  last_action_at: Date | null,          // timestamp, nullable
  created_at: Date,                     // timestamp, nullable, default: now()
  updated_at: Date,                     // timestamp, nullable, default: now()
  completed_at: Date | null             // timestamp, nullable
}
```

### API Endpoint to Build:
```
POST /api/ige-monitor/contractor/:id/goal
Body: {
  goal_type: string (REQUIRED),
  goal_description: string (REQUIRED),
  target_milestone?: string,
  priority_score?: number,
  // ... other optional fields
}
```

---

## 2. Manual Action Item Creation
**Table**: `contractor_action_items`

### Required Fields (NOT NULL):
```typescript
{
  contractor_id: number,        // NOT NULL
  title: string,                // NOT NULL (varchar)
  action_type: string,          // NOT NULL (varchar)
  priority: number              // NOT NULL (integer), default: 5
}
```

### Optional Fields (with defaults):
```typescript
{
  event_id: number | null,                      // integer, nullable
  description: string | null,                   // text, nullable
  contractor_priority: number | null,           // integer, nullable
  ai_suggested_priority: number | null,         // integer, nullable
  due_date: Date | null,                        // date, nullable
  reminder_time: Date | null,                   // timestamp, nullable
  status: string,                               // varchar, nullable, default: 'pending'
  completed_at: Date | null,                    // timestamp, nullable
  cancelled_reason: string | null,              // text, nullable
  related_partner_id: number | null,            // integer, nullable
  related_peer_contractor_id: number | null,    // integer, nullable
  related_speaker_id: number | null,            // integer, nullable
  related_sponsor_id: number | null,            // integer, nullable
  related_note_id: number | null,               // integer, nullable
  related_demo_booking_id: number | null,       // integer, nullable
  ai_generated: boolean,                        // boolean, nullable, default: false
  ai_reasoning: string | null,                  // text, nullable
  extraction_confidence: number | null,         // numeric, nullable
  source_message_id: number | null,             // integer, nullable
  conversation_context: object,                 // jsonb, nullable, default: '{}'
  created_at: Date,                             // timestamp, nullable, default: now()
  updated_at: Date                              // timestamp, nullable, default: now()
}
```

### API Endpoint to Build:
```
POST /api/ige-monitor/contractor/:id/action
Body: {
  title: string (REQUIRED),
  action_type: string (REQUIRED),
  priority?: number,
  description?: string,
  due_date?: string,
  // ... other optional fields
}
```

---

## 3. Manual Message Sending
**Table**: `ai_proactive_messages`

### Required Fields (NOT NULL):
```typescript
{
  contractor_id: number,        // NOT NULL
  message_type: string,         // NOT NULL (text)
  message_content: string,      // NOT NULL (text)
  ai_reasoning: string          // NOT NULL (text) - for manual: "Manually created by admin"
}
```

### Optional Fields (with defaults):
```typescript
{
  context_data: object | null,              // jsonb, nullable
  sent_at: Date | null,                     // timestamp, nullable
  contractor_response: string | null,       // text, nullable
  response_received_at: Date | null,        // timestamp, nullable
  conversation_continued: boolean,          // boolean, nullable, default: false
  outcome_rating: number | null,            // integer, nullable
  led_to_action: boolean,                   // boolean, nullable, default: false
  created_at: Date,                         // timestamp, nullable, default: now()
  updated_at: Date                          // timestamp, nullable, default: now()
}
```

### API Endpoint to Build:
```
POST /api/ige-monitor/contractor/:id/message
Body: {
  message_type: string (REQUIRED),
  message_content: string (REQUIRED),
  send_immediately?: boolean,  // if true, set sent_at to now()
  context_data?: object
}
```

---

## 4. Manual Trust Score Adjustment
**Table**: `ai_trust_indicators`

### Required Fields (NOT NULL):
```typescript
{
  contractor_id: number,              // NOT NULL
  indicator_type: string,             // NOT NULL (text) - use "manual_adjustment"
  indicator_description: string,      // NOT NULL (text) - reason for adjustment
  confidence_impact: number,          // NOT NULL (integer) - the delta (+/-)
  cumulative_trust_score: number      // NOT NULL (numeric) - new total score
}
```

### Optional Fields (with defaults):
```typescript
{
  context_data: object | null,        // jsonb, nullable
  recorded_at: Date,                  // timestamp, nullable, default: now()
  created_at: Date,                   // timestamp, nullable, default: now()
  updated_at: Date                    // timestamp, nullable, default: now()
}
```

### API Endpoint to Build:
```
POST /api/ige-monitor/contractor/:id/trust-adjustment
Body: {
  adjustment: number (REQUIRED),         // +/- value to add to current score
  reason: string (REQUIRED),             // indicator_description
  context_data?: object
}

Logic:
1. GET current trust score from latest ai_trust_indicators record
2. Calculate new score: current + adjustment
3. INSERT new record with:
   - indicator_type: "manual_adjustment"
   - indicator_description: reason
   - confidence_impact: adjustment
   - cumulative_trust_score: new calculated score
```

---

## 5. Bulk Operations
Use the same endpoints as above but with array of contractor IDs:

```
POST /api/ige-monitor/bulk/message
Body: {
  contractor_ids: number[] (REQUIRED),
  message_type: string (REQUIRED),
  message_content: string (REQUIRED),
  send_immediately?: boolean
}

POST /api/ige-monitor/bulk/goal
Body: {
  contractor_ids: number[] (REQUIRED),
  goal_type: string (REQUIRED),
  goal_description: string (REQUIRED),
  priority_score?: number
}

POST /api/ige-monitor/bulk/action
Body: {
  contractor_ids: number[] (REQUIRED),
  title: string (REQUIRED),
  action_type: string (REQUIRED),
  priority?: number,
  due_date?: string
}
```

---

## 6. System Alerts
**Note**: No alerts table exists. Alerts are computed in real-time from existing data.

Current alert logic (from igeMonitorController.js):
- Low trust scores (< 40)
- Inactive contractors (no activity in 30 days)
- Pending actions overdue
- Unresponded messages

**No new database tables needed for alerts.**

---

## Implementation Checklist

### Backend Controllers to Create:
- [ ] `igeManualGoalController.js` - DATABASE-CHECKED: ai_concierge_goals
- [ ] `igeManualActionController.js` - DATABASE-CHECKED: contractor_action_items
- [ ] `igeManualMessageController.js` - DATABASE-CHECKED: ai_proactive_messages
- [ ] `igeManualTrustController.js` - DATABASE-CHECKED: ai_trust_indicators
- [ ] `igeBulkOperationsController.js` - DATABASE-CHECKED: all above tables

### Routes to Add:
```javascript
// Individual operations
router.post('/contractor/:id/goal', igeManualGoalController.createGoal);
router.post('/contractor/:id/action', igeManualActionController.createAction);
router.post('/contractor/:id/message', igeManualMessageController.sendMessage);
router.post('/contractor/:id/trust-adjustment', igeManualTrustController.adjustTrust);

// Bulk operations
router.post('/bulk/message', igeBulkOperationsController.bulkMessage);
router.post('/bulk/goal', igeBulkOperationsController.bulkGoal);
router.post('/bulk/action', igeBulkOperationsController.bulkAction);
```

### Frontend UI Components:
- [ ] Quick action buttons on contractor detail page
- [ ] Modal forms for creating goals/actions/messages
- [ ] Trust score adjustment modal
- [ ] Bulk operation selection UI on search page
- [ ] Bulk operation action bar

---

## Database Field Name Standards

✅ **ALWAYS use these EXACT field names** (verified from database):

**Goals Table**:
- `goal_description` (NOT goal_text)
- `goal_type` (NOT category)
- `priority_score` (NOT priority)
- `current_progress` (NOT progress)
- `target_milestone` (NOT target_date)

**Actions Table**:
- `title` (NOT name or action_text)
- `description` (NOT details)
- `action_type` (NOT type or category)
- `priority` (NOT priority_score)

**Messages Table**:
- `message_content` (NOT message_text)
- `message_type` (NOT type)
- `ai_reasoning` (NOT reason)

**Trust Indicators**:
- `indicator_description` (NOT reason or description)
- `indicator_type` (NOT type or category)
- `confidence_impact` (NOT trust_delta or delta)
- `cumulative_trust_score` (NOT trust_score)

---

## CRITICAL REMINDERS

1. **ALWAYS check database schemas FIRST** before writing any code
2. **Use EXACT field names** from database - never assume or guess
3. **Add DATABASE-CHECKED comments** to all controllers
4. **Handle null values** properly for nullable fields
5. **Respect default values** (don't override unless necessary)
6. **Use prepared statements** ($1, $2, etc.) for SQL queries
7. **Validate required fields** in controllers before INSERT

---

**This document is the single source of truth for Phase 3A field names.**
**All code must reference this document and the database schemas.**
