# Internal Goal Engine - Complete Documentation

**Phase 1: Background Goal System**
**Status**: Production-Ready ✅
**Last Updated**: October 22, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Goal Generation Logic](#goal-generation-logic)
4. [Checklist Trigger Conditions](#checklist-trigger-conditions)
5. [API Reference](#api-reference)
6. [Common Use Cases](#common-use-cases)
7. [Error Handling](#error-handling)
8. [Performance](#performance)
9. [Testing](#testing)

---

## Overview

The Internal Goal Engine is a **hidden system** that enables the AI Concierge to maintain goals and checklists for each contractor **without their awareness**. This allows the AI to:

- Proactively guide conversations toward strategic objectives
- Collect missing data naturally
- Track progress toward business milestones
- Personalize recommendations based on contractor stage

### Key Principle

**Goals are NEVER visible to contractors**. They exist only in the AI's system prompt to guide behavior naturally.

---

## Architecture

### Database Tables

#### `ai_concierge_goals`
Stores high-level goals for each contractor.

**Key Fields:**
- `contractor_id` - Links to contractors table
- `goal_type` - Type of goal (revenue_growth, lead_improvement, team_expansion, network_building)
- `goal_description` - Human-readable description
- `priority_score` - 1-10 (higher = more important)
- `current_progress` - 0-100% (auto-calculated from checklist)
- `data_gaps` - JSONB array of missing data fields
- `status` - active, completed, abandoned, blocked

#### `ai_concierge_checklist_items`
Stores specific actions within each goal.

**Key Fields:**
- `goal_id` - Links to ai_concierge_goals
- `contractor_id` - Links to contractors table
- `checklist_item` - Description of action
- `item_type` - data_collection, recommendation, introduction
- `trigger_condition` - When to execute (immediately, next_conversation, post_event, after_data_collected)
- `status` - pending, in_progress, completed, skipped
- `execution_context` - JSONB with conversation details

### Service Layer

**goalEngineService.js** - Core service with functions:
- `generateGoalsForContractor()` - Creates goals based on profile
- `evaluateChecklistTriggers()` - Determines what to act on
- `trackActionExecution()` - Marks items as in-progress
- `completeActionAndUpdateProgress()` - Completes items and updates progress
- `parseResponseForActions()` - Detects AI actions in responses

**conversationContext.js** - Context injection:
- `buildConversationContext()` - Includes internal goals
- `generateInternalGoalsPrompt()` - Formats goals for system prompt

---

## Goal Generation Logic

### Input Data

Goal generation analyzes contractor profile:
- `revenue_tier` - 9 tiers from 0_5_million to 300_plus_million
- `team_size` - Number of employees
- `focus_areas` - JSON array or CSV string of focus areas
- `current_stage` - Business lifecycle stage
- `service_area` - Geographic focus
- `services_offered` - Types of services

### Goal Types & Generation Rules

#### 1. Revenue Growth Goals
**Triggers when:**
- Contractor has revenue_tier set
- Revenue < 300_plus_million

**Priority:**
- 0-5M: Priority 9 (critical for survival)
- 5-20M: Priority 9 (high growth phase)
- 21-50M: Priority 8 (scaling phase)
- 51-150M: Priority 7 (optimization phase)
- 151M+: Priority 5-3 (maintenance)

**Example Checklist Items:**
- "Assess current close rate"
- "Identify revenue growth opportunities"
- "Recommend CRM based on business size"

#### 2. Lead Improvement Goals
**Triggers when:**
- Focus areas include: "controlling_lead_flow", "greenfield_growth", "customer_acquisition"

**Priority:** 9 (always high priority)

**Example Checklist Items:**
- "Understand current lead flow and conversion rate"
- "Assess current CRM usage and lead tracking"
- "Recommend lead generation tools"

#### 3. Team Expansion Goals
**Triggers when:**
- Team size < 50 AND focus areas include "hiring", "team_building", "operational_efficiency"

**Priority:** 8

**Example Checklist Items:**
- "Ask about current hiring challenges"
- "Assess team structure and roles"
- "Recommend hiring resources or partners"

#### 4. Network Building Goals
**Triggers when:**
- Focus areas include: "referral_growth", "strategic_partnerships", "networking"

**Priority:** 7

**Example Checklist Items:**
- "Identify potential peer connections"
- "Recommend networking events"
- "Facilitate partner introductions"

### Data Gap Detection

System automatically detects missing fields:
- revenue_tier
- team_size
- focus_areas
- current_stage
- service_area
- services_offered

These gaps are added to `goal.data_gaps` array and checklist items are created to collect them naturally in conversation.

---

## Checklist Trigger Conditions

### Trigger Types

#### `immediately`
**When:** As soon as possible
**Use for:** Critical data collection, urgent actions
**Example:** "Get current close rate"

#### `next_conversation`
**When:** During any active conversation
**Use for:** General data collection, non-urgent questions
**Example:** "Assess current CRM usage"

#### `post_event`
**When:** After contractor attends an event
**Use for:** Event follow-ups, feedback collection
**Example:** "Request event feedback"

#### `after_data_collected`
**When:** After prerequisite data collection items complete
**Use for:** Recommendations that require data first
**Example:** "Recommend CRM based on close rate"

#### `after_action_completed`
**When:** After specific checklist item completes
**Use for:** Sequential workflows
**Example:** "Schedule demo after partner introduction"

### Trigger Evaluation

Function: `evaluateChecklistTriggers(contractorId, context)`

**Context Parameters:**
```javascript
{
  isInConversation: true,     // Currently in conversation
  isPostEvent: false,          // Just finished event
  recentlyCompletedActions: [], // Recently completed items
  eventId: null                // Event ID if applicable
}
```

**Returns:**
Array of triggered items, sorted by goal priority_score.

---

## API Reference

### Goal Operations

#### `createGoal(goalData)`
Creates a new goal for a contractor.

```javascript
const goal = await goalEngineService.createGoal({
  contractor_id: 56,
  goal_type: 'revenue_growth',
  goal_description: 'Help contractor grow to $10M',
  target_milestone: '$10M annual revenue',
  priority_score: 9,
  data_gaps: ['close_rate', 'lead_sources'],
  trigger_condition: 'immediately'
});
```

#### `getActiveGoals(contractorId)`
Gets all active goals for a contractor, sorted by priority.

```javascript
const goals = await goalEngineService.getActiveGoals(56);
// Returns: Array of goal objects
```

#### `updateGoalProgress(goalId, progress, nextMilestone)`
Manually updates goal progress.

```javascript
await goalEngineService.updateGoalProgress(1, 50, 'Next: Implement CRM');
```

#### `completeGoal(goalId)`
Marks a goal as completed.

```javascript
await goalEngineService.completeGoal(1);
```

### Checklist Operations

#### `createChecklistItem(itemData)`
Creates a checklist item for a goal.

```javascript
const item = await goalEngineService.createChecklistItem({
  goal_id: 1,
  contractor_id: 56,
  checklist_item: 'Ask about current close rate',
  item_type: 'data_collection',
  trigger_condition: 'immediately'
});
```

#### `getActiveChecklist(contractorId)`
Gets all pending checklist items with goal info.

```javascript
const checklist = await goalEngineService.getActiveChecklist(56);
// Returns: Array with goal_description for each item
```

#### `trackActionExecution(itemId, executionContext)`
Marks item as in-progress and saves context.

```javascript
await goalEngineService.trackActionExecution(1, {
  conversation_id: 'conv-123',
  message_id: 'msg-456',
  ai_response_excerpt: 'What is your close rate?'
});
```

#### `completeActionAndUpdateProgress(itemId, completionNotes, executionContext)`
Completes item and auto-updates goal progress.

```javascript
const result = await goalEngineService.completeActionAndUpdateProgress(
  1,
  'Contractor responded: Close rate is 35%',
  {
    data_collected: { close_rate: 35 }
  }
);

console.log(`Goal progress: ${result.goalProgress}%`);
```

### Intelligence Functions

#### `generateGoalsForContractor(contractorId)`
Analyzes contractor profile and generates 2-4 goals with checklists.

```javascript
const result = await goalEngineService.generateGoalsForContractor(56);
/*
Returns: {
  contractor_id: 56,
  goals_created: 2,
  checklist_items_created: 6,
  data_gaps_identified: 3,
  goals: [...],
  checklist: [...],
  data_gaps: ['close_rate', 'team_size', ...]
}
*/
```

#### `evaluateChecklistTriggers(contractorId, context)`
Determines which checklist items should trigger now.

```javascript
const triggered = await goalEngineService.evaluateChecklistTriggers(56, {
  isInConversation: true,
  isPostEvent: false
});
// Returns: Array of triggered items with trigger_reason
```

#### `parseResponseForActions(aiResponse, activeChecklist)`
Parses AI response to detect completed actions.

```javascript
const detected = goalEngineService.parseResponseForActions(
  "What's your close rate?",
  activeChecklist
);
/*
Returns: {
  questionsAsked: ['close rate'],
  recommendationsMade: [],
  matchedChecklistItems: [...]
}
*/
```

---

## Common Use Cases

### Use Case 1: New Contractor Onboarding

```javascript
// 1. Generate goals after contractor completes profile
const result = await goalEngineService.generateGoalsForContractor(contractorId);

// 2. Goals are now active and will appear in AI system prompts
// 3. AI will naturally ask questions to fill data gaps
```

### Use Case 2: AI Conversation with Goal Awareness

```javascript
// 1. Build context (includes internal goals)
const context = await conversationContext.buildConversationContext(contractorId);

// 2. Generate system prompt with goals
const systemPrompt = conversationContext.generateInternalGoalsPrompt(
  context.internalGoals,
  context.internalChecklist
);

// 3. AI sees goals in prompt but contractor never sees them
// 4. AI naturally weaves checklist items into conversation
```

### Use Case 3: Tracking Action Execution

```javascript
// After AI asks a question:
const triggered = await goalEngineService.evaluateChecklistTriggers(contractorId, {
  isInConversation: true
});

if (triggered.length > 0) {
  await goalEngineService.trackActionExecution(triggered[0].id, {
    conversation_id: conversationId,
    ai_response: aiResponse
  });
}

// After contractor responds with data:
await goalEngineService.completeActionAndUpdateProgress(
  triggered[0].id,
  'Contractor provided close rate',
  { data_collected: { close_rate: 42 } }
);
// Goal progress auto-updates!
```

---

## Error Handling

### Edge Cases Handled

1. **Contractor with no focus_areas**
   - System generates generic goals
   - Warning logged, not an error

2. **Goal with 0 checklist items**
   - Progress remains at 0%
   - Warning: `GOAL_NO_CHECKLIST`

3. **Database connection failure**
   - Auto-retry with exponential backoff
   - Max 3 attempts
   - Graceful degradation (AI continues without goals)

4. **Invalid data**
   - Validation before database insertion
   - Clear error messages returned

### Error Handling Functions

See `goalEngineErrorHandler.js`:
- `validateContractorForGoalGeneration()` - Pre-validation
- `handleDatabaseError()` - Standardized error responses
- `retryDatabaseOperation()` - Auto-retry logic

---

## Performance

### Benchmarks (Phase 1)

- **Context build time**: < 50ms (with cache: 0ms)
- **Goal generation**: ~200ms for 2-3 goals
- **Trigger evaluation**: ~50ms for 10 items
- **Progress update**: ~30ms

### Caching

**conversationContext.js** uses 30-second cache:
- Cache key: `context:{contractorId}:{eventId}`
- Automatic cleanup of expired entries
- `clearContractorCache(contractorId)` to force refresh

### Optimization Tips

1. **Batch operations** - Create multiple checklist items in one transaction
2. **Index usage** - All queries use indexed fields (contractor_id, status, priority_score)
3. **Avoid N+1** - Use JOINs for checklist + goal data
4. **Cache aggressively** - Context rarely changes mid-conversation

---

## Testing

### Test Scripts

1. **test-day2-goal-generation.js** - Goal generation logic
2. **test-day3-context-injection.js** - System prompt injection
3. **test-day4-trigger-evaluation.js** - Trigger logic and progress tracking
4. **test-internal-goal-engine.js** - Complete integration test

### Running Tests

```bash
# Full integration test
node test-internal-goal-engine.js

# Individual day tests
node test-day3-context-injection.js
node test-day4-trigger-evaluation.js
```

### Expected Results

✅ 100% test pass rate
✅ Zero data leaks
✅ < 500ms performance
✅ Goals generated for all contractor profiles

---

## Production Deployment

### Prerequisites

1. ✅ Both tables created (ai_concierge_goals, ai_concierge_checklist_items)
2. ✅ All indexes created
3. ✅ Foreign keys enforced
4. ✅ CHECK constraints active

### Migration Scripts

- **Development**: `tpe-database/migrations/create-internal-goal-engine-tables.js`
- **Production**: `tpe-database/migrations/create-internal-goal-engine-tables-production.js`

### Rollback Plan

If issues occur:
1. Goals are non-blocking - AI continues without them
2. Drop tables if needed: `DROP TABLE ai_concierge_checklist_items, ai_concierge_goals;`
3. Re-run migration scripts

---

## FAQ

### Q: Can contractors see their internal goals?
**A:** No. Goals exist only in the AI's system prompt. They never appear in contractor-facing responses, API responses, or UI.

### Q: What happens if goal generation fails?
**A:** AI Concierge continues normally without goals. Goals are an enhancement, not a requirement.

### Q: How often are goals regenerated?
**A:** Goals are generated once when contractor completes profile. New goals can be added manually or via future phases.

### Q: Can I manually create goals?
**A:** Yes, use `createGoal()` API with custom goal_type and description.

### Q: How do I debug goal behavior?
**A:** Check console logs for `[Goal Engine]` prefix. All operations are logged with timestamps and context.

---

**Phase 1 Complete**: Background Goal System ✅
**Next Phase**: Pattern Library (Phase 2) - Learn from contractor cohorts
**Future Phase**: Predictive Goals (Phase 3) - Anticipate needs before they arise
