# TPX SMS Router - DEV Workflow Documentation
**Workflow ID:** Xx8OJ6zQclCZayX8
**Node Count:** 15 nodes
**Purpose:** Route all inbound SMS to appropriate sub-workflows based on context and intent

---

## 🔍 Current Flow (n8n)

### Node 1: Webhook - All SMS Replies
- **Type:** Webhook Trigger
- **Path:** `/webhook/sms-router-dev`
- **Method:** POST
- **Data Source:** GHL (GoHighLevel) SMS webhook

**Receives:**
```json
{
  "contact_id": "tM5OabD8WqIUYIhRePz6",
  "phone": "+18108934075",
  "message": { "body": "3" },
  "location": { "id": "Jlq8gw3IEjAQu39n4c0s" }
}
```

---

### Node 2: Parse SMS Reply
- **Type:** Code (JavaScript)
- **Purpose:** Extract phone, message text, GHL IDs from webhook payload

**Logic:**
```javascript
const phone = data.phone || data.from;
const messageText = (data.message.body) || data.messageBody;
const ghlContactId = data.contactId || data.contact_id;
const ghlLocationId = data.location?.id || data.locationId;
```

**Outputs:**
```json
{
  "phone": "+18108934075",
  "message_text": "3",
  "ghl_contact_id": "tM5OabD8WqIUYIhRePz6",
  "ghl_location_id": "Jlq8gw3IEjAQu39n4c0s",
  "received_at": "2025-10-04T13:20:14.290Z"
}
```

---

### Node 3: Lookup Contractor
- **Type:** HTTP Request
- **URL:** `https://f88fd284a1e7.ngrok-free.app/api/contractors/lookup-by-phone?phone={phone}`
- **Headers:** X-API-Key: tpx-n8n-automation-key-2025-power100-experience

**Returns:**
```json
{
  "success": true,
  "contractor_id": 56,
  "name": "Zeek Test",
  "email": "zeek@power100.io",
  "phone": "+18108934075"
}
```

---

### Node 4: Check: Contractor Found?
- **Type:** IF condition
- **Logic:** `$json.success === true && $json.contractor_id > 0`
- **Routes:**
  - TRUE → Continue to Node 5
  - FALSE → Node 10 (Contractor Not Found response)

---

### Node 5: Lookup Pending Messages
- **Type:** HTTP Request
- **URL:** `https://f88fd284a1e7.ngrok-free.app/api/event-messaging/pending-context?contractor_id={id}`
- **Purpose:** Get recent outbound messages to determine context

**Returns:**
```json
{
  "success": true,
  "contractor_id": 56,
  "pending_messages": [
    {
      "id": 40,
      "event_id": 6,
      "message_type": "speaker_recommendation",
      "personalization_data": null,  // ← PROBLEM: Should contain speaker data
      "sent_at": "2025-10-04T17:19:38.143Z",
      "hours_since_sent": 3.98
    }
  ]
}
```

---

### Node 6: Analyze Intent & Route
- **Type:** Code (JavaScript)
- **Purpose:** Determine where to route based on database context + keywords

**Logic Flow:**
1. **LAYER 1 - Database State (90% confidence)**
   - Check pending_messages for recent context
   - If `message_type === 'pcr_request'` → route to `pcr_response`
   - If `message_type === 'sponsor_recommendation'` && reply is 1-3 → `sponsor_details`
   - If `message_type === 'speaker_recommendation'` && reply is 1-3 → `speaker_details`
   - If `message_type === 'speaker_recommendation'` && reply is 1-10 → `speaker_feedback`

2. **LAYER 2 - Keyword Fallback (60-70% confidence)**
   - ONLY if no database route found
   - If message matches `/^[1-5]$/` → `pcr_response`
   - If message contains "sponsor|booth|info" → `sponsor_details`
   - If message contains "speaker|session" → `speaker_details`

3. **LAYER 3 - Fallback (30% confidence)**
   - If nothing matches → `clarification_needed`

**Current Issue:** personalization_data is NULL, so routing skips database layer and falls back to keywords, causing misrouting

**Outputs:**
```json
{
  "route_to": "speaker_details",  // or pcr_response, sponsor_details, etc.
  "confidence": 0.85,
  "routing_method": "database",  // or "keyword", "fallback"
  "contractor_id": 56,
  "context_data": { /* message context */ }
}
```

---

### Node 7: Route Switch
- **Type:** Switch (5 outputs)
- **Routes:**
  1. `route_to === 'pcr_response'` → Node 11
  2. `route_to === 'sponsor_details'` → Node 12
  3. `route_to === 'speaker_details'` → Node 13
  4. `route_to === 'speaker_feedback'` → Node 14
  5. `route_to === 'clarification_needed'` → Node 8

---

### Node 8: Send Clarification Request
- **Type:** HTTP Request (GHL API)
- **Purpose:** Ask user to clarify their intent
- **Sends:** "I didn't quite understand. Can you clarify?"

---

