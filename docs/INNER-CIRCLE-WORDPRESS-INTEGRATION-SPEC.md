# Inner Circle WordPress Integration Spec

## Base URL
- **Production**: `https://tpx.power100.io`
- **Development**: `http://localhost:5000`

## Authentication
All protected endpoints require the `X-API-Key` header:
```
X-API-Key: <TPX_IC_API_KEY value>
```
The API key is stored in the TPE backend's `.env` as `TPX_IC_API_KEY`. WordPress should store this key in its IC Settings page and send it with every proxy request. **The browser never sees this key** — WordPress PHP backend proxies all requests.

---

## Endpoints

### 1. Register Member
```
POST /api/inner-circle/register
Auth: X-API-Key
```

**Request:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "phone": "+15551234567",
  "business_type": "general_contractor",
  "revenue_tier": "1m_5m",
  "team_size": "11-25",
  "focus_areas": ["revenue_growth", "hiring"],
  "entry_source": "wordpress"
}
```
Required: `name`, `email`. All other fields optional.

**Response (201):**
```json
{
  "success": true,
  "member": { "id": 2, "email": "jane@example.com", "name": "Jane Smith", "membership_status": "active" }
}
```

**Duplicate (409):**
```json
{
  "success": false,
  "error": "Member with this email already exists",
  "member_id": 2
}
```
WordPress should use the returned `member_id` to link the WP user to the TPE member.

---

### 2. AI Concierge Chat
```
POST /api/inner-circle/message
Auth: X-API-Key
```

**Request:**
```json
{
  "member_id": 1,
  "message": "Help me create a revenue growth plan",
  "session_id": "ic-abc123"
}
```
`session_id` is optional — omit to start a new session, include to continue an existing one.

**Response:**
```json
{
  "success": true,
  "session_id": "ic-abc123",
  "aiResponse": {
    "content": "Let's build your PowerMove! What's your current monthly revenue and target?"
  }
}
```

---

### 3. Get Conversations
```
GET /api/inner-circle/conversations?member_id=1&limit=50&offset=0
Auth: X-API-Key
```

**Response:**
```json
{
  "success": true,
  "conversations": [
    { "id": 1, "member_id": 1, "message_type": "user", "content": "Hello", "created_at": "..." },
    { "id": 2, "member_id": 1, "message_type": "ai", "content": "Hi there!", "created_at": "..." }
  ],
  "total": 42,
  "hasMore": true
}
```

---

### 4. Get Member Profile
```
GET /api/inner-circle/profile?member_id=1
Auth: X-API-Key
```

**Response:**
```json
{
  "success": true,
  "profile": {
    "id": 1,
    "name": "Test Member",
    "email": "test@example.com",
    "businessType": "HVAC Contractor",
    "revenueTier": "500K-1M",
    "teamSize": "6-10",
    "focusAreas": ["revenue_growth"],
    "onboardingComplete": true,
    "partnerUnlocked": true,
    "powerMovesActive": { "count": 1 },
    "powerMovesCompleted": 0,
    "membershipStatus": "active",
    "totalSessions": 5,
    "lastInteraction": "2026-02-16T..."
  }
}
```

---

### 5. Get PowerMoves
```
GET /api/inner-circle/power-moves?member_id=1&status=active,in_progress
Auth: X-API-Key
```

**Response:**
```json
{
  "success": true,
  "powerMoves": [
    {
      "id": 1,
      "title": "Scale Monthly Revenue",
      "description": "...",
      "pillar": "Revenue & Profit",
      "status": "active",
      "action_steps": { "weeks": ["..."] },
      "starting_value": 80000,
      "target_value": 120000,
      "current_value": 80000,
      "streak_weeks": 0,
      "total_checkins": 0
    }
  ],
  "count": 1
}
```

---

### 6. Get PowerMove Check-ins
```
GET /api/inner-circle/power-moves/:id/checkins?member_id=1
Auth: X-API-Key
```

**Response:**
```json
{
  "success": true,
  "checkins": [
    {
      "id": 1,
      "week_number": 1,
      "checkin_date": "2026-02-16T...",
      "checkin_source": "concierge",
      "progress_update": "Started outreach to 3 new clients",
      "current_value": 82000,
      "blockers": null,
      "wins": "Landed first new lead",
      "ai_coaching_response": "Great start! Focus on...",
      "ai_sentiment": "positive"
    }
  ],
  "count": 1
}
```

---

### 7. Get Engagement Score
```
GET /api/inner-circle/engagement-score?member_id=1
Auth: X-API-Key
```

**Response:**
```json
{
  "success": true,
  "memberId": 1,
  "engagementScore": 32.45
}
```

---

### 8. Get Sessions
```
GET /api/inner-circle/sessions?member_id=1&limit=10
Auth: X-API-Key
```

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "session_id": "ic-abc123",
      "session_type": "inner_circle",
      "started_at": "2026-02-16T...",
      "updated_at": "2026-02-16T..."
    }
  ],
  "count": 1
}
```

