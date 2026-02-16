# Phase 2: Intelligence — PowerMoves, Content & Proactive Engagement

**Document Version:** 1.0
**Date:** February 15, 2026
**Status:** READY FOR REVIEW
**Prerequisites:** Phase 1 must be complete and tested
**Depends On:** `inner_circle_members` table, skill system, Inner Circle Agent (all Phase 1)

---

## Executive Summary

**Goal:** Make the Inner Circle AI Concierge a powerful coaching partner and proactive engagement engine. Members create their own PowerMoves — 60-day action steps toward fiscal milestones — and the concierge becomes their accountability partner, research assistant, email crafter, and progress tracker.

### What PowerMoves Actually Are

PowerMoves are **user-created 60-day action steps to reach fiscal milestones** for a leader and their company. They are NOT system-assigned goals from a catalog. The member decides what they want to accomplish, frames it as a concrete fiscal milestone, and submits it. Each PowerMove aligns to one of the Four Pillars:

- **Growth** — Revenue targets, market expansion, sales milestones
- **Culture** — Team development, leadership growth, organizational change
- **Community** — Networking, partnerships, industry involvement, giving back
- **Innovation** — New products/services, process improvements, technology adoption

Once a member creates a PowerMove, the AI Concierge immediately responds with encouragement and recognition (Week 0), then generates a personalized 8-week action plan to reach the milestone. This action plan becomes the backbone — weekly check-ins measure progress against it:

- **Week 0 (immediate):** Motivational recognition + 8-week action plan generated
- Weekly progress check-ins measured against the 8-week plan
- Looking up relevant information, data, benchmarks
- Crafting and sending emails (to the member or on their behalf)
- Recommending relevant PowerChat/podcast content
- Connecting them to partners when it genuinely helps with their PowerMove
- Celebrating milestones and tracking completion

### What Phase 2 Delivers

- [ ] Database: `power_moves` table (user-created milestones, not a catalog)
- [ ] Database: `power_move_checkins` table (progress tracking entries)
- [ ] PowerMove coaching skill (SKILL.md for concierge behavior)
- [ ] Content recommendation skill (SKILL.md for PowerChat + podcast surfacing)
- [ ] New agent tool: `managePowerMoveTool` (create, update, track progress)
- [ ] New agent tool: `powerMoveCheckinTool` (record weekly check-in data)
- [ ] Proactive heartbeat engine (scheduled weekly check-ins via Bull queue)
- [ ] Partner recommendation gating enforcement (unlock on PowerMove creation, contextual to their goal)
- [ ] Database: `member_watch_history` table (portal watch data via n8n webhook)
- [ ] Watch history integration (concierge context, smart recommendations, engagement scoring)
- [ ] Member engagement analytics (ai_engagement_score powered by watch behavior + PowerMove activity)
- [ ] Conversion tracking (Inner Circle member -> contractor pipeline)
- [ ] Content ingestion pipeline for show episodes and general Power100 content

---

## 1. Database Schema Changes

### 1A. Migration: Create `power_moves` Table

**File:** `tpe-database/migrations/20260215_create_power_moves.sql`

**Design Philosophy:** This table stores PowerMoves that the MEMBER creates. There is no seed catalog. The member describes what they want to accomplish, the concierge helps them structure it, and they submit it. The AI tracks their journey.

```sql
-- ================================================================
-- Migration: Create Power Moves Table
-- Date: February 15, 2026
-- Purpose: Store user-created 60-day fiscal milestones.
--          Members create their own PowerMoves; the AI helps
--          them achieve them through coaching, reminders, and action.
-- ================================================================

CREATE TABLE IF NOT EXISTS power_moves (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES inner_circle_members(id) ON DELETE CASCADE,

  -- PowerMove Definition (created by the member, structured by the concierge)
  title VARCHAR(255) NOT NULL,
  description TEXT,
  pillar VARCHAR(50) NOT NULL
    CHECK (pillar IN ('growth', 'culture', 'community', 'innovation')),

  -- Fiscal Milestone
  fiscal_target TEXT,            -- e.g. "Increase monthly revenue from $80K to $120K"
  fiscal_metric VARCHAR(255),    -- e.g. "monthly_revenue", "new_clients", "team_hires"
  starting_value VARCHAR(255),   -- e.g. "$80,000" or "3 team members"
  target_value VARCHAR(255),     -- e.g. "$120,000" or "5 team members"
  current_value VARCHAR(255),    -- Updated as progress is tracked

  -- Timeline
  start_date TIMESTAMP DEFAULT NOW(),
  target_date TIMESTAMP NOT NULL,   -- 60 days from start_date (enforced in app logic)
  completed_date TIMESTAMP,

  -- Status
  status VARCHAR(50) DEFAULT 'active'
    CHECK (status IN ('draft', 'active', 'in_progress', 'completed', 'expired', 'abandoned')),

  -- AI Coaching Context (8-Week Action Plan)
  action_steps JSONB DEFAULT '[]'::jsonb,   -- 8-week action plan generated at Week 0
                                             -- Each entry: { week: 1-8, action: "...", status: "pending|done|skipped" }
                                             -- Weekly check-ins measure progress against this plan
  member_notes TEXT,                         -- Member's own notes/reflections
  ai_coaching_notes JSONB DEFAULT '[]'::jsonb,  -- Concierge observations over time
  ai_suggested_resources JSONB DEFAULT '[]'::jsonb,  -- Content/partners suggested

  -- Engagement Tracking
  total_checkins INTEGER DEFAULT 0,
  last_checkin_date TIMESTAMP,
  streak_weeks INTEGER DEFAULT 0,           -- Consecutive weeks with a check-in
  engagement_score NUMERIC(5,2) DEFAULT 0.00,

  -- Completion
  completion_evidence TEXT,        -- What the member provides as proof/summary
  completion_reflection TEXT,      -- Member's reflection on the journey
  ai_completion_summary TEXT,      -- AI-generated summary of the PowerMove journey

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pm_member_id ON power_moves(member_id);
CREATE INDEX idx_pm_status ON power_moves(status);
CREATE INDEX idx_pm_pillar ON power_moves(pillar);
CREATE INDEX idx_pm_target_date ON power_moves(target_date);
CREATE INDEX idx_pm_member_status ON power_moves(member_id, status);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_pm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pm_updated_at
  BEFORE UPDATE ON power_moves
  FOR EACH ROW
  EXECUTE FUNCTION update_pm_updated_at();
```

### 1B. Migration: Create `power_move_checkins` Table

**File:** `tpe-database/migrations/20260215_create_power_move_checkins.sql`

