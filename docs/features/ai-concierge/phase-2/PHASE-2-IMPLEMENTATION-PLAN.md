# Phase 2: Agent Migration with LangGraph - Implementation Plan

**Document Version:** 1.0
**Date:** October 13, 2025
**Status:** Ready for Implementation
**Database Schema:** ✅ Verified and Aligned
**Dependencies:** Phase 0 (Hybrid Search) ✅ COMPLETE, Phase 1 (Event Truth) ✅ COMPLETE

---

## 🎯 What is the AI Concierge?

### Core Identity
The AI Concierge is **NOT** a "general business advisor" - it is a **highly personalized, home improvement industry-specific intelligent assistant** tailored to each contractor's self-expressed business goals for the next 12-18 months.

### The Four Pillars
1. **TPX Ecosystem Guide** - Partners, books, podcasts, events
2. **Event Orchestrator** - Real-time event support and personalization
3. **Strategic Resource Matcher** - Connecting contractors to verified partners
4. **Power100 Experience Navigator** - Maximizing value from the TPX platform

### Comprehensive Capabilities

#### Personalization Foundation
- **Industry-Specific:** Home improvement industry expertise (expanding to other industries)
- **Data-Driven:** Uses first-party data from quarterly partner client feedback loops
- **Contextualized:** Compares contractor's business to similar businesses (size, revenue, goals)
- **Tailored Plans:** Creates detailed, data-driven plans based on real-time industry data
- **Goal-Oriented:** Aligned to contractor's specific 12-18 month business objectives

#### Standard Mode (Non-Event)
- Matches contractors to verified strategic partners based on focus areas, revenue, team size
- Recommends books, podcasts, and resources specific to their goals
- Knows what works for businesses "exactly like" the contractor's based on actual industry data
- Tracks progress on planned goals and checks in proactively
- Schedules reminders and follow-ups autonomously
- Curates and sends emails (Power100 domain) and SMS
- Creates action items and detailed implementation plans
- Constantly learning from interactions across all contractors

#### Event Mode (Enhanced Context)
- **Personalized Event Schedule:** Based on contractor's focus areas and goals
- **Speaker Recommendations:** Matches sessions to business objectives
- **Sponsor/Partner Matching:** Recommends exhibitors to engage with
- **Peer Matching:** Suggests networking with non-competing contractors
- **Note Capture:** Takes and categorizes contractor notes during events
- **Meeting Scheduling:** Arranges connections based on event interactions
- **Real-Time Session Info:** Knows what's happening now and what's coming next
- **Seamless Transition:** Still answers ANY business question - event context is additive, not limiting

#### Technical Intelligence
- Access to ALL event database tables for comprehensive context
- First-party data from quarterly partner client feedback loops
- Constantly updated industry data and trends
- Intelligent context switching (knows when to prioritize event vs. business context)
- Categorizes and structures data effectively in database
- Web search capabilities (future enhancement)
- Learning from every interaction to improve recommendations

### User Experience Philosophy
**To the contractor:** It's always "the AI Concierge" - one unified, intelligent assistant
**Behind the scenes:** Different agents/modes optimize for event vs. standard contexts
**Goal:** Everything a contractor needs to reach the next level in their business

---

## 📋 Executive Summary

**Goal:** Replace monolithic AI Concierge controller with autonomous agents powered by LangGraph, enabling multi-step workflows, tool-calling capabilities, and persistent memory while maintaining the unified AI Concierge experience.

### Prerequisites Complete ✅
- ✅ Phase 0: Hybrid search operational (31 entities indexed locally, 11 in production)
- ✅ Phase 1: Event Truth Management with materialized views (0% hallucination rate)
- ✅ Context Assembler service operational
- ✅ Database schemas verified (event_notes: 20 columns, ai_learning_events: 18 columns, contractor_followup_schedules: 21 columns)

### What Phase 2 Delivers
- ✅ 4 autonomous agent tools with Zod schema validation
- ✅ 2 specialized agents (AI Concierge Standard Mode + AI Concierge Event Mode)
- ✅ **Both agents have access to ALL tools** - no artificial capability restrictions
- ✅ Differentiation via system prompts and context priority, NOT tool access
- ✅ Controller code reduction from 500+ lines to < 150 lines
- ✅ Persistent conversation memory across interactions
- ✅ Learning event tracking for all agent actions
- ✅ Independent unit testing for each tool

---

## 🔍 Database Schema Verification

### Tables Used in Phase 2

