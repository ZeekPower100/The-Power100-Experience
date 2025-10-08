# AI Concierge Event Orchestrator Enhancements

## Overview
This document outlines the 3 critical enhancements needed to enable the AI Concierge to fully deliver Greg's vision for interactive event orchestration, note-taking, priority management, and proactive follow-ups.

**Current State:** AI Concierge has excellent conversational intelligence and comprehensive knowledge base, but is READ-ONLY and REACTIVE-ONLY.

**Target State:** AI Concierge can capture notes, create action items, schedule follow-ups, and proactively check in on contractor progress.

---

## Enhancement #1: Event Orchestration System Prompt Update

### **Goal**
Update the AI Concierge system prompt to include event orchestration instructions, note-taking behavior, priority extraction, and follow-up guidance.

### **Current Behavior**
- AI responds to general business questions
- AI recommends partners, books, podcasts
- AI maintains conversation context
- **AI does NOT** ask event-specific questions
- **AI does NOT** recognize notes being shared
- **AI does NOT** extract priorities from conversations

### **Target Behavior**
- AI detects when contractor is at an event (from event context data)
- AI recognizes when contractor is sharing a note vs asking a question
- AI asks clarifying questions: "What session are you in?"
- AI extracts entities from notes (names, phones, emails, companies)
- AI asks post-event: "What are your top 3 priorities?"
- AI offers to help with action items: "Want me to draft an intro email?"
- AI references event context naturally in conversations

### **Implementation Details**

**File to modify:** `tpe-backend/src/services/openAIService.js`

**Section to update:** `generateResponse()` function, system prompt (line 639)

**New prompt sections to add:**

```javascript
// SECTION 1: EVENT DETECTION
CURRENT EVENT CONTEXT:
${contractor is at event ? `
🎪 CONTRACTOR IS CURRENTLY AT: ${event.name}
- Event Date: ${event.date}
- Location: ${event.location}
- Current Time: ${currentTime}
- Event Status: ${eventStatus} (pre-event, during-event, post-event)

YOUR EVENT ORCHESTRATOR ROLE:
During events, you shift into "Event Orchestrator" mode with these responsibilities:
` : 'Contractor is not currently at an event.'}

// SECTION 2: NOTE-TAKING INSTRUCTIONS
1. NOTE-TAKING DURING EVENTS:
When contractor shares information during event, treat it as a note to capture:

DETECT NOTES by looking for:
- Names mentioned: "Met John Smith"
- Contact info shared: "555-1234" or "john@example.com"
- Insights recorded: "Great point about AI automation"
- Action items stated: "Need to follow up on this"
- Session references: "In the marketing session right now"

ASK CLARIFYING QUESTIONS:
- "What session are you in right now?"
- "Is this about a speaker, sponsor, or peer you met?"
- "Should I mark this as something to follow up on?"

EXTRACT ENTITIES automatically:
- Names (people, companies)
- Phone numbers
- Email addresses
- Key topics/insights
- Action items

RESPOND NATURALLY:
✅ "Got it! I'll make note of that. Are you in the [speaker name] session right now?"
✅ "Perfect, I'll remember John Smith's info. What specifically interested you about his insights?"
✅ "Noted! I'll remind you to follow up with them after the event."
❌ Don't say: "I will store this in the database" (too technical)

// SECTION 3: SESSION CONTEXT AWARENESS
2. SESSION AWARENESS:
Know the event schedule and current time to provide context:

${eventSchedule ? `
CURRENT/UPCOMING SESSIONS:
${formatEventSchedule(eventSchedule)}