**Purpose:** Weekly check-in entries that track progress on each PowerMove. Each check-in records what the member accomplished that week, any blockers, and the concierge's coaching response.

```sql
-- ================================================================
-- Migration: Create Power Move Check-ins Table
-- Date: February 15, 2026
-- Purpose: Track weekly progress check-ins for each PowerMove.
--          The concierge initiates these proactively, the member
--          responds, and the AI logs observations.
-- ================================================================

CREATE TABLE IF NOT EXISTS power_move_checkins (
  id SERIAL PRIMARY KEY,
  power_move_id INTEGER NOT NULL REFERENCES power_moves(id) ON DELETE CASCADE,
  member_id INTEGER NOT NULL REFERENCES inner_circle_members(id) ON DELETE CASCADE,

  -- Check-in Data
  week_number INTEGER NOT NULL,                -- Week 0-8 (Week 0 = creation response with 8-week plan)
  checkin_date TIMESTAMP DEFAULT NOW(),
  checkin_source VARCHAR(50) DEFAULT 'concierge'
    CHECK (checkin_source IN ('concierge', 'member_initiated', 'heartbeat')),

  -- Progress
  progress_update TEXT,                        -- What the member shared
  current_value VARCHAR(255),                  -- Updated metric value at check-in time
  blockers TEXT,                               -- Any obstacles mentioned
  wins TEXT,                                   -- Successes/milestones hit

  -- AI Coaching Response
  ai_coaching_response TEXT,                   -- What the concierge said/did in response
  ai_actions_taken JSONB DEFAULT '[]'::jsonb,  -- Actions: emails sent, content recommended, etc.
  ai_sentiment VARCHAR(50),                    -- on_track, falling_behind, ahead, needs_support

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pmc_power_move_id ON power_move_checkins(power_move_id);
CREATE INDEX idx_pmc_member_id ON power_move_checkins(member_id);
CREATE INDEX idx_pmc_week ON power_move_checkins(power_move_id, week_number);
```

### 1C. Migration: Create `member_watch_history` Table

**File:** `tpe-database/migrations/20260215_create_member_watch_history.sql`

**Purpose:** Track what members watch in the Inner Circle portal. Data flows from WordPress → n8n webhook → this table. The concierge reads this to know what a member has consumed, avoid redundant recommendations, reference specific episodes in conversation, and build accurate engagement scoring.

```sql
-- ================================================================
-- Migration: Create Member Watch History Table
-- Date: February 15, 2026
-- Purpose: Granular watch tracking for Inner Circle portal content.
--          Data ingested via n8n webhook from WordPress.
--          Used by AI concierge for personalized recommendations,
--          conversation context, and engagement scoring.
-- ================================================================

CREATE TABLE IF NOT EXISTS member_watch_history (
  id SERIAL PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES inner_circle_members(id) ON DELETE CASCADE,

  -- Content Reference
  content_id INTEGER NOT NULL,              -- FK to video_content.id or podcast_episodes.id
  content_type VARCHAR(20) NOT NULL
    CHECK (content_type IN ('video', 'podcast')),
  show_id INTEGER REFERENCES shows(id) ON DELETE SET NULL,  -- For quick show-level queries

  -- Watch Data
  watch_progress INTEGER DEFAULT 0
    CHECK (watch_progress >= 0 AND watch_progress <= 100),  -- Percentage watched
  total_watch_time_seconds INTEGER DEFAULT 0,
  watch_count INTEGER DEFAULT 1,            -- How many times they've watched/listened
  completed BOOLEAN DEFAULT FALSE,          -- Did they finish it?

  -- Source Tracking
  source VARCHAR(50) DEFAULT 'portal'
    CHECK (source IN ('portal', 'concierge_recommendation', 'direct_link', 'email_link')),

  -- Timestamps
  first_watched_at TIMESTAMP DEFAULT NOW(),
  last_watched_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mwh_member_id ON member_watch_history(member_id);
CREATE INDEX idx_mwh_content ON member_watch_history(content_type, content_id);
CREATE INDEX idx_mwh_show_id ON member_watch_history(show_id);
CREATE INDEX idx_mwh_member_show ON member_watch_history(member_id, show_id);
CREATE INDEX idx_mwh_member_completed ON member_watch_history(member_id, completed);
CREATE INDEX idx_mwh_last_watched ON member_watch_history(last_watched_at);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_mwh_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mwh_updated_at
  BEFORE UPDATE ON member_watch_history
  FOR EACH ROW
  EXECUTE FUNCTION update_mwh_updated_at();
```

**Data Flow:**
```
Member watches content in Inner Circle portal (WordPress)
    → WordPress fires watch event (play, progress, complete)
    → n8n webhook receives event
    → n8n UPSERTs into member_watch_history:
       - If first time watching: INSERT new row
       - If rewatching: UPDATE watch_progress, total_watch_time_seconds,
         watch_count++, last_watched_at, completed if progress >= 95%
    → Concierge reads on demand during conversations
```

**Concierge Uses:**
- `getMemberContext()` queries recent watch history to include in system prompt
- `recommend_content` tool checks watch history to avoid redundant recommendations
- PowerMove coaching references watched content: "You watched that PowerChat about scaling sales teams — how are you applying that?"
- Engagement scoring uses watch depth and patterns as strongest signal

### 1D. Verify Phase 1 Tables Before Proceeding

Before running Phase 2 migrations, verify Phase 1 tables exist:

```bash
powershell -Command ".\quick-db.bat \"SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('inner_circle_members', 'skill_definitions') ORDER BY table_name;\""
```

**Expected:** Both tables exist.

---

## 2. PowerMove Skills

### 2A. PowerMove Coaching Skill

**File:** `tpe-backend/src/skills/inner-circle/powermove-coaching/SKILL.md`

