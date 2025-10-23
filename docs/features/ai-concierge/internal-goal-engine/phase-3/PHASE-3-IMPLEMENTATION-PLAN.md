# Phase 3: Proactive Behavior & Evolution - Implementation Plan

**Feature:** AI Concierge Internal Goal Engine
**Phase:** 3 of 3 - Proactive Behavior & Evolution
**Timeline:** 5-7 days
**Status:** READY FOR IMPLEMENTATION

---

## 📋 Overview

### What This Phase Delivers
**Proactive Behavior & Evolution** is the final phase that transforms the AI Concierge from a reactive assistant into a proactive business partner that initiates conversations, schedules its own follow-ups, and continuously improves based on contractor responses.

**Key Deliverables:**
1. Proactive message initiation system (AI starts conversations)
2. Enhanced follow-up scheduler (AI schedules based on goals)
3. Natural question asking engine (fills data gaps conversationally)
4. Goal evolution logic (goals adapt based on contractor behavior)
5. Trust-building memory system (remembers and references past interactions)

**What It Enables:**
- AI initiates conversations without being prompted
- AI schedules follow-ups based on internal goals
- AI asks strategic questions naturally during conversation
- Goals evolve based on contractor progress and feedback
- AI feels like it's "always working" for the contractor

---

## 🗄️ Database Schema Verification

### VERIFIED: Existing Tables (Integration Points)

#### From Phase 1 (Background Goal Engine)
```sql
-- ai_concierge_goals (17 columns)
-- Core goal system with triggers and priorities

-- ai_concierge_checklist_items (13 columns)
-- Checklist items that drive AI actions
```

#### From Phase 2 (Pattern Learning)
```sql
-- business_growth_patterns (21 columns)
-- Success patterns from contractor cohorts

-- contractor_pattern_matches (11 columns)
-- Pattern matches for contractors

-- pattern_success_tracking (13 columns)
-- Tracks pattern effectiveness
```

#### Existing Proactive Systems
```sql
-- contractor_followup_schedules (21 columns)
-- Follow-up scheduling system

-- contractor_action_items (27 columns)
-- Action items AI creates

-- ai_concierge_sessions (existing)
-- Conversation history and context
```

### NEW TABLES: Phase 3 Proactive Schema

#### ai_proactive_messages
**Purpose:** AI-initiated messages and their outcomes

```sql
CREATE TABLE ai_proactive_messages (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  goal_id INTEGER REFERENCES ai_concierge_goals(id) ON DELETE SET NULL,
  checklist_item_id INTEGER REFERENCES ai_concierge_checklist_items(id) ON DELETE SET NULL,

  -- Message Details
  message_type VARCHAR(100) NOT NULL,  -- 'follow_up', 'data_collection', 'recommendation', 'check_in'
  message_content TEXT NOT NULL,  -- AI's proactive message
  message_trigger VARCHAR(100),  -- What triggered this: 'scheduled', 'goal_priority', 'event_based'

  -- Timing
  scheduled_send_time TIMESTAMP NOT NULL,
  actual_send_time TIMESTAMP,

  -- Outcome
  contractor_responded BOOLEAN DEFAULT FALSE,
  response_time_minutes INTEGER,  -- How long until response
  response_sentiment VARCHAR(50),  -- 'positive', 'neutral', 'negative', 'ignored'

  -- Effectiveness
  goal_advanced BOOLEAN DEFAULT FALSE,  -- Did this help achieve goal?
  data_collected JSONB,  -- Data gaps filled
  action_taken BOOLEAN DEFAULT FALSE,  -- Did contractor take action?

  -- Status
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'sent', 'responded', 'ignored', 'cancelled')),

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contractor_proactive ON ai_proactive_messages(contractor_id, status);
CREATE INDEX idx_scheduled_time ON ai_proactive_messages(scheduled_send_time, status);
CREATE INDEX idx_goal_messages ON ai_proactive_messages(goal_id, status);
```

#### ai_question_log
**Purpose:** Tracks AI's strategic questions and success rates