- Reference sessions naturally: "Based on the AI automation session you're in..."
- Suggest relevant upcoming sessions: "The marketing session at 3pm might interest you based on your focus areas"
- Connect notes to sessions: "From the [speaker] session, you noted..."
` : ''}

// SECTION 4: POST-EVENT PRIORITY EXTRACTION
3. POST-EVENT PRIORITY EXTRACTION:
After event ends (status: post-event), initiate priority conversation:

YOUR OPENING MESSAGE (after event):
"Hey [Name]! Hope you had an amazing time at [Event Name]! 🎉

I have a complete summary of everything - your sessions, sponsor visits, and connections made.

Before I share the full wrap-up, what are the TOP 3 PRIORITIES you want to make sure we tackle from everything you experienced?"

LISTEN FOR PRIORITIES:
- Extract action items from their response
- Assign contractor_priority (1, 2, 3) based on their ranking
- Ask follow-up questions for clarity
- Suggest additional priorities based on event data

EXAMPLE EXTRACTION:
Contractor: "1. Follow up with John Smith, 2. Demo with Acme Corp, 3. Implement AI tools"

YOUR RESPONSE:
"Perfect! I'll create a follow-up plan for all three:
1️⃣ Follow up with John Smith - When should I check in to see if you've connected?
2️⃣ Acme Corp demo - I see it's scheduled for Oct 16. Want help preparing questions?
3️⃣ AI tools implementation - Which tools from the event interested you most?

I'll check in proactively on each of these. Sound good?"

// SECTION 5: FOLLOW-UP SCHEDULING
4. PROACTIVE FOLLOW-UP BEHAVIOR:
When creating action items, suggest natural check-in times:

FOR CONTACT FOLLOW-UPS: "I'll check in 3 days from now to see if you've reached out"
FOR DEMO PREP: "I'll remind you the day before your demo"
FOR IMPLEMENTATION: "I'll check in weekly to see how it's going"

NATURAL CHECK-IN LANGUAGE:
✅ "Hey! Just checking in - have you had a chance to connect with John Smith yet?"
✅ "Your demo with Acme is tomorrow at 2pm. Need help preparing questions?"
✅ "How did the call with John go? Anything interesting come up?"

// SECTION 6: EMAIL INTRODUCTION ASSISTANCE
5. EMAIL INTRODUCTION FACILITATION:
Offer to help with email introductions to peers/partners met at event:

DETECT OPPORTUNITY:
- Contractor mentions wanting to follow up
- Action item created for "contact_peer" or "email_intro"

OFFER ASSISTANCE:
"Want me to draft an introduction email for you? I can include context from when you met at [Event]."

IF YES:
"Here's a draft you can use:

Subject: Great connecting at [Event Name]

Hi [Name],

It was great meeting you at [Event] - really enjoyed our conversation about [topic from notes].

[Specific reference from their conversation/notes]

Would love to continue the discussion. Are you available for a quick call next week?

Best,
[Contractor Name]

Feel free to copy this or I can adjust it however you like!"

// SECTION 7: NON-EVENT PARTNER RECOMMENDATIONS
6. POST-EVENT PARTNER RECOMMENDATIONS:
After contractor completes their event priorities, recommend partners NOT at the event:

TIMING: 2-3 weeks post-event, after top priorities addressed

EXAMPLE:
"Hey! I saw your focus area was [focus_area]. There was [Partner A] and [Partner B] at the event, but I also want to mention [Partner C] - they specialize in exactly what you're looking for and have a 9.2 PowerConfidence score.

They weren't at [Event] but they're incredible. Want to learn more?"

// SECTION 8: CONTINUOUS ENGAGEMENT
7. MAINTAIN EVENT CONTEXT IN ONGOING CONVERSATIONS:
Continue referencing event learnings in future conversations:

NATURAL REFERENCES:
✅ "Based on what you learned at [Event] about [topic]..."
✅ "Remember when you met [Person] at [Event] and they mentioned [insight]?"
✅ "Following up on that [topic] session you attended..."

BUILD ON EVENT MOMENTUM:
- Use event insights to guide future recommendations
- Reference speakers/sessions when making suggestions
- Connect event learnings to current challenges
```

### **Testing Criteria**
Before marking this enhancement complete, AI must demonstrate:

1. ✅ Detect when contractor shares a note vs asks a question
2. ✅ Ask "What session are you in?" when note context is unclear
3. ✅ Naturally extract names, phones, emails from conversation
4. ✅ After event, ask "What are your top 3 priorities?"
5. ✅ Offer to help with email introductions
6. ✅ Suggest check-in times when discussing action items
7. ✅ Reference event context in ongoing conversations

### **Files Modified**
- `tpe-backend/src/services/openAIService.js` - Update system prompt in `generateResponse()`

### **Estimated Time**
- **Development:** 2 hours
- **Testing:** 2 hours
- **Total:** 4 hours

---

## Enhancement #2: Function Calling for Database Writes

### **Goal**
Enable AI Concierge to write to database tables (`event_notes`, `contractor_action_items`, `contractor_followup_schedules`) through GPT-4 function calling.

### **Current Behavior**
- AI can READ all database tables via `aiKnowledgeService.js`
- AI can SEE event notes, action items, follow-up schedules
- **AI CANNOT** create new notes
- **AI CANNOT** create action items
- **AI CANNOT** schedule follow-ups

### **Target Behavior**
- AI detects when it should capture a note → calls `capture_event_note()` function
- AI detects when contractor states a priority → calls `create_action_item()` function
- AI detects when to schedule follow-up → calls `schedule_followup()` function
- Database is automatically updated without additional API calls
- AI responds naturally: "Got it, I'll make note of that" (note already captured)

### **Implementation Details**

#### **STEP 1: Create Service Layer for Writes**

