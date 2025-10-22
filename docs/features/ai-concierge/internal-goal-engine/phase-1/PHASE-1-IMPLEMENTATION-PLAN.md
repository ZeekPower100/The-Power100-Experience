# Phase 1: Background Goal Engine - Implementation Plan

**Feature:** AI Concierge Internal Goal Engine
**Phase:** 1 of 3 - Background Goal Engine (Core Foundation)
**Timeline:** 5-7 days
**Status:** READY FOR IMPLEMENTATION

---

## 📋 Overview

### What This Phase Delivers
The **Background Goal Engine** is the core foundation that enables the AI Concierge to maintain hidden internal goals for each contractor and act on them naturally during conversations. This is the AI's "private checklist" system that drives proactive behavior.

**Key Deliverables:**
1. Database tables for internal goals and checklist items
2. Goal generation logic (analyzes contractor profile → creates goals)
3. Goal prioritization system (what to act on first)
4. Integration with existing AI Concierge conversations
5. Goal tracking and completion monitoring

**What It Enables:**
- AI maintains internal goals hidden from contractor
- AI prioritizes actions based on success patterns
- AI naturally asks strategic questions during conversation
- AI tracks what it wants to accomplish for each contractor
- Foundation for Phase 2 (pattern learning) and Phase 3 (proactive behavior)

---

## 🗄️ Database Schema Verification

### VERIFIED: Existing Tables (Integration Points)

#### contractors table (72 columns verified)
```sql
-- Key fields for goal generation:
id                    INTEGER PRIMARY KEY
revenue_tier          VARCHAR(100)        -- Current revenue level
team_size             VARCHAR(100)        -- Team composition
focus_areas           TEXT                -- Business priorities
current_stage         VARCHAR(100)        -- Business maturity
business_goals        JSONB               -- Structured goal data
current_challenges    JSONB               -- Known pain points
ai_summary            TEXT                -- AI's understanding
ai_insights           JSONB               -- AI analysis data
growth_potential      INTEGER             -- Growth score 1-10
lifecycle_stage       VARCHAR(20)         -- Where in journey
last_ai_analysis      TIMESTAMP           -- Last AI check
```

#### contractor_action_items table (27 columns verified)
```sql
-- Action items that AI creates:
id                         INTEGER PRIMARY KEY
contractor_id              INTEGER REFERENCES contractors(id)
event_id                   INTEGER REFERENCES events(id)
title                      VARCHAR(255)
description                TEXT
action_type                VARCHAR(100)    -- follow_up, recommendation, introduction
priority                   INTEGER          -- System priority 1-10
contractor_priority        INTEGER          -- Contractor's priority
ai_suggested_priority      INTEGER          -- AI's recommendation
status                     VARCHAR(50)      -- pending, in_progress, completed
ai_generated               BOOLEAN          -- Created by AI
ai_reasoning               TEXT             -- Why AI created this
extraction_confidence      NUMERIC(5,2)     -- AI's confidence level
conversation_context       JSONB            -- What prompted this
```

#### contractor_followup_schedules table (21 columns verified)
```sql
-- Follow-ups AI schedules:
id                        INTEGER PRIMARY KEY
contractor_id             INTEGER REFERENCES contractors(id)
action_item_id            INTEGER REFERENCES contractor_action_items(id)
event_id                  INTEGER REFERENCES events(id)
scheduled_time            TIMESTAMP         -- When to follow up
followup_type             VARCHAR(100)      -- check_in, reminder, recommendation
status                    VARCHAR(50)       -- scheduled, sent, completed, cancelled
ai_should_personalize     BOOLEAN           -- Use AI for message
ai_context_hints          JSONB             -- Context for AI
skip_if_completed         BOOLEAN           -- Cancel if action done
```

### NEW TABLES: Phase 1 Core Schema

#### ai_concierge_goals
**Purpose:** AI's internal goal system - hidden from contractor