```markdown
---
name: powermove_coaching
description: Coaches members through their self-created PowerMoves — 60-day fiscal milestones
metadata:
  openclaw:
    emoji: "🎯"
    context: inner_circle
    priority: high
---

# PowerMove Coaching

## What PowerMoves Are

PowerMoves are 60-day action steps that a member creates to reach a fiscal milestone
for themselves and their company. The member defines the goal — you help them achieve it.

PowerMoves always connect to one of the Four Pillars:
- **Growth** — Revenue, sales, market expansion
- **Culture** — Team, leadership, organizational development
- **Community** — Networking, partnerships, industry involvement
- **Innovation** — New products, processes, technology

## Your Role

You are their accountability partner, research assistant, strategist, and cheerleader.
You don't assign PowerMoves. You help them create great ones and then do everything in
your power to help them succeed.

## Creating a PowerMove

When a member wants to create a PowerMove:

1. **Understand their vision** — What do they want to achieve? Why does it matter?
2. **Help them be specific** — Guide them from vague ("grow my business") to fiscal
   ("increase monthly revenue from $80K to $120K")
3. **Identify the pillar** — Which of the Four Pillars does this align to?
4. **Set the timeline** — 60 days from today. Help them understand what's realistic
5. **Use `manage_power_move` tool** to save it with status 'active'
6. Once saved, partner recommendations become available — but ONLY when a
   partner genuinely helps with THIS PowerMove. Don't announce the unlock.

## Week 0: The Immediate Response

The moment a PowerMove is created, you respond IMMEDIATELY with:

1. **Motivational recognition** — Acknowledge the courage and commitment it takes
   to set a concrete goal. This is a big deal. Make them feel it.
   Example: "This is huge, [Name]. Setting a clear target like going from $80K to
   $120K/month in 60 days — that takes real commitment. I'm here for every step."

2. **Generate the 8-week action plan** — Break their fiscal milestone into 8
   concrete weekly actions. This plan becomes the backbone of their journey:
   - Week 1: [Specific action relevant to their goal]
   - Week 2: [Building on week 1]
   - ... through Week 8
   Each action should be specific, measurable, and achievable within that week.

3. **Set expectations** — Let them know: "I'll check in with you every week to
   see how you're tracking against this plan. If anything needs adjusting, we
   adjust together. Let's get this done."

4. **Record via `power_move_checkin` tool** — Week 0 check-in with the action
   plan and motivational response logged.

Example 8-week action plan for "Scale Monthly Revenue to $120K":
- Week 1: Audit current sales pipeline — identify 3 highest-value opportunities
- Week 2: Hire 2nd sales rep — post job listing, begin outreach
- Week 3: Launch referral program with existing clients
- Week 4: Close 1st new commercial account from pipeline audit
- Week 5: Onboard new sales rep, set performance targets
- Week 6: Close 2nd new commercial account
- Week 7: Evaluate referral program results, adjust strategy
- Week 8: Close 3rd account, finalize revenue run rate to $120K

## Weekly Check-ins (Weeks 1-8)

The 8-week action plan is what you measure progress against. Each week:

1. **Reference the plan** — "This week's action was [Week N action]. How did it go?"
2. **Update the numbers** — If they share metric updates, record them
3. **Compare to plan** — Are they on track, ahead, or behind the action plan?
4. **Identify blockers** — If they're stuck on this week's action, help them problem-solve
5. **Celebrate wins** — Acknowledge every step forward, no matter how small
6. **Take action** — Don't just talk. If they need something:
   - Look up information, benchmarks, data
   - Adjust the action plan if circumstances changed
   - Craft emails they need to send
   - Send emails on their behalf (with their approval)
   - Recommend relevant PowerChat or podcast content
   - Connect them to a partner IF that partner genuinely helps with this
     specific PowerMove — frame it as support, not a sales pitch
7. **Use `power_move_checkin` tool** to record the check-in with plan comparison

## Proactive Behaviors

When a PowerMove is active:
- If it's been 7+ days since last check-in, reach out proactively
- If they're ahead of schedule, celebrate and suggest stretching the goal
- If they're falling behind, offer concrete help — not just encouragement
- If a PowerMove is expiring in 2 weeks with no recent activity, send a nudge
- If they complete a PowerMove, celebrate BIG and suggest their next one

## When a PowerMove is Complete

1. Ask for completion evidence or summary
2. Record their reflection on the journey
3. Generate an AI completion summary
4. Update `power_moves_completed` on their member profile
5. Check if `partner_recommendation_unlocked` should flip to true
6. Celebrate and suggest: "What's your next PowerMove?"

## What NOT to Do

- Don't assign PowerMoves — the member creates them
- Don't be vague — always tie coaching to their specific milestone
- Don't just encourage — take ACTION (send emails, look things up, map steps)
- Don't let a PowerMove sit idle — if they haven't checked in, reach out
- Don't judge abandoned PowerMoves — life happens, help them refocus
```

### 2B. Content Recommendation Skill

**File:** `tpe-backend/src/skills/inner-circle/content-recommendation/SKILL.md`

```markdown
---
name: content_recommendation
description: Surfaces relevant PowerChat videos and podcast episodes based on member context
metadata:
  openclaw:
    emoji: "📚"
    context: inner_circle
    priority: normal
---

# Content Recommendation

## What You Have Access To

- **PowerChat videos** — Short-form and full episodes covering business topics
  (rebranded from Next100 + new content)
- **Podcast episodes** — "Podcast Out of the Box" featuring top industry leaders
- **Books** — Recommended reading with AI summaries
- **Events** — Past and upcoming Power100 events

## When to Recommend Content

- Member asks about a specific topic → search and recommend
- Member is working on a PowerMove → proactively suggest relevant content
- Member mentions a challenge → connect them to an episode where someone solved it
- During weekly check-ins → "Here's something that might help with [their goal]"
- When they're browsing or exploring → guide them to high-value content

## How to Recommend

Use the `recommend_content` tool to search the content library. Then frame
recommendations with CONTEXT:

GOOD: "You're working on scaling revenue to $120K/month. There's a PowerChat
episode where Mike talks about exactly this — he went from $90K to $150K in
3 months by restructuring his sales process. The key insight starts around
minute 12. Want me to pull up the details?"

BAD: "Here are some episodes about sales growth: [list]"

Always explain WHY this content is relevant to THEIR situation.

## Watch History Awareness

You have access to what the member has watched via their watch history:
- **Don't recommend content they've already completed** (90%+ watched)
- **Do reference content they've watched**: "In that PowerChat you watched last
  week, Greg mentioned X — how are you applying that?"
- **Nudge partially-watched content**: "You started that Outside The Lines episode
  about AI in the field — want to finish it? The best part is in the second half."
- **Notice patterns**: If they watch all Growth content, acknowledge it and suggest
  branching into related pillars
- Use watch data to make recommendations SPECIFIC, not generic

## Content You Know Deeply

You don't just link to content — you UNDERSTAND it. If a member asks
"What did Greg say about pricing strategy in that episode?" you should
be able to answer from the transcript and AI analysis, not just say
"go watch it."
```

### 2C. Proactive Engagement Skill

**File:** `tpe-backend/src/skills/inner-circle/proactive-engagement/SKILL.md`

