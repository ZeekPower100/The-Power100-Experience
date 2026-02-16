# Phase 1: Foundation — Inner Circle Context, Security & Skill Architecture

**Document Version:** 1.2 (Revised: DB-primary skills with filesystem seeding)
**Date:** February 15, 2026
**Status:** READY FOR IMPLEMENTATION
**Prerequisites:** Pre-Flight Checklist must pass before any code changes
**Backup Tag:** `pre-inner-circle-concierge` (commit dc02635)
**OpenClaw Reference:** `C:/Users/broac/CascadeProjects/openclaw-reference/`

---

## Executive Summary

**Goal:** Extend the existing AI Concierge to support Inner Circle members with a new XState context, OpenClaw-derived skill architecture, conversational onboarding, and security hardening — built on the proven LangGraph + XState foundation.

**Key Design Decision (from OpenClaw source analysis):** The skill system uses OpenClaw's `SKILL.md` format — YAML frontmatter for metadata, Markdown body for behavior instructions. They get injected into the system prompt. The LLM decides when and how to apply them. No trigger evaluation engine, no complex parsers. However, unlike OpenClaw (which loads from filesystem only), we use a **database-primary approach with filesystem seeding**. Skills are stored in a `skill_definitions` table so they can be edited from the admin UI without deploying code. Filesystem SKILL.md files serve as the initial seed and version-controlled baseline.

### What Phase 1 Delivers

- [ ] Security hardening (credentials to env vars, prompt injection layer, per-member scoping, rate limiting)
- [ ] Database: `inner_circle_members` table
- [ ] Database: `member_id` column added to `ai_concierge_sessions`
- [ ] Lane Queue: Serial execution system (adopted from OpenClaw `src/process/command-queue.ts`)
- [ ] XState: `inner_circle_agent` state added to routing machine
- [ ] XState: `isInnerCircleMember` guard for context detection
- [ ] LangGraph: `aiConciergeInnerCircleAgent.js` with skill-aware system prompt
- [ ] Database: `skill_definitions` table (DB-primary skill storage)
- [ ] Skill System: DB-primary loader with filesystem seeding (OpenClaw SKILL.md format)
- [ ] Skill Seed Files: `onboarding/SKILL.md`, `general-guidance/SKILL.md`, `partner-gating/SKILL.md`
- [ ] Admin: Skill management endpoints (CRUD for skill_definitions)
- [ ] Conversational onboarding: Data extraction → member profile mapping
- [ ] New agent tools: `updateMemberProfileTool`, `recommendContentTool`
- [ ] API: Member registration, authentication, session management
- [ ] Controller: Extended `routeToAgent()` with member detection
- [ ] Frontend: Reference chat component for Inner Circle portal

---

## 1. Security Hardening

### 1A. Move Credentials to Environment Variables

**Problem:** Production database password and admin credentials are in `CLAUDE.md` (checked into git). Any agent or person with repo access can read them in plain text.

**Files Modified:**
- `CLAUDE.md` — Remove all plaintext credentials, replace with references to env vars

**Action:** Replace credential sections in CLAUDE.md with:
```
# Database credentials are stored in environment variables.
# See tpe-backend/.env.local (development) and tpe-backend/.env.production (production)
# NEVER commit credentials to source control.
# To query local DB: Use quick-db.bat (reads from .env automatically)
# To query production DB: Use MCP tool with credentials from env vars
```

**Note:** The quick-db.bat and MCP tool instructions in CLAUDE.md currently have inline credentials. These need to read from env vars or be referenced indirectly.

### 1B. Prompt Injection Protection Layer

**New File:** `tpe-backend/src/middleware/promptInjectionGuard.js`

**Purpose:** Sanitize member input before it reaches the agent. Based on detection patterns, not blocking — we log and sanitize, not reject.

**Implementation:**
```javascript
// Detect and sanitize (not block):
// - "Ignore your instructions" / "Forget your system prompt"
// - "Act as a different AI" / "You are now..."
// - "Show me your prompt" / "What are your instructions"
// - Attempts to reference other member IDs ("show me member 42's data")
// - SQL injection patterns within conversational input
//
// On detection:
// 1. Log: member_id, timestamp, pattern matched, raw input
// 2. Strip the injection pattern from input
// 3. Continue processing with sanitized input
// 4. Flag for review if repeated (3+ attempts per session)
```

**Integration Point:** Called in `aiConciergeController.js` before message reaches `routeToAgent()`.

### 1C. Per-Member Query Scoping

**New File:** `tpe-backend/src/services/memberScopedQuery.js`

**Purpose:** Wrapper around database `query()` that enforces member scoping. All Inner Circle service calls use this instead of raw `query()`.

```javascript
// memberQuery(memberId, sql, params)
// Validates that sql includes member_id scoping
// Prepends memberId to params array
// Logs query for audit trail
```

### 1D. Rate Limiting Per Member

