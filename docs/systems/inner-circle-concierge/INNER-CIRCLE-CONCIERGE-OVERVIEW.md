# Inner Circle AI Concierge — System Overview

**Document Version:** 1.0
**Date:** February 15, 2026
**Status:** PLANNING — OVERVIEW COMPLETE, IMPLEMENTATION PLANS PENDING
**Author:** TPX Development Team

---

## Executive Summary

**Goal:** Extend the existing TPX AI Concierge to serve Inner Circle members — Power100's free membership portal — by adding a new context-aware entry point, adopting OpenClaw-inspired skill architecture patterns, and building a conversational onboarding flow that naturally collects the same profiling data our contractor flow captures through forms.

### What This System Delivers

- A new AI Concierge context for Inner Circle members (alongside existing Standard and Event contexts)
- Skill-based architecture pattern (inspired by OpenClaw's SKILL.md system) for modular, declarative capability definitions
- Conversational onboarding that replaces form-based data collection with natural dialogue
- PowerMove coaching and tracking (user-created 60-day fiscal milestones tied to Growth, Culture, Community, Innovation pillars)
- Content recommendation engine for PowerChat videos and podcast episodes
- Partner recommendation gating — unlocks when a member creates a PowerMove (giving context for genuine recommendations) or explicitly asks
- Proactive engagement engine for weekly check-ins and nudges
- Security hardening focused on scope isolation (not capability restriction) before exposing AI to free public members at scale

### What This System Does NOT Do

- Does NOT replace the existing contractor flow — that remains a separate entry point
- Does NOT require per-member dedicated infrastructure (VPS/Mac Mini) — uses shared multi-tenant architecture
- Does NOT rebuild the AI Concierge from scratch — extends the existing LangGraph + XState foundation
- Does NOT implement employee agents or the Main Business Agent tier (future roadmap)

---

## Business Value

### For Inner Circle Members
- **Personalized AI guidance** from day one — not a generic chatbot, but a concierge that knows their business
- **Natural onboarding** — no lengthy forms, just a conversation that learns about them
- **PowerMove coaching** — structured goal tracking with AI-assisted progress
- **Content discovery** — relevant PowerChat episodes and podcast content surfaced based on their needs
- **Real action-taking** — the concierge sends emails, schedules follow-ups, books connections, tracks progress — it does things, not just talks
- **Partner connections when genuine** — once a member sets a PowerMove, partners are recommended only when they genuinely help with that specific goal — not pushed, but naturally supportive

### For Power100
- **Massive data collection at scale** — every Inner Circle conversation feeds the data engine
- **Warm lead pipeline** — members who complete PowerMoves and engage with content are pre-qualified for partner matching
- **Content engagement metrics** — which PowerChat episodes and podcasts drive the most member value
- **Lower barrier to entry** — free membership means dramatically more data points than paid-only models
- **AI that gets smarter** — more members = more conversations = better recommendations for everyone

### For Strategic Partners
- **Higher quality leads** — members who come through Inner Circle have been profiled through conversation and have demonstrated commitment through PowerMoves
- **Informed connections** — the AI knows what the member needs before the introduction happens
- **Natural timing** — partner recommendations happen when a member has set a goal and a partner genuinely helps them get there

---

## System Architecture

### Existing Foundation (Already Built & Production-Ready)

The AI Concierge already has a mature architecture we're extending, not replacing:

| Component | Technology | Status |
|-----------|-----------|--------|
| Agent Orchestration | LangGraph (Standard Agent + Event Agent) | Production |
| Agent Routing | XState v5 State Machine (idle → routing → agent) | Production |
| Knowledge Base | `aiKnowledgeService.js` with auto-schema discovery | Production |
| Search | Hybrid BM25 (40%) + pgvector semantic (60%) | Production |
| Agent Tools | 8 tools (partner, book, podcast, event, sponsor, session, note, followup) | Production |
| Observability | LangSmith tracing for all AI calls | Production |
| Caching | Redis + 5min/1min/24hr intelligent cache tiers | Production |
| Media Support | Image analysis (Vision API), audio transcription (Whisper) | Production |
| Frontend | Real-time chat with media upload, conversation history | Production |

### What We're Adding

```
┌─────────────────────────────────────────────────────────────┐
│                    INNER CIRCLE MEMBER                       │
│              (Free membership registration)                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              CONTEXT DETECTION LAYER                         │
│  XState routes based on:                                     │
│  - Contractor with active event → Event Agent                │
│  - Inner Circle member → Inner Circle Agent        [NEW]     │
│  - Default → Standard Agent                                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│            INNER CIRCLE AGENT (LangGraph)           [NEW]    │
│                                                              │
│  Skills loaded based on member state:                        │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │  Onboarding  │ │  PowerMove   │ │  Content             │ │
│  │  Skill       │ │  Coaching    │ │  Recommendation      │ │
│  │              │ │  Skill       │ │  Skill               │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐ │
│  │  Partner     │ │  Proactive   │ │  General Business    │ │
│  │  Recommend   │ │  Engagement  │ │  Guidance            │ │
│  │  (Gated)     │ │  Engine      │ │  Skill               │ │
│  └──────────────┘ └──────────────┘ └──────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              FULL-ACTION AGENT CAPABILITIES                   │
│  The concierge DOES things — it's not a read-only chatbot:   │
│  - Writes to member profile, PowerMoves, notes, action items │
│  - Sends emails to/for the member                            │
│  - Schedules follow-ups and reminders                        │
│  - Books partner connections when unlocked                   │
│  - Tracks engagement and updates progress                    │
│  - All actions scoped to the individual member's data        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              SHARED INFRASTRUCTURE                            │
│  - PostgreSQL (member profiles, PowerMoves, conversations)   │
│  - aiKnowledgeService.js (auto-discovered schema)            │
│  - Hybrid Search (BM25 + pgvector)                           │
│  - Redis caching                                             │
│  - LangSmith observability                                   │
└─────────────────────────────────────────────────────────────┘
```

### OpenClaw-Inspired Skill Architecture

Instead of hardcoding agent behavior, we adopt OpenClaw's declarative skill pattern. Each capability is defined in a structured skill file that the agent loads dynamically based on context.

**Why this matters:**
- Adding a new concierge capability = creating a skill file (not modifying agent code)
- Skills are composable — the onboarding skill can invoke the content recommendation skill mid-conversation
- Skills are testable in isolation
- Skills are readable by non-engineers (YAML + natural language instructions)
- Future employee agents and the Main Business Agent use the same skill system

**Skill Definition Pattern:**
```yaml
# Example: skills/inner-circle/onboarding.skill.yaml
name: inner_circle_onboarding
description: Conversational onboarding for new Inner Circle members
trigger: member.is_new AND member.onboarding_complete = false
priority: high

context_required:
  - member.name
  - member.entry_source

data_collection_goals:
  - business_type (What kind of business do you run?)
  - revenue_tier (mapped from natural conversation about business size)
  - team_size (mapped from conversation about their team)
  - focus_areas (mapped from conversation about goals and challenges)
  - growth_readiness (mapped from conversation about current state)

actions_available:
  - write_member_profile (update profile fields as data is collected)
  - send_welcome_email (trigger welcome sequence)
  - assign_power_moves (suggest initial PowerMoves based on profile)

behavior: |
  Welcome the member warmly. You are their business advisor now.
  Through natural conversation, learn about their business. DO NOT
  ask rapid-fire questions. Have a real dialogue. Each piece of
  information you learn gets saved to their profile automatically.
  When you have enough context, transition to the PowerMove coaching skill.

maps_to_database:
  business_type: inner_circle_members.business_type
  revenue_tier: inner_circle_members.revenue_tier
  team_size: inner_circle_members.team_size
  focus_areas: inner_circle_members.focus_areas
  growth_readiness: inner_circle_members.growth_readiness
```

### Three-Tier Agent Vision (Broader Roadmap)

The Inner Circle Concierge is part of a larger agent strategy for Power100:

| Tier | Description | Infrastructure | Timeline |
|------|-------------|---------------|----------|
| **Tier 3: Member Concierge** | AI for Inner Circle members (thousands of users) | Shared multi-tenant on existing infrastructure, PostgreSQL state | **NOW — This Build** |
| **Tier 2: Employee Agents** | Personal AI for each Power100 team member | Individual OpenClaw instances on VPS (~$20-40/mo each) | Future |
| **Tier 1: Main Business Agent** | Central Power100 operations AI | Dedicated OpenClaw instance, full system access | Future |

When Tier 1 and Tier 2 come online, actions that require elevated system access (beyond what the member concierge handles directly) will route through the Main Business Agent automatically. For now, the member concierge handles its own actions within per-member scope.

**This overview and its phases focus exclusively on Tier 3 (Member Concierge).** Tier 1 and Tier 2 will get their own system documentation when the time comes.

---

## Database Architecture

### New Table: `inner_circle_members`

Inner Circle members are distinct from contractors. They may eventually become contractors (warm leads), but they enter the system differently and have different data needs.

```
inner_circle_members
├── id (PK)
├── email
├── name
├── phone (optional)
├── entry_source (how they found Inner Circle — podcast, short, referral, etc.)
├── registration_date
├── membership_status (active, inactive, suspended)
│
├── ── Profile (collected via conversational onboarding) ──
├── business_type
├── revenue_tier
├── team_size
├── focus_areas (JSONB)
├── growth_readiness
├── onboarding_complete (boolean)
├── onboarding_data (JSONB — raw conversation extractions)
│
├── ── PowerMove Tracking ──
├── power_moves_completed (integer)
├── power_moves_active (JSONB)
├── power_moves_history (JSONB)
├── coaching_preferences (JSONB)
│
├── ── Engagement ──
├── last_concierge_interaction (timestamp)
├── total_concierge_sessions (integer)
├── content_interactions (JSONB — which PowerChat/podcasts they engaged with)
├── partner_recommendation_unlocked (boolean — true when member creates a PowerMove or explicitly asks)
│
├── ── AI Fields (auto-discovered by concierge) ──
├── ai_summary (TEXT — AI-generated member summary)
├── ai_tags (JSONB — auto-extracted topics and interests)
├── ai_insights (JSONB — actionable observations about this member)
├── ai_engagement_score (NUMERIC — how engaged this member is)
│
├── ── Conversion Tracking ──
├── converted_to_contractor (boolean)
├── contractor_id (FK → contractors.id, nullable)
├── conversion_date (timestamp)
│
├── created_at
└── updated_at
```

### New Table: `power_moves`

PowerMoves are **user-created 60-day fiscal milestones** — the member defines what they want to achieve, ties it to one of the Four Pillars (Growth, Culture, Community, Innovation), and the AI Concierge helps them reach it. There is no pre-built catalog; members create their own goals.

When a PowerMove is created, the concierge immediately responds with motivational encouragement (Week 0) and generates a personalized **8-week action plan** — concrete weekly actions that map the path to their milestone. This plan becomes the backbone of the entire journey; weekly check-ins measure progress against it.

```
power_moves
├── id (PK)
├── member_id (FK → inner_circle_members.id)
├── title
├── description
├── pillar (growth, culture, community, innovation)
│
├── ── Fiscal Milestone ──
├── fiscal_target (TEXT — the milestone statement)
├── fiscal_metric (VARCHAR — what's being measured)
├── starting_value (VARCHAR — where they are now)
├── target_value (VARCHAR — where they want to be)
├── current_value (VARCHAR — updated as progress is tracked)
│
├── ── Timeline ──
├── start_date (TIMESTAMP)
├── target_date (TIMESTAMP — 60 days from start)
├── completed_date (TIMESTAMP)
│
├── ── Status ──
├── status (draft, active, in_progress, completed, expired, abandoned)
│
├── ── AI Coaching Context ──
├── action_steps (JSONB — 8-week action plan generated at Week 0, measured against weekly)
├── member_notes (TEXT)
├── ai_coaching_notes (JSONB — concierge observations over time)
├── ai_suggested_resources (JSONB — content/partners suggested)
│
├── ── Engagement Tracking ──
├── total_checkins (INTEGER)
├── last_checkin_date (TIMESTAMP)
├── streak_weeks (INTEGER — consecutive weeks with a check-in)
├── engagement_score (NUMERIC)
│
├── ── Completion ──
├── completion_evidence (TEXT)
├── completion_reflection (TEXT)
├── ai_completion_summary (TEXT)
│
├── created_at
└── updated_at
```

### New Table: `power_move_checkins`

Tracks weekly progress check-ins for each PowerMove. The concierge initiates these proactively, records what the member shared, and logs coaching actions taken.

```
power_move_checkins
├── id (PK)
├── power_move_id (FK → power_moves.id)
├── member_id (FK → inner_circle_members.id)
├── week_number (INTEGER — week 0-8; Week 0 = creation response with 8-week plan)
├── checkin_date
├── checkin_source (concierge, member_initiated, heartbeat)
├── progress_update (TEXT — what the member shared)
├── current_value (VARCHAR — updated metric value)
├── blockers (TEXT)
├── wins (TEXT)
├── ai_coaching_response (TEXT — what the concierge did)
├── ai_actions_taken (JSONB — emails sent, content recommended, etc.)
├── ai_sentiment (on_track, falling_behind, ahead, needs_support)
├── created_at
└── updated_at
```

### New Table: `member_watch_history`

Tracks what members watch in the Inner Circle WordPress portal. Data flows in via n8n webhooks — first watch creates a record, rewatches update `watch_count` and `watch_progress` via UPSERT. The concierge reads this on demand for personalized context and content recommendations.

```
member_watch_history
├── id (PK)
├── member_id (FK → inner_circle_members.id)
├── content_id (INTEGER — FK to video_content or podcast_episodes)
├── content_type (VARCHAR — 'video' or 'podcast')
├── show_id (FK → shows.id, nullable)
├── watch_progress (INTEGER 0-100 — percentage watched)
├── total_watch_time_seconds (INTEGER)
├── watch_count (INTEGER DEFAULT 1)
├── completed (BOOLEAN DEFAULT false)
├── source (VARCHAR — portal, concierge_recommendation, direct_link, email_link)
├── first_watched_at (TIMESTAMP)
├── last_watched_at (TIMESTAMP)
├── created_at
└── updated_at
```

**Data pipeline:** WordPress portal → n8n webhook → TPX backend API → UPSERT into `member_watch_history`
**UPSERT pattern:** First watch = INSERT, rewatch = UPDATE watch_count + watch_progress + last_watched_at

### New Table: `skill_definitions`

Registry of available concierge skills (metadata for the skill files).

```
skill_definitions
├── id (PK)
├── skill_name (unique)
├── skill_file_path (path to YAML skill definition)
├── context_type (inner_circle, contractor, event, universal)
├── trigger_conditions (JSONB)
├── priority (integer)
├── is_active (boolean)
├── version
├── created_at
└── updated_at
```

### New Table: `shows`

Named content programs — each gets its own tab/filter in the Inner Circle portal. Slugs match WordPress `/show/{slug}/` for cross-system consistency.

```
shows
├── id (PK)
├── name (VARCHAR — "PowerChat", "Inner Circle with Greg & Paul", etc.)
├── slug (VARCHAR UNIQUE — matches WordPress show slugs)
├── hosts
├── description
├── logo_url
├── brand_color
├── format (video_podcast, live_session, audio_podcast)
├── is_active (boolean)
├── episode_count (cached count)
├── created_at
└── updated_at
```

**Initial shows:**
| Show | Slug | Hosts | Format |
|------|------|-------|--------|
| PowerChat | `powerchat` | Greg | video_podcast |
| Inner Circle with Greg & Paul | `inner-circle` | Greg & Paul | live_session |
| Outside The Lines with Ray & Greg | `outside-the-lines` | Ray & Greg | video_podcast |

**Content storage rules:**
- **Show content** → lives in BOTH `video_content` (video) AND `podcast_episodes` (audio feed) — all shows are video podcast format
- **General Power100 video content** (feature interviews, Day in the Life, event coverage) → `video_content` only
- **Existing TPX content** → unchanged (`video_type = 'demo'/'partner_demo'`, industry podcasts)

### Existing Tables — Extensions Needed

| Table | Change | Purpose |
|-------|--------|---------|
| `concierge_sessions` | Add `member_id` column (nullable FK) | Support Inner Circle member sessions alongside contractor sessions |
| `concierge_messages` | Add `member_id` column (nullable FK) | Message history for members |
| `video_content` | Add `show_id` FK → shows, `featured_names` TEXT[], `episode_number` INTEGER | Link videos to shows, enable name filtering |
| `podcast_episodes` | Add FK constraint on `show_id` → shows, add 6 AI fields (ai_summary, ai_insights, ai_key_topics, ai_engagement_score, ai_processing_status, last_ai_analysis) | Show linking + AI-powered content recommendations |

---

## Knowledge Base Scope — What the Concierge Knows

The Inner Circle concierge should be a walking encyclopedia of everything Power100. A member should be able to ask about any piece of Power100 content, any program detail, any resource — and get an informed, contextual answer. This goes beyond just recommending content; the concierge **understands** the content.

### Tier 1: Power100 Organizational Knowledge (Static/Semi-Static)

Content that rarely changes but the concierge must know intimately:

| Knowledge Area | What It Includes | Ingestion Method |
|---------------|-----------------|-----------------|
| **Power100 Identity** | Who Power100 is, mission, philosophy, leadership team, history | Manual content ingestion → embeddings |
| **Programs & Services** | Inner Circle, contractor flow, partner ecosystem, PowerConfidence, PCR | Manual content ingestion → embeddings |
| **How Things Work** | Membership benefits, what PowerMoves are, how partner matching works, what the contractor flow does | Manual content ingestion → embeddings |
| **Power100 Website Content** | All public pages, about sections, service descriptions, FAQs | Web crawl or manual ingestion → embeddings |
| **Inner Circle Portal** | Membership features, navigation guidance, what's available where | Manual content ingestion → embeddings |

**The concierge should be able to answer:**
- "What is Power100?"
- "How does the partner matching work?"
- "What's the difference between Inner Circle and the contractor program?"
- "Who runs Power100?"
- "What is PowerConfidence?"

### Tier 2: Dynamic Content Library (Regularly Updated)

Content grows over time as new episodes are published. All content is organized by **shows** (named programs with hosts) stored in the `shows` table, with show content in both `video_content` and `podcast_episodes` tables.

**Show-Based Content (video podcast format — stored in both tables):**

| Show | What It Is | Data Stored | Search Method |
|------|-----------|-------------|--------------|
| **PowerChat** | Greg + guest(s) — Power100's podcast arm | Title, guests, transcript, AI tags, insights, focus area alignment, featured_names, episode_number | Hybrid search (BM25 + pgvector) |
| **Inner Circle with Greg & Paul** | Monthly pillar recap — top moments and lessons from the month | Title, transcript, AI tags, pillar alignment, key takeaways | Hybrid search (BM25 + pgvector) |
| **Outside The Lines with Ray & Greg** | Military leadership, construction, AI — first Podcast Out of the Box format | Title, guests, transcript, AI tags, insights, focus area alignment | Hybrid search (BM25 + pgvector) |
| **Future shows** | New shows added to `shows` table as they launch | Same pattern — show_id links to show metadata | Hybrid search (BM25 + pgvector) |

**General Power100 Video Content (not podcast format — `video_content` only):**

| Content Type | What It Is | Data Stored | Search Method |
|-------------|-----------|-------------|--------------|
| **Feature Interviews** | In-depth conversations with industry leaders | Title, featured_names, transcript, AI tags, insights | Hybrid search (BM25 + pgvector) |
| **Day in the Life** | Following a leader through their day | Title, featured_names, transcript, AI insights | Hybrid search (BM25 + pgvector) |
| **Event Coverage** | Power100 events and industry events | Title, event details, key moments, AI summary | Hybrid search (BM25 + pgvector) |

**Other Content:**

| Content Type | Source | Data Stored | Search Method |
|-------------|--------|-------------|--------------|
| **Articles & Resources** | Power100 blog, guides, published content | Title, body/summary, AI tags, focus area alignment | Hybrid search (BM25 + pgvector) |
| **Event Content** | Past and upcoming events, recordings | Event details, session recordings, speaker content | Existing event system + embeddings |

**The concierge should be able to answer:**
- "What PowerChat episodes cover sales growth?"
- "What did Greg and Paul talk about in the last Inner Circle session?"
- "Is there an Outside The Lines episode about AI in construction?"
- "Show me everything featuring [Leader Name]"
- "What content do you have about hiring?"
- "What did Greg say about pricing strategy in that PowerChat?"

### Tier 3: Operational Knowledge (Real-Time from Database)

Data the concierge already has access to via `aiKnowledgeService.js`:

| Data Source | What It Provides | Already Built? |
|------------|-----------------|---------------|
| **Strategic Partners** | Partner profiles, capabilities, PowerConfidence scores, focus areas | Yes |
| **Books** | Recommended books with AI summaries and insights | Yes |
| **Podcasts** | Podcast catalog with AI analysis | Yes (extends to full episodes) |
| **Events** | Event schedules, speakers, sponsors | Yes |
| **Member Profile** | Their own business data, PowerMoves, engagement history | New (Phase 1) |
| **Industry Statistics** | Aggregated, privacy-safe benchmarks | Yes |

### Tier 4: Member-Specific Context (Per-Session)

Context the concierge builds about the individual member:

- Their business profile (collected through onboarding conversation)
- Their active and completed PowerMoves
- Their watch history from the portal (what they watched, progress, completion, rewatches — via `member_watch_history`)
- Their content interaction history (bookmarks, likes, lightweight signals — via `content_interactions` JSONB)
- Their conversation history (what they've asked about before)
- Their coaching preferences and communication style
- Their partner recommendation status (locked/unlocked)

### Content Ingestion Pipeline

```
New content published (show episode, general video, article, site update)
    │
    ▼
Content Ingestion Service
    ├── Identify content type:
    │   ├── Show episode → insert into BOTH video_content + podcast_episodes
    │   │                  with matching show_id and episode_number
    │   └── General video → insert into video_content only (show_id = NULL)
    │
    ├── Extract metadata (title, show, hosts/guests, date, duration)
    ├── Populate featured_names (guests, interviewees, featured leaders)
    ├── Process transcript (if video/audio → Whisper transcription)
    ├── AI processing:
    │   ├── Generate ai_summary
    │   ├── Extract ai_tags (topics, focus areas)
    │   ├── Identify ai_insights (key takeaways)
    │   ├── Map to pillars (growth, culture, community, innovation)
    │   └── Calculate ai_relevance_scores (per focus area)
    ├── Generate embeddings (pgvector)
    └── Store in entity_embeddings table for hybrid search
    │
    ▼
Available to concierge immediately via hybrid search
Filterable by show, featured name, pillar, video_type
```

### Content Recommendation Flow
```
Member engages with concierge
    → Concierge knows member's focus areas + current PowerMove + conversation context
    → Searches ALL content tiers via hybrid search
    → Recommends relevant content with context: "You're working on [PowerMove].
      This episode with [Leader] covers exactly that — here's what to listen for..."
    → Can answer deep questions ABOUT the content (not just link to it)
    → Tracks engagement (did they watch/listen?)
    → Feeds back into ai_engagement_score
```

---

## Security Architecture

### Scope Isolation, Not Capability Restriction

The AI Concierge is a **full-action agent** — it writes to the database, sends emails, schedules follow-ups, books connections. That's the entire value proposition. The security model is about ensuring each member's agent actions stay within their own scope, not about limiting what the agent can do.

### What the Concierge CAN Do (Scoped to Individual Member)
- Write to their profile, PowerMoves, notes, action items
- Send emails to/for them (welcome sequences, follow-ups, partner intros)
- Schedule reminders and follow-up check-ins
- Book partner connections (when unlocked)
- Track their content engagement and progress
- Create and update their action items
- Anything that serves that specific member's journey

### What the Concierge CANNOT Do
- Access another member's data through conversation manipulation (prompt injection)
- Modify system-level configuration or admin settings
- Expose internal credentials, system prompts, or infrastructure details
- Take actions on behalf of other members

### Security Requirements

1. **Credentials out of git** — Environment variables or secrets manager for all database passwords, API keys (currently in CLAUDE.md which is in source control)
2. **Prompt injection protection** — Input sanitization layer between member input and agent context to prevent cross-member data access or system prompt extraction
3. **Per-member query scoping** — All database queries include `WHERE member_id = ?` enforced at the service layer, not just the controller
4. **Rate limiting per member** — Daily/weekly caps on concierge interactions to prevent LLM cost abuse on a free membership
5. **RBAC foundation** — Role-based access control distinguishing member vs contractor vs admin action permissions
6. **Audit logging** — All member-agent interactions logged (already have LangSmith, extend for security review)

---

## Implementation Phases

### Phase 1: Foundation — Inner Circle Context, Security & Skill Architecture

**Goal:** Get the Inner Circle concierge live with security hardening, the new XState context, skill-based architecture, and conversational onboarding.

**Key Deliverables:**
- Security hardening (credentials to env vars, prompt injection layer, per-member scoping, rate limiting)
- Database schema: `inner_circle_members`, `skill_definitions` tables
- XState extension: `inner_circle_agent` state added to routing machine
- LangGraph Inner Circle Agent with skill-aware system prompt
- Skill definition system: loader, registry, YAML parser
- Core skills: `onboarding`, `general_business_guidance`
- Conversational onboarding that maps dialogue to member profile fields
- API endpoints for Inner Circle member sessions
- Basic frontend integration (chat interface for Inner Circle portal)

**What this phase enables:**
- Inner Circle members can register and immediately interact with a personalized AI concierge
- The concierge learns about them through conversation (not forms)
- All interactions are secure and scoped per member
- New skills can be added by creating a YAML file (no agent code changes)

---

### Phase 2: Intelligence — PowerMoves, Content & Proactive Engagement

**Goal:** Make the concierge a powerful coaching partner and proactive engagement engine. Members create their own PowerMoves — 60-day action steps toward fiscal milestones — and the concierge becomes their accountability partner, research assistant, email crafter, and progress tracker.

**Key Deliverables:**
- Database schema: `power_moves` table (user-created 60-day fiscal milestones, not a system catalog)
- Database schema: `power_move_checkins` table (weekly progress tracking)
- Database schema: `shows` table (PowerChat, Inner Circle, Outside The Lines + future shows)
- Database schema: `member_watch_history` table (portal watch data via n8n webhooks — progress, time, rewatches, source)
- Content architecture: extend `video_content` (show_id, featured_names, episode_number) and `podcast_episodes` (show_id FK + 6 AI fields)
- PowerMove coaching skill (help members create, track, and complete their own goals)
- Content recommendation skill (show-based content + general Power100 content, watch-history-aware to avoid re-recommending)
- Content ingestion pipeline (show episodes → both tables, general video → video_content only)
- Watch history integration (WordPress portal → n8n webhook → UPSERT pipeline, concierge reads on demand)
- Proactive heartbeat engine (scheduled weekly check-ins via Bull queue)
- Partner recommendation gating enforcement (unlocks on PowerMove creation or explicit ask — recommendations only when genuinely helpful)
- Member engagement analytics (ai_engagement_score, watch behavior 30% weight, content interaction tracking)
- Conversion tracking (Inner Circle member → contractor pipeline)

**What this phase enables:**
- Members create their own 60-day fiscal milestones tied to Growth, Culture, Community, or Innovation
- The AI concierge coaches them weekly — not just encouraging, but taking real action (emails, research, mapping steps)
- Content is surfaced based on member's active PowerMove and pillar alignment — and the concierge knows what they've already watched
- Watch history from the WordPress portal feeds into the concierge's context (what they watched, how far, how often)
- Partner recommendations unlock when a member creates a PowerMove — and only surface when genuinely helpful
- The concierge reaches out proactively (weekly check-ins, nudges, re-engagement)
- Power100 can track which members are ready for partner connections

---

## Integration Points

### Inner Circle Portal ↔ TPX Backend
- Inner Circle portal calls TPX backend API for concierge interactions
- Authentication: Inner Circle member token → TPX validates and creates/retrieves member session
- The concierge endpoint structure mirrors existing `/api/ai-concierge/*` routes with member context

### Contractor Flow Crossover
- When an Inner Circle member is ready for partner matching (PowerMove gating or explicit ask), the concierge can guide them toward the contractor flow
- `inner_circle_members.converted_to_contractor` and `contractor_id` track this transition
- Profile data collected via conversation pre-populates the contractor flow (no re-entering info)

### Content Pipeline
- PowerChat videos and podcast episodes need metadata in the database for AI search
- Content ingestion process: upload → AI processes transcript → extracts tags/insights → stored with embeddings
- Hybrid search indexes content alongside partners, books, and podcasts

---

## Success Metrics

| Metric | What It Measures | Target |
|--------|-----------------|--------|
| Registration → First Conversation | How many members engage with concierge after signup | >70% |
| Onboarding Completion Rate | How many members complete conversational profiling | >60% |
| PowerMove Adoption | Members who start at least 1 PowerMove | >50% |
| Weekly Active Conversations | Members interacting with concierge weekly | >30% of active members |
| Content Engagement | PowerChat/podcast episodes consumed via recommendation | Track and grow |
| Partner Recommendation Unlocks | Members who earn partner recommendations naturally | Track conversion funnel |
| Contractor Conversion Rate | Inner Circle members who enter contractor flow | Long-term KPI |
| Concierge Response Quality | LangSmith scoring on response relevance | >85% positive |
| Security Incidents | Prompt injection attempts caught, data leaks | Zero breaches |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Prompt injection at scale | High | High | Input sanitization layer, output filtering, per-member query scoping |
| LLM cost overrun from free members | Medium | High | Per-member rate limits, usage monitoring, cost alerts |
| Low member engagement post-registration | Medium | Medium | Proactive heartbeat, compelling onboarding, content recommendations |
| Skill definition complexity growing | Low | Medium | Standardized YAML schema, validation on load, documentation |
| Data model drift between member and contractor | Low | Medium | Shared `focus_areas` taxonomy, conversion mapping layer |
| OpenClaw patterns becoming outdated | Low | Low | We adopt patterns not packages — our implementation is independent |

---

## File Structure

```
docs/systems/inner-circle-concierge/
├── INNER-CIRCLE-CONCIERGE-OVERVIEW.md          (this document)
├── phase-1/
│   ├── PHASE-1-IMPLEMENTATION-PLAN.md          (pending)
│   └── PHASE-1-PRE-FLIGHT-CHECKLIST.md         (pending)
└── phase-2/
    ├── PHASE-2-IMPLEMENTATION-PLAN.md          (pending)
    └── PHASE-2-PRE-FLIGHT-CHECKLIST.md         (pending)
```

---

## Next Steps

1. Review and approve this overview document
2. Create **Phase 1 Implementation Plan** with exact migration SQL, file-by-file changes, and skill definition specs
3. Create **Phase 1 Pre-Flight Checklist** with database verification queries
4. Begin Phase 1 implementation via `/feature` workflow