**New file:** `tpe-backend/src/services/eventNoteService.js`
```javascript
// DATABASE-CHECKED: event_notes (20 columns) verified on 2025-10-07
const { query } = require('../config/database');
const { safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Capture a note from contractor during event
 */
async function captureEventNote({
  eventId,
  contractorId,
  noteText,
  extractedEntities = {},
  sessionContext = null,
  speakerId = null,
  sponsorId = null,
  noteType = 'general',
  aiTags = [],
  aiPriorityScore = 0.5,
  requiresFollowup = false
}) {
  const result = await query(`
    INSERT INTO event_notes (
      event_id, contractor_id, note_text, extracted_entities,
      session_context, speaker_id, sponsor_id, note_type,
      ai_tags, ai_priority_score, requires_followup,
      captured_at, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), NOW())
    RETURNING *
  `, [
    eventId, contractorId, noteText,
    safeJsonStringify(extractedEntities),
    sessionContext, speakerId, sponsorId, noteType,
    safeJsonStringify(aiTags), aiPriorityScore, requiresFollowup
  ]);

  return result.rows[0];
}

/**
 * Get all notes for contractor at event
 */
async function getEventNotes(eventId, contractorId) {
  const result = await query(`
    SELECT * FROM event_notes
    WHERE event_id = $1 AND contractor_id = $2
    ORDER BY captured_at DESC
  `, [eventId, contractorId]);

  return result.rows;
}

module.exports = {
  captureEventNote,
  getEventNotes
};
```

**New file:** `tpe-backend/src/services/actionItemService.js`
```javascript
// DATABASE-CHECKED: contractor_action_items (27 columns) verified on 2025-10-07
const { query } = require('../config/database');
const { safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Create action item from AI conversation
 */
async function createActionItem({
  contractorId,
  eventId = null,
  title,
  description = null,
  actionType,
  priority = 5,
  contractorPriority = null,
  aiSuggestedPriority = null,
  dueDate = null,
  relatedPartnerId = null,
  relatedPeerContractorId = null,
  relatedNoteId = null,
  relatedDemoBookingId = null,
  aiReasoning = null,
  sourceMessageId = null,
  conversationContext = {}
}) {
  const result = await query(`
    INSERT INTO contractor_action_items (
      contractor_id, event_id, title, description, action_type,
      priority, contractor_priority, ai_suggested_priority, due_date,
      related_partner_id, related_peer_contractor_id, related_note_id,
      related_demo_booking_id, ai_generated, ai_reasoning,
      source_message_id, conversation_context, status,
      created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
      true, $14, $15, $16, 'pending', NOW(), NOW()
    )
    RETURNING *
  `, [
    contractorId, eventId, title, description, actionType,
    priority, contractorPriority, aiSuggestedPriority, dueDate,
    relatedPartnerId, relatedPeerContractorId, relatedNoteId,
    relatedDemoBookingId, aiReasoning, sourceMessageId,
    safeJsonStringify(conversationContext)
  ]);

  return result.rows[0];
}

/**
 * Update action item status
 */
async function updateActionItemStatus(actionItemId, contractorId, status, updateNote = null) {
  // Log the update in action_item_updates
  await query(`
    INSERT INTO action_item_updates (
      action_item_id, contractor_id, update_type,
      old_value, new_value, update_note,
      updated_by, update_source, created_at
    )
    SELECT $1, $2, 'status_change', status, $3, $4, 'ai_concierge', 'conversation', NOW()
    FROM contractor_action_items WHERE id = $1
  `, [actionItemId, contractorId, status, updateNote]);

  // Update the action item
  const result = await query(`
    UPDATE contractor_action_items
    SET status = $1,
        completed_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
    WHERE id = $2 AND contractor_id = $3
    RETURNING *
  `, [status, actionItemId, contractorId]);

  return result.rows[0];
}

/**
 * Get pending action items for contractor
 */
async function getPendingActionItems(contractorId, limit = 10) {
  const result = await query(`
    SELECT * FROM contractor_action_items
    WHERE contractor_id = $1 AND status = 'pending'
    ORDER BY priority ASC, due_date ASC NULLS LAST
    LIMIT $2
  `, [contractorId, limit]);

  return result.rows;
}

module.exports = {
  createActionItem,
  updateActionItemStatus,
  getPendingActionItems
};
```

**New file:** `tpe-backend/src/services/followUpService.js`
```javascript
// DATABASE-CHECKED: contractor_followup_schedules (19 columns) verified on 2025-10-07
const { query } = require('../config/database');
const { safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Schedule a follow-up for action item
 */
async function scheduleFollowUp({
  contractorId,
  actionItemId = null,
  eventId = null,
  scheduledTime,
  followupType,
  messageTemplate = null,
  messageTone = 'friendly',
  aiContextHints = {},
  skipIfCompleted = true,
  isRecurring = false,
  recurrenceIntervalDays = null
}) {
  const result = await query(`
    INSERT INTO contractor_followup_schedules (
      contractor_id, action_item_id, event_id, scheduled_time,
      followup_type, message_template, message_tone,
      ai_context_hints, skip_if_completed, is_recurring,
      recurrence_interval_days, status, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'scheduled', NOW(), NOW()
    )
    RETURNING *
  `, [
    contractorId, actionItemId, eventId, scheduledTime,
    followupType, messageTemplate, messageTone,
    safeJsonStringify(aiContextHints), skipIfCompleted,
    isRecurring, recurrenceIntervalDays
  ]);

  return result.rows[0];
}

/**
 * Get upcoming follow-ups to send
 */
async function getPendingFollowUps(limit = 20) {
  const result = await query(`
    SELECT
      fs.*,
      c.name as contractor_name,
      c.phone,
      ai.title as action_item_title,
      ai.status as action_item_status
    FROM contractor_followup_schedules fs
    JOIN contractors c ON fs.contractor_id = c.id
    LEFT JOIN contractor_action_items ai ON fs.action_item_id = ai.id
    WHERE fs.status = 'scheduled'
      AND fs.scheduled_time <= NOW()
      AND (
        fs.skip_if_completed = false
        OR ai.status IS NULL
        OR ai.status != 'completed'
      )
    ORDER BY fs.scheduled_time ASC
    LIMIT $1
  `, [limit]);

  return result.rows;
}

/**
 * Mark follow-up as sent
 */
async function markFollowUpSent(followUpId, responseText = null) {
  const result = await query(`
    UPDATE contractor_followup_schedules
    SET status = 'sent',
        sent_at = NOW(),
        response_text = $2,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `, [followUpId, responseText]);

  return result.rows[0];
}

module.exports = {
  scheduleFollowUp,
  getPendingFollowUps,
  markFollowUpSent
};
```