---

### 9. End Session
```
POST /api/inner-circle/session/:session_id/end
Auth: X-API-Key
```

**Response:**
```json
{
  "success": true,
  "message": "Session ended"
}
```

---

### 10. Get Watch History
```
GET /api/inner-circle/watch-history?member_id=1&limit=20
Auth: X-API-Key
```

**Response:**
```json
{
  "success": true,
  "watchHistory": [
    {
      "id": 1,
      "member_id": 1,
      "content_id": 42,
      "content_type": "video",
      "show_id": 1,
      "watch_progress": 75.5,
      "total_watch_time_seconds": 320,
      "watch_count": 2,
      "completed": false,
      "last_watched_at": "2026-02-16T...",
      "title": "Episode Title",
      "show_name": "PowerChat"
    }
  ],
  "count": 1
}
```

---

## Open Endpoints (No API Key Required)

### Shows List
```
GET /api/inner-circle/shows
```

**Response:**
```json
{
  "success": true,
  "shows": [
    { "id": 1, "name": "PowerChat", "slug": "powerchat", "hosts": "Greg", "description": "...", "format": "video_podcast", "episode_count": 0 },
    { "id": 2, "name": "Inner Circle with Greg & Paul", "slug": "inner-circle", "hosts": "Greg & Paul", "description": "...", "format": "live_session", "episode_count": 0 },
    { "id": 3, "name": "Outside The Lines with Ray & Greg", "slug": "outside-the-lines", "hosts": "Ray & Greg", "description": "...", "format": "video_podcast", "episode_count": 0 },
    { "id": 4, "name": "TPX Industry Podcasts", "slug": "tpx-industry", "hosts": "Various", "description": "...", "format": "audio_podcast", "episode_count": 0 }
  ]
}
```

### Content Stats
```
GET /api/inner-circle/content-stats
```

---

## n8n Webhook Endpoints (WordPress fires these)

These are fired FROM WordPress TO n8n. n8n then calls the TPE backend.

| Event | n8n Webhook URL (Production) | n8n Webhook URL (Dev) |
|-------|-------|------|
| Watch History | `https://n8n.srv918843.hstgr.cloud/webhook/ic-watch-history` | `https://n8n.srv918843.hstgr.cloud/webhook/ic-watch-history-dev` |
| PowerMove Event | `https://n8n.srv918843.hstgr.cloud/webhook/ic-powermove-event` | `https://n8n.srv918843.hstgr.cloud/webhook/ic-powermove-event-dev` |

**Watch History Payload** (WordPress fires when member watches content):
```json
{
  "member_id": 1,
  "content_id": 42,
  "content_type": "video",
  "show_id": 1,
  "watch_progress": 75.5,
  "watch_time_seconds": 320,
  "source": "portal"
}
```

n8n forwards this to `POST /api/inner-circle/watch-history` (no API key required — direct n8n webhook).

**PowerMove Event Payload** (WordPress fires on PowerMove interactions):
```json
{
  "member_id": 1,
  "event_type": "checkin",
  "power_move_id": 1,
  "data": {
    "progress_update": "Completed week 1 tasks",
    "current_value": 85000
  }
}
```

---

## WordPress Settings Page Fields

The IC Settings page should have these integration fields:

| Field | Value |
|-------|-------|
| TPE API Base URL | `https://tpx.power100.io` |
| TPE API Key | `<TPX_IC_API_KEY value from .env>` |
| n8n Webhook Base | `https://n8n.srv918843.hstgr.cloud` |

---

## CORS

`https://innercircle.power100.io` is already allowlisted in the TPE backend CORS configuration. The `X-API-Key` header is in the allowed headers list.

---

## Error Responses

All endpoints return errors in this format:
```json
{
  "success": false,
  "error": "Description of error"
}
```

Common HTTP status codes:
- `400` — Missing required fields
- `401` — Missing or invalid API key
- `404` — Member not found
- `409` — Duplicate (registration only)
- `429` — Rate limit exceeded (50 messages/day per member)
- `500` — Server error