```markdown
---
name: proactive_engagement
description: Drives proactive outreach — weekly check-ins, nudges, and re-engagement
metadata:
  openclaw:
    emoji: "💬"
    context: inner_circle
    priority: normal
---

# Proactive Engagement

## Proactive Triggers

You don't wait for the member to come to you. You reach out when:

### PowerMove Check-ins (Weekly)
- Every active PowerMove gets a weekly check-in
- Day 7 since last check-in → reach out
- Day 10 → more urgent nudge
- Day 14+ → "Hey, I noticed we haven't connected about [PowerMove] in a while..."

### Milestone Moments
- PowerMove just created → Week 0 response (encouragement + 8-week action plan)
- PowerMove 50% through timeline (Week 4) → mid-point review against the plan
- PowerMove 2 weeks from deadline (Week 6) → urgency check against remaining plan actions
- PowerMove completed → celebrate BIG + suggest next PowerMove

### Engagement Signals
- No concierge interaction in 14+ days → gentle re-engagement
- New content published matching their focus areas → notify
- Member hasn't created a PowerMove yet (post-onboarding) → suggest one

## Tone for Proactive Messages

- Warm, not robotic: "Hey [Name], just checking in..."
- Specific, not generic: Reference their actual PowerMove and progress
- Action-oriented: Don't just ask how they are — offer something useful
- Respectful of time: Keep proactive messages concise with clear purpose

## Scheduling

Use `schedule_followup` tool with:
- `followup_type: 'check_in'` for weekly PowerMove check-ins
- `followup_type: 'reminder'` for deadline reminders
- `followup_type: 'offer_help'` for re-engagement nudges
- `followup_type: 'resource_recommendation'` for content notifications

## Re-engagement Strategy

If a member goes quiet (14+ days no interaction):
1. First reach out: Share a relevant content piece as conversation starter
2. Second (7 days later): Reference their PowerMove progress
3. Third (7 more days): "I'm still here when you need me. Your [PowerMove]
   deadline is [date] — want to talk strategy?"
4. After that: Mark in notes, wait for them to re-engage
```

---

## 3. New Agent Tools

### 3A. Manage PowerMove Tool

**New File:** `tpe-backend/src/services/agents/tools/managePowerMoveTool.js`

**Purpose:** Create, update, and manage PowerMoves from conversational interaction. The concierge calls this when a member wants to create a new PowerMove, update progress, or mark one complete.

```javascript
// Tool definition:
// name: "manage_power_move"
// description: "Create, update, or complete a PowerMove for an Inner Circle member.
//              PowerMoves are 60-day fiscal milestones that the member creates.
//              Use this when a member wants to set a new goal, update progress,
//              or mark a PowerMove as complete."
//
// parameters: {
//   member_id: integer (required)
//   action: enum ['create', 'update', 'complete', 'abandon'] (required)
//
//   --- For 'create' action ---
//   title: string (required for create)
//   description: string (optional)
//   pillar: enum ['growth', 'culture', 'community', 'innovation'] (required for create)
//   fiscal_target: string (required for create) — the milestone statement
//   fiscal_metric: string (optional) — what's being measured
//   starting_value: string (optional) — where they are now
//   target_value: string (optional) — where they want to be
//   action_steps: string[] (optional) — initial mapped steps
//
//   --- For 'update' action ---
//   power_move_id: integer (required for update/complete/abandon)
//   current_value: string (optional) — updated metric
//   action_steps: string[] (optional) — updated steps
//   member_notes: string (optional) — member's notes
//   ai_coaching_notes: string (optional) — concierge observations
//   ai_suggested_resources: object[] (optional) — content/partner suggestions
//
//   --- For 'complete' action ---
//   power_move_id: integer (required)
//   completion_evidence: string (optional)
//   completion_reflection: string (optional)
//   ai_completion_summary: string (required for complete) — AI-generated journey summary
//
//   --- For 'abandon' action ---
//   power_move_id: integer (required)
//   reason: string (optional) — why they're stepping back
// }
//
// On 'create':
//   1. Insert into power_moves with status 'active'
//   2. Set target_date to start_date + 60 days
//   3. Generate 8-week action plan based on the member's PowerMove details
//      (stored in action_steps as [{week: 1, action: "...", status: "pending"}, ...])
//   4. Update inner_circle_members.power_moves_active (append)
//   5. If partner_recommendation_unlocked = false → set to true (first PowerMove unlocks partners)
//   6. Record Week 0 check-in via powerMoveCheckinTool:
//      - week_number: 0
//      - checkin_source: 'concierge'
//      - ai_coaching_response: Motivational message + 8-week plan presentation
//      - ai_sentiment: 'on_track'
//      - ai_actions_taken: [{type: 'week_0_response', action_plan_generated: true}]
//   7. Schedule first weekly check-in (Week 1) via scheduleFollowupTool
//   8. Log to ai_learning_events
//
// Week 0 Response Behavior:
//   The concierge immediately responds with:
//   - Warm encouragement and motivational recognition for taking the step
//   - Acknowledgment of their specific goal and why it matters
//   - The personalized 8-week action plan broken down week by week
//   - Clear expectation setting: "I'll check in with you every week to track
//     progress against this plan. Let's get this done together."
//   This makes the member feel supported from moment one and gives them a
//   clear roadmap to follow. The 8-week plan IS what weekly check-ins measure against.
//
// On 'complete':
//   1. Update power_moves status to 'completed', set completed_date
//   2. Increment inner_circle_members.power_moves_completed
//   3. Move from power_moves_active to power_moves_history on member profile
//   4. Log to ai_learning_events
//
// Security: Uses memberScopedQuery — member_id in WHERE clause enforced
```

### 3B. PowerMove Check-in Tool

**New File:** `tpe-backend/src/services/agents/tools/powerMoveCheckinTool.js`

**Purpose:** Record weekly progress check-ins on active PowerMoves. Called by the concierge during proactive check-ins or member-initiated progress updates.

```javascript
// Tool definition:
// name: "power_move_checkin"
// description: "Record a weekly check-in on a member's active PowerMove.
//              Use this during weekly progress conversations to track
//              what's happening, capture wins, identify blockers,
//              and record coaching actions taken."
//
// parameters: {
//   power_move_id: integer (required)
//   member_id: integer (required)
//   progress_update: string (required) — what the member shared
//   current_value: string (optional) — updated metric value
//   blockers: string (optional) — obstacles mentioned
//   wins: string (optional) — successes/milestones
//   ai_coaching_response: string (required) — what you said/did in response
//   ai_actions_taken: object[] (optional) — emails sent, content recommended, etc.
//   ai_sentiment: enum ['on_track', 'falling_behind', 'ahead', 'needs_support'] (required)
//   checkin_source: enum ['concierge', 'member_initiated', 'heartbeat'] (default: 'concierge')
// }
//
// Actions:
//   1. Calculate week_number from power_move.start_date (Week 0 = creation day)
//   2. Insert into power_move_checkins
//   3. Update power_moves.total_checkins, last_checkin_date, streak_weeks
//   4. Update power_moves.current_value if provided
//   5. Compare progress against action_steps for the current week
//      (the 8-week plan is the measuring stick — flag if behind/ahead)
//   6. Schedule next weekly check-in via scheduleFollowupTool
//   7. Log to ai_learning_events
//
// Security: Uses memberScopedQuery — member_id in WHERE clause enforced
```