```sql
CREATE TABLE ai_concierge_goals (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

  -- Goal Definition
  goal_type VARCHAR(100) NOT NULL,  -- 'revenue_growth', 'team_expansion', 'lead_improvement', 'network_building'
  goal_description TEXT NOT NULL,   -- "Get contractor to $5M revenue level"
  target_milestone VARCHAR(255),    -- "$5M annual revenue" or "Hire operations manager"

  -- Priority & Progress
  priority_score INTEGER DEFAULT 5 CHECK (priority_score BETWEEN 1 AND 10),  -- AI's confidence this matters
  current_progress INTEGER DEFAULT 0 CHECK (current_progress BETWEEN 0 AND 100),  -- 0-100%
  next_milestone TEXT,              -- "Assess current lead flow system"

  -- Success Criteria
  success_criteria JSONB,           -- {revenue_increase: 20%, team_growth: true, close_rate_improved: true}

  -- Pattern Source (Phase 2 will populate this)
  pattern_source TEXT,              -- "Based on 47 contractors who went from $3M to $5M"
  pattern_confidence NUMERIC(3,2) CHECK (pattern_confidence BETWEEN 0 AND 1),  -- 0.00-1.00

  -- Data Gaps (What AI needs to know)
  data_gaps JSONB,                  -- ["team_size", "close_rate", "lead_sources", "hiring_timeline"]

  -- Status & Timing
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'blocked')),
  trigger_condition VARCHAR(100),   -- 'next_conversation', 'weekly', 'post_event', 'after_action_completed'
  last_action_at TIMESTAMP,         -- Last time AI acted on this goal

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  -- Indexes
  CONSTRAINT valid_progress CHECK (current_progress >= 0 AND current_progress <= 100)
);

CREATE INDEX idx_contractor_goals ON ai_concierge_goals(contractor_id, status);
CREATE INDEX idx_priority_goals ON ai_concierge_goals(priority_score DESC, status);
CREATE INDEX idx_trigger_goals ON ai_concierge_goals(trigger_condition, status);
```

#### ai_concierge_checklist_items
**Purpose:** AI's checklist - specific actions within goals

```sql
CREATE TABLE ai_concierge_checklist_items (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES ai_concierge_goals(id) ON DELETE CASCADE,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

  -- Checklist Item
  checklist_item TEXT NOT NULL,     -- "Assess current lead flow system"
  item_type VARCHAR(100),           -- 'data_collection', 'recommendation', 'follow_up', 'introduction', 'question'

  -- Status & Trigger
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  trigger_condition VARCHAR(100),   -- 'next_conversation', 'after_event', 'weekly', 'immediately'

  -- Execution
  executed_at TIMESTAMP,            -- When AI acted on this
  execution_context JSONB,          -- What was happening when AI acted

  -- Completion
  completed_at TIMESTAMP,
  completion_notes TEXT,            -- What happened, what was learned

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contractor_checklist ON ai_concierge_checklist_items(contractor_id, status);
CREATE INDEX idx_goal_items ON ai_concierge_checklist_items(goal_id, status);
CREATE INDEX idx_trigger_checklist ON ai_concierge_checklist_items(trigger_condition, status);
```

---

## 📅 Day-by-Day Implementation Plan

### Day 1: Database Foundation & Goal Data Model

**Duration:** 6-8 hours

#### Tasks:
1. **Create Database Tables** (2 hours)
   - Create `ai_concierge_goals` table with indexes
   - Create `ai_concierge_checklist_items` table with indexes
   - Run verification queries to confirm structure
   - Test foreign key relationships

2. **Create Goal Service Layer** (4 hours)
   - Create `tpe-backend/src/services/goalEngineService.js`
   - Implement `createGoal()` - Create internal goal for contractor
   - Implement `getActiveGoals()` - Fetch active goals by priority
   - Implement `updateGoalProgress()` - Track progress
   - Implement `completeGoal()` - Mark goal as achieved
   - Add database queries with error handling

3. **Create Checklist Service Layer** (2 hours)
   - Extend `goalEngineService.js` with checklist methods
   - Implement `createChecklistItem()` - Add item to goal
   - Implement `getActiveChecklist()` - Get pending items
   - Implement `completeChecklistItem()` - Mark as done
   - Implement `skipChecklistItem()` - Skip if not relevant

#### Success Criteria:
- ✅ Both tables exist with correct schema
- ✅ All indexes created successfully
- ✅ Foreign keys enforced
- ✅ Service layer can CRUD goals and checklist items
- ✅ Database queries return correct data types

#### Verification Commands:
```bash
# Verify tables exist
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_name IN ('ai_concierge_goals', 'ai_concierge_checklist_items');\""

# Verify column counts
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'ai_concierge_goals';\""

# Verify indexes
powershell -Command ".\quick-db.bat \"SELECT indexname FROM pg_indexes WHERE tablename = 'ai_concierge_goals';\""

# Test foreign keys
powershell -Command ".\quick-db.bat \"SELECT constraint_name, table_name FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY' AND table_name = 'ai_concierge_goals';\""
```

