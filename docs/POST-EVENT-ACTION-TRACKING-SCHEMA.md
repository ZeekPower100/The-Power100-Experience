# Post-Event Action Tracking Database Schema

## Overview
This schema supports Greg's complete vision for interactive post-event workflows, including:
1. **During-event note-taking** with AI organization
2. **Post-event priority extraction** from contractor conversations
3. **Automated follow-up scheduling** and execution
4. **Task completion monitoring** and progress tracking

---

## Table 1: `event_notes`
**Purpose:** Capture contractor notes during events via SMS with AI-powered organization

### Key Features:
- **Real-time note capture** during events
- **AI entity extraction** (names, phone numbers, emails, companies)
- **Session context tracking** (which speaker/session the note relates to)
- **AI categorization** (contact, insight, action item, etc.)
- **Priority scoring** (AI determines importance 0.00-1.00)
- **Follow-up tracking** (does this note require action?)

### Example Use Case:
```
Contractor (during event): "Met John Smith - amazing insights on AI automation. 555-1234, john@example.com"

System stores:
- note_text: "Met John Smith - amazing insights on AI automation. 555-1234, john@example.com"
- note_type: 'contact'
- extracted_entities: {
    names: ["John Smith"],
    phone_numbers: ["555-1234"],
    emails: ["john@example.com"]
  }
- ai_tags: ["networking", "follow-up-required", "ai-topic"]
- ai_priority_score: 0.85 (high priority)
- requires_followup: true
- session_context: "Growing with AI - 2:00 PM Main Stage"
```

### Fields:
- `id` - Primary key
- `event_id` - References events table
- `contractor_id` - References contractors table
- `note_text` - The actual note content
- `note_type` - 'general', 'contact', 'insight', 'action_item', 'speaker_note', 'sponsor_note'
- `extracted_entities` - JSONB with AI-extracted names, phones, emails, companies
- `session_context` - Which session/speaker this relates to
- `speaker_id` - References event_speakers (if applicable)
- `sponsor_id` - References event_sponsors (if applicable)
- `ai_categorization` - AI's interpretation of note category
- `ai_priority_score` - 0.00-1.00 importance score
- `ai_tags` - Array of AI-assigned tags
- `captured_at` - When note was taken
- `requires_followup` - Boolean flag
- `followup_completed` - Boolean flag
- `conversation_context` - Full SMS context when note was captured

---

## Table 2: `contractor_action_items`
**Purpose:** Track post-event priorities, tasks, and follow-ups identified by AI or contractor

### Key Features:
- **Tracks all action items** from post-event conversations
- **Priority management** (contractor's priority + AI's suggested priority)
- **Status tracking** (pending, in_progress, completed, cancelled, deferred)
- **Related entity linking** (partners, peers, speakers, sponsors, demos)
- **AI-generated vs contractor-created** tracking
- **Due dates and reminders**

### Example Use Case:
```
TPX: "What are your top 3 priorities from the event?"
Contractor: "1. Follow up with John Smith, 2. Demo with Acme Corp, 3. Implement AI tools"

System creates 3 action items:
1. {
     title: "Follow up with John Smith",
     action_type: 'contact_peer',
     contractor_priority: 1,
     ai_suggested_priority: 2,
     status: 'pending',
     related_note_id: 42 (the note about John Smith),
     ai_generated: false
   }

2. {
     title: "Prepare for Acme Corp demo",
     action_type: 'demo_prep',
     contractor_priority: 2,
     related_demo_booking_id: 15,
     due_date: '2025-10-15' (day before demo),
     ai_generated: true,
     ai_reasoning: "Demo scheduled for Oct 16, prep day before"
   }
```

### Fields:
- `id` - Primary key
- `contractor_id` - References contractors
- `event_id` - References events (NULL if not event-related)
- `title` - Action item title
- `description` - Detailed description
- `action_type` - 'follow_up', 'demo_prep', 'email_intro', 'implement_tool', 'contact_peer', etc.
- `priority` - 1 (highest) to 10 (lowest)
- `contractor_priority` - Contractor's own ranking (from "top 3" question)
- `ai_suggested_priority` - AI's recommended priority
- `due_date` - When it should be done
- `reminder_time` - When to remind contractor
- `status` - 'pending', 'in_progress', 'completed', 'cancelled', 'deferred'
- `completed_at` - Completion timestamp
- `related_partner_id` - Link to strategic partner (if applicable)
- `related_peer_contractor_id` - Link to peer contractor (if applicable)
- `related_speaker_id` - Link to event speaker
- `related_sponsor_id` - Link to event sponsor
- `related_note_id` - Link to event note that triggered this action
- `related_demo_booking_id` - Link to demo booking
- `ai_generated` - True if AI created this action
- `ai_reasoning` - Why AI suggested this
- `extraction_confidence` - 0.00-1.00 confidence score
- `source_message_id` - Which conversation created this
- `conversation_context` - Full conversation context

---

## Table 3: `contractor_followup_schedules`
**Purpose:** Define when AI Concierge should proactively check in on action items

### Key Features:
- **Automated follow-up scheduling** for action items
- **Message templates** for AI to personalize
- **Recurrence support** (daily/weekly check-ins)
- **Smart cancellation** (skip if action already completed)
- **Execution tracking** (sent, responded, deferred)