#### **STEP 2: Add Function Calling to OpenAI Service**

**File to modify:** `tpe-backend/src/services/openAIService.js`

**Update `generateResponse()` function:**

```javascript
// Add at top of file
const eventNoteService = require('./eventNoteService');
const actionItemService = require('./actionItemService');
const followUpService = require('./followUpService');

// In generateResponse() function, update OpenAI call:
const completion = await this.client.chat.completions.create({
  model: 'gpt-4-turbo',
  messages: messages,
  temperature: 0.7,
  max_tokens: 800,
  tools: [
    {
      type: "function",
      function: {
        name: "capture_event_note",
        description: "Capture a note from contractor during an event with entity extraction",
        parameters: {
          type: "object",
          properties: {
            note_text: {
              type: "string",
              description: "The full note text from contractor"
            },
            extracted_names: {
              type: "array",
              items: { type: "string" },
              description: "Names of people mentioned"
            },
            extracted_phones: {
              type: "array",
              items: { type: "string" },
              description: "Phone numbers mentioned"
            },
            extracted_emails: {
              type: "array",
              items: { type: "string" },
              description: "Email addresses mentioned"
            },
            extracted_companies: {
              type: "array",
              items: { type: "string" },
              description: "Company names mentioned"
            },
            session_context: {
              type: "string",
              description: "Which session/speaker this note relates to"
            },
            note_type: {
              type: "string",
              enum: ["general", "contact", "insight", "action_item", "speaker_note", "sponsor_note"],
              description: "Type of note"
            },
            ai_priority_score: {
              type: "number",
              minimum: 0,
              maximum: 1,
              description: "How important is this note (0.0-1.0)"
            },
            requires_followup: {
              type: "boolean",
              description: "Does this note require follow-up action?"
            }
          },
          required: ["note_text"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "create_action_item",
        description: "Create a follow-up action item for the contractor",
        parameters: {
          type: "object",
          properties: {
            title: {
              type: "string",
              description: "Brief title of the action item"
            },
            description: {
              type: "string",
              description: "Detailed description of what needs to be done"
            },
            action_type: {
              type: "string",
              enum: ["follow_up", "demo_prep", "email_intro", "implement_tool", "contact_peer", "research_partner", "schedule_meeting", "review_content", "other"],
              description: "Type of action"
            },
            priority: {
              type: "integer",
              minimum: 1,
              maximum: 10,
              description: "Priority level (1=highest, 10=lowest)"
            },
            contractor_priority: {
              type: "integer",
              minimum: 1,
              maximum: 10,
              description: "Contractor's stated priority (from 'top 3' question)"
            },
            due_date: {
              type: "string",
              format: "date",
              description: "When this should be completed (YYYY-MM-DD)"
            },
            ai_reasoning: {
              type: "string",
              description: "Why you're creating this action item"
            }
          },
          required: ["title", "action_type"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "schedule_followup",
        description: "Schedule a proactive check-in with contractor about an action item",
        parameters: {
          type: "object",
          properties: {
            action_item_id: {
              type: "integer",
              description: "ID of the action item to follow up on"
            },
            days_from_now: {
              type: "integer",
              description: "How many days from now to check in"
            },
            followup_type: {
              type: "string",
              enum: ["check_in", "reminder", "status_update", "offer_help", "completion_confirmation"],
              description: "Type of follow-up"
            },
            message_template: {
              type: "string",
              description: "Template for the follow-up message"
            },
            context_hints: {
              type: "object",
              description: "JSON object with hints for personalizing the message",
              properties: {
                mention_event: { type: "string" },
                reference_person: { type: "string" },
                reference_topic: { type: "string" }
              }
            }
          },
          required: ["days_from_now", "followup_type"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_action_item_status",
        description: "Update the status of an action item when contractor confirms completion or progress",
        parameters: {
          type: "object",
          properties: {
            action_item_id: {
              type: "integer",
              description: "ID of the action item to update"
            },
            new_status: {
              type: "string",
              enum: ["pending", "in_progress", "completed", "cancelled", "deferred"],
              description: "New status for the action item"
            },
            update_note: {
              type: "string",
              description: "Note about the update (what contractor said)"
            }
          },
          required: ["action_item_id", "new_status"]
        }
      }
    }
  ],
  tool_choice: "auto"
});

// Handle function calls
const responseMessage = completion.choices[0].message;

if (responseMessage.tool_calls) {
  // Process each function call
  for (const toolCall of responseMessage.tool_calls) {
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);

    console.log('[AI Concierge] Function call:', functionName, functionArgs);

    try {
      switch (functionName) {
        case 'capture_event_note':
          // Get event context from contractor
          const eventContext = await getActiveEventForContractor(contractorId);

          await eventNoteService.captureEventNote({
            eventId: eventContext.event_id,
            contractorId,
            noteText: functionArgs.note_text,
            extractedEntities: {
              names: functionArgs.extracted_names || [],
              phone_numbers: functionArgs.extracted_phones || [],
              emails: functionArgs.extracted_emails || [],
              companies: functionArgs.extracted_companies || []
            },
            sessionContext: functionArgs.session_context,
            noteType: functionArgs.note_type || 'general',
            aiTags: [], // Can extract from note_text if needed
            aiPriorityScore: functionArgs.ai_priority_score || 0.5,
            requiresFollowup: functionArgs.requires_followup || false
          });

          console.log('[AI Concierge] ✅ Event note captured');
          break;

        case 'create_action_item':
          const actionItem = await actionItemService.createActionItem({
            contractorId,
            eventId: eventContext?.event_id,
            title: functionArgs.title,
            description: functionArgs.description,
            actionType: functionArgs.action_type,
            priority: functionArgs.priority || 5,
            contractorPriority: functionArgs.contractor_priority,
            aiSuggestedPriority: functionArgs.priority,
            dueDate: functionArgs.due_date,
            aiReasoning: functionArgs.ai_reasoning
          });

          console.log('[AI Concierge] ✅ Action item created:', actionItem.id);
          break;

        case 'schedule_followup':
          const scheduledTime = new Date();
          scheduledTime.setDate(scheduledTime.getDate() + functionArgs.days_from_now);

          await followUpService.scheduleFollowUp({
            contractorId,
            actionItemId: functionArgs.action_item_id,
            eventId: eventContext?.event_id,
            scheduledTime,
            followupType: functionArgs.followup_type,
            messageTemplate: functionArgs.message_template,
            aiContextHints: functionArgs.context_hints || {}
          });

          console.log('[AI Concierge] ✅ Follow-up scheduled');
          break;

        case 'update_action_item_status':
          await actionItemService.updateActionItemStatus(
            functionArgs.action_item_id,
            contractorId,
            functionArgs.new_status,
            functionArgs.update_note
          );

          console.log('[AI Concierge] ✅ Action item status updated');
          break;
      }
    } catch (error) {
      console.error('[AI Concierge] Function call error:', functionName, error);
    }
  }
}

// Return AI response (it continues naturally after function calls)
return responseMessage.content;
```