---

### Day 2: Goal Generation Logic

**Duration:** 6-8 hours

#### Tasks:
1. **Implement Goal Generator** (4 hours)
   - Create `generateGoalsForContractor()` in `goalEngineService.js`
   - Analyze contractor profile (revenue_tier, team_size, focus_areas)
   - Generate 2-4 high-level goals based on business stage
   - Assign priority scores based on data completeness
   - Create checklist items for each goal

2. **Goal Generation Rules** (2 hours)
   - **Revenue Growth Goals**: If revenue_tier < target, create growth goal
   - **Team Expansion Goals**: If team_size small + scaling, suggest hiring
   - **Lead System Goals**: If greenfield_growth in focus_areas, prioritize
   - **Network Building Goals**: If referral_growth in focus_areas

3. **Data Gap Detection** (2 hours)
   - Implement `identifyDataGaps()` function
   - Check which fields are NULL or empty
   - Prioritize missing fields by goal importance
   - Create checklist items to collect missing data

#### Success Criteria:
- ✅ Given contractor ID, system generates 2-4 relevant goals
- ✅ Priority scores align with contractor's business stage
- ✅ Data gaps correctly identified
- ✅ Checklist items created for each goal
- ✅ Goals stored in database successfully

#### Test Cases:
```javascript
// Test Contractor: Zeek Brockman (ID: 56)
// Revenue: $3.2M, Target: $5M, Focus: Greenfield Growth
// Expected Goals:
// 1. "Improve lead conversion rate" (priority: 9/10)
// 2. "Prepare for team expansion" (priority: 8/10)
// 3. "Increase referral network" (priority: 6/10)

const goals = await generateGoalsForContractor(56);
expect(goals.length).toBeGreaterThanOrEqual(2);
expect(goals[0].priority_score).toBeGreaterThan(7);
expect(goals[0].data_gaps).toBeArray();
```

#### Verification Commands:
```bash
# Check goals created for test contractor
powershell -Command ".\quick-db.bat \"SELECT id, goal_type, goal_description, priority_score, status FROM ai_concierge_goals WHERE contractor_id = 56;\""

# Check checklist items generated
powershell -Command ".\quick-db.bat \"SELECT checklist_item, item_type, status FROM ai_concierge_checklist_items WHERE contractor_id = 56;\""
```

---

### Day 3: AI Concierge Integration - Context Injection

**Duration:** 6-8 hours

#### Tasks:
1. **Update AI Concierge Context Builder** (3 hours)
   - Modify `conversationContext.js` to include active goals
   - Add `getInternalGoalsContext()` function
   - Inject goals into AI system prompt (hidden from user)
   - Format as: "Internal Checklist (contractor can't see):"

2. **System Prompt Enhancement** (2 hours)
   - Add section: "## YOUR INTERNAL GOALS"
   - Include active goals with priority scores
   - Include pending checklist items with triggers
   - Include data gaps to fill during conversation

3. **Goal-Aware Response Logic** (3 hours)
   - Update `aiProcessingService.js` to check active goals
   - Before each response, fetch high-priority checklist items
   - Weave checklist actions naturally into conversation
   - Track when checklist items are addressed

#### Success Criteria:
- ✅ AI receives internal goals in context (hidden from contractor)
- ✅ System prompt includes goals, checklist, data gaps
- ✅ AI naturally asks questions related to data gaps
- ✅ Checklist items marked as "in_progress" when AI acts
- ✅ Contractor never sees the internal checklist directly

#### Integration Points (VERIFIED):
```javascript
// conversationContext.js - buildConversationContext()
const contractorData = {
  id: contractor.id,
  revenue_tier: contractor.revenue_tier,
  team_size: contractor.team_size,
  focus_areas: contractor.focus_areas,
  business_goals: contractor.business_goals,  // JSONB field
  current_challenges: contractor.current_challenges,  // JSONB field
  ai_summary: contractor.ai_summary,  // TEXT field
  ai_insights: contractor.ai_insights  // JSONB field
};

// NEW: Add internal goals context
const internalGoals = await getActiveGoals(contractor.id);
const internalChecklist = await getActiveChecklist(contractor.id);

systemPrompt += `

## 🎯 YOUR INTERNAL GOALS (Hidden from contractor)

You have the following internal goals for ${contractor.first_name}:

${internalGoals.map(g => `
**Goal ${g.priority_score}/10**: ${g.goal_description}
- Target: ${g.target_milestone}
- Progress: ${g.current_progress}%
- Next Step: ${g.next_milestone}
- Data Gaps: ${g.data_gaps.join(', ')}
`).join('\n')}