### Node 9: Log Routing Decision
- **Type:** HTTP Request
- **URL:** `/api/event-messaging/routing-log`
- **Purpose:** Log routing decision for debugging
- **Data:** route, confidence, method, timestamp

---

### Node 10: Contractor Not Found
- **Type:** Respond to Webhook
- **Response:** `{ success: false, message: "Contractor not found", ignored: true }`

---

### Node 11: Call 'TPX PCR Response - DEV'
- **Type:** Execute Workflow
- **Workflow ID:** hTyeWDSEEsal59Ad
- **Passes:** contractor_id, phone, message_text, context_data

---

### Node 12: Call 'TPX Sponsor Response - DEV'
- **Type:** Execute Workflow
- **Workflow ID:** auUATKX6Ht4OK2s9
- **Passes:** contractor_id, phone, message_text, context_data

---

### Node 13: Call 'TPX Speaker Details - DEV'
- **Type:** Execute Workflow
- **Workflow ID:** hshQfIsiLJT8iKiP
- **Passes:** contractor_id, phone, message_text, context_data

---

### Node 14: Call 'TPX Speaker Feedback - DEV'
- **Type:** Execute Workflow
- **Workflow ID:** IEbbg7LVy9YX7gSx
- **Passes:** contractor_id, phone, message_text, context_data

---

### Node 15: Success Response
- **Type:** Respond to Webhook
- **Response:** `{ success: true, message: "Message routed successfully", route: "..." }`

---

## 🐛 Current Issues

1. **personalization_data is NULL** - Backend not saving speaker/sponsor data from workflows
2. **Keyword fallback overrides database routing** - Fixed but exposed data issue
3. **Multiple API calls** - 2 HTTP requests before routing decision
4. **Scattered logic** - Intent classification in n8n, not in backend
5. **No AI** - Simple keyword matching, not intelligent

---

## 🎯 Migration Target (Backend)

### New Endpoint: `/api/sms/inbound`
```javascript
POST /api/sms/inbound
{
  "phone": "+18108934075",
  "message": "3",
  "ghl_contact_id": "tM5OabD8WqIUYIhRePz6",
  "ghl_location_id": "Jlq8gw3IEjAQu39n4c0s",
  "timestamp": "2025-10-04T13:20:14.290Z"
}
```

**Backend Flow:**
1. **Load context** (single database query):
   - Contractor info
   - Recent event_messages
   - Current event registrations
   - Conversation history

2. **AI Intent Classification:**
   - Use AI Concierge brain
   - Analyze: message text + contractor context + recent messages
   - Return: { intent, confidence, route, reasoning }

3. **Route to handler:**
   - `handleSpeakerDetails()`
   - `handleSpeakerFeedback()`
   - `handleSponsorDetails()`
   - `handlePCRResponse()`
   - `handlePeerMatchingResponse()`

4. **Execute handler:**
   - Business logic
   - Generate personalized response
   - Save to database (WITH personalization_data)
   - Return SMS to send

5. **Send via n8n:**
   - POST to `/api/sms/outbound`
   - n8n receives → Sends via GHL → Done

---

## 📊 Database Schema Required

### New Table: `routing_logs`
```sql
CREATE TABLE routing_logs (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER REFERENCES contractors(id),
  inbound_message TEXT NOT NULL,
  classified_intent VARCHAR(100),
  confidence DECIMAL(3,2),
  routing_method VARCHAR(50), -- 'ai', 'rule', 'fallback'
  route_to VARCHAR(100),
  context_data JSONB,
  ai_reasoning TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Update: `event_messages` table
Ensure `personalization_data` is ALWAYS saved:
```sql
-- Already exists, but ensure it's used correctly
ALTER TABLE event_messages
  ALTER COLUMN personalization_data SET DEFAULT '{}';
```

---

## 🧪 Testing Requirements

### Test Cases:
1. Reply "1" to speaker recommendation → Routes to speaker_details
2. Reply "8" to speaker recommendation → Routes to speaker_feedback
3. Reply "2" to sponsor recommendation → Routes to sponsor_details
4. Reply "3" to PCR request → Routes to pcr_response
5. Reply "yes" to peer matching → Routes to peer_match_response
6. Random text with no context → Routes to clarification

### Success Criteria:
- ✅ All test cases route correctly
- ✅ personalization_data saved in database
- ✅ AI confidence >85% for context-based routing
- ✅ Response time <1 second
- ✅ Zero data loss

---

## 🔄 Migration Steps

1. **Create backend endpoint** `/api/sms/inbound`
2. **Build AI Router service** using AI Concierge
3. **Implement message handlers** (speaker, sponsor, PCR, etc.)
4. **Create** `/api/sms/outbound` endpoint
5. **Simplify n8n workflow:** Webhook → POST to backend
6. **Test** with all scenarios
7. **Archive old router** workflow

---

## 📝 Notes

- Current routing works but fragile (depends on personalization_data)
- Keyword fallback causes misrouting when data is NULL
- AI routing will be more robust and intelligent
- Backend routing eliminates 2 HTTP requests per message
- Unified logging in routing_logs table for debugging