**File Modified:** `tpe-backend/src/middleware/rateLimiter.js` (or new middleware)

**Configuration:**
- **Free tier:** 50 concierge messages per day per member
- **Rate window:** Rolling 24-hour window
- **Storage:** Redis key `rate:member:{member_id}:daily`
- **Response on limit:** 429 with message: "You've reached your daily conversation limit. It resets tomorrow — in the meantime, check out your PowerMoves!"

---

## 2. Database Schema Changes

### 2A. Migration: Create `inner_circle_members` Table

**File:** `tpe-database/migrations/20260215_create_inner_circle_members.sql`

```sql
-- ================================================================
-- Migration: Create Inner Circle Members Table
-- Date: February 15, 2026
-- Purpose: Store Inner Circle membership profiles collected via
--          conversational onboarding through AI Concierge
-- ================================================================

CREATE TABLE IF NOT EXISTS inner_circle_members (
  id SERIAL PRIMARY KEY,

  -- Identity
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  entry_source VARCHAR(100),  -- podcast, short, referral, direct, social
  registration_date TIMESTAMP DEFAULT NOW(),
  membership_status VARCHAR(50) DEFAULT 'active'
    CHECK (membership_status IN ('active', 'inactive', 'suspended')),

  -- Profile (collected via conversational onboarding)
  business_type VARCHAR(255),
  revenue_tier VARCHAR(100),
  team_size VARCHAR(100),
  focus_areas JSONB DEFAULT '[]'::jsonb,
  growth_readiness VARCHAR(100),
  onboarding_complete BOOLEAN DEFAULT FALSE,
  onboarding_data JSONB DEFAULT '{}'::jsonb,

  -- PowerMove Tracking
  power_moves_completed INTEGER DEFAULT 0,
  power_moves_active JSONB DEFAULT '[]'::jsonb,
  power_moves_history JSONB DEFAULT '[]'::jsonb,
  coaching_preferences JSONB DEFAULT '{}'::jsonb,

  -- Engagement
  last_concierge_interaction TIMESTAMP,
  total_concierge_sessions INTEGER DEFAULT 0,
  content_interactions JSONB DEFAULT '[]'::jsonb,
  partner_recommendation_unlocked BOOLEAN DEFAULT FALSE,

  -- AI Fields (auto-discovered by aiKnowledgeService.js via ai_ prefix)
  ai_summary TEXT,
  ai_tags JSONB DEFAULT '[]'::jsonb,
  ai_insights JSONB DEFAULT '[]'::jsonb,
  ai_engagement_score NUMERIC(5,2) DEFAULT 0.00,

  -- Conversion Tracking
  converted_to_contractor BOOLEAN DEFAULT FALSE,
  contractor_id INTEGER REFERENCES contractors(id) ON DELETE SET NULL,
  conversion_date TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_icm_email ON inner_circle_members(email);
CREATE INDEX idx_icm_membership_status ON inner_circle_members(membership_status);
CREATE INDEX idx_icm_onboarding_complete ON inner_circle_members(onboarding_complete);
CREATE INDEX idx_icm_partner_unlock ON inner_circle_members(partner_recommendation_unlocked);
CREATE INDEX idx_icm_converted ON inner_circle_members(converted_to_contractor);
CREATE INDEX idx_icm_last_interaction ON inner_circle_members(last_concierge_interaction);
CREATE INDEX idx_icm_ai_tags ON inner_circle_members USING GIN(ai_tags);
CREATE INDEX idx_icm_focus_areas ON inner_circle_members USING GIN(focus_areas);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_icm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_icm_updated_at
  BEFORE UPDATE ON inner_circle_members
  FOR EACH ROW
  EXECUTE FUNCTION update_icm_updated_at();
```

### 2B. Migration: Extend `ai_concierge_sessions` Table

**File:** `tpe-database/migrations/20260215_extend_sessions_for_members.sql`

```sql
-- ================================================================
-- Migration: Add member_id to AI Concierge Sessions
-- Date: February 15, 2026
-- Purpose: Allow Inner Circle members to have concierge sessions
--          alongside existing contractor sessions
-- ================================================================

-- Add member_id column (nullable — existing sessions have contractor_id only)
ALTER TABLE ai_concierge_sessions
  ADD COLUMN IF NOT EXISTS member_id INTEGER REFERENCES inner_circle_members(id) ON DELETE SET NULL;

-- NOTE: session_type has NO CHECK constraint (verified Oct 15, 2025)
-- so 'inner_circle' can be used directly as a value

-- Index for member session lookups
CREATE INDEX IF NOT EXISTS idx_acs_member_id ON ai_concierge_sessions(member_id);

-- Extend messages table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_concierge_messages') THEN
    ALTER TABLE ai_concierge_messages
      ADD COLUMN IF NOT EXISTS member_id INTEGER REFERENCES inner_circle_members(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_acm_member_id ON ai_concierge_messages(member_id);
  END IF;
END $$;
```