```sql
CREATE TABLE ai_question_log (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  goal_id INTEGER REFERENCES ai_concierge_goals(id) ON DELETE SET NULL,

  -- Question Details
  question_text TEXT NOT NULL,
  question_purpose VARCHAR(100),  -- 'data_gap_fill', 'goal_validation', 'pattern_check', 'trust_building'
  data_gap_targeted VARCHAR(100),  -- Which field AI is trying to fill

  -- Context
  conversation_context JSONB,  -- What led to this question
  asked_at TIMESTAMP DEFAULT NOW(),

  -- Response
  contractor_answered BOOLEAN DEFAULT FALSE,
  answer_received TEXT,
  data_gap_filled BOOLEAN DEFAULT FALSE,

  -- Effectiveness
  question_naturalness_score INTEGER CHECK (question_naturalness_score BETWEEN 1 AND 5),  -- How natural it felt
  goal_progress_impact INTEGER,  -- Did this advance goal? (0-100%)

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contractor_questions ON ai_question_log(contractor_id, data_gap_filled);
CREATE INDEX idx_goal_questions ON ai_question_log(goal_id, contractor_answered);
CREATE INDEX idx_question_effectiveness ON ai_question_log(data_gap_filled, question_naturalness_score);
```

#### ai_goal_evolution_log
**Purpose:** Tracks how goals change based on contractor behavior

```sql
CREATE TABLE ai_goal_evolution_log (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES ai_concierge_goals(id) ON DELETE CASCADE,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

  -- Evolution Details
  evolution_type VARCHAR(100) NOT NULL,  -- 'priority_change', 'milestone_update', 'status_change', 'abandoned'
  previous_state JSONB,  -- Goal state before change
  new_state JSONB,  -- Goal state after change

  -- Reason
  evolution_reason TEXT,  -- Why goal evolved
  trigger_event VARCHAR(100),  -- 'contractor_feedback', 'pattern_update', 'inactivity', 'goal_completed'

  -- Impact
  contractor_engagement_change INTEGER,  -- Did engagement improve? (-100 to +100)
  goal_relevance_score INTEGER CHECK (goal_relevance_score BETWEEN 1 AND 10),  -- How relevant is goal now?

  -- Metadata
  evolved_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_goal_evolution ON ai_goal_evolution_log(goal_id, evolution_type);
CREATE INDEX idx_contractor_evolution ON ai_goal_evolution_log(contractor_id, evolved_at);
```

#### ai_trust_indicators
**Purpose:** Tracks trust-building moments and contractor confidence

```sql
CREATE TABLE ai_trust_indicators (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

  -- Trust Event
  trust_event_type VARCHAR(100) NOT NULL,  -- 'remembered_detail', 'helpful_recommendation', 'timely_follow_up', 'goal_achieved'
  event_description TEXT,
  confidence_impact INTEGER CHECK (confidence_impact BETWEEN -10 AND 10),  -- Impact on trust (-10 to +10)

  -- Context
  related_goal_id INTEGER REFERENCES ai_concierge_goals(id) ON DELETE SET NULL,
  event_context JSONB,

  -- Outcome
  contractor_acknowledged BOOLEAN DEFAULT FALSE,  -- Did contractor recognize this?
  feedback_received TEXT,

  -- Trust Score
  cumulative_trust_score INTEGER DEFAULT 0,  -- Running total of trust

  -- Metadata
  event_date TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contractor_trust ON ai_trust_indicators(contractor_id, event_date);
CREATE INDEX idx_trust_events ON ai_trust_indicators(trust_event_type, confidence_impact);
```

---

## 📅 Day-by-Day Implementation Plan

### Day 1: Proactive Message System Foundation

**Duration:** 6-8 hours

#### Tasks:
1. **Create Database Tables** (2 hours)
   - **IMPORTANT**: Use Node.js migration script (NOT SQL file)
   - Create `tpe-database/migrations/create-phase3-proactive-tables.js`
   - Execute: `node tpe-database/migrations/create-phase3-proactive-tables.js`
   - Create 4 tables: `ai_proactive_messages`, `ai_question_log`, `ai_goal_evolution_log`, `ai_trust_indicators`
   - Script auto-verifies: column counts, constraints, foreign keys, indexes

2. **Create Proactive Message Service** (4 hours)
   - Create `tpe-backend/src/services/proactiveMessageService.js`
   - Implement `scheduleProactiveMessage()` - Schedule AI-initiated message
   - Implement `generateFollowUpMessage()` - Create context-aware follow-up
   - Implement `trackMessageOutcome()` - Record contractor response
   - Implement `getScheduledMessages()` - Retrieve pending messages

