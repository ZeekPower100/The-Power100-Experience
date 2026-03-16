# TPX Sales Agent API — Integration Spec for Power100 Ranking System

## Connection Details

- **Base URL**: `https://tpx.power100.io:5000`
- **Auth**: `X-API-Key` header on every request
- **API Key**: `tpx-sales-agent-prod-2026-a9f3b7c1e5d2`
- **Content-Type**: `application/json`

Store in your `.env`:
```
TPX_API_URL=https://tpx.power100.io:5000
TPX_SALES_AGENT_API_KEY=tpx-sales-agent-prod-2026-a9f3b7c1e5d2
```

## Endpoints — All Live in Production

Every request requires:
```
Headers:
  Content-Type: application/json
  X-API-Key: <your stored key>
```

`user_id` = the rep's `users.id` from `power_rankings_db`
`company_id` = the company's `companies.id` from `power_rankings_db`

No ID mapping needed — TPX reads directly from `power_rankings_db`.

---

### POST /api/sales-agent/briefing
**When**: Rep clicks "AI Briefing" button on an account.

**Request:**
```json
{
  "user_id": 1,
  "company_id": 8455
}
```

**Response:**
```json
{
  "success": true,
  "briefing": "### Account Briefing: PJ Fitzpatrick\n\n#### 1. Company Overview\n- **CEO**: James Freeman\n- **Score**: 91.28\n- **Estimated Revenue**: $149.8M\n...",
  "user_id": 1,
  "company_id": 8455
}
```

The `briefing` field is Markdown. It includes: company overview, communication history, intel highlights, open tasks, and a recommended next action.

---

### POST /api/sales-agent/generate-email
**When**: Rep wants to email a CEO.

**Request:**
```json
{
  "user_id": 1,
  "company_id": 8455,
  "purpose": "cold_outreach",
  "additional_context": "They just won a local award"
}
```

`purpose` and `additional_context` are optional but improve personalization.

**Response:**
```json
{
  "success": true,
  "email_draft": "Subject: Elevate Your Market Presence with Power100\n\nHi James,\n\n...",
  "user_id": 1,
  "company_id": 8455
}
```

---

### POST /api/sales-agent/generate-sms
**When**: Rep wants to text a CEO.

**Request:**
```json
{
  "user_id": 1,
  "company_id": 8455,
  "purpose": "follow-up",
  "additional_context": "We spoke last week about their expansion"
}
```

**Response:**
```json
{
  "success": true,
  "sms_draft": "Hi James, following up on our conversation about PJ Fitzpatrick's expansion plans...",
  "user_id": 1,
  "company_id": 8455
}
```

---

### POST /api/sales-agent/message
**When**: Rep uses freeform AI chat about an account (e.g., "What objections should I expect?" or "What's the best approach for this company?").

**Request:**
```json
{
  "user_id": 1,
  "company_id": 8455,
  "message": "What objections should I expect from this CEO?"
}
```

**Response:**
```json
{
  "success": true,
  "response": "Based on PJ Fitzpatrick's profile — $149.8M revenue, 45 years in business, HIP 200 status — James Freeman likely has...",
  "user_id": 1,
  "company_id": 8455
}
```

This is a conversational endpoint. The AI has full context of the account (profile, comms, intel, tasks) and can answer any sales-related question. Thread memory is maintained per rep+company pair.

---

### POST /api/sales-agent/summarize-call
**When**: Rep finishes a call and wants AI to summarize it and create follow-up tasks.

**Request:**
```json
{
  "user_id": 1,
  "company_id": 8455,
  "transcript": "Full call transcript here...",
  "call_notes": "Or brief notes if no transcript available"
}
```

At least one of `transcript` or `call_notes` is required.

**Response:**
```json
{
  "success": true,
  "summary": "## Call Summary\n\n**Key Takeaways:**\n- James expressed interest in...\n\n**Action Items:**\n1. Send proposal by Friday\n2. ...",
  "user_id": 1,
  "company_id": 8455
}
```

The AI will also automatically log the communication and create follow-up tasks in `power_rankings_db`.

---

### POST /api/sales-agent/company-intel
**When**: Quick intel fetch without full agent invocation (faster, no GPT call).

**Request:**
```json
{
  "company_id": 8455
}
```

**Response:**
```json
{
  "success": true,
  "company": {
    "id": 8455,
    "name": "PJ Fitzpatrick",
    "score": 91.28,
    "rankGrade": null
  },
  "intel": [],
  "recent_comms": [],
  "last_contact": null
}
```

This is a direct database read — no AI involved. Use it for quick data lookups.

---

## Error Responses

All endpoints return consistent error format:

```json
{ "success": false, "error": "Description of what went wrong" }
```

| Status | Meaning |
|--------|---------|
| 400 | Missing required fields |
| 401 | No API key provided |
| 403 | Invalid API key |
| 404 | Company not found |
| 429 | Rate limited (30 req/min) |
| 500 | Server error |

---

### POST /api/sales-agent/send-daily-reports
**When**: Nightly after daily report generation completes. Ranking system sends all rep reports in one batch call.

**Request:**
```json
{
  "reports": [
    {
      "user_id": 1,
      "user_name": "John Smith",
      "user_email": "john@power100.io",
      "report_date": "2026-03-15",
      "metrics": {
        "total_session_minutes": 145,
        "pages_visited": 87,
        "accounts_viewed": 32,
        "unique_accounts_viewed": 18,
        "notes_created": 5,
        "calls_logged": 12,
        "emails_logged": 8,
        "sms_logged": 3,
        "tasks_created": 6,
        "tasks_completed": 4,
        "profiles_edited": 2,
        "briefings_requested": 7,
        "avg_time_per_account": 8.1,
        "outreach_volume": 23
      },
      "ai_analysis": {
        "performance_score": 78,
        "trend": "improving",
        "strengths": ["High call volume", "Good account coverage"],
        "improvements": ["Follow-up cadence could be tighter"],
        "specific_suggestions": ["Try SMS for accounts that haven't responded to email"],
        "motivational_note": "Strong day, John. Your outreach volume is 15% above team average.",
        "status": "ok"
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "total": 1,
  "sent": 1,
  "failed": 0,
  "results": [
    { "user_id": 1, "success": true, "email": "john@power100.io" }
  ]
}
```

**Notes:**
- Send all reports in one batch call (array of reports).
- `metrics` fields match the `daily_performance_reports` table columns exactly.
- `ai_analysis` is the AI coaching JSON from `generate_ai_coaching()`. If AI analysis failed, you can omit it or send `{"status": "error"}` — the email will skip the coaching section.
- Emails are sent via n8n → GHL (same pipeline as all TPX emails).
- Each report email includes: metrics table, AI performance score, strengths, improvements, suggestions, and a motivational note.

---

## Integration Notes

- **Response times**: `/company-intel` is fast (~100ms, direct DB). Agent endpoints (`/briefing`, `/message`, `/generate-*`) take 5-15 seconds (GPT-4o invocation with tool calls).
- **Rate limit**: 30 requests per minute per IP.
- **Thread memory**: The `/message` endpoint maintains conversation context per rep+company pair. Sequential messages build on each other.
- **Side effects**: `/summarize-call` may write to `communications` and `account_tasks` tables in `power_rankings_db`. `/message` may also write if the AI decides to log a note or create a task.
- **Markdown**: `briefing`, `response`, `summary` fields return Markdown. Render accordingly in the dashboard.