**DATABASE-CHECKED: event_notes, ai_learning_events, contractor_followup_schedules, strategic_partners columns verified October 13, 2025**

#### event_notes Table (20 columns)
```sql
-- DATABASE VERIFIED: event_notes columns (October 13, 2025)
id                     | integer
event_id               | integer
contractor_id          | integer
note_text              | text                       -- DATABASE VERIFIED: note_text (not note_content)
note_type              | character varying
extracted_entities     | jsonb
session_context        | character varying
speaker_id             | integer
sponsor_id             | integer
ai_categorization      | character varying
ai_priority_score      | numeric
ai_tags                | jsonb
captured_at            | timestamp without time zone
session_time           | time without time zone
conversation_context   | jsonb
requires_followup      | boolean
followup_completed     | boolean
followup_completed_at  | timestamp without time zone
created_at             | timestamp without time zone
updated_at             | timestamp without time zone
```

#### ai_learning_events Table (18 columns)
```sql
-- DATABASE VERIFIED: ai_learning_events columns (October 13, 2025)
id                     | integer
event_type             | character varying
contractor_id          | integer
partner_id             | integer
context                | text
recommendation         | text
action_taken           | text
outcome                | text
success_score          | numeric
learned_insight        | text
confidence_level       | numeric
event_id               | integer
event_interaction_type | character varying
session_id             | character varying
conversation_id        | integer
related_entities       | jsonb
created_at             | timestamp without time zone
updated_at             | timestamp without time zone
```

#### contractor_followup_schedules Table (21 columns)
```sql
-- DATABASE VERIFIED: contractor_followup_schedules columns (October 13, 2025)
id                       | integer
contractor_id            | integer
action_item_id           | integer
event_id                 | integer
scheduled_time           | timestamp without time zone
followup_type            | character varying
message_template         | text
message_tone             | character varying
status                   | character varying
sent_at                  | timestamp without time zone
response_received_at     | timestamp without time zone
response_text            | text
ai_should_personalize    | boolean
ai_context_hints         | jsonb
skip_if_completed        | boolean
is_recurring             | boolean
recurrence_interval_days | integer
next_occurrence_id       | integer
created_at               | timestamp without time zone
updated_at               | timestamp without time zone
sent_by                  | character varying
```

#### strategic_partners Key Fields
```sql
-- DATABASE VERIFIED: strategic_partners columns (October 13, 2025)
company_name  | character varying
focus_areas   | text                  -- DATABASE VERIFIED: text type (not jsonb array)
ai_summary    | text
```

---

## 🛠️ Agent Tools Implementation

### Tool 1: Partner Match Tool

**DATABASE-CHECKED: strategic_partners, entity_embeddings, contractors columns verified October 13, 2025**

**File:** `tpe-backend/src/services/agents/tools/partnerMatchTool.js`

```javascript
// DATABASE-CHECKED: strategic_partners, entity_embeddings, contractors columns verified October 13, 2025
const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { query } = require('../../../config/database');
const { safeJsonParse } = require('../../../utils/jsonHelpers');

const partnerMatchTool = new DynamicStructuredTool({
  name: 'find_matching_partners',
  description: 'Finds strategic partners that match the contractor\'s focus areas and business profile. Use this when contractor asks about partners or needs recommendations.',

  schema: z.object({
    contractor_id: z.number().describe('The contractor ID'),
    focus_areas: z.array(z.string()).optional().describe('Specific focus areas to match on'),
    limit: z.number().default(3).describe('Number of partners to return (max 5)')
  }),

  func: async ({ contractor_id, focus_areas, limit }) => {
    try {
      // Use hybrid search to find top partners (from Phase 0)
      const partners = await query(`
        SELECT
          p.id,
          p.company_name,              -- DATABASE VERIFIED: company_name (not name)
          p.focus_areas,               -- DATABASE VERIFIED: text type (will need parsing)
          p.ai_summary,                -- DATABASE VERIFIED: ai_summary (not description)
          ee.content,
          (ee.bm25_score * 0.4 + ee.vector_score * 0.6) AS hybrid_score
        FROM strategic_partners p
        JOIN entity_embeddings ee ON ee.entity_type = 'partner' AND ee.entity_id = p.id
        WHERE (ee.contractor_id = $1 OR ee.contractor_id IS NULL)
          AND p.is_active = true
        ORDER BY hybrid_score DESC
        LIMIT $2
      `, [contractor_id, Math.min(limit, 5)]);

      // Log learning event
      await query(`
        INSERT INTO ai_learning_events (
          event_type, contractor_id, action_taken, outcome, related_entities, created_at
        ) VALUES (
          'partner_recommendation', $1, 'find_matching_partners',
          'returned_' || $2 || '_partners',
          $3::jsonb, NOW()
        )
      `, [
        contractor_id,
        partners.rows.length,
        JSON.stringify({ partner_ids: partners.rows.map(p => p.id) })
      ]);

      return JSON.stringify({
        partners: partners.rows.map(p => ({
          company_name: p.company_name,
          ai_summary: p.ai_summary,
          focus_areas: safeJsonParse(p.focus_areas, []),  // Safe parsing of text field
          relevance_score: parseFloat(p.hybrid_score)
        })),
        count: partners.rows.length
      });

    } catch (error) {
      console.error('[PartnerMatchTool] Error:', error);

      // Log failed attempt
      await query(`
        INSERT INTO ai_learning_events (
          event_type, contractor_id, action_taken, outcome, created_at
        ) VALUES (
          'partner_recommendation', $1, 'find_matching_partners', 'error', NOW()
        )
      `, [contractor_id]);

      throw new Error(`Failed to find matching partners: ${error.message}`);
    }
  }
});

module.exports = partnerMatchTool;
```