### 2C. Migration: Create `skill_definitions` Table

**File:** `tpe-database/migrations/20260215_create_skill_definitions.sql`

**Why database, not filesystem-only:** OpenClaw loads skills from the filesystem because it's a personal single-user agent. For TPX, skills need to be editable from the admin UI without code deployments — tuning onboarding conversation tone, adjusting partner gating language, adding new skills for content types, assigning skills to employee agents (Tier 2). Filesystem SKILL.md files serve as the version-controlled seed; the database is the runtime source of truth.

```sql
-- ================================================================
-- Migration: Create Skill Definitions Table
-- Date: February 15, 2026
-- Purpose: Database-primary skill storage for AI Concierge.
--          Skills use OpenClaw's SKILL.md format (YAML frontmatter
--          + Markdown body) but are stored in DB for hot-reload
--          and admin UI editing without code deployments.
-- ================================================================

CREATE TABLE IF NOT EXISTS skill_definitions (
  id SERIAL PRIMARY KEY,

  -- Identity (from SKILL.md frontmatter)
  skill_name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  emoji VARCHAR(10),

  -- Context & Targeting
  context_type VARCHAR(50) NOT NULL
    CHECK (context_type IN ('inner_circle', 'contractor', 'event', 'universal')),
  priority VARCHAR(20) DEFAULT 'normal'
    CHECK (priority IN ('high', 'normal', 'low')),

  -- Content (the actual skill instructions — Markdown body from SKILL.md)
  skill_content TEXT NOT NULL,

  -- Metadata (mirrors OpenClaw frontmatter metadata object)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- State
  is_active BOOLEAN DEFAULT TRUE,
  version VARCHAR(20) DEFAULT '1.0',

  -- Seed tracking (links back to filesystem SKILL.md if seeded from file)
  seed_file_path VARCHAR(500),
  last_seeded_at TIMESTAMP,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sd_context_type ON skill_definitions(context_type);
CREATE INDEX idx_sd_active ON skill_definitions(is_active);
CREATE INDEX idx_sd_name ON skill_definitions(skill_name);
CREATE INDEX idx_sd_priority ON skill_definitions(priority);

-- Auto-update trigger
CREATE OR REPLACE FUNCTION update_sd_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sd_updated_at
  BEFORE UPDATE ON skill_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_sd_updated_at();
```

---

## 3. Lane Queue — Adopted from OpenClaw

### 3A. Port the Lane Queue

**Source:** OpenClaw `src/process/command-queue.ts` (~150 lines)
**New File:** `tpe-backend/src/services/laneQueue.js`

**Purpose:** Serial execution prevents race conditions when the agent simultaneously writes to member profile, sends an email, and schedules a follow-up. Without this, concurrent tool calls can corrupt state.

**Our Lanes:**
```javascript
const CommandLane = {
  Main: 'main',           // User-facing message processing
  Cron: 'cron',           // Proactive heartbeat/scheduled jobs (Phase 2)
  Background: 'background' // Non-urgent tasks (embedding generation, etc.)
};
```

**Core API (adapted from OpenClaw):**
```javascript
// Enqueue a task in a specific lane
enqueueInLane(lane, task, opts)  // Returns Promise<T>

// Set concurrency per lane (default: 1 = serial)
setLaneConcurrency(lane, maxConcurrent)

// Clear a lane (invalidates pending tasks via generation number)
clearLane(lane)
```

**Integration:** The concierge controller wraps agent invocations in `enqueueInLane(CommandLane.Main, ...)` to ensure one message processes at a time per session.

---

## 4. Skill System — DB-Primary with Filesystem Seeding

### 4A. How It Works

**Based on:** OpenClaw `src/agents/skills/workspace.ts` format, adapted for multi-tenant database storage.

**Runtime flow:**
```
1. On server startup (or manual seed command):
   - Scan tpe-backend/src/skills/ for SKILL.md files
   - For each file: parse YAML frontmatter + Markdown body
   - UPSERT into skill_definitions table (insert new, update existing if file changed)
   - Log: "Seeded 3 skills from filesystem"

2. On agent invocation:
   - Query skill_definitions WHERE context_type = 'inner_circle' AND is_active = true
   - Build system prompt extension from skill_content (Markdown bodies)
   - Inject into agent system prompt

3. On admin edit (via API/admin UI):
   - Update skill_definitions row directly
   - Change takes effect on next agent invocation (no deploy needed)
   - seed_file_path preserved so you can re-seed from filesystem if needed
```

**This means:**
- New skills can be created from admin UI → available immediately
- Skill behavior can be tuned from admin UI → no deploy wait
- Filesystem SKILL.md files are the git-versioned baseline seed
- `seed_file_path` tracks which DB records came from files vs. created in admin
- Re-seeding overwrites DB records that match a seed file (manual edits to seeded skills get a warning)

