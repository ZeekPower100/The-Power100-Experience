# AI Concierge — Rankings Rep Agent

## Purpose

The Rankings Rep Agent is a specialized AI sales assistant integrated into the TPX AI Concierge system. It serves sales reps working the Power100 Ranking System, providing account intelligence, outreach scripts, objection handling, and activity logging — all powered by the rankings database.

This is part of the larger vision: **TPX as the foundational AI brain for the entire Power100 business**, with contextualized agents for each role/system.

## Architecture

```
Ranking System Dashboard (Flask, Vultr)
  │
  │  POST /api/sales-agent/message     { user_id, company_id, message }
  │  POST /api/sales-agent/briefing    { user_id, company_id }
  │  POST /api/sales-agent/generate-email
  │  POST /api/sales-agent/generate-sms
  │  POST /api/sales-agent/summarize-call
  │  POST /api/sales-agent/company-intel
  │  (X-API-Key auth)
  │
  ▼
TPX Backend (Node.js, AWS)
  │
  ├── salesAgentRoutes.js → salesAgentController.js
  │     │
  │     ├── Connects to power_rankings_db (second Pool)
  │     ├── Fetches company profile, comms, notes, intel
  │     └── Routes to Rankings Rep Agent
  │
  ├── conciergeStateMachine.js
  │     └── State: rankings_rep_agent | Guard: isRankingsRep
  │
  ├── aiConciergeRankingsRepAgent.js (LangGraph)
  │     ├── GPT-4o, temp 0.4
  │     ├── System prompt: sales enablement context
  │     ├── Skills: 4 rankings-rep skills
  │     └── Tools: 8 rankings + 3 shared = 11 total
  │
  └── rankingsDbService.js
        └── Second pg Pool → power_rankings_db
```

## API Contract

All endpoints require `X-API-Key` header with the value of `TPX_SALES_AGENT_API_KEY`.

### POST /api/sales-agent/message
Chat with the AI about an account.

**Request:**
```json
{
  "user_id": 1,
  "company_id": 42,
  "message": "What do you know about this company?"
}
```

**Response:**
```json
{
  "success": true,
  "response": "Here's what I know about ABC Roofing...",
  "user_id": 1,
  "company_id": 42
}
```

### POST /api/sales-agent/briefing
Generate a comprehensive account briefing.

**Request:**
```json
{
  "user_id": 1,
  "company_id": 42
}
```

**Response:**
```json
{
  "success": true,
  "briefing": "## Account Briefing: ABC Roofing\n\n...",
  "user_id": 1,
  "company_id": 42
}
```

### POST /api/sales-agent/generate-email
Generate a personalized email draft.

**Request:**
```json
{
  "user_id": 1,
  "company_id": 42,
  "purpose": "cold_outreach",
  "additional_context": "They just won a local award"
}
```

### POST /api/sales-agent/generate-sms
Generate a short SMS message.

**Request:**
```json
{
  "user_id": 1,
  "company_id": 42,
  "purpose": "follow-up"
}
```

### POST /api/sales-agent/summarize-call
Summarize a call and extract action items.

**Request:**
```json
{
  "user_id": 1,
  "company_id": 42,
  "transcript": "...",
  "call_notes": "..."
}
```

### POST /api/sales-agent/company-intel
Fetch company intelligence (direct DB, no agent invocation).

**Request:**
```json
{
  "company_id": 42
}
```

## Database Access

### Connection Pattern
Uses a **second pg Pool** (`database.rankings.js`) pointing to `power_rankings_db` on the same AWS RDS instance as `tpedb`. Reuses `DB_HOST`, `DB_USER`, `DB_PASSWORD` from the main .env — only `RANKINGS_DB_NAME` differs.

### rankingsDbService Methods

| Method | Table(s) | Purpose |
|--------|----------|---------|
| `getCompany(id)` | companies, pillars | Full profile with scoring |
| `getCompanyCommunications(id, limit)` | communications, users | Recent comms with rep names |
| `getCompanyNotes(id)` | account_notes, users | Notes with author names |
| `getCompanyTasks(id, status)` | account_tasks, users | Tasks filtered by status |
| `getCompanyIntel(id)` | company_intel | Non-expired intel items |
| `getRepUser(id)` | users, user_pillar_assignments, pillars | Rep profile + assigned pillars |
| `getRepPillarCompanies(id, limit)` | companies, pillars, user_pillar_assignments | Top companies in rep's pillars |
| `logCommunication(data)` | communications | Write call/email/SMS record |
| `createAccountNote(data)` | account_notes | Write account note |
| `createAccountTask(data)` | account_tasks | Write follow-up task |