---

### Tool 2: Event Sessions Tool

**DATABASE-CHECKED: mv_sessions_now (from Phase 1) columns verified October 13, 2025**

**File:** `tpe-backend/src/services/agents/tools/eventSessionsTool.js`

```javascript
// DATABASE-CHECKED: mv_sessions_now columns verified October 13, 2025 (Phase 1)
const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { query } = require('../../../config/database');

const eventSessionsTool = new DynamicStructuredTool({
  name: 'get_current_event_sessions',
  description: 'Gets sessions happening right now at the contractor\'s event. Only use when contractor is at an active event.',

  schema: z.object({
    contractor_id: z.number().describe('The contractor ID'),
    event_id: z.number().describe('The event ID')
  }),

  func: async ({ contractor_id, event_id }) => {
    try {
      // Query materialized view (from Phase 1 - already filtered and scored)
      const sessions = await query(`
        SELECT
          speaker_name,              -- DATABASE VERIFIED: speaker_name (from mv_sessions_now)
          session_title,             -- DATABASE VERIFIED: session_title
          session_time,              -- DATABASE VERIFIED: session_time (start time)
          session_end,               -- DATABASE VERIFIED: session_end
          session_location,          -- DATABASE VERIFIED: session_location
          focus_areas,               -- DATABASE VERIFIED: focus_areas
          relevance_score            -- DATABASE VERIFIED: relevance_score (pre-computed)
        FROM mv_sessions_now
        WHERE event_id = $1 AND contractor_id = $2
        ORDER BY relevance_score DESC
        LIMIT 3
      `, [event_id, contractor_id]);

      // Log learning event
      await query(`
        INSERT INTO ai_learning_events (
          event_type, contractor_id, event_id, action_taken, outcome, created_at
        ) VALUES (
          'event_session_query', $1, $2, 'get_current_event_sessions',
          'returned_' || $3 || '_sessions', NOW()
        )
      `, [contractor_id, event_id, sessions.rows.length]);

      return JSON.stringify({
        sessions: sessions.rows.map(s => ({
          speaker_name: s.speaker_name,
          session_title: s.session_title,
          start_time: s.session_time,
          end_time: s.session_end,
          location: s.session_location,
          focus_areas: s.focus_areas,
          relevance_score: parseFloat(s.relevance_score)
        })),
        happening_now: true,
        event_id: event_id
      });

    } catch (error) {
      console.error('[EventSessionsTool] Error:', error);

      // Log failed attempt
      await query(`
        INSERT INTO ai_learning_events (
          event_type, contractor_id, event_id, action_taken, outcome, created_at
        ) VALUES (
          'event_session_query', $1, $2, 'get_current_event_sessions', 'error', NOW()
        )
      `, [contractor_id, event_id]);

      throw new Error(`Failed to get event sessions: ${error.message}`);
    }
  }
});

module.exports = eventSessionsTool;
```

---

### Tool 3: Capture Note Tool

**DATABASE-CHECKED: event_notes columns verified October 13, 2025**

**File:** `tpe-backend/src/services/agents/tools/captureNoteTool.js`