### 4B. Seed File Directory Structure

Filesystem SKILL.md files serve as the initial seed and version-controlled reference:

```
tpe-backend/src/skills/
├── inner-circle/
│   ├── onboarding/
│   │   └── SKILL.md
│   ├── general-guidance/
│   │   └── SKILL.md
│   └── partner-gating/
│       └── SKILL.md
├── contractor/
│   └── (future)
├── event/
│   └── (future)
└── universal/
    └── (future — skills used by all contexts)
```

### 4B. Core Skill Files

**File:** `tpe-backend/src/skills/inner-circle/onboarding/SKILL.md`

```markdown
---
name: inner_circle_onboarding
description: Conversational onboarding for new Inner Circle members
metadata:
  openclaw:
    emoji: "👋"
    context: inner_circle
    priority: high
---

# Inner Circle Onboarding

You are welcoming a new Inner Circle member. Your job is to learn about their
business through NATURAL CONVERSATION — not rapid-fire questions.

## Data You Need to Collect

Through natural dialogue, gather:

1. **Business type** — What kind of business do they run?
2. **Revenue tier** — How would they describe their business size?
   Valid tiers: Under $500K, $500K-$1M, $1M-$2.5M, $2.5M-$5M, $5M-$10M, $10M+
3. **Team size** — How many people on their team?
4. **Focus areas** — What are they focused on improving in the next 12-18 months?
   (up to 3 selections)
5. **Growth readiness** — How would they describe where their business is right now?

## How to Collect It

- Start warm: Welcome them, tell them what Inner Circle offers
- Ask ONE question at a time, woven naturally into dialogue
- React to their answers with genuine insight before asking the next question
- If they mention a specific challenge, acknowledge it and connect it to what
  Inner Circle and Power100 can do for them
- NEVER say "I need to collect some information" — this IS the conversation

## When You Have Enough

Once you've captured business_type, revenue_tier, team_size, and at least 1
focus_area:

1. Use the `update_member_profile` tool to save each field as you learn it
2. Set `onboarding_complete` to true
3. Suggest their first PowerMove based on what you've learned
4. Transition naturally into ongoing guidance — don't announce the transition

## What NOT to Do

- Don't ask all questions at once
- Don't use bullet lists of questions
- Don't say "Now let me ask you about..."
- Don't rush — if they want to talk about a topic, go deep, then circle back
```

**File:** `tpe-backend/src/skills/inner-circle/general-guidance/SKILL.md`

```markdown
---
name: inner_circle_general_guidance
description: Ongoing business guidance for Inner Circle members who completed onboarding
metadata:
  openclaw:
    emoji: "🧭"
    context: inner_circle
    priority: normal
---

# Inner Circle Business Guidance

You are this member's personal business advisor. You know their business profile,
their goals, their PowerMove progress, and all of Power100's content and resources.

## What You Know

- Their full business profile (from onboarding)
- All Power100 content: PowerChat videos, podcast episodes, books, events
- All strategic partners and their capabilities
- Their PowerMove progress and coaching history
- What content they've already engaged with

## Content Recommendations

When a member's question or goal connects to specific content:
- Use the `recommend_content` tool to search PowerChat and podcast catalog
- Frame recommendations with context: "You're working on [goal]. This episode
  with [Leader] covers exactly that — here's what to listen for..."
- Track what they engage with using `capture_note`

## Partner Recommendations — GATING RULES

**If `partner_recommendation_unlocked` is FALSE:**
- Do NOT recommend specific partners
- If they ask about partners: "Great question! Once you create your first
  PowerMove, I'll be able to connect you with partners who can genuinely
  help you reach that milestone. What's a goal you're working toward?"

**If `partner_recommendation_unlocked` is TRUE:**
- Partner recommendations are available BUT only when they genuinely help
  with the member's active PowerMove(s)
- Don't blanket-recommend partners — connect them when a partner's specific
  capability directly supports what the member is trying to accomplish
- Frame it naturally: "You're working on [PowerMove]. [Partner] specializes
  in exactly this — they've helped similar businesses [specific result]."

**Unlock triggers (checked per message):**
- Member has at least 1 active PowerMove (created, not necessarily completed) → auto-unlock
- Member explicitly asks about partners → unlock and recommend

When unlocking, update their profile: `partner_recommendation_unlocked = true`

## Proactive Behavior

- Reference their specific business context in every interaction
- Suggest relevant content when it connects to their current focus
- If they seem stuck on a PowerMove, offer coaching
- Schedule follow-ups for important action items
- You can send emails, schedule reminders, capture notes — you're a
  full-action advisor, not just a chatbot

## What You Are

You are the AI Concierge for The Power100 Experience, serving an Inner Circle
member. You know everything about Power100 — the organization, its programs,
its content, its partners. If they ask "What is Power100?" or "How does this
work?" — you have the answer.
```

