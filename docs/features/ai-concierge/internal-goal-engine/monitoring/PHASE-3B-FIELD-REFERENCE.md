# PHASE 3B - IGE Analytics Dashboard
## Database Field Reference (Verified: October 24, 2025)

**PURPOSE**: Analytics and reporting endpoints for IGE system performance metrics

---

## DATABASE TABLES USED (Read-Only Analytics)

### 1. ai_concierge_goals (18 columns)
**Analytics Fields:**
- `id` - integer, NOT NULL (Primary key)
- `contractor_id` - integer, NOT NULL (Link to contractor)
- `goal_type` - varchar, NOT NULL (For segmentation)
- `goal_description` - text, NOT NULL
- `priority_score` - integer, NULL (1-10 scale)
- `current_progress` - integer, NULL (0-100 percentage)
- `status` - varchar, NULL (active, completed, cancelled)
- `created_at` - timestamp, NULL (Goal creation time)
- `completed_at` - timestamp, NULL (Goal completion time)
- `updated_at` - timestamp, NULL (Last modification)
- `pattern_source` - text, NULL (manual_admin_creation, ai_generated, etc.)

**Key Analytics:**
- Goal completion rate: COUNT(completed_at IS NOT NULL) / COUNT(*)
- Average completion time: AVG(completed_at - created_at)
- Goals by type: GROUP BY goal_type
- Goals by status: GROUP BY status

---

### 2. contractor_action_items (27 columns)
**Analytics Fields:**
- `id` - integer, NOT NULL (Primary key)
- `contractor_id` - integer, NOT NULL (Link to contractor)
- `title` - varchar, NOT NULL
- `action_type` - varchar, NOT NULL (Valid values: follow_up, demo_prep, email_intro, implement_tool, contact_peer, research_partner, schedule_meeting, review_content, other)
- `priority` - integer, NOT NULL (1-10 scale)
- `status` - varchar, NULL (pending, in_progress, completed, cancelled)
- `ai_generated` - boolean, NULL (TRUE = AI-created, FALSE = manual)
- `created_at` - timestamp, NULL (Action creation time)
- `completed_at` - timestamp, NULL (Action completion time)
- `due_date` - date, NULL (Action deadline)
- `updated_at` - timestamp, NULL (Last modification)

**Key Analytics:**
- Action completion rate: COUNT(completed_at IS NOT NULL) / COUNT(*)
- Average completion time: AVG(completed_at - created_at)
- Overdue actions: COUNT(due_date < NOW() AND status = 'pending')
- Actions by type: GROUP BY action_type
- AI vs Manual: GROUP BY ai_generated

---