### Example Use Case:
```
Action item created: "Follow up with John Smith"
System automatically creates follow-up schedule:

{
  contractor_id: 56,
  action_item_id: 123,
  scheduled_time: '2025-10-10 10:00:00' (3 days after event),
  followup_type: 'check_in',
  message_template: "Hey! Just checking in. Have you reached out to John Smith yet?",
  message_tone: 'friendly',
  ai_should_personalize: true,
  ai_context_hints: {
    mention_event: "Power100 Dallas",
    reference_note: "AI automation discussion"
  },
  skip_if_completed: true,
  status: 'scheduled'
}

[3 days later, AI sends:]
"Hey! Just checking in. Have you had a chance to connect with John Smith from the Power100 Dallas event? I know you were interested in his insights on AI automation."
```

### Fields:
- `id` - Primary key
- `contractor_id` - References contractors
- `action_item_id` - References contractor_action_items
- `event_id` - References events (if applicable)
- `scheduled_time` - When to send follow-up
- `followup_type` - 'check_in', 'reminder', 'status_update', 'offer_help', 'completion_confirmation'
- `message_template` - Template for AI to use
- `message_tone` - 'friendly', 'professional', 'casual', 'urgent'
- `status` - 'scheduled', 'sent', 'responded', 'cancelled', 'deferred'
- `sent_at` - When message was sent
- `response_received_at` - When contractor responded
- `response_text` - Contractor's response
- `ai_should_personalize` - Should AI customize the message?
- `ai_context_hints` - JSONB with hints for AI on what to reference
- `skip_if_completed` - Cancel if action already done
- `is_recurring` - Is this a recurring follow-up?
- `recurrence_interval_days` - How often to repeat
- `next_occurrence_id` - Link to next scheduled occurrence

---

## Table 4: `action_item_updates`
**Purpose:** Audit trail of all changes to action items

### Key Features:
- **Complete history** of status changes, priority changes, notes
- **Source tracking** (contractor, AI, or system)
- **Learning data** for AI to understand what works

### Example Use Case:
```
[Action item #123 is updated from 'pending' to 'completed']

System logs:
{
  action_item_id: 123,
  contractor_id: 56,
  update_type: 'status_change',
  old_value: 'pending',
  new_value: 'completed',
  update_note: "Contractor confirmed email sent to John Smith",
  updated_by: 'contractor',
  update_source: 'sms_conversation',
  message_id: 789
}
```

---

## How This Supports Greg's Vision

### 1. **During-Event Note-Taking** ✅
- `event_notes` table captures all notes in real-time
- AI extracts entities (names, phones, emails)
- AI determines session context
- AI prioritizes notes for follow-up

### 2. **Post-Event Priority Extraction** ✅
- AI conversation asks "What are your top 3 priorities?"
- Creates `contractor_action_items` with `contractor_priority` field
- AI also suggests its own priorities based on event data
- Both priorities tracked for comparison

### 3. **Automated Follow-Up Scheduling** ✅
- `contractor_followup_schedules` defines when AI checks in
- AI personalizes messages based on `ai_context_hints`
- Skips follow-ups if action already completed
- Supports recurring check-ins

### 4. **Email Introduction Orchestration** ✅
- Action items can be type `email_intro`
- Links to `related_peer_contractor_id` or `related_partner_id`
- AI can track "email sent" via `action_item_updates`
- Can offer to draft email intro message

### 5. **Post-Event Partner Re-Matching** ✅
- Action items can be type `research_partner`
- AI creates action item: "Review BuildPro Solutions (not at event)"
- Links to `related_partner_id`
- Scheduled follow-up recommends the partner

---

## AI Concierge Integration

**The AI Concierge will automatically have access to these tables through `aiKnowledgeService.js`**

When contractor sends a message, AI can:
1. **See all their event notes** - Knows what they found important
2. **See all pending action items** - Knows what they're trying to accomplish
3. **See upcoming follow-ups** - Knows what it's supposed to check on
4. **Update action items** - Can mark things completed or create new ones
5. **Schedule follow-ups** - Can create proactive check-ins

---

## Sample Queries

### Get contractor's pending actions (ordered by priority):
```sql
SELECT * FROM contractor_action_items
WHERE contractor_id = $1 AND status = 'pending'
ORDER BY priority ASC, due_date ASC NULLS LAST;
```

### Get upcoming follow-ups to send:
```sql
SELECT * FROM contractor_followup_schedules
WHERE status = 'scheduled'
  AND scheduled_time <= NOW() + INTERVAL '5 minutes'
ORDER BY scheduled_time ASC;
```

### Get all notes from an event:
```sql
SELECT * FROM event_notes
WHERE event_id = $1 AND contractor_id = $2
ORDER BY captured_at;
```

### Get action items requiring follow-up:
```sql
SELECT ai.*, en.note_text, en.extracted_entities
FROM contractor_action_items ai
LEFT JOIN event_notes en ON ai.related_note_id = en.id
WHERE ai.contractor_id = $1
  AND ai.status = 'pending'
  AND ai.due_date <= CURRENT_DATE + INTERVAL '3 days';
```

---

## Next Steps

1. ✅ Schema designed and documented
2. ⏳ Run migration to create tables
3. ⏳ Add tables to `aiKnowledgeService.js` for AI visibility
4. ⏳ Create service layer for action item management
5. ⏳ Build note-taking handler in AI Concierge
6. ⏳ Build priority extraction handler
7. ⏳ Build follow-up scheduler (cron job or n8n workflow)
