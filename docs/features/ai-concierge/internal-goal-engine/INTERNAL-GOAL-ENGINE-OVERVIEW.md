# AI Concierge Internal Goal Engine - Complete System Overview

**Document Version:** 1.0
**Date:** October 22, 2025
**Status:** READY FOR IMPLEMENTATION
**Owner:** Greg Cummings & Development Team

---

## 🎯 Vision & Purpose

### The Problem
Contractors need an AI Concierge that doesn't just respond to questions—it **anticipates needs, proactively guides growth, and feels like a knowledgeable business partner** who's always working in the background to help them reach the next level.

### The Solution
**Internal Goal Engine**: A hidden goal-driven system where the AI maintains its own checklist of what it wants to accomplish for each contractor. The AI uses this internal checklist to:
- Ask strategic questions at natural moments
- Proactively recommend resources based on success patterns
- Schedule its own follow-ups without being asked
- Continuously collect data to serve better
- Guide contractors toward business level-up milestones

### Greg's Core Vision (From Meeting Transcripts)

> "We want the system to be **curious**. We want the system to be **passionate about resolving their business issues**... Most importantly, **it's to gain their trust**."

> "The AI should **always be thinking at or ahead of the contractor** which should equate to meeting the contractor's needs **before they even know they have that need**."

> "More data = better assistance. **Allow it to proactively set its own follow-ups and reminders** as it continues to improve on understanding the contractor's preferences and patterns."

---

## 🧠 Core Concept

### What It Is
The AI maintains **internal goals** (hidden from contractor) that drive its behavior. Think of it like:
- **Internal Checklist**: AI's private to-do list for each contractor
- **Pattern Learning**: AI learns from successful contractors' journeys
- **Proactive Behavior**: AI initiates conversations, not just responds
- **Data Collection Drive**: AI naturally asks questions to fill knowledge gaps