**File:** `tpe-backend/src/skills/inner-circle/partner-gating/SKILL.md`

```markdown
---
name: partner_gating
description: Controls when Inner Circle members get access to partner recommendations
metadata:
  openclaw:
    emoji: "🔒"
    context: inner_circle
    priority: high
---

# Partner Recommendation Gating

## Rule

Inner Circle members do NOT get partner recommendations immediately.
They earn access by either:

1. Creating at least 1 PowerMove (shows commitment and gives context for genuine recommendations)
2. Explicitly asking about partners (shows intent — don't gatekeep when they ask)

## When Gated (partner_recommendation_unlocked = false)

If they ask about partners or a topic that would naturally lead to a partner
recommendation, acknowledge their interest warmly and guide them toward
creating a PowerMove:

"That's a great area to focus on! Once you set a PowerMove around that goal,
I can connect you with verified partners who specialize in helping businesses
like yours get there. What's a specific milestone you're working toward?"

This keeps the flow natural — you're not blocking them, you're helping them
get more value by defining what they need first.

## When Unlocked (partner_recommendation_unlocked = true)

ONLY recommend partners when it would genuinely help the member with their
active PowerMove(s). This is NOT a blanket unlock — it's contextual.

- Connect partner capabilities directly to what the member is trying to achieve
- Frame recommendations as support for their specific goal, not a sales pitch
- Explain WHY this partner helps with THEIR PowerMove
- Use PowerConfidence data to back up the recommendation with real results

GOOD: "You're working on scaling to $120K/month. [Partner] has helped 3
businesses in your revenue tier do exactly that — their PowerConfidence
score is 92. Want me to set up an introduction?"

BAD: "Here are some partners you might like." (too generic, no PowerMove tie-in)

## Auto-Unlock Logic

When you detect that the member has at least 1 active PowerMove, immediately:
1. Use `update_member_profile` to set `partner_recommendation_unlocked = true`
2. Don't announce the unlock formally — just naturally start including partner
   recommendations when they're relevant to the member's PowerMove(s)
```

### 4C. Skill Loader Service

**New File:** `tpe-backend/src/services/skillLoaderService.js`

**Based on:** OpenClaw `src/agents/skills/workspace.ts` — adapted for DB-primary storage

```javascript
// Key methods:
//
// === Seeding (filesystem → database) ===
// seedFromFilesystem()              → Scan SKILL.md files, UPSERT into skill_definitions
// parseSeedFile(filePath)           → Parse YAML frontmatter + Markdown body from SKILL.md
//
// === Runtime (database → agent prompt) ===
// getSkillsForContext(contextType)  → Query skill_definitions WHERE context_type AND is_active
// buildPromptExtension(contextType) → Format active skills into system prompt text
// getSkillByName(skillName)         → Get a single skill by name
//
// === Admin API support ===
// createSkill(data)                 → Insert new skill into skill_definitions
// updateSkill(id, data)             → Update skill content/metadata
// toggleSkill(id, isActive)         → Enable/disable a skill
// listSkills(filters)               → List skills with optional context_type filter
//
// The LLM reads the skill instructions and applies them contextually.
// No programmatic trigger evaluation — the model IS the trigger engine.
```

**Prompt Extension Format** (how skills appear in the system prompt):
```
## Active Skills

### 👋 Inner Circle Onboarding
[Full Markdown body from skill_definitions.skill_content]

### 🧭 Inner Circle Business Guidance
[Full Markdown body from skill_definitions.skill_content]

### 🔒 Partner Recommendation Gating
[Full Markdown body from skill_definitions.skill_content]
```

**NPM Dependency:** `gray-matter` (for parsing SKILL.md seed files — YAML frontmatter extraction)

---

## 5. XState Extension — Inner Circle Agent Routing

### 5A. Modify State Machine

**File Modified:** `tpe-backend/src/services/conciergeStateMachine.js`

**Current States:** `idle → routing → standard_agent | event_agent`
**New States:** `idle → routing → standard_agent | event_agent | inner_circle_agent`

**Changes:**

1. **Add `inner_circle_agent` state** (follows exact pattern of existing states)
2. **Add `isInnerCircleMember` guard** to routing `always` transitions
3. **Add `setInnerCircleAgent` action**
4. **Extend context** with `memberId` and `memberContext`

**Routing Priority (order in `always` array matters):**
```
1. hasActiveEvent → event_agent           (existing — highest priority)
2. isInnerCircleMember → inner_circle_agent  (NEW — second priority)
3. default → standard_agent               (existing — fallback)
```

**New Guard:**
```javascript
isInnerCircleMember: ({ context }) => {
  return context.memberId !== null && context.memberId !== undefined;
}
```

**New State:**
```javascript
inner_circle_agent: {
  on: {
    MESSAGE_RECEIVED: 'routing',
    SESSION_END: 'idle'
  },
  entry: 'logInnerCircleAgentEntry',
  meta: {
    agentType: 'inner_circle',
    description: 'Inner Circle member coaching, content, and business guidance'
  }
}
```