## ✅ YOUR CHECKLIST (Act on these naturally)

${internalChecklist.map(item => `
- [ ] ${item.checklist_item} (${item.item_type})
  Trigger: ${item.trigger_condition}
`).join('\n')}

**INSTRUCTIONS:**
- NEVER mention "my checklist" or "my internal goals" to the contractor
- Weave checklist actions naturally into conversation
- Ask questions to fill data gaps when context allows
- Mark items complete when you address them
`;
```

#### Test Scenario:
```
Contractor: "Need better lead flow tools"

AI Internal Check:
- Goal priority 9/10: "Improve lead conversion"
- Data gap: close_rate
- Checklist item: "Assess current lead flow system" - TRIGGER NOW

AI Response:
"Got you covered on lead flow! Quick question first - what's
your close rate at right now? Want to match you with the right
tool tier."

Result: Data collected naturally, checklist item completed
```

---

### Day 4: Checklist Execution & Tracking

**Duration:** 6-8 hours

#### Tasks:
1. **Implement Checklist Trigger System** (3 hours)
   - Create `evaluateChecklistTriggers()` function
   - Check which items should trigger based on:
     - `next_conversation`: Every conversation
     - `immediately`: As soon as possible
     - `post_event`: After event ends
     - `after_action_completed`: When prerequisite done
   - Return prioritized list of items to act on

2. **Action Execution Tracking** (2 hours)
   - When AI responds, analyze response for checklist actions
   - If AI asked about data gap → mark item as "in_progress"
   - If data collected → mark item as "completed" + save notes
   - If AI made recommendation → link to action_item + mark done

3. **Progress Update Logic** (2 hours)
   - When checklist item completes → update goal progress
   - Calculate progress: (completed_items / total_items) * 100
   - If all items complete → mark goal as "completed"
   - Generate new checklist items if goal still active

4. **Response Parser** (1 hour)
   - Parse AI response for completed actions
   - Extract: questions asked, data collected, recommendations made
   - Update `execution_context` with conversation excerpt

#### Success Criteria:
- ✅ Checklist items trigger at correct times
- ✅ AI actions tracked automatically
- ✅ Goal progress updates as items complete
- ✅ Completed items have execution_context saved
- ✅ New items generated when needed

#### Verification Commands:
```bash
# Check checklist execution tracking
powershell -Command ".\quick-db.bat \"SELECT id, checklist_item, status, executed_at, completion_notes FROM ai_concierge_checklist_items WHERE contractor_id = 56 AND status != 'pending' ORDER BY executed_at DESC;\""

# Check goal progress updates
powershell -Command ".\quick-db.bat \"SELECT id, goal_description, current_progress, last_action_at FROM ai_concierge_goals WHERE contractor_id = 56 ORDER BY priority_score DESC;\""
```

---

### Day 5: Testing & Validation

**Duration:** 6-8 hours

#### Tasks:
1. **Create Test Script** (2 hours)
   - Create `test-internal-goal-engine.js`
   - Test goal generation for sample contractor
   - Test checklist item creation
   - Test AI conversation with goals injected
   - Test progress tracking

2. **Manual Testing Scenarios** (3 hours)
   - **Scenario 1**: New contractor → goals generated automatically
   - **Scenario 2**: Contractor asks question → AI weaves in data gap question
   - **Scenario 3**: Data collected → checklist item marked complete
   - **Scenario 4**: Goal completed → new goal generated
   - **Scenario 5**: Post-event → goals updated with event insights