## Tools Inventory

### Rankings-Specific Tools (8)
Located in `tpe-backend/src/services/agents/tools/rankings/`

| Tool | Name (in agent) | Purpose |
|------|-----------------|---------|
| `getAccountProfileTool.js` | `get_account_profile` | Full company profile + scoring |
| `getCompanyIntelTool.js` | `get_company_intel` | Recent intel (news, social) |
| `getCommunicationHistoryTool.js` | `get_communication_history` | All comms for a company |
| `recommendNextActionTool.js` | `recommend_next_action` | AI-recommended next step |
| `generateTalkingPointsTool.js` | `generate_talking_points` | Personalized conversation data |
| `logCommunicationTool.js` | `log_communication` | Write comms to DB |
| `createTaskTool.js` | `create_task` | Create follow-up tasks |
| `createNoteTool.js` | `create_note` | Create account notes |

### Shared Tools (3)
Imported from parent `tools/` directory — no moves, no renames:
- `webSearchTool.js` — Real-time web search
- `sendEmailTool.js` — Send emails
- `sendSMSTool.js` — Send SMS

## Skills Inventory

Located in `tpe-backend/src/skills/rankings-rep/`

| Skill | Context Type | Priority | Purpose |
|-------|-------------|----------|---------|
| `account_research` | `rankings_rep` | high | Account briefing and research workflow |
| `outreach_script` | `rankings_rep` | high | Call scripts, email/SMS generation |
| `follow_up_cadence` | `rankings_rep` | medium | Multi-touch outreach sequences |
| `objection_handling` | `rankings_rep` | high | Common objection responses |

Skills are seeded to `skill_definitions` table on server startup via `skillLoaderService.seedFromFilesystem()`.

## State Machine Integration

### Guard
```javascript
isRankingsRep: ({ context }) => {
  return context.rankingsRepId !== null && context.rankingsRepId !== undefined;
}
```

### Routing Priority
`event_agent` → `inner_circle_agent` → `rankings_rep_agent` → `standard_agent`

### Machine Key
`srep-${rankingsRepId}-${sessionId}`

## Environment Variables

| Variable | Dev Value | Prod Value | Purpose |
|----------|-----------|------------|---------|
| `RANKINGS_DB_NAME` | `home_improvement_db` | `power_rankings_db` | Rankings database name |
| `TPX_SALES_AGENT_API_KEY` | `tpx-sales-agent-key-2026-power100` | (secure key) | API key for auth |
| `DB_HOST` | (reused) | (reused) | Same RDS host |
| `DB_USER` | (reused) | (reused) | Same RDS credentials |
| `DB_PASSWORD` | (reused) | (reused) | Same RDS credentials |

## Testing

### Local
```bash
# Start backend
node dev-manager.js start all

# Check logs for:
# ✅ Rankings database (home_improvement_db) connected

# Test briefing
curl -X POST http://localhost:5000/api/sales-agent/briefing -H "Content-Type: application/json" -H "X-API-Key: tpx-sales-agent-key-2026-power100" -d "{\"user_id\": 1, \"company_id\": 1}"

# Test message
curl -X POST http://localhost:5000/api/sales-agent/message -H "Content-Type: application/json" -H "X-API-Key: tpx-sales-agent-key-2026-power100" -d "{\"user_id\": 1, \"company_id\": 1, \"message\": \"What do you know about this company?\"}"
```

### Production
```bash
curl -X POST https://tpx.power100.io:5000/api/sales-agent/briefing -H "Content-Type: application/json" -H "X-API-Key: <prod-key>" -d "{\"user_id\": 1, \"company_id\": 1}"
```

## Future Roadmap
- Twilio dialer integration (click-to-call from dashboard)
- Automated outreach sequences (agent-driven cadence)
- Daily briefing emails (morning digest for reps)
- Performance analytics (track AI-assisted vs manual outreach)
- Voice call summarization (Whisper integration)