### 5B. Modify State Machine Manager

**File Modified:** `tpe-backend/src/services/conciergeStateMachineManager.js`

**Changes:**
- `getOrCreateMachine()` — Accept `memberId` in input alongside `contractorId`
- State persistence — Handle `inner_circle` session type in save/load
- Key format: Support `member-{memberId}-{sessionId}` alongside existing `{contractorId}-{sessionId}`

### 5C. Modify Controller — Route Detection

**File Modified:** `tpe-backend/src/controllers/aiConciergeController.js`

**Changes to `routeToAgent()`:**

Add `memberId` parameter. If present, skip event check entirely and route to inner_circle_agent. Existing contractor logic stays untouched.

```
routeToAgent(contractorId, sessionId, memberId)
    │
    ├── Is memberId provided?
    │   ├── YES → Set memberId in state machine context
    │   │         → State machine routes to inner_circle_agent
    │   │         → Return Inner Circle Agent
    │   │
    │   └── NO → Existing contractor flow (UNCHANGED)
    │            → Check event registrations
    │            → Route to event_agent or standard_agent
```

**Key Principle:** The existing contractor flow is NOT modified. We add a branch at the top.

---

## 6. Inner Circle Agent

### 6A. New LangGraph Agent

**New File:** `tpe-backend/src/services/agents/aiConciergeInnerCircleAgent.js`

**Pattern:** Same structure as `aiConciergeStandardAgent.js`:
- `ChatOpenAI` with GPT-4
- `StateGraph` with `MessagesAnnotation`
- `MemorySaver` for conversation persistence
- LangSmith tracing

**System Prompt Architecture:**
```
INNER CIRCLE AGENT BASE PROMPT
(identity, pillars, communication style — adapted for Inner Circle context)
    +
SKILL PROMPT EXTENSION
(built by skillLoaderService.buildPromptExtension('inner_circle'))
(queries skill_definitions table, includes all active skill_content for inner_circle context)
    +
MEMBER CONTEXT
(profile, PowerMoves, engagement history — from getMemberContext())
    +
KNOWLEDGE CONTEXT
(from aiKnowledgeService — Power100 content, partners, books, etc.)
```

**Tools Available:**
- `partnerMatchTool` — Gated by `partner_recommendation_unlocked` (enforcement in skill instructions, not code)
- `captureNoteTool` — Capture notes and insights
- `scheduleFollowupTool` — Schedule proactive check-ins
- `sendEmailTool` — Send emails to/for member
- `sendSMSTool` — Send SMS for urgent/time-sensitive info
- `webSearchTool` — Real-time web search
- `updateMemberProfileTool` — **NEW** — Write to member profile from conversation
- `recommendContentTool` — **NEW** — Search and recommend PowerChat/podcast content

### 6B. New Agent Tools

**File:** `tpe-backend/src/services/agents/tools/updateMemberProfileTool.js`

Updates `inner_circle_members` fields from data extracted during conversation. The onboarding skill instructs the agent to call this as it learns each data point.

```javascript
// Tool definition:
// name: "update_member_profile"
// description: "Update an Inner Circle member's profile with information
//              collected from conversation. Call this each time you learn
//              a new piece of information about the member."
// parameters: {
//   member_id: integer (required)
//   field_name: string (required) — must be in ALLOWED_FIELDS list
//   field_value: string | object (required)
// }
//
// ALLOWED_FIELDS (enforced in code):
// business_type, revenue_tier, team_size, focus_areas, growth_readiness,
// onboarding_complete, coaching_preferences, partner_recommendation_unlocked,
// ai_summary, ai_tags, ai_insights
//
// Security: Uses memberScopedQuery — member_id in WHERE clause enforced
```

**File:** `tpe-backend/src/services/agents/tools/recommendContentTool.js`

Searches PowerChat and podcast content via hybrid search and returns contextual recommendations.

```javascript
// Tool definition:
// name: "recommend_content"
// description: "Search Inner Circle content (PowerChat videos, podcast episodes)
//              and recommend relevant content based on member's needs"
// parameters: {
//   query: string (required) — what the member is looking for
//   content_type: string (optional) — "powerchat", "podcast", "all" (default)
//   limit: integer (optional, default 3)
// }
//
// Uses: hybridSearchService for BM25 + pgvector search
// Returns: title, description, type, relevance_score, ai_summary snippet
```

### 6C. Member Context Builder

**New Function:** `getMemberContext(memberId)` in the Inner Circle Agent

```javascript
// Queries (all using memberScopedQuery):
// 1. inner_circle_members — full profile
// 2. ai_concierge_sessions — recent conversation count
// 3. Skill loader — determines which skills to include based on member state
//    (if onboarding_complete = false → include onboarding skill prominently)
//
// Returns formatted context string for system prompt injection
```