```javascript
// DATABASE-CHECKED: event_notes columns verified October 13, 2025
const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { query } = require('../../../config/database');

const captureNoteTool = new DynamicStructuredTool({
  name: 'capture_event_note',
  description: 'Captures a note during an event. Use when contractor shares information, feedback, or observations during an event.',

  schema: z.object({
    contractor_id: z.number().describe('The contractor ID'),
    event_id: z.number().describe('The event ID'),
    note_text: z.string().describe('The note content to capture'),  // DATABASE VERIFIED: note_text
    note_type: z.enum([
      'speaker_feedback',
      'sponsor_interest',
      'general_observation',
      'action_item',
      'networking_opportunity',
      'question'
    ]).describe('Type of note being captured')
  }),

  func: async ({ contractor_id, event_id, note_text, note_type }) => {
    try {
      // Insert note using DATABASE VERIFIED field names
      const result = await query(`
        INSERT INTO event_notes (
          contractor_id, event_id, note_text, note_type, captured_at, created_at
        ) VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id
      `, [contractor_id, event_id, note_text, note_type]);

      const noteId = result.rows[0].id;

      // Track learning event
      await query(`
        INSERT INTO ai_learning_events (
          event_type, contractor_id, event_id, action_taken, outcome,
          related_entities, created_at
        ) VALUES (
          'note_capture', $1, $2, $3, 'captured',
          $4::jsonb, NOW()
        )
      `, [
        contractor_id,
        event_id,
        note_type,
        JSON.stringify({ note_id: noteId, note_type })
      ]);

      return JSON.stringify({
        success: true,
        message: 'Note captured successfully',
        note_id: noteId,
        note_type: note_type
      });

    } catch (error) {
      console.error('[CaptureNoteTool] Error:', error);

      // Log failed attempt
      await query(`
        INSERT INTO ai_learning_events (
          event_type, contractor_id, event_id, action_taken, outcome, created_at
        ) VALUES (
          'note_capture', $1, $2, 'capture_event_note', 'error', NOW()
        )
      `, [contractor_id, event_id]);

      throw new Error(`Failed to capture note: ${error.message}`);
    }
  }
});

module.exports = captureNoteTool;
```

---

### Tool 4: Schedule Follow-up Tool

**DATABASE-CHECKED: contractor_followup_schedules columns verified October 13, 2025**

**File:** `tpe-backend/src/services/agents/tools/scheduleFollowupTool.js`

```javascript
// DATABASE-CHECKED: contractor_followup_schedules columns verified October 13, 2025
const { DynamicStructuredTool } = require('@langchain/core/tools');
const { z } = require('zod');
const { query } = require('../../../config/database');

const scheduleFollowupTool = new DynamicStructuredTool({
  name: 'schedule_followup',
  description: 'Schedules a follow-up message to the contractor at a specific time. Use for reminders, check-ins, or proactive outreach.',

  schema: z.object({
    contractor_id: z.number().describe('The contractor ID'),
    message_template: z.string().describe('The follow-up message template to send'),  // DATABASE VERIFIED: message_template
    scheduled_time: z.string().describe('ISO 8601 datetime when to send'),           // DATABASE VERIFIED: scheduled_time
    followup_type: z.enum([
      'demo_reminder',
      'action_item_check',
      'event_recap',
      'general',
      'session_reminder',
      'post_event_survey'
    ]).describe('Type of follow-up'),                                               // DATABASE VERIFIED: followup_type
    event_id: z.number().optional().describe('Event ID if event-related')
  }),

  func: async ({ contractor_id, message_template, scheduled_time, followup_type, event_id }) => {
    try {
      // Insert follow-up schedule using DATABASE VERIFIED field names
      const result = await query(`
        INSERT INTO contractor_followup_schedules (
          contractor_id,
          event_id,
          scheduled_time,
          followup_type,
          message_template,
          status,
          ai_should_personalize,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, 'pending', true, NOW())
        RETURNING id
      `, [
        contractor_id,
        event_id || null,
        scheduled_time,
        followup_type,
        message_template
      ]);

      const followupId = result.rows[0].id;

      // Track learning event
      await query(`
        INSERT INTO ai_learning_events (
          event_type, contractor_id, event_id, action_taken, outcome,
          related_entities, created_at
        ) VALUES (
          'followup_scheduled', $1, $2, $3, 'scheduled',
          $4::jsonb, NOW()
        )
      `, [
        contractor_id,
        event_id || null,
        followup_type,
        JSON.stringify({ followup_id: followupId, scheduled_time })
      ]);

      return JSON.stringify({
        success: true,
        message: 'Follow-up scheduled successfully',
        followup_id: followupId,
        scheduled_for: scheduled_time,
        followup_type: followup_type
      });

    } catch (error) {
      console.error('[ScheduleFollowupTool] Error:', error);

      // Log failed attempt
      await query(`
        INSERT INTO ai_learning_events (
          event_type, contractor_id, action_taken, outcome, created_at
        ) VALUES (
          'followup_scheduled', $1, 'schedule_followup', 'error', NOW()
        )
      `, [contractor_id]);

      throw new Error(`Failed to schedule follow-up: ${error.message}`);
    }
  }
});

module.exports = scheduleFollowupTool;
```

