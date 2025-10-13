# AI Concierge + Event Orchestrator - Complete System Guide

**The Power100 Experience AI System - Your Complete Reference**

---

## 📋 Table of Contents

1. [What Is It? (Executive Summary)](#part-1-what-is-it-executive-summary)
2. [AI Concierge (General Mode)](#part-2-ai-concierge-general-mode)
3. [Event Orchestrator Mode](#part-3-event-orchestrator-mode)
4. [Technical Architecture](#part-4-technical-architecture)
5. [Testing & Usage](#part-5-testing--usage)
6. [Adding New Capabilities](#part-6-adding-new-capabilities)

---

## Part 1: What Is It? (Executive Summary)

### The Vision

> "Every contractor has a personal AI advisor that knows their business better than they do, anticipates their needs, and connects them with the exact resources, knowledge, and partners they need at the precise moment they need them."

The AI Concierge is **not just a chatbot**—it's contractors' **EVERYTHING**. A 24/7 business advisor that:
- Knows their complete business profile (revenue, team, location, challenges)
- Recommends partners, books, podcasts, and events contextually
- Learns from every interaction to improve future guidance
- **Transforms into an Event Orchestrator during commercial events**

### Two Operating Modes

#### **Mode 1: General Business Advisor** (Default)
- Available 24/7 via web interface or SMS
- Answers questions about partners, resources, industry trends
- Makes intelligent recommendations based on contractor profile
- Maintains conversation history and context

#### **Mode 2: Event Orchestrator** (Auto-activated at events)
When a contractor checks into an event, the AI automatically shifts into specialized mode:
- **During Event**: Captures notes, extracts contacts, recommends sessions/sponsors
- **Post-Event**: Extracts priorities, creates action items, schedules follow-ups
- **Proactive**: Checks in days/weeks later without being asked

### Key Differentiator

**Other chatbots:** Reactive, static responses (same answer every time)

**TPX AI Concierge:**
- Proactive, context-aware intelligence
- Learns from outcomes (what worked, what didn't)
- Writes to database (captures notes, creates tasks)
- Schedules its own follow-ups
- Gets smarter with every interaction

---

## Part 2: AI Concierge (General Mode)

### Core Capabilities

#### 1. **Intelligent Recommendations**
The AI can recommend from TPX's complete ecosystem:

**Partners (Strategic Partners):**
- Matches based on focus areas, revenue tier, location
- Considers PowerConfidence scores (customer satisfaction)
- Explains WHY each partner is recommended
- Tracks outcomes to improve future matches

**Books:**
- AI-processed summaries and key insights
- Matched to contractor's current challenges
- Specific chapter/page references when relevant

**Podcasts:**
- Auto-transcribed and analyzed episodes
- Timestamp recommendations (skip to 14:30 for...)
- Topic-based matching

**Events:**
- Upcoming events matched to focus areas
- Session-level recommendations
- Peer attendee matching (same role, different market)

#### 2. **Comprehensive Knowledge Base**

The AI has access to:
- **89 database tables** with **1,443 columns** of data
- All contractor profiles and interaction history
- All partner details, testimonials, and performance data
- Complete event schedules, speakers, sponsors
- Books, podcasts, and all AI-processed content

**Auto-Discovery System:**
Any database field starting with `ai_` is automatically:
- Included in the AI's knowledge base
- Formatted properly for AI consumption
- Refreshed on a smart schedule (5 min dev, 24 hr prod)

**Examples of AI fields:**
- `ai_summary` - AI-generated summaries
- `ai_tags` - Auto-extracted topics
- `ai_insights` - Actionable takeaways
- `ai_differentiators` - Unique selling points

#### 3. **Conversation Memory**

Every conversation is tracked:
- Stored in `ai_concierge_conversations` table
- Maintains context across sessions
- References previous discussions naturally
- Learns communication preferences over time

#### 4. **Cross-Entity Intelligence**

The AI connects dots across all data:
- "Partners who also recommend this book"
- "Events featuring speakers who discuss your challenge"
- "Podcasts by partners in your region"
- "Books mentioned by top-rated speakers"

### Access Control

**Gating Mechanism:**
- Contractors must complete the contractor flow OR feedback survey
- Database flag: `feedback_completion_status = 'completed'`
- This incentivizes participation in PowerConfidence feedback

**Access Levels:**
- `no_access` - Hasn't completed onboarding
- `full` - Completed flow or feedback, unlimited access

### How to Use (Contractor Perspective)

**Web Interface:**
```
1. Log into TPX
2. Navigate to AI Concierge page
3. Type question or select quick action
4. AI responds with personalized guidance
```

**SMS Interface:**
```
1. Text your question to the TPX number
2. AI responds via SMS (max 960 chars per message)
3. Multi-message support for longer responses
4. Can request more detail or ask follow-ups
```

**Example Conversations:**

```
Contractor: "I need help with sales leadership"

AI: "Based on your $3M revenue and 8-person team, I recommend:

1. 🤝 Partner: Destination Motivation
   - 94% PowerConfidence score
   - Specializes in sales team building for $2-5M companies
   - Average client sees 40% sales increase in 6 months

2. 📚 Book: Beyond the Hammer, Chapter 4
   - Specific sales compensation structures
   - Page 127-134 addresses your revenue range

3. 🎧 Podcast: Wealthy Contractor Ep 247
   - Skip to 14:30 for sales comp discussion
   - Guest scaled from $5M to $12M with similar challenges

Which would you like to explore first?"
```

---

## Part 3: Event Orchestrator Mode

### How Event Mode Activates

**Automatic Detection:**
The AI detects event context through:
1. Contractor checks into event (via QR code or mass trigger)
2. Record created in `event_attendees` table
3. AI receives `eventContext` object with:
   - Event details (name, date, location)
   - Event status (pre_event, during_event, post_event)
   - Full schedule (speakers, sponsors, sessions)
   - Contractor's personalized agenda

**Event Status States:**
- `pre_event` - Before event date
- `during_event` - Event is happening NOW
- `post_event` - Within 7 days after event ends
- `past_event` - More than 7 days ago

### During-Event Behavior

When `eventStatus === 'during_event'`, the AI shifts into specialized Event Orchestrator mode:

#### **1. Note-Taking & Entity Extraction**

**What the AI Does:**
Detects when contractor is sharing information (not asking a question):

```
Contractor: "Met John Smith from Acme Corp - great insights on AI automation.
His number is 555-1234, email john@acme.com"

AI: "Awesome! What session are you in right now?"

Contractor: "The AI automation session"

AI: "Perfect! I'll make note of that. What specifically interested you about
his insights?"
```

**Behind the Scenes (Function Calling):**
```javascript
// AI automatically calls capture_event_note() function
{
  note_text: "Met John Smith from Acme Corp - great insights on AI automation",
  extracted_names: ["John Smith"],
  extracted_companies: ["Acme Corp"],
  extracted_phones: ["555-1234"],
  extracted_emails: ["john@acme.com"],
  session_context: "AI automation session",
  note_type: "contact",
  ai_priority_score: 0.8,
  requires_followup: true
}
```

**Database Write:**
- Saved to `event_notes` table
- Contractor doesn't see technical details
- AI responds naturally: "Got it! I'll remember John Smith's info."

#### **2. Session & Speaker Awareness**

The AI knows the full event schedule:

```
CURRENT EVENT SCHEDULE:
• 9:00 AM - "Simple CRM Strategy For Sales Growth" by Clint K (Richards Building Supply)
• 10:30 AM - "The Grit to Gold Success Process" by Paul B (Westlake Royal)
• 1:00 PM - "GAF Insurance Forecast" by Sydney Rosenthal (GAF)
• 2:30 PM - "Retail Growth Playbook" by Andy K (James Hardie)
• 4:00 PM - "New Income Opportunities" by Anthony Marino (CertainTeed)

CRITICAL: These are the ONLY speakers at this event. DO NOT mention any other speakers.
```

**Smart Recommendations:**
```
Contractor: "What sessions should I attend?"

AI: "Based on your focus on controlling lead flow and sales training:

1. **Simple CRM Strategy** by Clint K at 9:00 AM
   Why: Learn how to streamline lead flow with simplified CRM processes

2. **The Grit to Gold Success Process** by Paul B at 10:30 AM
   Why: Build high-performance sales leadership that drives growth

3. **Retail Growth Playbook** by Andy K at 2:30 PM
   Why: Optimize operations and drive sales growth strategies

These 3 sessions align perfectly with your business goals."
```

#### **3. Sponsor Recommendations**

The AI recommends sponsors with specific booth contacts:

```
AI: "During the lunch break, I recommend visiting these sponsor booths:

1. 🎯 FieldForce (Booth 12)
   Contact: Sarah Johnson, VP Sales
   Say: "I'm looking for field service management tools to control lead flow"

2. 🎯 TechStack Solutions (Booth 8)
   Contact: Mike Chen, Solutions Architect
   Say: "I need help with sales team tracking and operational efficiency"

Mention you're from Zeek Co and focused on greenfield growth!"
```

### Post-Event Behavior

When `eventStatus === 'post_event'`, the AI initiates priority extraction:

#### **Opening Message (AI-Initiated):**
```
AI: "Hey Zeek! Hope you had an amazing time at Business Growth Expo! 🎉

I have a complete summary of everything - your sessions, sponsor visits,
and connections made.

Before I share the full wrap-up, what are the TOP 3 PRIORITIES you want
to make sure we tackle from everything you experienced?"
```

#### **Priority Extraction (Function Calling):**

```
Contractor: "1. Follow up with John Smith, 2. Demo with Acme Corp, 3. Implement AI tools"

AI: "Perfect! I'll create a follow-up plan for all three:

1️⃣ Follow up with John Smith - When should I check in to see if you've connected?
2️⃣ Acme Corp demo - I see it's scheduled for Oct 16. Want help preparing questions?
3️⃣ AI tools implementation - Which tools from the event interested you most?

I'll check in proactively on each of these. Sound good?"
```

**Behind the Scenes:**
```javascript
// AI calls create_action_item() for EACH priority
Action Item 1:
{
  title: "Follow up with John Smith",
  description: "Contact John Smith from Acme Corp regarding AI automation insights",
  action_type: "contact_peer",
  contractor_priority: 1,  // Top priority
  due_date: "2025-10-14",
  ai_reasoning: "Contractor stated as #1 priority from event"
}

Action Item 2:
{
  title: "Acme Corp Demo",
  description: "Prepare for and attend Acme Corp demo scheduled for Oct 16",
  action_type: "demo_prep",
  contractor_priority: 2,
  due_date: "2025-10-16",
  related_demo_booking_id: 42
}

Action Item 3:
{
  title: "Implement AI tools",
  description: "Research and implement AI automation tools discussed at event",
  action_type: "implement_tool",
  contractor_priority: 3,
  due_date: "2025-10-21"
}
```

#### **Follow-Up Scheduling (Automatic):**

```
Contractor: "Check in 3 days from now"

AI: "Got it! I'll check in on Wednesday."
```

**Behind the Scenes:**
```javascript
// AI calls schedule_followup() function
{
  action_item_id: 123,
  days_from_now: 3,
  followup_type: "check_in",
  message_template: "Hey! Just checking in - have you had a chance to connect with John Smith yet?",
  context_hints: {
    mention_event: "Business Growth Expo",
    reference_person: "John Smith",
    reference_topic: "AI automation"
  }
}
```

### Proactive Follow-Ups (The Magic)

**3 Days Later (Automatically):**

```
AI: "Hey Zeek! Just checking in - have you had a chance to connect with John Smith yet?"

Contractor: "Yes! We had a great call yesterday"

AI: "That's awesome! How did it go? Anything interesting come up?"

[AI automatically calls update_action_item_status(123, 'completed')]
```

**This Happens Without Human Intervention:**
- Bull queue checks `contractor_followup_schedules` table every 5 minutes
- Finds scheduled follow-ups that are due
- AI generates personalized message using context hints
- Sends via n8n → GHL → SMS
- Marks as sent in database
- Conversation continues naturally if contractor responds

### The Four Database-Writing Functions

The AI can write to the database using OpenAI function calling:

#### **1. capture_event_note()**
**When:** Contractor shares information during event
**Writes to:** `event_notes` table
**Extracts:** Names, phones, emails, companies, session context

#### **2. create_action_item()**
**When:** Contractor states a priority or task
**Writes to:** `contractor_action_items` table
**Includes:** Title, description, type, priority, due date, AI reasoning

#### **3. schedule_followup()**
**When:** AI creates an action item
**Writes to:** `contractor_followup_schedules` table
**Schedules:** Proactive check-in via Bull queue + Redis

#### **4. update_action_item_status()**
**When:** Contractor confirms completion or progress
**Writes to:** `contractor_action_items` + `action_item_updates`
**Tracks:** Status changes, completion timestamps, update notes

---

## Part 4: Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (Next.js)                         │
│  - AI Concierge Chat Interface                             │
│  - Message history display                                 │
│  - Quick action buttons                                    │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓ API Calls
┌─────────────────────────────────────────────────────────────┐
│               BACKEND (Express.js)                          │
│                                                             │
│  Controllers:                                               │
│  - aiConciergeController.js (main entry point)            │
│                                                             │
│  Services:                                                  │
│  - aiKnowledgeService.js (knowledge base loader)          │
│  - openAIService.js (GPT-4 integration)                   │
│  - eventNoteService.js (note capture)                     │
│  - actionItemService.js (task management)                 │
│  - followUpService.js (scheduling)                        │
│  - dynamicPromptBuilder.js (context formatting)           │
│                                                             │
│  Background Workers:                                        │
│  - Bull Worker (follow-up scheduler)                      │
│  - Redis (job queue)                                       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ↓ OpenAI API
┌─────────────────────────────────────────────────────────────┐
│                    OPENAI GPT-4                             │
│  - Conversation generation                                  │
│  - Function calling (4 functions)                          │
│  - Sentiment analysis                                       │
│  - Entity extraction                                        │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow (General Mode)

```
1. User sends message
   ↓
2. aiConciergeController.generateAIResponse()
   ↓
3. aiKnowledgeService.getDynamicKnowledge()
   - Loads contractor profile
   - Loads all 89 tables (1,443 columns)
   - Builds comprehensive knowledge base
   ↓
4. dynamicPromptBuilder.buildContext()
   - Formats data for AI consumption
   - Includes cross-entity insights
   - Auto-discovers ai_* fields
   ↓
5. openAIService.generateConciergeResponse()
   - Builds system prompt
   - Includes conversation history
   - Sends to GPT-4
   ↓
6. GPT-4 generates response
   ↓
7. Response returned to user
   ↓
8. Saved to ai_concierge_conversations table
```

### Request Flow (Event Mode with Function Calling)

```
1. User sends message during event
   ↓
2. aiConciergeController.generateAIResponse()
   - Includes eventContext parameter
   ↓
3. aiKnowledgeService.getCurrentEventContext()
   - Loads event details (name, date, location)
   - Loads speakers (fullSchedule + speakers fields)
   - Loads sponsors (allSponsors + sponsors fields)
   - Returns eventContext object
   ↓
4. openAIService.generateConciergeResponse()
   - Builds system prompt with EVENT ORCHESTRATOR section
   - Includes event schedule with CRITICAL anti-hallucination instructions
   - Enables 4 function tools (capture_event_note, etc.)
   ↓
5. GPT-4 analyzes message and decides to call function
   Example: "Met John Smith, 555-1234"
   ↓
6. GPT-4 returns function call:
   {
     function: "capture_event_note",
     arguments: {
       note_text: "Met John Smith",
       extracted_names: ["John Smith"],
       extracted_phones: ["555-1234"]
     }
   }
   ↓
7. openAIService processes function call
   ↓
8. eventNoteService.captureEventNote()
   - Writes to event_notes table
   - Returns success
   ↓
9. GPT-4 generates natural response
   "Got it! I'll make note of John's info. What session are you in?"
   ↓
10. Response returned to user (user never sees technical details)
```

### Database Schema (Event-Related Tables)

#### **event_notes** (20 columns)
Stores notes captured during events with AI entity extraction
```sql
Key columns:
- event_id, contractor_id
- note_text (full note)
- extracted_entities (JSONB: names, phones, emails, companies)
- session_context (which session)
- note_type (contact, insight, action_item, speaker_note, sponsor_note)
- ai_tags, ai_priority_score
- requires_followup (boolean)
```

#### **contractor_action_items** (27 columns)
Action items created by AI from contractor priorities
```sql
Key columns:
- contractor_id, event_id
- title, description, action_type
- priority (1-10)
- contractor_priority (stated by contractor: 1, 2, 3)
- ai_suggested_priority (AI's recommendation)
- due_date, status
- related_partner_id, related_peer_contractor_id, related_note_id
- ai_generated, ai_reasoning
```

#### **contractor_followup_schedules** (21 columns)
Scheduled follow-ups managed by Bull queue
```sql
Key columns:
- contractor_id, action_item_id, event_id
- scheduled_time (when to send)
- followup_type (check_in, reminder, status_update)
- message_template
- ai_context_hints (JSONB: for personalization)
- skip_if_completed (boolean)
- status (scheduled, sent, skipped)
- sent_at, response_text
```

#### **action_item_updates** (13 columns)
Audit trail for action item changes
```sql
Key columns:
- action_item_id, contractor_id
- update_type (status_change, priority_change)
- old_value, new_value
- update_note (what contractor said)
- updated_by (ai_concierge, contractor, admin)
```

### Key Services Explained

#### **aiKnowledgeService.js**
**Purpose:** Loads and formats all data for AI consumption

**Key Functions:**
- `getDynamicKnowledge(contractorId, eventContext)` - Main entry point
- `getCurrentEventContext(eventId, contractorId)` - Loads event details
- `getCrossEntityInsights(contractorId)` - Connects related data
- `getAllDatabaseTables()` - Discovers all 89 tables
- `isRelevantColumn(columnName)` - Filters out sensitive fields

**Caching:**
- Development: 5 minutes for active events, 1 hour for past events
- Production: 30 seconds for active events, 24 hours for past events

#### **openAIService.js**
**Purpose:** Interfaces with OpenAI API, manages function calling

**Key Functions:**
- `generateConciergeResponse(message, contractor, history, partners, knowledgeBase)`
- Builds comprehensive system prompt with event orchestrator instructions
- Handles function call execution (capture_event_note, create_action_item, etc.)
- Returns natural language response

**Critical Event Schedule Section (lines 955-966):**
```javascript
${event && (event.speakers || event.fullSchedule) &&
   (event.speakers?.length > 0 || event.fullSchedule?.length > 0) ? `
CURRENT EVENT SCHEDULE:
${((event.speakers || event.fullSchedule) || []).map((s, i) =>
  `• ${s.session_time || 'TBD'} - "${s.session_title}" by ${s.name}${s.company ? ` (${s.company})` : ''}`
).join('\n')}

CRITICAL: These are the ONLY speakers at this event. DO NOT mention any other speakers.
If asked about speakers, ONLY reference the speakers listed above.
` : ''}
```

#### **eventNoteService.js**
**Purpose:** Captures notes during events

**Key Function:**
```javascript
async captureEventNote({
  eventId,
  contractorId,
  noteText,
  extractedEntities = {},  // {names: [], phone_numbers: [], emails: [], companies: []}
  sessionContext = null,
  speakerId = null,
  sponsorId = null,
  noteType = 'general',
  aiTags = [],
  aiPriorityScore = 0.5,
  requiresFollowup = false
})
```

#### **actionItemService.js**
**Purpose:** Manages contractor action items and updates

**Key Functions:**
- `createActionItem()` - Creates from AI conversation
- `updateActionItemStatus()` - Updates status when contractor confirms
- `getPendingActionItems()` - Gets contractor's open tasks

#### **followUpService.js**
**Purpose:** Schedules and manages proactive follow-ups

**Key Functions:**
- `scheduleFollowUp()` - Creates scheduled follow-up
- `getPendingFollowUps()` - Gets follow-ups due now
- `markFollowUpSent()` - Marks as sent after delivery

#### **Bull Worker (Background Process)**
**Purpose:** Executes scheduled follow-ups automatically

**How it works:**
1. Runs as separate process (started by dev-manager.js)
2. Checks `contractor_followup_schedules` table every 5 minutes
3. Finds follow-ups where `scheduled_time <= NOW()` and `status = 'scheduled'`
4. For each pending follow-up:
   - Loads contractor details
   - Generates personalized message using AI
   - Sends via n8n → GHL → SMS
   - Marks as sent in database
5. Concurrent workers: 5
6. Rate limit: 10 jobs/minute
7. Retry strategy: 3 attempts with exponential backoff

**Configuration:**
```javascript
// In server.js or dev-manager.js
const followUpQueue = new Queue('contractor-followups', {
  redis: { host: 'localhost', port: 6379 }
});

followUpQueue.process(5, async (job) => {
  // Execute follow-up
});
```

### SMS Integration (Event Orchestrator)

```
Contractor → GHL (receives SMS)
              ↓
           n8n Router Webhook
              ↓
        Backend /api/sms/inbound
              ↓
        AI Router (classifies intent)
              ↓
        Message Handler Registry
              ↓
        Appropriate Handler:
        - speakerHandlers.js
        - sponsorHandlers.js
        - pcrHandlers.js
        - messageHandlerRegistry.js (general_question → AI Concierge)
              ↓
        AI Concierge (with event context)
              ↓
        Response generated
              ↓
        Backend → n8n Webhook
              ↓
        GHL sends SMS
              ↓
        Contractor receives response
```

**Key Point:** Event context is passed through ALL handlers so AI always knows contractor is at an event.

---

## Part 5: Testing & Usage

### Admin Testing Interface

Admins can test the AI Concierge as any contractor:

**Endpoint:** `POST /api/ai-concierge/admin-test-message`

```javascript
{
  "contractorId": 42,
  "message": "What sessions should I attend?",
  "eventContext": {
    "id": 41,
    "name": "Business Growth Expo"
  }
}
```

**Response:**
```javascript
{
  "success": true,
  "response": "Based on your focus on controlling lead flow...",
  "metadata": {
    "model": "gpt-4-turbo",
    "tokens": 342,
    "latency_ms": 1240,
    "function_calls": ["capture_event_note"]
  }
}
```

### Testing Event Orchestrator Locally

#### **1. Setup Local Event**
```sql
-- Create test event
INSERT INTO events (name, date, end_date, location, status)
VALUES ('Test Event 2025', '2025-10-15', '2025-10-15', 'Test Venue', 'active');

-- Create test speakers
INSERT INTO event_speakers (event_id, name, title, company, session_title, session_time, focus_areas)
VALUES
  (41, 'Test Speaker 1', 'CEO', 'Test Company', 'Test Session', '2025-10-15 09:00:00', '["controlling_lead_flow"]'),
  (41, 'Test Speaker 2', 'VP', 'Another Co', 'Another Session', '2025-10-15 11:00:00', '["sales_training"]');

-- Check in test contractor
INSERT INTO event_attendees (event_id, contractor_id, check_in_time, check_in_method)
VALUES (41, 1, NOW(), 'manual');
```

#### **2. Force Refresh AI Schema**
```bash
curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh
```

#### **3. Test Note Capture**
```bash
curl -X POST http://localhost:5000/api/ai-concierge/admin-test-message \
-H "Content-Type: application/json" \
-d '{
  "contractorId": 1,
  "message": "Met John Smith from Acme Corp, great insights. His number is 555-1234",
  "eventContext": {"id": 41}
}'
```

**Expected:** AI should call `capture_event_note()` function and save to database.

#### **4. Verify Database Write**
```sql
SELECT * FROM event_notes WHERE contractor_id = 1 ORDER BY created_at DESC LIMIT 1;
```

**Expected:** New note with extracted entities JSON containing "John Smith", "Acme Corp", "555-1234"

#### **5. Test Priority Extraction**
```bash
curl -X POST http://localhost:5000/api/ai-concierge/admin-test-message \
-H "Content-Type: application/json" \
-d '{
  "contractorId": 1,
  "message": "My top 3 priorities are: 1. Follow up with John, 2. Demo with Acme, 3. Implement CRM",
  "eventContext": {"id": 41, "eventStatus": "post_event"}
}'
```

**Expected:** AI should call `create_action_item()` 3 times, one for each priority.

#### **6. Verify Action Items Created**
```sql
SELECT * FROM contractor_action_items WHERE contractor_id = 1 ORDER BY contractor_priority;
```

**Expected:** 3 action items with `contractor_priority` = 1, 2, 3

#### **7. Test Follow-Up Scheduling**

Follow-ups should be scheduled automatically when action items are created. Check:

```sql
SELECT * FROM contractor_followup_schedules WHERE contractor_id = 1 AND status = 'scheduled';
```

**Expected:** Scheduled follow-ups with `scheduled_time` in the future.

#### **8. Test Proactive Follow-Up (Manual Trigger)**

```bash
curl -X POST http://localhost:5000/api/event-messaging/trigger-followups
```

**Expected:** Bull worker processes pending follow-ups and sends SMS.

### Troubleshooting Common Issues

#### **Issue: AI hallucinating speakers (mentions names not in database)**

**Cause:** Event schedule section not appearing in AI prompt.

**Check:**
1. Does `event.speakers` or `event.fullSchedule` exist?
   ```javascript
   console.log('Event speakers:', event.speakers?.length);
   console.log('Event fullSchedule:', event.fullSchedule?.length);
   ```

2. Is event context being passed to openAIService?
   ```javascript
   // In aiConciergeController.js around line 656
   console.log('Event context passed to AI:', eventContext?.name);
   ```

3. Is the prompt section being built?
   ```javascript
   // In openAIService.js around line 907
   console.log('Checking for currentEvent in knowledgeBase:', !!knowledgeBase.currentEvent);
   ```

**Fix:** Ensure event context flows: handler → controller → openAIService with both `speakers` AND `fullSchedule` fields.

#### **Issue: Function calling not working (notes not saving)**

**Cause:** GPT-4 not receiving function definitions or function call execution failing.

**Check:**
1. Are tools defined in OpenAI API call?
   ```javascript
   // In openAIService.js around line 509
   console.log('Tools passed to OpenAI:', tools.length);
   ```

2. Is GPT-4 calling the function?
   ```javascript
   // In openAIService.js around line 683
   console.log('Function calls:', responseMessage.tool_calls);
   ```

3. Is function execution succeeding?
   ```javascript
   // In openAIService.js around line 692
   console.log('[AI Concierge] Function call:', functionName, functionArgs);
   ```

**Fix:** Check function call handler switch statement for errors, verify database services are accessible.

#### **Issue: Follow-ups not sending**

**Cause:** Bull worker not running or Redis connection failed.

**Check:**
1. Is Redis running?
   ```bash
   redis-cli ping
   # Expected: PONG
   ```

2. Is Bull worker running?
   ```bash
   node dev-manager.js status
   # Should show: Bull Worker: Running
   ```

3. Are follow-ups in the queue?
   ```sql
   SELECT * FROM contractor_followup_schedules
   WHERE status = 'scheduled' AND scheduled_time <= NOW();
   ```

**Fix:**
- Start Redis: `redis-server`
- Restart Bull worker: `node dev-manager.js restart all`
- Check worker logs for errors

#### **Issue: Schema changes not appearing in AI**

**Cause:** Cached schema not refreshed.

**Fix:**
```bash
# Development (5-minute cache):
curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh

# Production (24-hour cache):
curl -X POST https://tpx.power100.io/api/ai-concierge/schema/refresh
```

#### **Issue: AI recommending wrong number of speakers**

**Cause:** No explicit instruction in prompt to limit recommendations.

**Fix:** Add to system prompt in openAIService.js:
```javascript
When recommending sessions/speakers, recommend ONLY the top 3 most relevant, not all sessions.
```

---

## Part 6: Adding New Capabilities

### Adding a New AI-Processed Field

**Rule:** Any field starting with `ai_` is automatically discovered and included in the AI Concierge knowledge base.

**Steps:**

#### **1. Add Column to Database**
```sql
-- Example: Add AI-generated recommendations to partners
ALTER TABLE strategic_partners
ADD COLUMN ai_recommended_for TEXT;

-- Populate with AI analysis
UPDATE strategic_partners
SET ai_recommended_for = 'Contractors with $2-5M revenue focused on sales growth'
WHERE id = 3;
```

#### **2. Force Schema Refresh** (Development)
```bash
curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh
```

#### **3. Verify Field Appears**
```bash
curl http://localhost:5000/api/ai-concierge/schema/summary | grep ai_recommended_for
```

**Expected:** Field should appear in schema summary.

#### **4. Test in AI Concierge**
```bash
curl -X POST http://localhost:5000/api/ai-concierge/admin-test-message \
-H "Content-Type: application/json" \
-d '{
  "contractorId": 1,
  "message": "Tell me about FieldForce"
}'
```

**Expected:** AI should mention the `ai_recommended_for` value in its response.

**That's it!** No code changes needed. The AI automatically:
- Discovers the new field
- Includes it in the knowledge base
- Formats it properly in responses

### Adding a New Function (Database Write Capability)

To give the AI a new action it can perform (like "send email" or "book demo"):

#### **1. Create Service Function**

```javascript
// tpe-backend/src/services/demoBookingService.js
async function bookDemoWithPartner({
  contractorId,
  partnerId,
  preferredDate,
  preferredTime,
  notes
}) {
  // Insert into demo_bookings table
  const result = await query(`
    INSERT INTO demo_bookings (
      contractor_id, partner_id, requested_date, requested_time,
      booking_status, notes, created_at
    ) VALUES ($1, $2, $3, $4, 'pending', $5, NOW())
    RETURNING *
  `, [contractorId, partnerId, preferredDate, preferredTime, notes]);

  return result.rows[0];
}

module.exports = { bookDemoWithPartner };
```

#### **2. Add Function Definition to OpenAI Call**

In `openAIService.js` around line 509, add to `tools` array:

```javascript
{
  type: "function",
  function: {
    name: "book_demo_with_partner",
    description: "Book a demo for contractor with a strategic partner",
    parameters: {
      type: "object",
      properties: {
        partner_name: {
          type: "string",
          description: "Name of the partner (e.g., 'FieldForce')"
        },
        preferred_date: {
          type: "string",
          format: "date",
          description: "Preferred demo date (YYYY-MM-DD)"
        },
        preferred_time: {
          type: "string",
          description: "Preferred time (e.g., '2:00 PM')"
        },
        notes: {
          type: "string",
          description: "Any notes or specific topics to discuss"
        }
      },
      required: ["partner_name", "preferred_date"]
    }
  }
}
```

#### **3. Add Function Handler**

In `openAIService.js` around line 694, add to `switch` statement:

```javascript
case 'book_demo_with_partner':
  // Look up partner ID from name
  const partnerResult = await query(`
    SELECT id FROM strategic_partners WHERE company_name ILIKE $1
  `, [functionArgs.partner_name]);

  if (partnerResult.rows.length === 0) {
    console.error('[AI Concierge] Partner not found:', functionArgs.partner_name);
    break;
  }

  const partnerId = partnerResult.rows[0].id;

  const demoBookingService = require('./demoBookingService');
  await demoBookingService.bookDemoWithPartner({
    contractorId,
    partnerId,
    preferredDate: functionArgs.preferred_date,
    preferredTime: functionArgs.preferred_time,
    notes: functionArgs.notes
  });

  console.log('[AI Concierge] ✅ Demo booked with', functionArgs.partner_name);
  break;
```

#### **4. Test New Function**

```bash
curl -X POST http://localhost:5000/api/ai-concierge/admin-test-message \
-H "Content-Type: application/json" \
-d '{
  "contractorId": 1,
  "message": "Book a demo with FieldForce for next Tuesday at 2pm"
}'
```

**Expected:**
- AI calls `book_demo_with_partner()` function
- New record created in `demo_bookings` table
- AI responds: "Great! I've booked a demo with FieldForce for Tuesday at 2pm. They'll reach out to confirm."

### Customizing Event Orchestrator Behavior

To change how the AI behaves during events:

#### **Edit System Prompt** (`openAIService.js` lines 920-966)

**Example: Add "Booth Visit Tracking"**

```javascript
3️⃣ BOOTH VISIT TRACKING:
When contractor mentions visiting a sponsor booth, ask:
• "How was your conversation?"
• "Did they address your needs?"
• "On a scale of 1-10, how helpful were they?"

Then call capture_event_note() with:
- note_type: "sponsor_note"
- extracted_companies: [sponsor name]
- ai_priority_score: (rating / 10)
```

**Example: Change Priority Question Wording**

```javascript
// FROM:
"What are the TOP 3 PRIORITIES you want to make sure we tackle from everything you experienced?"

// TO:
"What are the 3 most valuable takeaways you want to act on?"
```

**Example: Adjust Follow-Up Timing**

Default is whatever the AI suggests. To force specific timing:

```javascript
4️⃣ FOLLOW-UP SCHEDULING:
When creating action items, ALWAYS schedule follow-ups:
- Contact-related: 3 days
- Demo prep: 1 day before demo
- Implementation: 7 days
- General: 5 days
```

### Adding a New Event Message Type

To add a new automated message (like "Lunch Break Recommendation"):

#### **1. Add Message Handler**

```javascript
// tpe-backend/src/services/eventOrchestrator/lunchHandlers.js
async function sendLunchRecommendation(attendeeData) {
  const { contractor, eventContext } = attendeeData;

  // Get sponsor recommendations
  const sponsors = await getRelevantSponsors(contractor, eventContext.id);

  const message = `
Lunch break! Here are 3 booths to visit:

${sponsors.slice(0, 3).map((s, i) => `
${i + 1}. ${s.name} (Booth ${s.booth_number})
   ${s.recommendation_reason}
`).join('\n')}

Enjoy your meal! 🍽️
  `.trim();

  return { success: true, message, message_type: 'lunch_recommendation' };
}

module.exports = { sendLunchRecommendation };
```

#### **2. Register in Message Handler Registry**

```javascript
// tpe-backend/src/services/eventOrchestrator/messageHandlerRegistry.js

// Add to handler map
const handlers = {
  // ... existing handlers
  lunch_recommendation: async (smsData) => {
    const lunchHandlers = require('./lunchHandlers');
    return await lunchHandlers.sendLunchRecommendation(smsData);
  }
};
```

#### **3. Schedule the Message**

```javascript
// In your event scheduling service
async function scheduleLunchMessages(eventId) {
  const attendees = await getEventAttendees(eventId);
  const lunchTime = '12:00:00'; // Noon

  for (const attendee of attendees) {
    await query(`
      INSERT INTO event_messages (
        event_id, contractor_id, message_type,
        scheduled_time, status, created_at
      ) VALUES ($1, $2, 'lunch_recommendation', $3, 'scheduled', NOW())
    `, [eventId, attendee.contractor_id, lunchTime]);
  }
}
```

#### **4. Test**

```bash
# Trigger the scheduled message manually
curl -X POST http://localhost:5000/api/event-messaging/send-scheduled \
-H "Content-Type: application/json" \
-d '{
  "eventId": 41,
  "messageType": "lunch_recommendation"
}'
```

---

## 🎯 Quick Reference

### Essential Commands

```bash
# Refresh AI schema (force cache clear)
curl -X POST http://localhost:5000/api/ai-concierge/schema/refresh

# Check what AI can see
curl http://localhost:5000/api/ai-concierge/schema/summary | jq

# Test as admin
curl -X POST http://localhost:5000/api/ai-concierge/admin-test-message \
-H "Content-Type: application/json" \
-d '{"contractorId": 1, "message": "test"}'

# Manually trigger follow-ups
curl -X POST http://localhost:5000/api/event-messaging/trigger-followups

# Check Bull queue status
redis-cli
> KEYS *followup*
> GET bull:contractor-followups:1

# Restart servers with AI protection
npm run safe
```

### Key Files to Know

| File | Purpose |
|------|---------|
| `aiConciergeController.js` | Main entry point for AI requests |
| `aiKnowledgeService.js` | Loads and caches knowledge base |
| `openAIService.js` | GPT-4 integration, function calling |
| `dynamicPromptBuilder.js` | Formats data for AI consumption |
| `eventNoteService.js` | Captures notes during events |
| `actionItemService.js` | Manages action items |
| `followUpService.js` | Schedules proactive follow-ups |
| `messageHandlerRegistry.js` | Routes SMS to appropriate handlers |

### Environment Variables

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Redis (for Bull queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# Feature flags
ENABLE_FOLLOWUP_SCHEDULER=true  # Enable proactive follow-ups
ENABLE_FUNCTION_CALLING=true     # Enable database writes

# Cache timing
AI_CACHE_ACTIVE_EVENT_SECONDS=30    # Production: 30 seconds
AI_CACHE_PAST_EVENT_HOURS=24        # Production: 24 hours
```

---

## 📖 Additional Resources

- **AI-FIRST-STRATEGY.md** - Complete AI vision and roadmap
- **AI-CONCIERGE-ARCHITECTURE.md** - Original technical architecture
- **AI-CONCIERGE-EVENT-ORCHESTRATOR-ENHANCEMENTS.md** - Detailed implementation specs
- **EVENT-SMS-ARCHITECTURE.md** - SMS routing and GHL integration
- **AI-CONCIERGE-TESTING-GUIDE.md** - Comprehensive testing scenarios
- **AI-FIELD-NAMING-CONVENTIONS.md** - How to add AI-discoverable fields

---

**Last Updated:** October 11, 2025
**Version:** 1.0
**Status:** Production - AI Concierge + Event Orchestrator fully operational
