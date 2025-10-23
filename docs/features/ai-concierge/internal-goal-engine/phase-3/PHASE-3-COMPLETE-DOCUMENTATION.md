# Phase 3: Proactive Behavior & Evolution - Complete Documentation
**Status**: ✅ Complete
**Last Updated**: October 23, 2025
**Version**: 1.0.0

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Services](#services)
4. [Database Schema](#database-schema)
5. [Safeguards](#safeguards)
6. [Message Templates](#message-templates)
7. [Triggers & Scheduling](#triggers--scheduling)
8. [Trust System](#trust-system)
9. [Goal Evolution](#goal-evolution)
10. [Testing](#testing)
11. [Production Deployment](#production-deployment)
12. [Troubleshooting](#troubleshooting)

---

## Overview

### What is Phase 3?

Phase 3 implements AI-initiated conversations that make the AI Concierge proactive rather than reactive. The system:

- **Schedules proactive messages** based on goal progress and contractor behavior
- **Asks strategic questions** to fill data gaps naturally
- **Schedules intelligent follow-ups** with context awareness
- **Evolves goals** based on contractor responses and behavior
- **Builds trust** through memory and appropriate proactivity

### Key Principles

1. **Never Spam**: Max 1 proactive message per 2 days
2. **Always Natural**: Questions feel conversational, never robotic
3. **Respect Trust**: Reduce proactivity if trust score drops
4. **Memory Matters**: Reference past interactions
5. **Learn & Adapt**: Goals evolve based on responses

---

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     PHASE 3 ARCHITECTURE                     │
└─────────────────────────────────────────────────────────────┘

[Phase 1: Goals] ──┐
                   │
[Phase 2: Patterns]├──> [Proactive Trigger Evaluation]
                   │            │
[Contractor Data] ─┘            │
                                ▼
                    [Safeguards Check]
                        (4 layers)
                                │
                     Pass       │      Fail
                        ▼       │       ▼
               [Message Generation] [Log & Pause]
                        │
                        ▼
           [Template + Personalization]
                        │
                        ▼
                 [Schedule Message]
                        │
                        ▼
                [Contractor Response]
                        │
         ┌──────────────┴──────────────┐
         ▼                              ▼
  [Question Asked]              [Follow-up Needed]
         │                              │
         ▼                              ▼
  [Answer Received]            [Schedule Follow-up]
         │                              │
         ▼                              ▼
  [Fill Data Gaps]              [Send Follow-up]
         │                              │
         └──────────────┬───────────────┘
                        ▼
                [Goal Evolution]
                        │
                        ▼
                [Trust Tracking]
                        │
                        ▼
             [Behavior Adjustment]
```

---

## Services

### 1. proactiveMessageService.js

**Purpose**: Schedule and manage AI-initiated messages

**Key Functions**:
- `scheduleProactiveMessage(messageData)` - Schedule a message
- `generateFollowUpMessage(contractorId, context)` - Generate follow-up
- `trackMessageOutcome(messageId, outcome)` - Track response
- `evaluateProactiveTriggers(contractorId)` - Check if should send
- `getScheduledMessages(filters)` - Get pending messages
- `markMessageAsSent(messageId)` - Mark as sent

**Database**: `ai_proactive_messages` (14 columns)

**Usage Example**:
```javascript
const proactiveMessageService = require('./services/proactiveMessageService');

const message = await proactiveMessageService.scheduleProactiveMessage({
  contractor_id: 123,
  message_type: 'check_in',
  message_content: 'Hey John, how\'s revenue growth going?',
  ai_reasoning: 'Goal has no updates in 7 days',
  context_data: { goal_id: 456 }
});
```

---

### 2. questionGenerationService.js

**Purpose**: Generate natural strategic questions to fill data gaps

**Key Functions**:
- `generateStrategicQuestion(contractorId, dataGapField, goalId)` - Generate question
- `identifyDataGaps(contractorId)` - Find missing data
- `prioritizeDataGaps(gaps)` - Rank by importance
- `trackQuestionAnswer(questionId, answer, quality)` - Record answer
- `getQuestionEffectiveness(contractorId)` - Get metrics
- `getNextBestQuestion(contractorId, goalId)` - Get next question

**Database**: `ai_question_log` (14 columns)

**Question Types**:
- `clarifying` - Clarify existing information
- `exploratory` - Discover new information
- `validating` - Confirm assumptions
- `prioritizing` - Understand priorities
- `reflecting` - Encourage reflection

**Usage Example**:
```javascript
const questionService = require('./services/questionGenerationService');

const question = await questionService.generateStrategicQuestion(
  contractorId,
  'revenue_target', // data gap field
  goalId
);
// Returns: { question_text: "What's your revenue target for next year?", ... }
```

---

### 3. enhancedFollowUpService.js

**Purpose**: Schedule intelligent follow-ups based on goals and trust

**Key Functions**:
- `scheduleGoalDrivenFollowUp(followUpData)` - Schedule follow-up
- `generateContextAwareFollowUp(contractorId, context)` - Generate message
- `getContractorResponseTiming(contractorId)` - Analyze patterns
- `autoCancelCompletedFollowUps(actionItemId)` - Cancel if done
- `getPendingFollowUps(filters)` - Get scheduled
- `markFollowUpAsSent(followUpId)` - Mark as sent

**Database**: `contractor_followup_schedules` (21 columns)

**Follow-up Types**:
- `check_in` - General progress check
- `reminder` - Action item reminder
- `status_update` - Request update
- `offer_help` - Offer assistance
- `completion_confirmation` - Confirm completion

**Usage Example**:
```javascript
const followUpService = require('./services/enhancedFollowUpService');

const followUp = await followUpService.scheduleGoalDrivenFollowUp({
  contractor_id: 123,
  goal_id: 456,
  followup_type: 'check_in',
  days_until_followup: 5,
  context_hints: { milestone: 'First hire' }
});
// Automatically adjusts timing based on contractor response patterns
```

---

### 4. goalEvolutionService.js

**Purpose**: Adapt goals based on contractor behavior and responses

**Key Functions**:
- `evolveGoal(evolutionData)` - Evolve a goal
- `adjustGoalsBasedOnBehavior(contractorId)` - Auto-adjust priorities
- `generateNewGoal(goalData)` - Create new goal
- `analyzeAbandonedGoals(contractorId)` - Learn from abandoned
- `getGoalEvolutionHistory(goalId)` - Get history

**Database**: `ai_goal_evolution_log` (15 columns)

**Evolution Types**:
- `refinement` - Clarify existing goal
- `expansion` - Broaden scope
- `pivot` - Change direction
- `milestone_adjustment` - Update milestones
- `priority_change` - Adjust priority
- `goal_completion` - Mark complete

**Auto-Adjustment Logic**:
- **Active** (action ≤7 days): Priority +1
- **Stalled** (30-59 days): Priority -2
- **Abandoned** (60+ days): Status → abandoned

**Usage Example**:
```javascript
const goalEvolutionService = require('./services/goalEvolutionService');

const evolution = await goalEvolutionService.evolveGoal({
  goal_id: 456,
  evolution_type: 'expansion',
  evolved_description: 'Hire 2 sales people and expand to 3 new states',
  reason: 'Contractor shared expansion plans in conversation',
  confidence: 0.9,
  relevance_score: 9,
  auto_approve: true // High confidence
});
```

---

### 5. trustMemoryService.js

**Purpose**: Track trust-building moments and adjust AI behavior

**Key Functions**:
- `trackTrustEvent(eventData)` - Log trust event
- `getTrustScore(contractorId)` - Get current score
- `getTrustLevel(score)` - Get level label
- `getRelevantMemories(contractorId, filters)` - Retrieve memories
- `injectMemoryIntoMessage(contractorId, message, options)` - Add context
- `getAIBehaviorSettings(contractorId)` - Get behavior adjustments
- `getTrustHistory(contractorId, limit)` - Get history

**Database**: `ai_trust_indicators` (10 columns)

**Trust Indicator Types** (with impact):
- `positive_feedback` (+5)
- `acted_on_suggestion` (+8)
- `milestone_achieved` (+10)
- `shared_vulnerability` (+7)
- `asked_for_help` (+6)
- `setback_shared` (+4)
- `negative_feedback` (-5)
- `ignored_suggestion` (-2)

**Trust Levels** (0-100 scale):
- **0-20**: Very Low (Building Trust)
- **21-40**: Low (Establishing)
- **41-60**: Medium (Trusted Advisor)
- **61-80**: High (Highly Trusted)
- **81-100**: Very High (Complete Trust)

**Behavior Adjustments**:
| Trust Score | Proactive Frequency | Question Boldness | Follow-up Timing |
|-------------|---------------------|-------------------|------------------|
| 80+ | High (2-3 days) | Bold | Flexible |
| 60-79 | Normal (5-7 days) | Moderate | Standard |
| 40-59 | Low (10-14 days) | Moderate | Standard |
| 20-39 | Minimal (30+ days) | Gentle | Conservative |
| <20 | **PAUSED** | None | None |

**Usage Example**:
```javascript
const trustMemoryService = require('./services/trustMemoryService');

// Track trust event
await trustMemoryService.trackTrustEvent({
  contractor_id: 123,
  indicator_type: 'acted_on_suggestion',
  description: 'Contractor scheduled recommended demo call'
});

// Get behavior settings
const behavior = await trustMemoryService.getAIBehaviorSettings(123);
// Returns: { proactive_frequency: 'normal', question_boldness: 'moderate', ... }
```

---

### 6. proactiveSafeguardsService.js

**Purpose**: Prevent spam and enforce safety rules

**Key Functions**:
- `canSendProactiveMessage(contractorId)` - Check all safeguards
- `checkLastMessageTime(contractorId)` - Anti-spam check
- `checkIgnoredMessages(contractorId)` - Ignored message check
- `checkTrustScore(contractorId)` - Trust level check
- `checkComplaintStatus(contractorId)` - Complaint check
- `emergencyStop(contractorId, reason, days)` - Pause all messages
- `resumeProactiveMessaging(contractorId)` - Resume
- `getSafeguardStatus(contractorId)` - Get full status

**Safeguard Rules**:

| Rule | Threshold | Action |
|------|-----------|--------|
| **Last Message** | < 2 days | Block until 2 days pass |
| **Ignored Messages** | 3 in a row | Pause for 7 days |
| **Trust Score** | < 20 | Pause until score improves |
| **Complaint** | Any complaint | Pause for 30 days |

**Usage Example**:
```javascript
const safeguardsService = require('./services/proactiveSafeguardsService');

const check = await safeguardsService.canSendProactiveMessage(123);

if (check.can_send) {
  // Send message
} else {
  console.log('Blocked:', check.reasons);
  // [{ rule: 'MIN_DAYS_BETWEEN_MESSAGES', message: 'Must wait 12 more hours' }]
}
```

---

### 7. messageTemplateService.js

**Purpose**: Generate natural, personalized messages

**Key Functions**:
- `generatePersonalizedMessage(messageConfig)` - Generate message
- `getRecommendedStyle(contractorId)` - Get best style
- `validateMessage(message)` - Check quality
- `buildPersonalizationData(contractorId, context)` - Get data
- `personalizeTemplate(template, data)` - Fill placeholders

**Message Styles**:
- `casual` - "Hey John, how's it going?"
- `professional` - "Hi John, following up on..."
- `friendly` - "Hey John! Hope you're doing well..."

**Forbidden Phrases** (NEVER use):
- "as per"
- "please provide"
- "I am here to"
- "let me help you"
- "based on my analysis"
- "as an AI"

**Personalization Variables**:
- `{name}` - Contractor first name
- `{goal}` - Goal description
- `{milestone}` - Milestone name
- `{resource}` - Resource name
- `{progress_metric}` - Progress description
- `{issue}` - Issue/challenge
- `{achievement}` - Achievement description

**Usage Example**:
```javascript
const templateService = require('./services/messageTemplateService');

const message = await templateService.generatePersonalizedMessage({
  contractor_id: 123,
  message_type: 'check_in',
  style: 'friendly',
  context: {
    goal_id: 456,
    include_pattern_data: true
  }
});
// Returns: "Hey John! Just wanted to see how revenue growth is going for you."
```

---

## Database Schema

### ai_proactive_messages (14 columns)

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| contractor_id | INTEGER | FK to contractors |
| message_type | TEXT | Type of message (CHECK constraint) |
| message_content | TEXT | Actual message text |
| ai_reasoning | TEXT | Why AI sent this |
| context_data | JSONB | Additional context |
| sent_at | TIMESTAMP | When sent (nullable) |
| contractor_response | TEXT | Contractor reply (nullable) |
| response_received_at | TIMESTAMP | When replied (nullable) |
| conversation_continued | BOOLEAN | Did conversation continue |
| outcome_rating | INTEGER | Rating 1-5 (nullable) |
| led_to_action | BOOLEAN | Did it lead to action |
| created_at | TIMESTAMP | Record created |
| updated_at | TIMESTAMP | Record updated |

**CHECK Constraints**:
```sql
CHECK (message_type IN ('check_in', 'milestone_follow_up', 'resource_suggestion',
                        'encouragement', 'course_correction', 'celebration'))
CHECK (outcome_rating >= 1 AND outcome_rating <= 5)
```

---

### ai_question_log (14 columns)

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| contractor_id | INTEGER | FK to contractors |
| goal_id | INTEGER | FK to contractor_goals (nullable) |
| question_text | TEXT | The question asked |
| question_purpose | TEXT | Why asking |
| question_type | TEXT | Type of question (CHECK constraint) |
| asked_at | TIMESTAMP | When asked |
| contractor_answer | TEXT | Answer (nullable) |
| answer_received_at | TIMESTAMP | When answered (nullable) |
| answer_quality_score | INTEGER | Quality 1-5 (nullable) |
| led_to_goal_refinement | BOOLEAN | Did answer refine goal |
| question_naturalness_score | INTEGER | Naturalness 1-5 |
| created_at | TIMESTAMP | Record created |
| updated_at | TIMESTAMP | Record updated |

**CHECK Constraints**:
```sql
CHECK (question_type IN ('clarifying', 'exploratory', 'validating',
                         'prioritizing', 'reflecting'))
CHECK (answer_quality_score >= 1 AND answer_quality_score <= 5)
CHECK (question_naturalness_score >= 1 AND question_naturalness_score <= 5)
```

---

### ai_goal_evolution_log (15 columns)

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| goal_id | INTEGER | FK to contractor_goals |
| contractor_id | INTEGER | FK to contractors |
| evolution_type | TEXT | Type of evolution (CHECK constraint) |
| original_description | TEXT | Original goal text |
| evolved_description | TEXT | New goal text |
| original_milestones | JSONB | Original milestones (nullable) |
| evolved_milestones | JSONB | New milestones (nullable) |
| reason_for_evolution | TEXT | Why it evolved |
| ai_confidence_in_change | DECIMAL | Confidence 0-1 |
| contractor_approved | BOOLEAN | Approved by contractor |
| goal_relevance_score | INTEGER | Relevance 1-10 |
| evolved_at | TIMESTAMP | When evolved |
| created_at | TIMESTAMP | Record created |
| updated_at | TIMESTAMP | Record updated |

**CHECK Constraints**:
```sql
CHECK (evolution_type IN ('refinement', 'expansion', 'pivot',
                          'milestone_adjustment', 'priority_change', 'goal_completion'))
CHECK (ai_confidence_in_change >= 0 AND ai_confidence_in_change <= 1)
CHECK (goal_relevance_score >= 1 AND goal_relevance_score <= 10)
```

---

### ai_trust_indicators (10 columns)

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key |
| contractor_id | INTEGER | FK to contractors |
| indicator_type | TEXT | Type of trust event (CHECK constraint) |
| indicator_description | TEXT | What happened |
| context_data | JSONB | Additional context (nullable) |
| confidence_impact | INTEGER | Impact -10 to +10 |
| cumulative_trust_score | DECIMAL | Running score 0-100 |
| recorded_at | TIMESTAMP | When recorded |
| created_at | TIMESTAMP | Record created |
| updated_at | TIMESTAMP | Record updated |

**CHECK Constraints**:
```sql
CHECK (indicator_type IN ('positive_feedback', 'negative_feedback', 'ignored_suggestion',
                          'acted_on_suggestion', 'shared_vulnerability', 'asked_for_help',
                          'milestone_achieved', 'setback_shared'))
CHECK (confidence_impact >= -10 AND confidence_impact <= 10)
CHECK (cumulative_trust_score >= 0 AND cumulative_trust_score <= 100)
```

---

## Safeguards

### 4-Layer Protection System

**Layer 1: Time-Based Anti-Spam**
- Minimum 2 days (48 hours) between proactive messages
- Calculated from `sent_at` of last message
- Blocks ALL message types until threshold met

**Layer 2: Ignored Message Detection**
- Tracks consecutive ignored messages (no `contractor_response`)
- After 3 ignored messages → 7-day pause
- Pause resets after contractor responds to ANY message

**Layer 3: Trust Score Gating**
- Minimum trust score: 20/100
- Below threshold → all proactive messaging paused
- Requires positive trust events to resume

**Layer 4: Complaint/Emergency Stop**
- Contractor can request pause via preferences
- Stored in `contractors.ai_proactive_paused`
- Default pause: 30 days
- Can be resumed manually or auto-expires

### Safeguard Decision Tree

```
Can Send Proactive Message?
│
├─ Last message < 2 days ago? → NO → Block (hours remaining)
│
├─ 3+ ignored messages? → YES → Block (7-day pause)
│
├─ Trust score < 20? → YES → Block (improve trust first)
│
├─ Contractor complained? → YES → Block (30-day pause)
│
└─ All checks pass → YES → Can send message
```

---

## Message Templates

### Template Structure

Each message type has 3 styles (casual, professional, friendly) with 4 variants each.

**Total**: 6 message types × 3 styles × 4 variants = **72 templates**

### Message Types

1. **check_in** - General progress check
2. **milestone_follow_up** - Follow up on specific milestone
3. **resource_suggestion** - Recommend resource
4. **encouragement** - Celebrate progress
5. **course_correction** - Address issue
6. **celebration** - Celebrate achievement

### Quality Validation

Every generated message is validated for:
- ✅ No forbidden phrases (10 phrases blocked)
- ✅ Length (20-300 characters)
- ✅ Max 2 question marks
- ✅ Max 2 exclamation marks
- ✅ Quality score 1-5 (must be ≥3)

---

## Triggers & Scheduling

### Proactive Trigger Evaluation

**Evaluated Every**: 1 hour (via cron job)

**Trigger Conditions**:

1. **Goal Stalled** (no progress in 7+ days)
   - Message Type: `check_in`
   - Priority: Medium

2. **Data Gap Identified** (missing critical info)
   - Message Type: `check_in` with question
   - Priority: High

3. **Milestone Approaching** (within 3 days)
   - Message Type: `milestone_follow_up`
   - Priority: High

4. **Pattern Insight Available** (new pattern match)
   - Message Type: `resource_suggestion`
   - Priority: Low

5. **Action Item Overdue** (past due date)
   - Message Type: `reminder`
   - Priority: High

### Scheduling Logic

```javascript
// Pseudo-code for scheduling
function scheduleProactiveMessage(contractor, trigger) {
  // 1. Check safeguards
  const safeguards = canSendProactiveMessage(contractor.id);
  if (!safeguards.can_send) return;

  // 2. Get trust score and adjust timing
  const trustScore = getTrustScore(contractor.id);
  const baseDays = 3;
  const adjustedDays = trustScore > 60 ? baseDays * 0.7 : baseDays;

  // 3. Generate personalized message
  const style = getRecommendedStyle(contractor.id);
  const message = generatePersonalizedMessage({
    contractor_id: contractor.id,
    message_type: trigger.type,
    style: style,
    context: trigger.context
  });

  // 4. Schedule for future send
  const scheduledTime = new Date();
  scheduledTime.setDate(scheduledTime.getDate() + adjustedDays);

  scheduleProactiveMessage({
    contractor_id: contractor.id,
    message_type: trigger.type,
    message_content: message.message_content,
    ai_reasoning: trigger.reason,
    context_data: message.personalization_data,
    scheduled_time: scheduledTime
  });
}
```

---

## Trust System

### Trust Score Calculation

**Formula**: Cumulative addition/subtraction of trust impacts

```javascript
newScore = Math.max(0, Math.min(100, currentScore + impact))
```

**Starting Score**: 50 (neutral)

### Trust Events

| Event | Impact | Example |
|-------|--------|---------|
| Positive Feedback | +5 | "Thanks, this was helpful!" |
| Acted on Suggestion | +8 | Scheduled recommended demo |
| Milestone Achieved | +10 | Completed major goal |
| Shared Vulnerability | +7 | Shared challenge openly |
| Asked for Help | +6 | Proactively requested guidance |
| Setback Shared | +4 | Shared failure/setback |
| Negative Feedback | -5 | "This isn't relevant to me" |
| Ignored Suggestion | -2 | No response to message |

### Memory Integration

**Memory Sources**:
1. **Proactive Messages** - Past conversations
2. **Action Items** - Completed or in-progress
3. **Goals** - Active goals and progress

**Memory Retrieval**:
```javascript
const memories = await getRelevantMemories(contractorId, { limit: 3 });
// Returns: [{
//   type: 'proactive_message',
//   content: 'How is hiring going?',
//   response: 'Made first hire last week!',
//   date: '2025-10-15'
// }, ...]
```

**Memory Injection**:
```javascript
const enhanced = await injectMemoryIntoMessage(
  contractorId,
  'How is progress going this week?',
  { include_past_conversation: true, include_achievements: true }
);
// Returns: "Remember when we talked about hiring? Great work on making
//           your first hire! How is progress going this week?"
```

---

## Goal Evolution

### Evolution Triggers

1. **Contractor Response** - Answer reveals new direction
2. **Time-Based** - 30+ days no action
3. **Pattern Match** - New pattern suggests adjustment
4. **Milestone Completion** - Goal achieved
5. **External Event** - Business change

### Auto-Approval Logic

**Auto-Approve if**:
- Confidence ≥ 0.85 (85%)
- Evolution type is `refinement` or `milestone_adjustment`
- Trust score > 60

**Require Approval if**:
- Confidence < 0.85
- Evolution type is `pivot` or `goal_completion`
- Major change to goal scope

### Abandoned Goal Analysis

```javascript
const analysis = await analyzeAbandonedGoals(contractorId);
// Returns: {
//   abandoned_by_type: [
//     { goal_type: 'revenue_growth', count: 3, avg_days_active: 45 }
//   ],
//   common_reasons: [
//     { reason: 'Goal too ambitious', occurrences: 2 }
//   ],
//   insights: [
//     'Revenue growth goals abandoned quickly (avg 45 days). May be too ambitious.'
//   ]
// }
```

---

## Testing

### Test Coverage

**Total Tests**: 56/56 passing (100%)

| Day | Service | Tests | Status |
|-----|---------|-------|--------|
| 1 | proactiveMessageService | 10 | ✅ |
| 2 | questionGenerationService | 10 | ✅ |
| 3 | enhancedFollowUpService | 12 | ✅ |
| 4 | goalEvolutionService | 10 | ✅ |
| 5 | trustMemoryService | 10 | ✅ |
| 6 | E2E Integration | 4 | ✅ |

### Running Tests

```bash
# Day 1: Proactive Messaging
node test-day1-proactive-messaging.js

# Day 2: Strategic Questions
node test-day2-question-generation.js

# Day 3: Enhanced Follow-ups
node test-day3-enhanced-followup.js

# Day 4: Goal Evolution
node test-day4-goal-evolution.js

# Day 5: Trust & Memory
node test-day5-trust-memory.js

# Day 6: E2E Integration
node test-day6-e2e-integration.js
```

### E2E Test Flow

```
Test 1: Complete 8-Step Flow
├─ Generate goal
├─ Ask strategic question
├─ Receive contractor answer
├─ Fill data gaps
├─ Schedule proactive message
├─ Schedule follow-up
├─ Evolve goal based on response
└─ Track trust event

Test 2: Cross-Phase Integration
├─ Phase 1: Pattern match
├─ Phase 2: Infer goal from pattern
└─ Phase 3: Send proactive message with context

Test 3: Message Quality
├─ Generate message with memory
├─ Validate no robotic phrases
├─ Check naturalness score
└─ Verify context awareness

Test 4: Performance
├─ Check anti-spam protection
├─ Measure query speed (<2ms)
├─ Validate scheduling accuracy
└─ Test behavior calculation
```

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] All 56 tests passing locally
- [ ] Database migration script prepared
- [ ] Phase 3 tables exist in production
- [ ] All indexes created
- [ ] Safeguards tested
- [ ] Message templates validated
- [ ] Rollback plan documented

### Deployment Steps

1. **Verify Production Database**
```bash
# Check tables exist
PGPASSWORD='dBP0wer100!!' psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -c "SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'ai_%' ORDER BY table_name;"
```

2. **Deploy Services**
```bash
# Copy services to production
scp -r tpe-backend/src/services/*.js production:/path/to/services/
```

3. **Run Smoke Tests**
```bash
# Test basic functionality
node test-production-smoke.js
```

4. **Enable Cron Job**
```bash
# Add to crontab (every hour)
0 * * * * node /path/to/evaluateProactiveTriggers.js
```

5. **Monitor**
```bash
# Check logs
tail -f /var/log/ai-concierge.log
```

### Rollback Plan

**If issues arise**:

1. Pause all proactive messaging:
```sql
UPDATE contractors SET ai_proactive_paused = true;
```

2. Stop cron job
3. Roll back service files
4. Investigate logs
5. Fix issues
6. Re-deploy

---

## Troubleshooting

### Common Issues

**Issue**: Messages not sending
- **Check**: Safeguards status (`getSafeguardStatus`)
- **Check**: Last message time
- **Check**: Trust score
- **Solution**: Review blocking reasons

**Issue**: Messages feel robotic
- **Check**: Template validation results
- **Check**: Forbidden phrases list
- **Solution**: Add more casual templates

**Issue**: Too many messages
- **Check**: Anti-spam protection working
- **Check**: MIN_DAYS_BETWEEN_MESSAGES setting
- **Solution**: Increase minimum days

**Issue**: Low response rate
- **Check**: Message style performance
- **Check**: Trust score trends
- **Solution**: Switch to recommended style

**Issue**: Goals not evolving
- **Check**: Confidence thresholds
- **Check**: Contractor response data
- **Solution**: Lower auto-approve threshold

### Debug Commands

```javascript
// Check safeguard status
const status = await proactiveSafeguardsService.getSafeguardStatus(contractorId);
console.log('Can send:', status.can_send_message);
console.log('Reasons:', status.blocking_reasons);

// Check trust score
const trust = await trustMemoryService.getTrustScore(contractorId);
console.log('Trust score:', trust.score);
console.log('Trust level:', trust.level.label);

// Check pending messages
const pending = await proactiveMessageService.getScheduledMessages({
  contractor_id: contractorId
});
console.log('Pending:', pending.length);

// Check question effectiveness
const effectiveness = await questionGenerationService.getQuestionEffectiveness(contractorId);
console.log('Answer rate:', effectiveness.answer_rate + '%');
```

---

## Success Metrics

### Technical Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Proactive Send Rate | 70%+ | TBD |
| Response Rate | 50%+ | TBD |
| Question Answer Rate | 60%+ | TBD |
| Goal Evolution Accuracy | 80%+ | TBD |

### Business Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Avg Trust Score (30 days) | 40+ | TBD |
| Data Gap Fill Rate | 70%+ | TBD |
| Goal Advancement | 40%+ | TBD |
| Satisfaction Rating | 8/10+ | TBD |

### Engagement Metrics

| Metric | Target | Current |
|--------|--------|---------|
| Contractor-Initiated Increase | +30% | TBD |
| Action Item Completion | 50%+ | TBD |
| Follow-up Response Rate | 60%+ | TBD |
| Spam Complaints | 0 | TBD |

---

## Related Documentation

- [PHASE-3-IMPLEMENTATION-PLAN.md](./PHASE-3-IMPLEMENTATION-PLAN.md) - Original plan
- [PHASE-3-PRE-FLIGHT-CHECKLIST.md](./PHASE-3-PRE-FLIGHT-CHECKLIST.md) - Database verification
- [INTERNAL-GOAL-ENGINE-OVERVIEW.md](../INTERNAL-GOAL-ENGINE-OVERVIEW.md) - Full system overview
- [Phase 1 Documentation](../phase-1/) - Background goal engine
- [Phase 2 Documentation](../phase-2/) - Pattern learning

---

**Phase 3 Status**: ✅ Complete and Production-Ready
**Last Updated**: October 23, 2025
**Next Phase**: Integration with SMS and web chat interfaces