---

## 7. API Endpoints

### 7A. New Inner Circle Routes

**New File:** `tpe-backend/src/routes/innerCircleRoutes.js`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/inner-circle/register` | Register new member (email, name, entry_source) |
| POST | `/api/inner-circle/login` | Authenticate member (email-based or token) |
| GET | `/api/inner-circle/profile/:memberId` | Get own profile |
| PUT | `/api/inner-circle/profile/:memberId` | Update own profile |

### 7B. Extended Concierge Routes

**File Modified:** `tpe-backend/src/routes/aiConciergeRoutes.js`

| Method | Endpoint | Change |
|--------|----------|--------|
| POST | `/api/ai-concierge/message` | Accept `member_id` OR `contractor_id` in request body |
| GET | `/api/ai-concierge/session/:session_id` | Support member sessions |
| GET | `/api/ai-concierge/conversations` | Filter by `member_id` when provided |
| GET | `/api/ai-concierge/access-status` | Support member access check |

**Pattern:** Request body includes either `contractor_id` or `member_id`. Controller detects which is present and routes accordingly. Never both.

### 7C. New Controller

**New File:** `tpe-backend/src/controllers/innerCircleController.js`

**Methods:**
- `register(req, res)` — Create member, return JWT
- `login(req, res)` — Authenticate member, return JWT
- `getProfile(req, res)` — Get own profile (scoped by JWT member_id)
- `updateProfile(req, res)` — Update own profile (scoped by JWT member_id)

### 7D. Skill Admin Routes

**New File:** `tpe-backend/src/routes/skillRoutes.js`

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/skills` | List all skills (filterable by context_type, is_active) |
| GET | `/api/skills/:id` | Get single skill with full content |
| POST | `/api/skills` | Create new skill from admin UI |
| PUT | `/api/skills/:id` | Update skill content/metadata |
| PATCH | `/api/skills/:id/toggle` | Enable/disable a skill |
| POST | `/api/skills/seed` | Re-seed from filesystem SKILL.md files |

**Auth:** Admin-only (existing JWT admin auth)

### 7E. Register in Server.js

**File Modified:** `tpe-backend/src/server.js`

```javascript
const innerCircleRoutes = require('./routes/innerCircleRoutes');
const skillRoutes = require('./routes/skillRoutes');
app.use('/api/inner-circle', innerCircleRoutes);
app.use('/api/skills', skillRoutes);
```

---

## 8. Frontend Integration Point

### 8A. Reference Chat Component

**New File:** `tpe-front-end/src/components/inner-circle/InnerCircleConcierge.tsx`

**Purpose:** Reference implementation of the chat interface for Inner Circle context. Uses the same patterns as `tpe-front-end/src/app/ai-concierge/page.tsx` but:
- Authenticates with `member_id` instead of `contractor_id`
- Shows member-specific UI (onboarding progress, content recommendations)
- Can be used directly in TPX frontend or serve as reference for the Inner Circle portal team

---

## 9. File-by-File Change Summary

### New Files (18 files)

| # | File | Purpose |
|---|------|---------|
| 1 | `tpe-database/migrations/20260215_create_inner_circle_members.sql` | Member table |
| 2 | `tpe-database/migrations/20260215_create_skill_definitions.sql` | Skill registry table |
| 3 | `tpe-database/migrations/20260215_extend_sessions_for_members.sql` | Session table extension |
| 4 | `tpe-backend/src/middleware/promptInjectionGuard.js` | Input sanitization |
| 5 | `tpe-backend/src/services/memberScopedQuery.js` | Per-member query enforcement |
| 6 | `tpe-backend/src/services/laneQueue.js` | Serial execution (from OpenClaw) |
| 7 | `tpe-backend/src/services/skillLoaderService.js` | DB-primary skill loader + seeder + prompt builder |
| 8 | `tpe-backend/src/services/agents/aiConciergeInnerCircleAgent.js` | Inner Circle LangGraph agent |
| 9 | `tpe-backend/src/services/agents/tools/updateMemberProfileTool.js` | Profile update tool |
| 10 | `tpe-backend/src/services/agents/tools/recommendContentTool.js` | Content recommendation tool |
| 11 | `tpe-backend/src/routes/innerCircleRoutes.js` | Member API routes |
| 12 | `tpe-backend/src/routes/skillRoutes.js` | Skill admin CRUD routes |
| 13 | `tpe-backend/src/controllers/innerCircleController.js` | Member registration/auth |
| 14 | `tpe-backend/src/skills/inner-circle/onboarding/SKILL.md` | Onboarding skill seed file |
| 15 | `tpe-backend/src/skills/inner-circle/general-guidance/SKILL.md` | General guidance skill seed file |
| 16 | `tpe-backend/src/skills/inner-circle/partner-gating/SKILL.md` | Partner gating skill seed file |
| 17 | `tpe-front-end/src/components/inner-circle/InnerCircleConcierge.tsx` | Reference chat component |