---

## 🤖 Agent Implementation

### IMPORTANT: Tool Access Philosophy

**Both agents have access to ALL tools.** The difference between Standard Mode and Event Mode is NOT tool restriction, but rather:

1. **System Prompts** - Different instructions on how to prioritize information
2. **Context Priority** - Event Mode emphasizes event context, Standard Mode emphasizes business goals
3. **Temperature** - Event Mode uses lower temperature for factual accuracy

**Why?** Because "to the contractor it's always 'the AI Concierge'" - artificially limiting capabilities breaks the unified experience. The AI Concierge can answer ANY question regardless of mode.

---

### Agent 1: AI Concierge (Standard Mode)

**File:** `tpe-backend/src/services/agents/aiConciergeStandardAgent.js`

```javascript
// AI Concierge - Standard Mode
// Focus: Business growth guidance, partner matching, resource recommendations
// Context: Prioritizes contractor's 12-18 month business goals
// Capability: Can STILL answer event questions if asked - no artificial restrictions
const { ChatOpenAI } = require('@langchain/openai');
const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const { MemorySaver } = require('@langchain/langgraph');
const partnerMatchTool = require('./tools/partnerMatchTool');
const eventSessionsTool = require('./tools/eventSessionsTool');
const captureNoteTool = require('./tools/captureNoteTool');
const scheduleFollowupTool = require('./tools/scheduleFollowupTool');

function createAIConciergeStandardAgent() {
  const model = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY
  });

  // ALL TOOLS AVAILABLE - no artificial restrictions
  const tools = [
    partnerMatchTool,
    eventSessionsTool,
    captureNoteTool,
    scheduleFollowupTool
  ];

  const systemPrompt = `You are the AI Concierge for The Power100 Experience.

Your primary focus is helping contractors reach their 12-18 month business goals through:
- Strategic partner matching based on their specific needs
- Resource recommendations (books, podcasts) aligned to their goals
- Proactive follow-ups and action item tracking
- Data-driven insights from businesses exactly like theirs