---

## 4. Proactive Heartbeat Engine

### 4A. Heartbeat Service

**New File:** `tpe-backend/src/services/heartbeatService.js`

**Based on:** OpenClaw `src/infra/heartbeat-runner.ts` concept, implemented via Bull queue (already available in project).

**Purpose:** Scheduled job that runs daily, scans for members who need proactive outreach, and enqueues messages.

```javascript
// Key responsibilities:
//
// 1. Daily scan at configured time (e.g., 9 AM EST):
//    - Query all active PowerMoves where last_checkin_date > 7 days ago
//    - Query members with no interaction in 14+ days (re-engagement)
//    - Query PowerMoves approaching deadline (< 14 days remaining)
//    - Query newly completed PowerMoves (celebration + next suggestion)
//
// 2. For each action needed:
//    - Enqueue via laneQueue in 'cron' lane (not 'main' — don't block user messages)
//    - Use scheduleFollowupTool to create the outreach
//    - Log to ai_learning_events
//
// 3. Rate limiting:
//    - Max 3 proactive messages per member per day
//    - Don't send if member interacted today already
//    - Respect member timezone (from profile or default EST)
//
// Bull Queue Job:
//    Queue name: 'heartbeat'
//    Job: 'daily_member_scan'
//    Repeat: cron '0 9 * * *' (9 AM daily)
//
// Integration:
//    - Registered in server.js on startup
//    - Uses Redis for Bull queue persistence
//    - Each scan logged with member count and actions taken
```

### 4B. Heartbeat Configuration

**New File:** `tpe-backend/src/config/heartbeatConfig.js`

```javascript
// Configuration for proactive engagement thresholds:
module.exports = {
  // PowerMove check-in triggers
  CHECKIN_OVERDUE_DAYS: 7,       // Days since last check-in before reaching out
  CHECKIN_URGENT_DAYS: 10,       // Days before more urgent nudge
  CHECKIN_CRITICAL_DAYS: 14,     // Days before concern message

  // PowerMove deadline triggers
  DEADLINE_WARNING_DAYS: 14,     // Days before deadline to warn
  DEADLINE_URGENT_DAYS: 7,       // Days before urgent reminder

  // Re-engagement triggers
  INACTIVE_DAYS: 14,             // Days without any interaction
  MAX_REENGAGEMENT_ATTEMPTS: 3,  // Stop after 3 attempts

  // Rate limits
  MAX_PROACTIVE_PER_DAY: 3,     // Max proactive messages per member per day
  SKIP_IF_ACTIVE_TODAY: true,   // Don't send if member already chatted today

  // Schedule
  SCAN_CRON: '0 9 * * *',       // 9 AM daily
  TIMEZONE: 'America/New_York'   // Default timezone
};
```

---

## 5. Partner Recommendation Gating — Enforcement

### 5A. Auto-Unlock Logic

**Where:** Inside `managePowerMoveTool.js` (on 'create' action — not 'complete')

When a member **creates** their first PowerMove:
1. Check if `partner_recommendation_unlocked` is currently `false`
2. Auto-set `partner_recommendation_unlocked = true` on member profile
3. Don't announce the unlock formally — the concierge will naturally start including partner recommendations when they're genuinely relevant to the member's active PowerMove(s)

**Key distinction:** The unlock trigger is CREATING a PowerMove, not completing one. Creating a PowerMove means the member has committed to a specific fiscal milestone — the concierge now has context for what they need, making partner recommendations genuine rather than generic.

**Where:** Inside `aiConciergeInnerCircleAgent.js` (member context builder)

On every message, `getMemberContext()` checks:
- If `partner_recommendation_unlocked = false` AND member has at least 1 active PowerMove:
  → Call `updateMemberProfileTool` to set `partner_recommendation_unlocked = true`
  → No formal notification — just allows natural partner recommendations

### 5B. Contextual Recommendation Rule

**Where:** In the `partner-gating` skill (Phase 1) and `powermove-coaching` skill (Phase 2)

Partner recommendations are NOT a blanket unlock. Even when `partner_recommendation_unlocked = true`, the concierge should ONLY recommend partners when:
- The partner's capabilities directly support the member's active PowerMove
- The recommendation genuinely helps the member reach their fiscal milestone
- It fits naturally in the conversation — not forced or salesy

The concierge explains WHY this partner helps with THEIR specific goal, backed by PowerConfidence data.

### 5C. Explicit Ask Override

**Where:** In the `partner-gating` skill (already defined in Phase 1)

If the member explicitly asks about partners (detected by the LLM from conversation):
- The skill instructions tell the concierge to unlock and recommend
- No PowerMove creation required — explicit intent is respected
- Even with explicit asks, recommendations should connect to what the member is working on

---

## 6. Content Architecture — Shows, Videos & Podcasts

### 6A. Content Landscape

Power100 content is organized by **shows** (named programs with hosts) and **general content** (standalone videos). All content is accessible in the Inner Circle portal. Members can filter by show tabs or browse everything.

**Named Shows (each gets its own portal tab):**

| Show | Hosts | Format | Frequency |
|---|---|---|---|
| **PowerChat** | Greg + guest(s) | Video podcast | Regular |
| **Inner Circle with Greg & Paul** | Greg & Paul | Monthly pillar recap (live session) | Last Friday of month |
| **Outside The Lines with Ray & Greg** | Ray & Greg | Video podcast (Podcast Out of the Box format) | TBD |
| Future shows | Various | Video podcast | As created |

**General Power100 Video Content (not podcast format):**
- Feature interviews with leaders
- Day in the Life content
- Event coverage
- Other video content as produced

**Content Storage Rules:**
- **Show content** → lives in BOTH `video_content` (video version) AND `podcast_episodes` (audio feed) — all shows are video podcast format
- **General Power100 video content** → `video_content` only (not podcast format)
- **Existing TPX content** → stays in current tables unchanged (`video_type = 'demo'/'partner_demo'`, industry podcasts)

### 6B. Migration: Create `shows` Table

**File:** `tpe-database/migrations/20260215_create_shows.sql`