3. **Validation Checks** (2 hours)
   - Verify goals never leak into contractor-facing messages
   - Verify checklist triggers fire correctly
   - Verify progress calculations accurate
   - Verify foreign keys maintain integrity
   - Check performance (goals shouldn't slow down responses)

4. **Bug Fixes & Refinements** (1 hour)
   - Address any issues found in testing
   - Optimize database queries if needed
   - Refine goal generation rules

#### Success Criteria:
- ✅ All test scenarios pass
- ✅ Goals remain hidden from contractor
- ✅ Checklist items execute naturally
- ✅ Progress tracking accurate
- ✅ No performance degradation
- ✅ Zero data leaks to contractor-facing responses

#### Test Script Output:
```bash
node test-internal-goal-engine.js

Expected Output:
✅ Goal Engine Test - Phase 1 Background System
========================================

📋 STEP 1: Goal Generation
  ✅ Generated 3 goals for contractor 56
  ✅ Priority scores: 9, 8, 6
  ✅ Data gaps identified: close_rate, team_size, hiring_timeline

📝 STEP 2: Checklist Creation
  ✅ Created 8 checklist items across 3 goals
  ✅ Triggers set: next_conversation, immediately, post_event

🤖 STEP 3: AI Context Injection
  ✅ System prompt includes internal goals (1,247 characters)
  ✅ Goals section not visible in user-facing messages
  ✅ AI response references data gap naturally

📊 STEP 4: Progress Tracking
  ✅ Checklist item marked "completed"
  ✅ Goal progress updated: 0% → 33%
  ✅ execution_context saved with conversation excerpt

✅ Phase 1: Background Goal Engine - ALL TESTS PASSED
```

---

### Day 6-7: Polish, Documentation & Production Ready

**Duration:** 6-8 hours

#### Tasks:
1. **Error Handling & Edge Cases** (2 hours)
   - Handle contractor with no focus_areas set
   - Handle goals with 0 checklist items
   - Handle database connection failures gracefully
   - Add logging for goal generation and execution

2. **Performance Optimization** (2 hours)
   - Add caching for active goals (5-minute cache)
   - Optimize checklist trigger queries
   - Batch update operations where possible
   - Monitor response time impact

3. **Documentation** (2 hours)
   - Document goal generation logic
   - Document checklist trigger conditions
   - Create examples for common goal types
   - Update AI Concierge docs with goal system

4. **Production Deployment Preparation** (2 hours)
   - Create production migration scripts
   - Test on production database (dry run)
   - Verify all indexes created
   - Prepare rollback plan if needed

#### Success Criteria:
- ✅ All edge cases handled gracefully
- ✅ Response time impact < 100ms
- ✅ Documentation complete and clear
- ✅ Production migration ready
- ✅ Rollback plan documented

---

## 🎯 Phase 1 Success Metrics

### Technical Metrics
- **Goal Generation Success Rate**: 100% of contractors get 2-4 goals
- **Checklist Execution Rate**: 80%+ of triggered items acted upon
- **Data Gap Fill Rate**: 50%+ of missing data collected within 2 weeks
- **Response Time Impact**: < 100ms added to AI response time
- **Zero Data Leaks**: 0 instances of internal goals visible to contractor

### Business Metrics
- **AI Proactivity**: AI asks strategic questions without prompting
- **Data Collection**: Missing contractor data filled naturally
- **Trust Building**: Contractors feel AI "remembers" and "cares"
- **Goal Completion**: 30%+ of goals reach 50%+ progress in 30 days

---

## 🔗 Integration Points

### Existing Systems (VERIFIED)
1. **conversationContext.js**: Inject goals into AI system prompt
2. **aiProcessingService.js**: Check checklist triggers before response
3. **contractors table**: Read profile data for goal generation
4. **contractor_action_items**: Link completed checklist items
5. **contractor_followup_schedules**: Create follow-ups from goals

### New Services (TO CREATE)
1. **goalEngineService.js**: Core goal management logic
2. **checklistExecutor.js**: Trigger evaluation and tracking
3. **dataGapAnalyzer.js**: Identify missing contractor data
4. **progressTracker.js**: Update goal progress automatically

---

## 📚 Related Documents

- **Overview**: `INTERNAL-GOAL-ENGINE-OVERVIEW.md`
- **Pre-Flight Checklist**: `PHASE-1-PRE-FLIGHT-CHECKLIST.md` (create next)
- **Phase 2 Plan**: `phase-2/PHASE-2-IMPLEMENTATION-PLAN.md` (future)
- **Phase 3 Plan**: `phase-3/PHASE-3-IMPLEMENTATION-PLAN.md` (future)

---

## 🚨 Critical Reminders

1. **Goals Must Stay Hidden**: NEVER let internal goals leak into contractor-facing messages
2. **Natural Execution**: Checklist items must feel like natural conversation, not robotic
3. **Database Verification**: ALWAYS verify field names before coding (see Pre-Flight Checklist)
4. **Test Before Commit**: Phase 1 must be fully tested and working before commit
5. **Phase Independence**: Phase 1 must work standalone (Phase 2/3 are enhancements)

---

**Phase 1 Status**: Ready for Pre-Flight Checklist
**Next Step**: Create `PHASE-1-PRE-FLIGHT-CHECKLIST.md`
**Last Updated**: October 22, 2025