3. **Message Trigger System** (2 hours)
   - Implement `evaluateProactiveTriggers()` - Check what needs follow-up
   - Triggers:
     - Time-based: 3 days after event, 1 week after action item
     - Goal-based: High-priority goal with data gaps
     - Pattern-based: "89% of contractors did X at this stage"
   - Return prioritized list of messages to send

#### Success Criteria:
- ✅ All 4 tables created with correct schema
- ✅ Proactive message service can schedule messages
- ✅ Trigger system identifies when to reach out
- ✅ Message outcomes tracked (responded, ignored, etc.)

#### Verification Commands:
```bash
# Verify tables exist
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_name IN ('ai_proactive_messages', 'ai_question_log', 'ai_goal_evolution_log', 'ai_trust_indicators');\""

# Verify column counts
powershell -Command ".\quick-db.bat \"SELECT COUNT(*) as column_count FROM information_schema.columns WHERE table_name = 'ai_proactive_messages';\""

# Verify indexes
powershell -Command ".\quick-db.bat \"SELECT indexname FROM pg_indexes WHERE tablename = 'ai_proactive_messages';\""
```

---

### Day 2: Natural Question Asking Engine

**Duration:** 6-8 hours

#### Tasks:
1. **Question Generation Service** (3 hours)
   - Create `tpe-backend/src/services/questionGenerationService.js`
   - Implement `generateStrategicQuestion()` - Create natural data gap question
   - Weave question into conversation context
   - Example: "Quick question - what's your close rate at right now?" feels natural
   - Track question success in `ai_question_log`

2. **Data Gap Prioritization** (2 hours)
   - Extend Phase 1's data gap detection
   - Prioritize gaps by:
     - Goal importance (high-priority goals first)
     - Pattern relevance (gaps that patterns need)
     - Contractor stage (right timing for question)
   - Create natural question templates for each gap type

3. **Question Effectiveness Tracking** (2 hours)
   - Track: Did contractor answer?
   - Track: Did answer fill data gap?
   - Track: How natural did question feel? (1-5 score)
   - Use feedback to improve future questions

4. **Integration with Conversation Flow** (1 hour)
   - Inject questions into AI responses naturally
   - Never ask 2+ questions in same message
   - Wait appropriate time between questions
   - Stop asking if contractor seems annoyed

#### Success Criteria:
- ✅ AI generates natural questions based on data gaps
- ✅ Questions tracked in question_log
- ✅ Effectiveness metrics calculated
- ✅ Questions feel conversational, not interrogative

#### Test Cases:
```javascript
// Test: Generate question for "close_rate" data gap
const question = await generateStrategicQuestion(contractorId, 'close_rate', goalId);
expect(question).toContain('close rate');
expect(question).not.toContain('please provide');  // Not robotic
expect(question.length).toBeLessThan(200);  // Concise

// Test: Track question effectiveness
await trackQuestion(contractorId, question, 'close_rate');
const answered = await checkIfAnswered(questionId);
expect(answered).toBe(true);
```

---

### Day 3: Enhanced Follow-Up Scheduler

**Duration:** 6-8 hours

#### Tasks:
1. **Goal-Driven Scheduling** (3 hours)
   - Extend `contractor_followup_schedules` with goal logic
   - Schedule follow-ups based on:
     - Goal priority (high-priority goals get faster follow-ups)
     - Checklist triggers (after milestone, after data collected)
     - Pattern timelines ("most contractors do X within 2 weeks")
   - Auto-cancel if contractor completes action early

2. **Follow-Up Message Generation** (2 hours)
   - Generate context-aware follow-up messages
   - Reference past conversation: "Remember you mentioned hiring challenges?"
   - Include pattern data: "Contractors who did X saw 40% improvement"
   - Keep tone helpful, not pushy

3. **Smart Timing Logic** (2 hours)
   - Don't follow up too soon (min 2 days)
   - Don't follow up too late (max 2 weeks for urgent items)
   - Respect contractor's response patterns (some prefer weekly check-ins)
   - Adjust timing based on past response rates

4. **Integration with Existing Systems** (1 hour)
   - Link to `contractor_action_items` (follow up on AI-created actions)
   - Link to `ai_concierge_goals` (follow up advances goal)
   - Update goal progress when follow-up completed

#### Success Criteria:
- ✅ Follow-ups scheduled automatically from goals
- ✅ Messages reference past context
- ✅ Timing adapts to contractor behavior
- ✅ Follow-ups advance goals meaningfully

---

### Day 4: Goal Evolution & Adaptation