```sql
-- ================================================================
-- Migration: Create Shows Table
-- Date: February 15, 2026
-- Purpose: Named content programs (PowerChat, Inner Circle, etc.)
--          Each show gets its own tab/filter in the Inner Circle portal.
--          Slug matches WordPress /show/{slug}/ for cross-system consistency.
-- ================================================================

CREATE TABLE IF NOT EXISTS shows (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  hosts VARCHAR(500),
  description TEXT,
  logo_url TEXT,
  brand_color VARCHAR(20),
  format VARCHAR(50) DEFAULT 'video_podcast'
    CHECK (format IN ('video_podcast', 'live_session', 'audio_podcast')),
  is_active BOOLEAN DEFAULT TRUE,
  episode_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_shows_slug ON shows(slug);
CREATE INDEX idx_shows_active ON shows(is_active);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_shows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_shows_updated_at
  BEFORE UPDATE ON shows
  FOR EACH ROW
  EXECUTE FUNCTION update_shows_updated_at();

-- Seed initial shows
INSERT INTO shows (name, slug, hosts, description, format) VALUES
  ('PowerChat', 'powerchat', 'Greg', 'Power100''s podcast arm — Greg and guests discuss business growth, leadership, and industry insights.', 'video_podcast'),
  ('Inner Circle with Greg & Paul', 'inner-circle', 'Greg & Paul', 'Monthly pillar recap — the top moments, lessons, and takeaways from the month, organized by the current focus pillar.', 'live_session'),
  ('Outside The Lines with Ray & Greg', 'outside-the-lines', 'Ray & Greg', 'Conversations at the intersection of military leadership, construction, and AI — the first Podcast Out of the Box format show.', 'video_podcast')
ON CONFLICT (slug) DO NOTHING;
```

### 6C. Migration: Extend `video_content` Table

**File:** `tpe-database/migrations/20260215_extend_video_content.sql`

```sql
-- ================================================================
-- Migration: Add show_id and featured_names to video_content
-- Date: February 15, 2026
-- Purpose: Link videos to shows and enable name-based filtering.
-- ================================================================

-- Link videos to named shows (NULL = general Power100 content or TPX content)
ALTER TABLE video_content
  ADD COLUMN IF NOT EXISTS show_id INTEGER REFERENCES shows(id) ON DELETE SET NULL;

-- Enable filtering by guest/featured person name
ALTER TABLE video_content
  ADD COLUMN IF NOT EXISTS featured_names TEXT[] DEFAULT '{}';

-- Episode number within a show (NULL for non-show content)
ALTER TABLE video_content
  ADD COLUMN IF NOT EXISTS episode_number INTEGER;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vc_show_id ON video_content(show_id);
CREATE INDEX IF NOT EXISTS idx_vc_featured_names ON video_content USING GIN(featured_names);
CREATE INDEX IF NOT EXISTS idx_vc_show_episode ON video_content(show_id, episode_number);

-- Update existing TPX content: show_id stays NULL, video_type stays as-is
-- No existing data is modified
```

### 6D. Migration: Extend `podcast_episodes` Table

**File:** `tpe-database/migrations/20260215_extend_podcast_episodes.sql`

```sql
-- ================================================================
-- Migration: Add show_id and AI fields to podcast_episodes
-- Date: February 15, 2026
-- Purpose: Link podcast episodes to shows and add AI processing
--          fields for concierge content recommendations.
-- ================================================================

-- Link to shows table (replaces raw show_id integer with FK)
-- NOTE: Existing show_id column exists but has no FK constraint.
-- We add the FK constraint to the existing column.
ALTER TABLE podcast_episodes
  ADD CONSTRAINT fk_pe_show_id FOREIGN KEY (show_id) REFERENCES shows(id) ON DELETE SET NULL;

-- AI fields (matching video_content pattern for auto-discovery by aiKnowledgeService)
ALTER TABLE podcast_episodes
  ADD COLUMN IF NOT EXISTS ai_summary TEXT;

ALTER TABLE podcast_episodes
  ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '[]'::jsonb;

ALTER TABLE podcast_episodes
  ADD COLUMN IF NOT EXISTS ai_key_topics JSONB DEFAULT '[]'::jsonb;

ALTER TABLE podcast_episodes
  ADD COLUMN IF NOT EXISTS ai_engagement_score NUMERIC(5,2) DEFAULT 0.00;

ALTER TABLE podcast_episodes
  ADD COLUMN IF NOT EXISTS ai_processing_status VARCHAR(50) DEFAULT 'pending';

ALTER TABLE podcast_episodes
  ADD COLUMN IF NOT EXISTS last_ai_analysis TIMESTAMP;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pe_show_id ON podcast_episodes(show_id);
CREATE INDEX IF NOT EXISTS idx_pe_ai_topics ON podcast_episodes USING GIN(ai_key_topics);
```

### 6E. Content Queries — How Filtering Works

With this architecture, all content queries work naturally:

```sql
-- All portal content (everything except TPX demos)
SELECT * FROM video_content WHERE video_type NOT IN ('demo', 'partner_demo');

-- All content for a specific show
SELECT * FROM video_content WHERE show_id = (SELECT id FROM shows WHERE slug = 'powerchat');

-- Inner Circle sessions only
SELECT * FROM video_content WHERE show_id = (SELECT id FROM shows WHERE slug = 'inner-circle');

-- General Power100 content (not part of any show)
SELECT * FROM video_content WHERE show_id IS NULL AND video_type NOT IN ('demo', 'partner_demo');

-- All podcast-format content (audio feeds)
SELECT pe.*, s.name as show_name FROM podcast_episodes pe
  JOIN shows s ON pe.show_id = s.id;

-- Filter by featured person name
SELECT * FROM video_content WHERE 'John Smith' = ANY(featured_names);

-- AI concierge content search (all member-relevant content)
SELECT * FROM video_content
  WHERE video_type NOT IN ('demo', 'partner_demo')
  ORDER BY ai_engagement_score DESC;
```

### 6F. Content Ingestion Pipeline

**New File:** `tpe-backend/src/services/contentIngestionService.js`

**Purpose:** Process show episodes and general video content for AI-powered recommendations.

```javascript
// For each new content piece:
// 1. Extract metadata (title, show, hosts/guests, date, duration, type)
// 2. Process transcript (if video/audio → use existing Whisper integration)
// 3. AI processing:
//    - Generate ai_summary (what this episode covers)
//    - Extract ai_tags (topics, focus areas it relates to)
//    - Identify ai_insights (key takeaways for members)
//    - Map to pillars (growth, culture, community, innovation)
//    - Identify relevant fiscal scenarios (what PowerMoves this helps with)
//    - Extract featured_names from transcript/metadata
// 4. Generate embeddings via pgvector
// 5. Store in entity_embeddings table for hybrid search
//
// For show content: insert into BOTH video_content AND podcast_episodes
// with matching show_id and episode_number
//
// For general Power100 content: insert into video_content only
// with show_id = NULL and appropriate video_type
```