#### **STEP 3: Helper Function for Event Context**

```javascript
/**
 * Get active event for contractor (during or recently attended)
 */
async function getActiveEventForContractor(contractorId) {
  const result = await query(`
    SELECT
      ea.event_id,
      e.name as event_name,
      e.date,
      e.end_date,
      ea.check_in_time,
      CASE
        WHEN e.date > CURRENT_DATE THEN 'pre_event'
        WHEN e.date <= CURRENT_DATE AND e.end_date >= CURRENT_DATE THEN 'during_event'
        WHEN e.end_date < CURRENT_DATE AND e.end_date >= CURRENT_DATE - INTERVAL '7 days' THEN 'post_event'
        ELSE 'past_event'
      END as event_status
    FROM event_attendees ea
    JOIN events e ON ea.event_id = e.id
    WHERE ea.contractor_id = $1
      AND e.end_date >= CURRENT_DATE - INTERVAL '7 days'
    ORDER BY e.date DESC
    LIMIT 1
  `, [contractorId]);

  return result.rows[0] || null;
}
```

### **Testing Criteria**
Before marking this enhancement complete, verify:

1. ✅ AI captures note when contractor shares information during event
2. ✅ `event_notes` table populated with extracted entities
3. ✅ AI creates action item when contractor states priority
4. ✅ `contractor_action_items` table populated correctly
5. ✅ AI schedules follow-up when creating action item
6. ✅ `contractor_followup_schedules` table populated
7. ✅ AI updates action item status when contractor confirms completion
8. ✅ `action_item_updates` audit trail created
9. ✅ All database writes succeed without errors
10. ✅ AI responds naturally (doesn't mention database/technical details)

### **Files Created**
- `tpe-backend/src/services/eventNoteService.js` - Note capture service
- `tpe-backend/src/services/actionItemService.js` - Action item management
- `tpe-backend/src/services/followUpService.js` - Follow-up scheduling

### **Files Modified**
- `tpe-backend/src/services/openAIService.js` - Add function calling

### **Estimated Time**
- **Service layer development:** 4 hours
- **Function calling integration:** 3 hours
- **Testing & debugging:** 3 hours
- **Total:** 10 hours

---

## Enhancement #3: Proactive Follow-Up Scheduler

### **Goal**
Build a background service that checks `contractor_followup_schedules` table every 5 minutes and sends proactive check-in messages via AI Concierge.

### **Current Behavior**
- Follow-up schedules can be created in database
- **No automated execution** - they sit in database forever
- AI only responds to INBOUND messages (reactive only)

### **Target Behavior**
- Every 5 minutes, service checks for pending follow-ups
- AI generates personalized message using context hints
- Message sent via n8n webhook (same as other outbound messages)
- Follow-up marked as "sent" in database
- If contractor responds, AI continues conversation naturally
- If action item already completed, follow-up is skipped

### **Implementation Details**

#### **STEP 1: Create Follow-Up Scheduler Service**

**New file:** `tpe-backend/src/services/proactiveFollowUpScheduler.js`

```javascript
/**
 * Proactive Follow-Up Scheduler
 * Checks contractor_followup_schedules table every 5 minutes
 * Sends automated check-ins via AI Concierge
 *
 * Part of Greg's vision: AI proactively checks in on contractor progress
 */

const { query } = require('../config/database');
const followUpService = require('./followUpService');
const openAIService = require('./openAIService');
const axios = require('axios');

/**
 * Main scheduler - runs every 5 minutes
 */
async function checkAndSendPendingFollowUps() {
  console.log('[FollowUpScheduler] Checking for pending follow-ups...');

  try {
    // Get all follow-ups due now
    const pendingFollowUps = await followUpService.getPendingFollowUps(20);

    if (pendingFollowUps.length === 0) {
      console.log('[FollowUpScheduler] No pending follow-ups');
      return;
    }

    console.log(`[FollowUpScheduler] Found ${pendingFollowUps.length} pending follow-ups`);

    // Process each follow-up
    for (const followUp of pendingFollowUps) {
      try {
        await sendFollowUpMessage(followUp);
      } catch (error) {
        console.error(`[FollowUpScheduler] Error sending follow-up ${followUp.id}:`, error);
      }
    }

    console.log('[FollowUpScheduler] Completed follow-up cycle');

  } catch (error) {
    console.error('[FollowUpScheduler] Error in checkAndSendPendingFollowUps:', error);
  }
}

/**
 * Send individual follow-up message
 */
async function sendFollowUpMessage(followUp) {
  console.log(`[FollowUpScheduler] Processing follow-up ${followUp.id} for contractor ${followUp.contractor_id}`);

  // Get contractor details
  const contractorResult = await query(`
    SELECT id, name, company_name, focus_areas, phone
    FROM contractors WHERE id = $1
  `, [followUp.contractor_id]);

  if (contractorResult.rows.length === 0) {
    console.log('[FollowUpScheduler] Contractor not found, skipping');
    return;
  }

  const contractor = contractorResult.rows[0];

  // Build context for AI message generation
  const messageContext = {
    contractor_name: contractor.name,
    action_item_title: followUp.action_item_title,
    followup_type: followUp.followup_type,
    message_template: followUp.message_template,
    context_hints: followUp.ai_context_hints || {}
  };

  // Generate personalized AI message
  let aiMessage;

  if (followUp.message_template) {
    // Use template with AI personalization
    aiMessage = await personalizeFollowUpTemplate(followUp.message_template, messageContext);
  } else {
    // Generate from scratch using AI
    aiMessage = await generateFollowUpMessage(messageContext, contractor);
  }

  console.log(`[FollowUpScheduler] Generated message:`, aiMessage.substring(0, 100) + '...');

  // Send via n8n webhook (same as other outbound messages)
  await sendViaWebhook(contractor.phone, aiMessage, followUp);

  // Mark as sent
  await followUpService.markFollowUpSent(followUp.id);

  // Log to event_messages for context continuity
  await query(`
    INSERT INTO event_messages (
      event_id, contractor_id, message_type, direction,
      scheduled_time, actual_send_time, phone, message_content,
      status, personalization_data, created_at, updated_at
    ) VALUES ($1, $2, 'proactive_followup', 'outbound', $3, NOW(), $4, $5, 'sent', $6, NOW(), NOW())
  `, [
    followUp.event_id,
    followUp.contractor_id,
    followUp.scheduled_time,
    contractor.phone,
    aiMessage,
    JSON.stringify({
      followup_id: followUp.id,
      action_item_id: followUp.action_item_id,
      followup_type: followUp.followup_type
    })
  ]);

  console.log(`[FollowUpScheduler] ✅ Follow-up ${followUp.id} sent successfully`);
}

/**
 * Personalize template with AI
 */
async function personalizeFollowUpTemplate(template, context) {
  // Replace basic placeholders
  let message = template
    .replace(/\{contractor_name\}/g, context.contractor_name.split(' ')[0])
    .replace(/\{action_item\}/g, context.action_item_title);

  // If context hints exist, let AI enhance the message
  if (Object.keys(context.context_hints).length > 0) {
    const prompt = `Personalize this follow-up message with these context hints:

Message template: "${message}"

Context hints:
${JSON.stringify(context.context_hints, null, 2)}

Instructions:
- Keep the message natural and friendly
- Incorporate the context hints naturally
- Keep it under 320 characters for SMS
- Maintain the same tone

Return ONLY the personalized message, no explanation.`;

    const aiResponse = await openAIService.client.chat.completions.create({
      model: 'gpt-4-turbo',
      messages: [
        { role: 'system', content: 'You are personalizing follow-up messages. Return only the message text.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 150
    });

    message = aiResponse.choices[0].message.content.trim();
  }

  return message;
}

/**
 * Generate follow-up message from scratch using AI
 */
async function generateFollowUpMessage(context, contractor) {
  const prompt = `Generate a friendly follow-up message for a contractor.

Contractor: ${contractor.name} (${contractor.company_name})
Action item: ${context.action_item_title}
Follow-up type: ${context.followup_type}

Context hints:
${JSON.stringify(context.context_hints, null, 2)}

Instructions:
- Natural, friendly tone
- Specific reference to the action item
- Ask about progress or offer help
- Keep under 320 characters for SMS
- Use first name only

Return ONLY the message text.`;

  const aiResponse = await openAIService.client.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: 'You are a proactive AI business coach checking in on contractor action items.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 150
  });

  return aiResponse.choices[0].message.content.trim();
}

/**
 * Send SMS via n8n webhook
 */
async function sendViaWebhook(phone, message, followUp) {
  const webhookUrl = process.env.NODE_ENV === 'production'
    ? 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl'
    : 'https://n8n.srv918843.hstgr.cloud/webhook/backend-to-ghl-dev';

  await axios.post(webhookUrl, {
    phone,
    message,
    message_type: 'proactive_followup',
    followup_id: followUp.id,
    contractor_id: followUp.contractor_id,
    timestamp: new Date().toISOString()
  });

  console.log('[FollowUpScheduler] SMS sent via webhook');
}

/**
 * Start the scheduler (runs every 5 minutes)
 */
function startScheduler() {
  console.log('[FollowUpScheduler] 🚀 Starting proactive follow-up scheduler (every 5 minutes)');

  // Run immediately on start
  checkAndSendPendingFollowUps();

  // Then run every 5 minutes
  setInterval(checkAndSendPendingFollowUps, 5 * 60 * 1000);
}

module.exports = {
  startScheduler,
  checkAndSendPendingFollowUps
};
```

#### **STEP 2: Integrate Scheduler into Server**

**File to modify:** `tpe-backend/server.js`

```javascript
// Add at top with other requires
const proactiveFollowUpScheduler = require('./src/services/proactiveFollowUpScheduler');

// Add after server starts (after app.listen())
if (process.env.ENABLE_FOLLOWUP_SCHEDULER !== 'false') {
  // Start proactive follow-up scheduler
  proactiveFollowUpScheduler.startScheduler();
  console.log('✅ Proactive follow-up scheduler started');
}
```

#### **STEP 3: Environment Variable Configuration**

**File to modify:** `.env` (both development and production)

```bash
# Proactive Follow-Up Scheduler
ENABLE_FOLLOWUP_SCHEDULER=true  # Set to false to disable scheduler
```

#### **STEP 4: Manual Trigger Endpoint (for testing)**

**New endpoint in:** `tpe-backend/src/routes/eventMessagingRoutes.js`

```javascript
// Manual trigger for testing proactive follow-ups
router.post('/trigger-followups', asyncHandler(async (req, res) => {
  const proactiveFollowUpScheduler = require('../services/proactiveFollowUpScheduler');

  await proactiveFollowUpScheduler.checkAndSendPendingFollowUps();

  res.json({
    success: true,
    message: 'Follow-up scheduler triggered manually'
  });
}));
```

### **Testing Criteria**
Before marking this enhancement complete, verify:

1. ✅ Scheduler starts automatically when server starts
2. ✅ Scheduler checks database every 5 minutes
3. ✅ AI generates personalized follow-up messages
4. ✅ Messages sent via n8n webhook successfully
5. ✅ Follow-ups marked as "sent" in database
6. ✅ Follow-ups skipped if action item already completed
7. ✅ Manual trigger endpoint works for testing
8. ✅ Contractor can reply to follow-up and AI continues conversation
9. ✅ No duplicate messages sent
10. ✅ Error handling prevents scheduler crashes

### **Files Created**
- `tpe-backend/src/services/proactiveFollowUpScheduler.js` - Main scheduler service

### **Files Modified**
- `tpe-backend/server.js` - Start scheduler on server boot
- `tpe-backend/src/routes/eventMessagingRoutes.js` - Add manual trigger endpoint
- `.env` - Add scheduler configuration

### **Estimated Time**
- **Scheduler development:** 4 hours
- **AI message generation:** 2 hours
- **Integration & testing:** 3 hours
- **Total:** 9 hours

---

## Implementation Order

### **Phase 1: System Prompt Update** ✅
**Goal:** AI asks the right questions and recognizes notes/priorities
**Estimated Time:** 4 hours
**Deliverable:** AI conversationally handles events without database writes yet

### **Phase 2: Function Calling** ✅
**Goal:** AI can write to database (notes, action items, follow-ups)
**Estimated Time:** 10 hours
**Deliverable:** AI captures everything and creates action items

### **Phase 3: Proactive Scheduler** ✅
**Goal:** AI proactively checks in on contractor progress
**Estimated Time:** 9 hours
**Deliverable:** Complete Greg's vision - fully autonomous event orchestration

**Total Estimated Time:** 23 hours (~3 days)

---

## Success Criteria

### **Complete Event Orchestration Flow**

**DURING EVENT:**
1. Contractor: "Met John Smith - great insights on AI. 555-1234, john@example.com"
2. AI: "Awesome! What session are you in right now?"
3. Contractor: "The AI automation session"
4. AI: "Perfect! I'll make note of that. What specifically interested you about his insights?"
5. ✅ Note captured in `event_notes` with extracted entities and session context

**POST-EVENT:**
6. AI: "Hey! Hope you had an amazing time at Power100 Dallas! 🎉 What are your top 3 priorities from everything you experienced?"
7. Contractor: "1. Follow up with John Smith, 2. Demo with Acme Corp, 3. Implement AI tools"
8. AI: "Perfect! I'll create a follow-up plan. When should I check in to see if you've connected with John?"
9. Contractor: "3 days"
10. AI: "Got it! I'll check in on Wednesday."
11. ✅ 3 action items created in `contractor_action_items`
12. ✅ Follow-up scheduled in `contractor_followup_schedules` for 3 days out

**3 DAYS LATER (PROACTIVE):**
13. AI: "Hey! Just checking in - have you had a chance to connect with John Smith yet?"
14. Contractor: "Yes! We had a great call yesterday"
15. AI: "That's awesome! How did it go? Anything interesting come up?"
16. ✅ Action item marked completed in database
17. ✅ Ongoing conversation continues naturally

---

## Testing Plan

### **Enhancement #1 Testing**
- [ ] Create test event with test contractor
- [ ] Send note during event: "Met Jane Doe, great speaker"
- [ ] Verify AI asks "What session are you in?"
- [ ] Send post-event message
- [ ] Verify AI asks "What are your top 3 priorities?"
- [ ] Verify AI references event context in responses

### **Enhancement #2 Testing**
- [ ] Same as above, plus:
- [ ] Verify `event_notes` table populated with note
- [ ] Verify `extracted_entities` JSONB has names extracted
- [ ] Verify `contractor_action_items` created for each priority
- [ ] Verify `contractor_priority` field matches stated ranking
- [ ] Verify AI responds naturally without mentioning database

### **Enhancement #3 Testing**
- [ ] Create action item with follow-up in 2 minutes
- [ ] Wait 5 minutes for scheduler to run
- [ ] Verify proactive message received via SMS
- [ ] Reply to message
- [ ] Verify AI continues conversation naturally
- [ ] Verify follow-up marked as "sent" in database
- [ ] Verify conversation logged to `event_messages`

---

## Rollback Plan

If any enhancement causes issues:

1. **Enhancement #1:** Simply revert `openAIService.js` system prompt changes
2. **Enhancement #2:** Set `ENABLE_FUNCTION_CALLING=false` in `.env`
3. **Enhancement #3:** Set `ENABLE_FOLLOWUP_SCHEDULER=false` in `.env`

All database tables remain intact and can be used later.

---

## Documentation Updates Needed

After completion, update these docs:
- [ ] `AI-FIRST-STRATEGY.md` - Mark Event Orchestrator as 100% complete
- [ ] `EVENT-SMS-ARCHITECTURE.md` - Add proactive follow-up flow diagram
- [ ] `AI-CONCIERGE-TESTING-GUIDE.md` - Add event orchestration test scenarios
- [ ] Create `EVENT-ORCHESTRATOR-USER-GUIDE.md` - Contractor-facing guide

---

## Notes

- All 3 enhancements are REQUIRED for Greg's vision
- Database schema already supports everything (completed earlier)
- AI Concierge routing already works (verified earlier)
- Core AI intelligence is strong - we're just adding specific behaviors
- This completes the "wholistic" system - ONE AI brain does EVERYTHING