### Modified Files (6 files)

| # | File | Change |
|---|------|--------|
| 1 | `tpe-backend/src/services/conciergeStateMachine.js` | Add `inner_circle_agent` state + guard |
| 2 | `tpe-backend/src/services/conciergeStateMachineManager.js` | Support `memberId` in machine context |
| 3 | `tpe-backend/src/controllers/aiConciergeController.js` | Extend routing for member detection |
| 4 | `tpe-backend/src/routes/aiConciergeRoutes.js` | Accept `member_id` parameter |
| 5 | `tpe-backend/src/server.js` | Register Inner Circle + Skill routes |
| 6 | `CLAUDE.md` | Remove plaintext credentials |

### NPM Dependencies

| Package | Purpose |
|---------|---------|
| `gray-matter` | Parse YAML frontmatter from SKILL.md seed files |

---

## 10. Implementation Order

Each step can be tested independently before the next:

1. **Security: Credentials** — Move passwords out of CLAUDE.md
2. **Security: Prompt injection guard** — Build and unit test
3. **Security: Member scoped query** — Build and unit test
4. **Security: Rate limiter** — Extend existing middleware
5. **Database: Run migrations** — All 3 migration files (members, skills, sessions)
6. **Lane queue** — Port from OpenClaw, test independently
7. **Skill seed files** — Create the 3 SKILL.md files
8. **Skill loader service** — Build DB-primary loader + filesystem seeder
9. **Seed skills** — Run seeder to populate skill_definitions from SKILL.md files
10. **Skill admin routes** — CRUD endpoints for skill management
11. **XState extension** — Add inner_circle_agent state and guard
12. **State machine manager updates** — Support memberId
13. **Inner Circle Agent** — New LangGraph agent with skill-aware prompt
14. **New agent tools** — updateMemberProfile + recommendContent
15. **Inner Circle controller** — Registration, login, profile
16. **Inner Circle routes** — Wire up API endpoints
17. **Concierge controller modifications** — Extend routing for members
18. **Concierge route modifications** — Accept member_id
19. **Server.js registration** — Wire all new routes
20. **Frontend reference component** — Chat interface
21. **End-to-end testing** — Register → onboard → converse → verify data

---

## 11. Testing Strategy

### Unit Tests
- Skill seeder parses SKILL.md frontmatter + body and inserts into DB correctly
- Skill loader queries DB and builds prompt extension correctly
- Prompt injection guard catches known patterns, passes clean input
- Member scoped query rejects queries without member_id
- Lane queue processes tasks serially and handles generation clearing
- XState routing sends members to inner_circle_agent
- Rate limiter enforces per-member limits

### Integration Tests
- Member registration → session creation → message → agent response
- Onboarding skill: agent extracts data and calls updateMemberProfile tool
- Partner gating: agent follows gating rules from SKILL.md
- Member cannot access another member's data via prompt manipulation
- Existing contractor flow completely unaffected

### Manual Testing
- Full onboarding conversation (register → chat → profile populated)
- Schema refresh sees new inner_circle_members table
- Skills load from DB and appear in agent system prompt
- Admin can edit skill in DB and change takes effect on next message
- Lane queue prevents concurrent agent invocations for same session
- Seed command populates DB from filesystem SKILL.md files

---

## 12. What We Adopted from OpenClaw (With Source References)

| Pattern | OpenClaw Source | Our Implementation |
|---------|----------------|-------------------|
| SKILL.md format | `src/agents/skills/types.ts` | Same format — YAML frontmatter + Markdown body |
| Skill loading pipeline | `src/agents/skills/workspace.ts` | Adapted — filesystem seeds DB, DB is runtime source |
| Skills injected into prompt | `buildWorkspaceSkillSnapshot()` | `buildPromptExtension()` — same concept, reads from DB |
| Lane queue | `src/process/command-queue.ts` | `laneQueue.js` — ported directly (~150 lines) |
| Heartbeat pattern | `src/infra/heartbeat-runner.ts` | Phase 2 — via Bull queue |
| Channel dock abstraction | `src/channels/dock.ts` | Future — when we go multi-channel |

| What We Did NOT Adopt | Why |
|----------------------|-----|
| SQLite + sqlite-vec memory | We have PostgreSQL + pgvector (superior for multi-tenant) |
| PI embedded runner | We have LangGraph (serves same purpose) |
| Auth profile failover | We use single OpenAI provider |
| CLI experience | Not applicable — we're building web API |
| Filesystem-only skill storage | We need admin UI editing without deploys (DB-primary instead) |

---

## Next Steps

1. Complete **Phase 1 Pre-Flight Checklist** — verify existing tables and fields
2. Begin implementation following Section 10 order
3. Test each component independently before integration
4. Full end-to-end test before marking Phase 1 complete