### 6G. Content-PowerMove Linking

When the concierge recommends content during a PowerMove coaching session:
1. Record the recommendation in `power_moves.ai_suggested_resources`
2. When member watches recommended content, `member_watch_history` records it with `source = 'concierge_recommendation'`
3. Concierge can see in next conversation: "You watched [episode] — what did you think?"
4. Feed watch data back into `ai_engagement_score`

### 6H. Watch History Integration with Concierge

**Where:** Inside `getMemberContext()` in `aiConciergeInnerCircleAgent.js`

On every message, the member context builder queries `member_watch_history`:

```javascript
// Query recent watch history (last 30 days):
// SELECT mwh.*, vc.title, vc.ai_summary, s.name as show_name
//   FROM member_watch_history mwh
//   LEFT JOIN video_content vc ON mwh.content_id = vc.id AND mwh.content_type = 'video'
//   LEFT JOIN shows s ON mwh.show_id = s.id
//   WHERE mwh.member_id = ? AND mwh.last_watched_at > NOW() - INTERVAL '30 days'
//   ORDER BY mwh.last_watched_at DESC
//   LIMIT 10
//
// Injected into system prompt as:
// "## Recent Watch History
//  - Watched "PowerChat Ep. 42: Scaling Sales Teams" (95% complete, 2 days ago)
//  - Watched "Inner Circle Jan Recap: Growth Pillar" (100% complete, 1 week ago)
//  - Started "Outside The Lines Ep. 3: AI in Field Operations" (30%, 3 days ago)"
//
// This gives the concierge natural conversation hooks and avoids
// recommending content they've already consumed.
```

**Where:** Inside `recommendContentTool.js` (Phase 1 tool, updated in Phase 2)

Before recommending content, check watch history:
```javascript
// Exclude content the member has already completed (watch_progress >= 90%)
// Include partially-watched content with context: "You started this one — want to finish it?"
// Prioritize content from shows they haven't explored yet (diversity signal)
```

---

## 7. Member Engagement Analytics

### 7A. Engagement Score Calculation

**New Function:** In `aiConciergeInnerCircleAgent.js` or as a separate service

```javascript
// ai_engagement_score is calculated from:
//
// 1. Content watch behavior (from member_watch_history):     — weight: 30%
//    - Total content pieces watched
//    - Average watch completion % (watching 90%+ vs 10%)
//    - Watch frequency (sessions per week)
//    - Show diversity (watching multiple shows vs just one)
//    - Rewatch count (rewatching = high value signal)
// 2. PowerMove activity:                                     — weight: 30%
//    - Has active PowerMoves? (+)
//    - Check-in streak length (+)
//    - PowerMoves completed (+)
//    - PowerMoves abandoned (-)
// 3. Concierge interaction frequency (sessions per week):    — weight: 20%
//    - Message count and depth of conversations
//    - Questions asked (curiosity signal)
//    - Actions taken from concierge suggestions
// 4. Profile completeness:                                   — weight: 10%
//    - All onboarding fields filled
//    - Coaching preferences set
// 5. Recency:                                                — weight: 10%
//    - Days since last interaction OR last watch (decay factor)
//
// Score range: 0.00 — 100.00
// Updated: After each concierge interaction and weekly via heartbeat
```

### 7B. Engagement-Based Behaviors

The concierge adjusts behavior based on engagement score:
- **High engagement (70+):** Deep coaching, advanced content, partner recommendations
- **Medium engagement (40-69):** Encouraging, surfacing easy wins, content recommendations
- **Low engagement (<40):** Re-engagement focus, light touch, celebrate any return

---

## 8. Conversion Tracking

### 8A. Inner Circle → Contractor Pipeline

When a member has:
- Completed 1+ PowerMoves
- High engagement score (70+)
- Partner recommendations unlocked

The concierge can naturally guide them toward the contractor flow:

```
"Based on everything we've worked on together, I think you'd get incredible value
from our full contractor experience. It would connect you directly with verified
partners who specialize in exactly what you need for [their focus area]. Want me
to tell you more about how that works?"
```

**If they convert:**
1. Update `inner_circle_members.converted_to_contractor = true`
2. Pre-populate contractor flow with data from member profile (same field names)
3. Set `inner_circle_members.contractor_id` after contractor record is created
4. Set `inner_circle_members.conversion_date`
5. Log conversion in `ai_learning_events`

---

## 9. File-by-File Change Summary

### New Files (14 files)

| # | File | Purpose |
|---|------|---------|
| 1 | `tpe-database/migrations/20260215_create_power_moves.sql` | PowerMoves table |
| 2 | `tpe-database/migrations/20260215_create_power_move_checkins.sql` | Check-in tracking table |
| 3 | `tpe-database/migrations/20260215_create_member_watch_history.sql` | Watch history tracking (data from WordPress portal via n8n) |
| 4 | `tpe-database/migrations/20260215_create_shows.sql` | Shows table + seed data (PowerChat, Inner Circle, Outside The Lines) |
| 5 | `tpe-database/migrations/20260215_extend_video_content.sql` | Add show_id FK, featured_names, episode_number to video_content |
| 6 | `tpe-database/migrations/20260215_extend_podcast_episodes.sql` | Add show_id FK constraint + AI fields to podcast_episodes |
| 7 | `tpe-backend/src/services/agents/tools/managePowerMoveTool.js` | Create/update/complete PowerMoves |
| 8 | `tpe-backend/src/services/agents/tools/powerMoveCheckinTool.js` | Record weekly check-ins |
| 9 | `tpe-backend/src/services/heartbeatService.js` | Proactive daily scan + outreach scheduling |
| 10 | `tpe-backend/src/config/heartbeatConfig.js` | Heartbeat thresholds and schedule |
| 11 | `tpe-backend/src/skills/inner-circle/powermove-coaching/SKILL.md` | PowerMove coaching skill |
| 12 | `tpe-backend/src/skills/inner-circle/content-recommendation/SKILL.md` | Content recommendation skill |
| 13 | `tpe-backend/src/skills/inner-circle/proactive-engagement/SKILL.md` | Proactive engagement skill |
| 14 | `tpe-backend/src/services/contentIngestionService.js` | Content processing for hybrid search |

### Modified Files (6 files)