However, you can answer ANY question the contractor asks, including:
- Event-related questions (who's speaking, what sessions are happening, etc.)
- General business questions
- Clarifications about TPX resources

You have access to all tools. Use them appropriately based on what the contractor needs.`;

  const agent = createReactAgent({
    llm: model,
    tools: tools,
    checkpointSaver: new MemorySaver(), // Persistent memory across conversations
    systemPrompt: systemPrompt
  });

  return agent;
}

module.exports = { createAIConciergeStandardAgent };
```

---

### Agent 2: AI Concierge (Event Mode)

**File:** `tpe-backend/src/services/agents/aiConciergeEventAgent.js`

```javascript
// AI Concierge - Event Mode
// Focus: Real-time event support, session recommendations, note capture
// Context: Prioritizes event context while maintaining business goal awareness
// Capability: Can STILL answer business questions - event context is ADDITIVE, not limiting
const { ChatOpenAI } = require('@langchain/openai');
const { createReactAgent } = require('@langchain/langgraph/prebuilt');
const { MemorySaver } = require('@langchain/langgraph');
const partnerMatchTool = require('./tools/partnerMatchTool');
const eventSessionsTool = require('./tools/eventSessionsTool');
const captureNoteTool = require('./tools/captureNoteTool');
const scheduleFollowupTool = require('./tools/scheduleFollowupTool');

function createAIConciergeEventAgent() {
  const model = new ChatOpenAI({
    modelName: 'gpt-4',
    temperature: 0.5, // Lower temperature for factual accuracy with event data
    openAIApiKey: process.env.OPENAI_API_KEY
  });

  // ALL TOOLS AVAILABLE - no artificial restrictions
  const tools = [
    partnerMatchTool,
    eventSessionsTool,
    captureNoteTool,
    scheduleFollowupTool
  ];

  const systemPrompt = `You are the AI Concierge for The Power100 Experience, currently supporting a contractor at a live event.

Your primary focus during events is:
- Recommending sessions based on contractor's focus areas and goals
- Capturing notes and observations during sessions
- Identifying networking opportunities and connections
- Scheduling follow-ups based on event interactions
- Providing real-time event information (who's speaking, what's happening now, etc.)

However, you can STILL answer ANY question the contractor asks, including:
- General business questions about partners, resources, or strategies
- Questions about their 12-18 month business goals
- Clarifications about TPX resources outside of the event

Event context is ADDITIVE - it enhances your responses but doesn't limit your capabilities.
You have access to all tools. Use them appropriately based on what the contractor needs.`;

  const agent = createReactAgent({
    llm: model,
    tools: tools,
    checkpointSaver: new MemorySaver(), // Persistent memory across conversations
    systemPrompt: systemPrompt
  });

  return agent;
}

module.exports = { createAIConciergeEventAgent };
```

---

## 📅 Implementation Timeline (5 Days)

### Day 1: Dependencies & Tool Foundations ✅ Pending
- [ ] Install LangChain dependencies (`@langchain/openai`, `@langchain/langgraph`, `@langchain/core`, `zod`)
- [ ] Verify environment variables (OPENAI_API_KEY)
- [ ] Create tools directory structure
- [ ] Implement Partner Match Tool with Zod schema
- [ ] Write unit tests for Partner Match Tool
- [ ] Test with real database queries
- **Deliverable:** Partner Match Tool operational and tested

### Day 2: Complete Tool Suite ✅ Pending
- [ ] Implement Event Sessions Tool (using Phase 1 materialized views)
- [ ] Implement Capture Note Tool (event_notes table)
- [ ] Implement Schedule Follow-up Tool (contractor_followup_schedules table)
- [ ] Write unit tests for all tools
- [ ] Test learning event tracking
- **Deliverable:** All 4 tools operational with learning tracking

### Day 3: Agent Creation & Integration ✅ Pending
- [ ] Create AI Concierge (Standard Mode) Agent
- [ ] Create AI Concierge (Event Mode) Agent
- [ ] Configure MemorySaver for conversation persistence
- [ ] Test agent tool selection accuracy
- [ ] Test agent memory across multiple interactions
- **Deliverable:** 2 AI Concierge agents operational with persistent memory

### Day 4: Controller Integration ✅ Pending
- [ ] Update AI Concierge Controller to route to agents
- [ ] Pass contractor context to agents
- [ ] Handle agent responses and streaming
- [ ] Simplify controller logic (target: < 150 lines)
- [ ] Integration testing with real scenarios
- **Deliverable:** Controller routing to agents, code simplified

### Day 5: Testing & Documentation ✅ Pending
- [ ] Comprehensive integration testing
- [ ] Test pre-event scenario (General Business Advisor)
- [ ] Test during-event scenario (Event Orchestrator)
- [ ] Test tool selection accuracy (target: > 90%)
- [ ] Performance benchmarking (target: < 2s response time)
- [ ] Document agent architecture
- [ ] Create operational runbook
- **Deliverable:** Phase 2 complete, documented, and production-ready

---

## ✅ Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Controller Code Size** | < 150 lines | Line count after refactor (from 500+) |
| **Agent Tool Selection Accuracy** | > 90% | Test with 20+ scenarios, measure correct tool chosen |
| **Agent Response Time** | < 2s | Average time from query to first response token |
| **Learning Event Coverage** | 100% | All tool executions log to ai_learning_events |
| **Memory Persistence** | 100% | Agent remembers context across conversation |
| **Test Coverage** | > 80% | Unit + integration test coverage |

---

## 📚 Related Documents

- **Phase 0 Complete:** `docs/features/ai-concierge/phase-0/PHASE-0-IMPLEMENTATION-STATUS.md`
- **Phase 1 Complete:** `docs/features/ai-concierge/phase-1/PHASE-1-COMPLETE.md`
- **Hybrid Architecture:** `docs/features/ai-concierge/AI-CONCIERGE-HYBRID-ARCHITECTURE-RECOMMENDATION.md`
- **Database Field Naming:** `docs/AI-FIELD-NAMING-CONVENTIONS.md`

---

**Phase 2 Status:** Ready for Implementation
**Database Schema:** ✅ 100% Verified and Aligned
**Prerequisites:** ✅ Complete (Phase 0 + Phase 1)