### What It's NOT
- ❌ NOT visible to the contractor ("I'm working on my checklist...")
- ❌ NOT rigid task management (flows naturally in conversation)
- ❌ NOT pushy sales (always helpful, never salesy)
- ❌ NOT separate from AI Concierge (it's HOW the Concierge thinks)

### How It Feels to the Contractor

**Without Internal Goal Engine:**
```
Contractor: "What CRM tools are good?"
AI: "Here are 3 CRM options: [lists tools]"
```

**With Internal Goal Engine:**
```
Contractor: "What CRM tools are good?"

AI (thinking internally):
- Goal: Get them to $5M revenue (current: $3.2M)
- Pattern: 89% of $3M→$5M contractors improved lead systems first
- Data gap: Don't know their current close rate
- Checklist: "Assess lead flow system" - TRIGGER NOW

AI (responds naturally):
"Got some killer CRM options. Quick context though - what's your
close rate running at right now? Helps me nail the recommendation."

[Internal checklist: "Collect close rate data" - COMPLETED ✅]
[New checklist item: "Recommend CRM based on close rate" - PENDING]
```

---

## 📊 System Architecture

### Three-Layer Intelligence System

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: CONTRACTOR-FACING (What They See)                 │
│  - Natural conversation                                      │
│  - Helpful recommendations                                   │
│  - Timely follow-ups                                         │
│  - "This AI just gets me"                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2: INTERNAL GOAL ENGINE (Hidden Intelligence)        │
│  - Active goals for this contractor                         │
│  - Data gaps to fill                                         │
│  - Pattern-based next actions                               │
│  - Proactive follow-up schedule                             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: PATTERN LIBRARY (Learning from Success)           │
│  - $3M→$5M contractor patterns                              │
│  - Focus area success indicators                            │
│  - Partner utilization data                                  │
│  - Timeline to level-up                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 How It Works (Complete Flow)

### 1. **AI Analyzes Contractor Profile**
Every conversation, AI checks:
- Current revenue vs target revenue
- Business level (struggling, stable, scaling, optimizing)
- Focus areas vs what successful contractors prioritized
- Data completeness (what's missing?)
- Time since last key milestone

### 2. **AI Generates Internal Goals**
Based on analysis, AI creates hidden goals:

```javascript
// Example: Contractor at $3.2M revenue, targeting $5M
{
  contractor_id: 56,
  current_revenue: '$3.2M',
  target_revenue: '$5M',

  active_goals: [
    {
      goal: 'Prepare contractor for team expansion',
      priority: 8/10,
      next_action: 'Ask about current team structure',
      pattern_source: '73% of $3M→$5M hired operations manager',
      trigger: 'next_conversation',
      data_gaps: ['team_size', 'org_structure', 'hiring_timeline']
    },
    {
      goal: 'Improve lead conversion rate',
      priority: 9/10,
      next_action: 'Get current close rate data',
      pattern_source: '89% used CRM automation tools',
      trigger: 'immediately',
      data_gaps: ['close_rate', 'lead_sources', 'sales_process']
    },
    {
      goal: 'Increase referral network',
      priority: 6/10,
      next_action: 'Suggest networking event',
      pattern_source: '67% attended 2+ industry events',
      trigger: 'after_lead_flow_solved',
      data_gaps: ['network_size', 'referral_rate']
    }
  ]
}
```

### 3. **AI Acts on Goals Naturally**
In conversation, AI weaves goal actions into responses:

**Example 1: Data Collection**
```
Contractor: "Need better lead flow tools"

AI Internal Check:
- Goal priority 9/10: "Improve lead conversion"
- Data gap: close_rate
- Trigger: immediately
- Action: Collect data while recommending

AI Response:
"Got you covered on lead flow! Quick question first - what's
your close rate at right now? Want to match you with the right
tool tier."

Result: Data collected naturally, contractor doesn't feel "surveyed"
```

**Example 2: Proactive Follow-Up**
```
[3 days after event]

AI Internal Check:
- Goal: "Follow up on sponsor connections"
- Checklist item: "Check BuildPro follow-up" (94% match sponsor)
- Pattern: Contractors who follow up within 1 week close 3x more
- Trigger: 3_days_post_event

AI Initiates (sends text):
"Hey! Just checking in - have you connected with BuildPro yet?
They were pumped about your operation."

Result: Proactive outreach feels helpful, not pushy
```

### 4. **AI Schedules Its Own Follow-Ups**
When AI identifies action items, it automatically creates follow-ups:

```javascript
// After contractor says: "Yeah, I need to hire an ops manager"
AI Action:
1. Creates action item: "Hire operations manager"
2. Schedules follow-up: 2 weeks from now
3. Adds to internal checklist: "Check hiring progress"
4. Prepares next recommendation: "Operations management course"

// 2 weeks later
AI sends: "How's the ops manager search going? Want help
finding the right person?"
```

### 5. **AI Learns from Patterns**
System queries database for contractors who leveled up:

```sql
-- Find contractors who went from $3M to $5M
SELECT
  focus_areas_prioritized,
  partners_used,
  time_to_level_up_months,
  key_milestones
FROM contractors
WHERE revenue_start BETWEEN 3000000 AND 3500000
  AND revenue_current BETWEEN 5000000 AND 6000000
  AND level_up_achieved = true
```

**Results become AI's playbook:**
- "89% improved lead systems first" → AI prioritizes lead flow questions
- "73% hired operations manager within 6 months" → AI asks about team
- "67% attended 2+ events per year" → AI recommends events proactively

---

## 🎯 Three-Phase Implementation

### Phase 1: Background Goal Engine (Core Foundation)
**Duration:** 5-7 days
**Goal:** AI can create internal goals, track progress, act on them

**What Gets Built:**
- Database tables for goals, checklist items, patterns
- Goal generation logic (analyzes contractor profile)
- Goal prioritization system
- Integration with existing AI Concierge

**Deliverable:** AI has hidden goals and acts on them in conversation

---

### Phase 2: Pattern Learning & Intelligence
**Duration:** 5-7 days
**Goal:** AI learns from successful contractor data

**What Gets Built:**
- Business growth pattern analysis
- Success indicator tracking
- Partner utilization patterns
- Revenue tier progression library

**Deliverable:** AI recommendations based on real success patterns

---

### Phase 3: Proactive Behavior & Evolution
**Duration:** 5-7 days
**Goal:** AI initiates conversations and improves over time

**What Gets Built:**
- Proactive follow-up scheduler (enhanced)
- Automated action item creation
- Natural question asking (data gap filling)
- Goal evolution based on contractor response

**Deliverable:** AI that feels like it's always working for the contractor

---

## 🎨 Key Features

### 1. **Event-Aware Timing** (Greg's Requirement)
AI knows when to ask vs when to stay quiet:

```javascript
// During event
{
  mode: 'event',
  priority: 'event_schedule_first',
  background_goals: {
    trigger: 'during_break',  // Only acts during breaks
    urgency: 'low'
  }
}

// Post-event
{
  mode: 'post_event',
  priority: 'priority_extraction',
  background_goals: {
    trigger: 'after_priorities_set',
    urgency: 'high'
  }
}
```

**Example:**
```
[During session]
AI thinks: "Need close rate data"
AI waits: Session is priority

[Break time, 15min]
AI acts: "Break time! Booth 5 next. Quick Q - what's your close rate?"
```

### 2. **Pattern-Based Priority Suggestions** (Greg's Vision)
Instead of asking "What are your priorities?", AI suggests them:

```
AI: "Based on your 5/5 rating and contractors who went from $3M to $5M:

1) BuildPro follow-up (94% match, you spent 20min at booth)
   → 89% of similar contractors improved lead systems first

2) Mike Johnson connection (complementary business)
   → 73% hired ops manager, Mike's expertise aligns

3) LeadGen tool implementation (you asked questions in session)
   → 67% attended training, saw 40% efficiency gain

These your top 3, or want to adjust?"
```

### 3. **Post-Event Partner Recommendations** (Modified per Greg)
If contractor hasn't done contractorflow or AI learns new info:

```
AI: "Based on what you shared at the event, your profile might
need an update. Want to refresh your focus areas? Takes 3min
and I'll match you with partners who weren't at the event."
```

### 4. **Note-Taking Encouragement** (Greg's Requirement)
```
[After contractor attends high-value session]

AI: "That roofing economics session was 🔥 wasn't it? Drop any
notes here - I'll organize them for your post-event summary."

[Contractor shares notes]
AI: "Perfect. Got it saved. Session was on pricing strategy, right?"
[Confirms context, links to agenda]
```

### 5. **Trust-Building Memory** (Greg's Core Principle)
```
[Week after event]

AI: "Remember you mentioned hiring challenges at the event?
Found a hiring playbook from contractors who scaled past $5M.
Want the link?"

Contractor feels: "This AI actually listens and cares"
```

---

## 📊 Database Schema (Phase 1 Foundation)

### ai_concierge_goals
```sql
CREATE TABLE ai_concierge_goals (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

  -- Goal Definition
  goal_type VARCHAR(100) NOT NULL,  -- 'revenue_growth', 'team_expansion', 'lead_improvement', etc.
  goal_description TEXT NOT NULL,  -- "Get contractor to $5M revenue level"
  target_milestone VARCHAR(255),  -- "$5M annual revenue"

  -- Priority & Progress
  priority_score INTEGER DEFAULT 5,  -- 1-10, AI's confidence this matters
  current_progress INTEGER DEFAULT 0,  -- 0-100%
  next_milestone TEXT,  -- "Hire operations manager"

  -- Success Criteria
  success_criteria JSONB,  -- {revenue_increase: 20%, team_growth: true}

  -- Pattern Source
  pattern_source TEXT,  -- "Based on 47 contractors who went from $3M to $5M"
  pattern_confidence NUMERIC(3,2),  -- 0.00-1.00

  -- Data Gaps (What AI needs to know)
  data_gaps JSONB,  -- ["team_size", "close_rate", "lead_sources"]

  -- Status & Timing
  status VARCHAR(50) DEFAULT 'active',  -- 'active', 'completed', 'abandoned', 'blocked'
  trigger_condition VARCHAR(100),  -- 'next_conversation', 'weekly', 'post_event'
  last_action_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,

  -- Indexes
  INDEX idx_contractor_goals (contractor_id, status),
  INDEX idx_priority (priority_score DESC),
  INDEX idx_trigger (trigger_condition)
);
```

### ai_concierge_checklist_items
```sql
CREATE TABLE ai_concierge_checklist_items (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER REFERENCES ai_concierge_goals(id) ON DELETE CASCADE,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

  -- Checklist Item
  checklist_item TEXT NOT NULL,  -- "Assess current lead flow system"
  item_type VARCHAR(100),  -- 'data_collection', 'recommendation', 'follow_up', 'introduction'

  -- Status & Trigger
  status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'in_progress', 'completed', 'skipped'
  trigger_condition VARCHAR(100),  -- 'next_conversation', 'after_event', 'weekly', 'immediately'

  -- Execution
  executed_at TIMESTAMP,
  execution_context JSONB,  -- What was happening when AI acted on this

  -- Completion
  completed_at TIMESTAMP,
  completion_notes TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_contractor_checklist (contractor_id, status),
  INDEX idx_goal_items (goal_id),
  INDEX idx_trigger_condition (trigger_condition, status)
);
```

### business_growth_patterns
```sql
CREATE TABLE business_growth_patterns (
  id SERIAL PRIMARY KEY,

  -- Revenue Tier Transition
  from_revenue_tier VARCHAR(50),  -- '$3M-$5M', '$5M-$10M', etc.
  to_revenue_tier VARCHAR(50),

  -- Success Pattern
  pattern_name VARCHAR(255),  -- "Lead System Optimization First"
  pattern_description TEXT,

  -- Common Actions
  common_focus_areas JSONB,  -- ["greenfield_growth", "operational_efficiency"]
  common_partners JSONB,  -- [{"partner_id": 5, "usage_rate": 0.89}]
  common_milestones JSONB,  -- ["hired_ops_manager", "implemented_crm"]

  -- Timeline
  avg_time_to_level_up_months INTEGER,
  median_time_to_level_up_months INTEGER,

  -- Success Indicators
  success_indicators JSONB,  -- {lead_flow_improved: true, team_doubled: true}

  -- Data Source
  sample_size INTEGER,  -- How many contractors this pattern represents
  confidence_score NUMERIC(3,2),  -- 0.00-1.00

  -- Content Consumed
  common_books JSONB,
  common_podcasts JSONB,
  common_events JSONB,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Indexes
  INDEX idx_revenue_transition (from_revenue_tier, to_revenue_tier),
  INDEX idx_confidence (confidence_score DESC)
);
```

---

## 🎯 Success Metrics

### System Performance
- **Goal Completion Rate**: % of goals achieved
- **Data Gap Fill Rate**: % of missing data collected within 2 weeks
- **Proactive Action Success**: % of proactive messages with positive response
- **Pattern Accuracy**: % of pattern-based recommendations accepted

### Contractor Experience
- **Trust Score**: Contractor rates AI helpfulness (1-5)
- **Response Rate**: % of proactive messages contractor responds to
- **Action Item Completion**: % of AI-suggested priorities contractor acts on
- **Referral Rate**: Contractors recommend TPX to peers

### Business Impact
- **Revenue Tier Progression**: Contractors reaching next level faster
- **Partner Utilization**: Higher partner engagement rates
- **Content Consumption**: More books/podcasts/events consumed
- **Retention**: Contractors stay engaged longer

---

## 📚 Related Documents

**Phase Implementation Plans:**
- [Phase 1: Background Goal Engine](./phase-1/PHASE-1-IMPLEMENTATION-PLAN.md)
- [Phase 2: Pattern Learning](./phase-2/PHASE-2-IMPLEMENTATION-PLAN.md)
- [Phase 3: Proactive Behavior](./phase-3/PHASE-3-IMPLEMENTATION-PLAN.md)

**Pre-Flight Checklists:**
- [Phase 1 Pre-Flight Checklist](./phase-1/PHASE-1-PRE-FLIGHT-CHECKLIST.md)
- [Phase 2 Pre-Flight Checklist](./phase-2/PHASE-2-PRE-FLIGHT-CHECKLIST.md)
- [Phase 3 Pre-Flight Checklist](./phase-3/PHASE-3-PRE-FLIGHT-CHECKLIST.md)

**Reference Documents:**
- Greg's Vision: `docs/Greg_Tom_Meeting_TPE_Overview.md`
- Post-Event Capabilities: `docs/Greg-Added-Vision-For-Post-Event-Capabilities-1.md`
- Event Summary: `docs/greg-events-summary-and-details-1.md`
- AI Concierge Phase 4: `docs/features/ai-concierge/phase-4/PHASE-4-IMPLEMENTATION-PLAN.md`

---

**Last Updated:** October 22, 2025
**Status:** Ready for Phase 1 Implementation
**Next Step:** Complete Phase 1 Pre-Flight Checklist