| # | File | Change |
|---|------|--------|
| 1 | `tpe-backend/src/services/agents/aiConciergeInnerCircleAgent.js` | Add PowerMove tools, watch history in getMemberContext(), engagement scoring, conversion logic |
| 2 | `tpe-backend/src/services/agents/tools/recommendContentTool.js` | Check watch history before recommending (exclude completed, nudge partially-watched) |
| 3 | `tpe-backend/src/services/skillLoaderService.js` | Seed new Phase 2 skills into skill_definitions |
| 4 | `tpe-backend/src/server.js` | Register heartbeat Bull queue on startup |
| 5 | `tpe-backend/src/services/agents/tools/updateMemberProfileTool.js` | Add power_moves_completed and partner_recommendation_unlocked updates |
| 6 | `tpe-backend/src/routes/innerCircleRoutes.js` | Add PowerMove API endpoints + watch history webhook endpoint for n8n |

### Existing Tables Extended

| Table | Change |
|-------|--------|
| `inner_circle_members` | No schema change — fields already defined in Phase 1 (power_moves_completed, power_moves_active, etc.) |
| `video_content` | Add `show_id` (FK → shows), `featured_names` (TEXT[]), `episode_number` (INTEGER) |
| `podcast_episodes` | Add FK constraint on existing `show_id`, add 6 AI fields (ai_summary, ai_insights, ai_key_topics, ai_engagement_score, ai_processing_status, last_ai_analysis) |

---

## 10. Implementation Order

Each step builds on the previous:

1. **Database: Run content migrations** — `shows` table, extend `video_content` (show_id, featured_names, episode_number), extend `podcast_episodes` (FK constraint + AI fields)
2. **Database: Run PowerMove migrations** — `power_moves` and `power_move_checkins` tables
3. **Database: Run watch history migration** — `member_watch_history` table
4. **Post-migration verification** — Confirm all tables, columns, constraints, seed data
4. **Skill seed files** — Create the 3 Phase 2 SKILL.md files
5. **Seed skills** — Run seeder to add Phase 2 skills to `skill_definitions`
6. **managePowerMoveTool** — Build and unit test (create, update, complete, abandon actions)
7. **powerMoveCheckinTool** — Build and unit test
8. **Inner Circle Agent updates** — Add new tools, engagement scoring, conversion logic
9. **Partner gating enforcement** — Auto-unlock on PowerMove creation
10. **Content ingestion pipeline** — Process show episodes + general content for hybrid search
11. **Content recommendation skill integration** — Wire `recommend_content` tool to shows + AI fields
12. **Heartbeat service** — Build daily scan + Bull queue scheduling
13. **Heartbeat configuration** — Set thresholds, register in server.js
14. **Engagement score calculation** — Build scoring function, integrate with heartbeat
15. **Conversion tracking** — member → contractor pipeline logic
16. **API endpoints** — PowerMove + shows routes for frontend (list, detail, filter)
17. **End-to-end testing** — Create PowerMove → weekly check-ins → complete → partner unlock → content recommendations

---

## 11. Testing Strategy

### Unit Tests
- `managePowerMoveTool`: Create PowerMove with all fields, verify 60-day target_date calculation
- `managePowerMoveTool`: Create action generates 8-week action plan in action_steps
- `managePowerMoveTool`: Create action triggers Week 0 check-in with motivational response
- `managePowerMoveTool`: Complete action increments `power_moves_completed` and triggers unlock
- `powerMoveCheckinTool`: Correctly calculates week_number from start_date (Week 0 = creation day)
- `powerMoveCheckinTool`: Updates streak_weeks (consecutive weeks)
- `powerMoveCheckinTool`: Compares progress against action_steps for current week
- Heartbeat service: Identifies overdue check-ins correctly
- Heartbeat service: Respects rate limits (max 3 per day)
- Engagement score: Calculates correctly from weighted components

### Integration Tests
- Full PowerMove lifecycle: create → 3 weekly check-ins → complete
- Partner unlock: First PowerMove creation → `partner_recommendation_unlocked = true`
- Heartbeat scan: Creates scheduled follow-ups for overdue check-ins
- Content recommendation: PowerMove context improves search relevance
- Watch history: n8n webhook UPSERT correctly (new watch → INSERT, rewatch → UPDATE)
- Watch history: Concierge references recently watched content in conversation
- Watch history: `recommend_content` excludes completed content, nudges partial
- Conversion flow: Member with completed PowerMove guided to contractor flow
- Member scoping: Cannot access or modify another member's PowerMoves or watch history

### Manual Testing
- Create a PowerMove via concierge conversation (natural language → structured data)
- Weekly check-in conversation flow (concierge asks, member responds, coaching recorded)
- Proactive outreach after 7 days of no check-in
- Content recommendation tied to active PowerMove topic
- Watch history appears in concierge context ("You watched X recently...")
- Concierge doesn't recommend content member already completed
- Concierge nudges partially-watched content ("Want to finish that episode?")
- Partner recommendation appears only after PowerMove creation
- Heartbeat fires at scheduled time and sends correct outreach

---

## 12. Phase 2 Pre-Flight Checklist Needed

Before implementing Phase 2, a pre-flight checklist must verify:
- Phase 1 tables (`inner_circle_members`, `skill_definitions`) exist and are populated
- Phase 1 skills are seeded in `skill_definitions` table
- Inner Circle Agent is functional (can register, onboard, converse)
- `power_moves` and `power_move_checkins` tables do NOT already exist
- Bull queue / Redis is operational for heartbeat
- `contractor_content_engagement` table structure (for extending to members)
- Existing heartbeat/scheduling patterns (if any) to avoid conflicts

---

## 13. What This Phase Enables

After Phase 2 is complete:

1. **Members create PowerMoves** — 60-day fiscal milestones in their own words
2. **Immediate support from day one** — Week 0 response with encouragement + personalized 8-week action plan
3. **AI coaches them weekly** — Check-ins measured against the 8-week plan with real action (not just talk)
4. **Content is contextual** — Recommendations tied to their specific PowerMove, pillar, and watch history
5. **Partners unlock naturally** — First PowerMove creation or explicit ask
6. **Engagement is measurable** — ai_engagement_score tracks member value (watch behavior + PowerMove activity)
7. **Conversion pipeline exists** — Warm leads naturally flow to contractor matching
8. **The concierge never sleeps** — Heartbeat engine ensures no member goes forgotten

---

## Next Steps

1. Create **Phase 2 Pre-Flight Checklist** with database verification queries
2. Complete Phase 1 implementation first
3. Begin Phase 2 implementation following Section 10 order
4. Update OVERVIEW document `power_moves` table design to match this plan