### 3. ai_proactive_messages (14 columns)
**Analytics Fields:**
- `id` - integer, NOT NULL (Primary key)
- `contractor_id` - integer, NOT NULL (Link to contractor)
- `message_type` - text, NOT NULL (Valid values: check_in, milestone_follow_up, resource_suggestion, encouragement, course_correction, celebration)
- `message_content` - text, NOT NULL
- `sent_at` - timestamp, NULL (When message was sent)
- `contractor_response` - text, NULL (Contractor's reply)
- `response_received_at` - timestamp, NULL (When contractor replied)
- `conversation_continued` - boolean, NULL (Did conversation continue?)
- `outcome_rating` - integer, NULL (1-10 effectiveness rating)
- `led_to_action` - boolean, NULL (Did message result in action?)
- `created_at` - timestamp, NULL (Message creation time)
- `updated_at` - timestamp, NULL (Last modification)

**Key Analytics:**
- Response rate: COUNT(contractor_response IS NOT NULL) / COUNT(sent_at IS NOT NULL)
- Average response time: AVG(response_received_at - sent_at)
- Conversation continuation rate: COUNT(conversation_continued = TRUE) / COUNT(*)
- Action conversion rate: COUNT(led_to_action = TRUE) / COUNT(*)
- Messages by type: GROUP BY message_type
- Average outcome rating: AVG(outcome_rating)

---

### 4. ai_trust_indicators (10 columns)
**Analytics Fields:**
- `id` - integer, NOT NULL (Primary key)
- `contractor_id` - integer, NOT NULL (Link to contractor)
- `indicator_type` - text, NOT NULL (Valid values: positive_feedback, negative_feedback, ignored_suggestion, acted_on_suggestion, shared_vulnerability, asked_for_help, milestone_achieved, setback_shared)
- `indicator_description` - text, NOT NULL
- `confidence_impact` - integer, NOT NULL (Delta: -100 to +100)
- `cumulative_trust_score` - numeric, NOT NULL (Current score: 0-100)
- `recorded_at` - timestamp, NULL (When indicator was recorded)
- `created_at` - timestamp, NULL (Record creation time)

**Key Analytics:**
- Average trust score: AVG(cumulative_trust_score) WHERE recorded_at IN (SELECT MAX(recorded_at) FROM ai_trust_indicators GROUP BY contractor_id)
- Trust score trends: GROUP BY DATE_TRUNC('day', recorded_at)
- Trust score distribution: Buckets (0-40: Low, 40-70: Medium, 70-100: High)
- Indicators by type: GROUP BY indicator_type
- Average impact by type: AVG(confidence_impact) GROUP BY indicator_type

---

### 5. contractors (Segmentation Fields)
**Analytics Fields:**
- `id` - integer, NOT NULL (Primary key)
- `revenue_tier` - varchar, NULL (For segmentation)
- `team_size` - varchar, NULL (For segmentation)
- `current_stage` - varchar, NULL (For segmentation)
- `created_at` - timestamp, NULL (Contractor onboarding date)
- `last_activity_at` - timestamp, NULL (Last engagement)

**Key Analytics:**
- Total contractors: COUNT(*)
- Contractors by revenue tier: GROUP BY revenue_tier
- Contractors by team size: GROUP BY team_size
- Active contractors: COUNT(last_activity_at > NOW() - INTERVAL '30 days')
- New contractors: COUNT(created_at > NOW() - INTERVAL '30 days')

---

## PHASE 3B API ENDPOINTS (To Build)

### System-Wide Metrics
- `GET /api/ige-monitor/analytics/overview` - Dashboard overview stats
- `GET /api/ige-monitor/analytics/goals/summary` - Goal metrics
- `GET /api/ige-monitor/analytics/actions/summary` - Action metrics
- `GET /api/ige-monitor/analytics/messages/summary` - Message metrics
- `GET /api/ige-monitor/analytics/trust/summary` - Trust score metrics

### Time-Series Analysis
- `GET /api/ige-monitor/analytics/trends/goals?period=7d|30d|90d` - Goal trends
- `GET /api/ige-monitor/analytics/trends/actions?period=7d|30d|90d` - Action trends
- `GET /api/ige-monitor/analytics/trends/messages?period=7d|30d|90d` - Message trends
- `GET /api/ige-monitor/analytics/trends/trust?period=7d|30d|90d` - Trust trends

### Contractor Segmentation
- `GET /api/ige-monitor/analytics/segments/by-trust` - Contractors by trust score
- `GET /api/ige-monitor/analytics/segments/by-engagement` - Active vs inactive
- `GET /api/ige-monitor/analytics/segments/by-performance` - High vs low performers

### Message Effectiveness
- `GET /api/ige-monitor/analytics/messages/effectiveness` - Response rates by type
- `GET /api/ige-monitor/analytics/messages/best-performing` - Top message types
- `GET /api/ige-monitor/analytics/messages/conversion` - Action conversion rates

---

## COMMON QUERY PATTERNS

### Goal Completion Rate (Last 30 Days)
```sql
SELECT
  COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as completed,
  COUNT(*) as total,
  ROUND(COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END)::numeric / COUNT(*) * 100, 2) as completion_rate
FROM ai_concierge_goals
WHERE created_at > NOW() - INTERVAL '30 days';
```

### Average Trust Score (Latest per Contractor)
```sql
WITH latest_trust AS (
  SELECT DISTINCT ON (contractor_id)
    contractor_id,
    cumulative_trust_score
  FROM ai_trust_indicators
  ORDER BY contractor_id, recorded_at DESC
)
SELECT AVG(cumulative_trust_score) as avg_trust_score
FROM latest_trust;
```

### Message Response Rate by Type
```sql
SELECT
  message_type,
  COUNT(CASE WHEN contractor_response IS NOT NULL THEN 1 END) as responses,
  COUNT(*) as total_sent,
  ROUND(COUNT(CASE WHEN contractor_response IS NOT NULL THEN 1 END)::numeric / COUNT(*) * 100, 2) as response_rate
FROM ai_proactive_messages
WHERE sent_at IS NOT NULL
GROUP BY message_type
ORDER BY response_rate DESC;
```

### Action Completion Time (Average)
```sql
SELECT
  action_type,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400) as avg_days_to_complete
FROM contractor_action_items
WHERE completed_at IS NOT NULL
GROUP BY action_type
ORDER BY avg_days_to_complete ASC;
```

---

## FIELD NAMING STANDARDS (Database is Source of Truth)

**Always use these EXACT field names:**
- ✅ `contractor_id` (NOT contractorId, contractor_ID)
- ✅ `goal_type` (NOT goalType, goal_category)
- ✅ `action_type` (NOT actionType, action_category)
- ✅ `message_type` (NOT messageType, msg_type)
- ✅ `indicator_type` (NOT indicatorType, trust_type)
- ✅ `completed_at` (NOT completedAt, completion_date)
- ✅ `created_at` (NOT createdAt, creation_date)
- ✅ `sent_at` (NOT sentAt, send_time)
- ✅ `cumulative_trust_score` (NOT trustScore, current_score)
- ✅ `confidence_impact` (NOT impact, trust_delta)

**Common Mistakes to Avoid:**
- ❌ Using camelCase (database uses snake_case)
- ❌ Abbreviating field names (msg_type vs message_type)
- ❌ Guessing field names without checking database

---

## NOTES

1. **Read-Only Operations**: Phase 3B is purely analytics - NO INSERT/UPDATE/DELETE operations
2. **Performance**: Use appropriate indexes and LIMIT clauses for large datasets
3. **Time Zones**: All timestamps are stored without timezone (assume UTC)
4. **Aggregations**: Use PostgreSQL aggregate functions (COUNT, AVG, SUM, etc.)
5. **Date Ranges**: Use INTERVAL syntax for time-based filtering
6. **NULL Handling**: Many analytics fields can be NULL - use COALESCE or IS NOT NULL filters
7. **Segmentation**: Join with contractors table for revenue_tier, team_size segmentation