**Duration:** 6-8 hours

#### Tasks:
1. **Goal Evolution Service** (3 hours)
   - Create `tpe-backend/src/services/goalEvolutionService.js`
   - Implement `evolveGoal()` - Update goal based on new data
   - Track changes in `ai_goal_evolution_log`
   - Reasons for evolution:
     - Contractor feedback indicates different priority
     - Pattern data updated (new insights)
     - Goal stalled (no progress in 30 days)
     - Contractor achieved milestone early

2. **Automatic Goal Adjustment** (2 hours)
   - If contractor ignores goal → lower priority
   - If contractor engages → increase priority
   - If data gap filled → unlock next milestone
   - If pattern confidence drops → reevaluate goal

3. **New Goal Generation** (2 hours)
   - When goal completed → generate next logical goal
   - When contractor level-ups → generate growth goals
   - When new pattern match → generate pattern-based goals
   - Respect max 3-4 active goals per contractor

4. **Abandoned Goal Handling** (1 hour)
   - If goal ignored for 60 days → mark 'abandoned'
   - Log why goal was abandoned
   - Learn from abandoned goals (don't repeat mistakes)

#### Success Criteria:
- ✅ Goals adapt based on contractor behavior
- ✅ Evolution logged with reasons
- ✅ New goals generated when appropriate
- ✅ System learns from abandoned goals

---

### Day 5: Trust-Building Memory System

**Duration:** 6-8 hours

#### Tasks:
1. **Trust Event Tracking** (3 hours)
   - Implement `trackTrustEvent()` in trust service
   - Events that build trust:
     - AI remembers detail from past conversation
     - AI's recommendation worked (contractor says "that helped!")
     - AI follows up at perfect time
     - Goal achieved thanks to AI guidance
   - Calculate cumulative trust score

2. **Memory Integration** (2 hours)
   - When AI responds, inject relevant memories
   - "Remember you mentioned hiring challenges at the event?"
   - "Last time you said X, want to revisit that?"
   - Pull from: conversation history, event notes, action items

3. **Trust Score Impact** (2 hours)
   - Track contractor's trust in AI (cumulative score)
   - Use trust score to:
     - Adjust proactive message frequency (higher trust = more proactive)
     - Determine question boldness (higher trust = ask harder questions)
     - Schedule follow-up timing (higher trust = more flexible)

4. **Trust Decay Prevention** (1 hour)
   - If AI makes bad recommendation → -5 trust
   - If AI forgets important detail → -3 trust
   - If AI spams with messages → -2 trust per message
   - Minimum trust threshold: pause proactive behavior if too low

#### Success Criteria:
- ✅ Trust events tracked with scores
- ✅ AI references past interactions naturally
- ✅ Trust score influences AI behavior
- ✅ System prevents trust decay

#### Example Trust Building:
```
[Week after event]

AI Internal Check:
- Trust event: "remembered_detail" from event notes
- Contractor mentioned: "hiring challenges for operations"
- Goal: "Prepare for team expansion" (priority 8/10)
- Action: Reference memory + provide value

AI Message:
"Remember you mentioned hiring challenges at the event?
Found a hiring playbook from contractors who scaled past $5M.
Want the link?"

Result: Trust +5 (helpful + remembered detail)
```

---

### Day 6: Testing & Integration

**Duration:** 6-8 hours

#### Tasks:
1. **End-to-End Testing** (3 hours)
   - Test complete proactive flow:
     1. Goal identifies data gap
     2. Question generated and asked naturally
     3. Contractor responds
     4. Data gap filled
     5. Follow-up scheduled
     6. Follow-up sent at right time
     7. Goal progresses
     8. Trust event logged

2. **Phase 1 + Phase 2 + Phase 3 Integration** (2 hours)
   - Verify: Pattern learning informs proactive messages
   - Verify: Goals from Phase 1 drive proactive behavior
   - Verify: Success tracking updates pattern confidence
   - Test complete workflow: Pattern → Goal → Question → Follow-up → Evolution

3. **Message Quality Validation** (2 hours)
   - Review generated messages for naturalness
   - Ensure no robotic phrasing ("please provide", "as per", etc.)
   - Test with sample contractors
   - Adjust templates based on feedback

4. **Performance & Timing** (1 hour)
   - Verify scheduled messages fire on time
   - Check query performance for trigger evaluation
   - Ensure no message spam (max 1 proactive message per 2 days)

#### Success Criteria:
- ✅ Complete proactive flow working end-to-end
- ✅ All 3 phases integrated seamlessly
- ✅ Messages feel natural and helpful
- ✅ Performance acceptable (<50ms added)

---

### Day 7: Polish, Documentation & Production Ready

**Duration:** 6-8 hours

#### Tasks:
1. **Proactive Behavior Safeguards** (2 hours)
   - Max 1 proactive message per 2 days (prevent spam)
   - If contractor ignores 3 messages in row → pause proactive for 1 week
   - If trust score < 20 → pause proactive
   - Emergency stop mechanism if contractor complains

2. **Message Templates & Personalization** (2 hours)
   - Create library of natural message templates
   - Personalize with: contractor name, past interactions, pattern data
   - A/B test message styles (casual vs professional)
   - Learn from response rates

3. **Documentation** (2 hours)
   - Document proactive message triggers
   - Document trust score calculation
   - Document goal evolution logic
   - Create examples for common scenarios

4. **Production Deployment** (2 hours)
   - Deploy Phase 3 tables to production
   - Verify all indexes created
   - Test proactive system in production (dry run)
   - Prepare rollback plan

#### Success Criteria:
- ✅ Safeguards prevent spam and annoyance
- ✅ Message templates feel natural
- ✅ Documentation complete
- ✅ Production deployment successful

---

## 🎯 Phase 3 Success Metrics

### Technical Metrics
- **Proactive Message Send Rate**: 70%+ of scheduled messages sent successfully
- **Response Rate**: 50%+ of proactive messages get contractor response
- **Question Answer Rate**: 60%+ of strategic questions answered
- **Goal Evolution Accuracy**: 80%+ of evolved goals remain relevant

### Business Metrics
- **Trust Score Average**: Contractors average 40+ trust score after 30 days
- **Data Gap Fill Rate**: 70%+ of data gaps filled within 2 weeks
- **Goal Advancement**: Proactive messages advance goals 40%+ of time
- **Contractor Satisfaction**: "AI feels proactive" rating 8/10+

### Engagement Metrics
- **Contractor Initiated Conversations**: Increase 30%+ (AI builds engagement)
- **Action Item Completion**: 50%+ of AI-suggested actions completed
- **Follow-Up Engagement**: 60%+ of follow-ups get response
- **Zero Spam Complaints**: No contractors report AI as "annoying"

---

## 🔗 Integration Points

### Phase 1 (Background Goal Engine)
- Use `ai_concierge_goals` to drive proactive behavior
- Use `ai_concierge_checklist_items` to trigger follow-ups
- Track progress when proactive messages succeed

### Phase 2 (Pattern Learning)
- Use `business_growth_patterns` in proactive messages
- Reference pattern data: "89% of contractors did X"
- Use `pattern_success_tracking` to validate recommendations

### Existing Systems
- `contractor_followup_schedules`: Enhanced with goal logic
- `contractor_action_items`: Trigger follow-ups on AI-created actions
- `ai_concierge_sessions`: Pull memory for trust-building

### New Services (TO CREATE)
1. **proactiveMessageService.js**: Schedule and send AI-initiated messages
2. **questionGenerationService.js**: Generate natural strategic questions
3. **goalEvolutionService.js**: Adapt goals based on contractor behavior
4. **trustTrackingService.js**: Monitor trust-building moments

---

## 🚨 Critical Reminders

1. **Never Spam**: Max 1 proactive message per 2 days, pause if ignored
2. **Always Natural**: Questions must feel conversational, never robotic
3. **Respect Trust**: If trust score drops, reduce proactive behavior
4. **Memory Matters**: Reference past interactions to build trust
5. **Learn & Adapt**: Goals evolve based on contractor responses

---

## 📚 Related Documents

- **Overview**: `INTERNAL-GOAL-ENGINE-OVERVIEW.md`
- **Pre-Flight Checklist**: `PHASE-3-PRE-FLIGHT-CHECKLIST.md` (create next)
- **Phase 1 Complete**: `phase-1/PHASE-1-IMPLEMENTATION-PLAN.md`
- **Phase 2 Complete**: `phase-2/PHASE-2-IMPLEMENTATION-PLAN.md`

---

**Phase 3 Status**: Ready for Pre-Flight Checklist
**Next Step**: Create `PHASE-3-PRE-FLIGHT-CHECKLIST.md`
**Last Updated**: October 22, 2025
