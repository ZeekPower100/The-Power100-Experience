# Internal Goal Engine (IGE) - Database Fields Reference

**Purpose**: Complete field-level documentation for IGE monitoring dashboard
**Verified**: October 23, 2025 - Local Development Database
**Tables**: 4 core IGE tables, 56 total columns

---

## Table 1: `ai_proactive_messages` (14 columns)

**Purpose**: Tracks all proactive messages sent by AI to contractors

| Field Name | Data Type | Nullable | Description |
|------------|-----------|----------|-------------|
| `id` | integer | NO | Primary key |
| `contractor_id` | integer | NO | Foreign key to contractors table |
| `message_type` | text | NO | Type: check_in, milestone_follow_up, resource_suggestion, encouragement, course_correction, celebration |
| `message_content` | text | NO | The actual message text sent to contractor |
| `ai_reasoning` | text | NO | AI's reasoning for sending this message |
| `context_data` | jsonb | YES | Additional context (goal_id, pattern_data, etc.) |
| `sent_at` | timestamp | YES | When message was actually sent |
| `contractor_response` | text | YES | Contractor's response to the message |
| `response_received_at` | timestamp | YES | When contractor responded |
| `conversation_continued` | boolean | YES | Did conversation continue beyond initial response? |
| `outcome_rating` | integer | YES | Rating 1-5 of message outcome |
| `led_to_action` | boolean | YES | Did message lead to contractor action? |
| `created_at` | timestamp | YES | Record creation time |
| `updated_at` | timestamp | YES | Record last update time |

**Key Metrics for Dashboard:**
- Total messages sent (COUNT where sent_at IS NOT NULL)
- Response rate (COUNT with contractor_response / COUNT sent)
- Average outcome rating
- Action conversion rate (led_to_action = true / total sent)
- Messages by type (GROUP BY message_type)

---

## Table 2: `ai_question_log` (14 columns)

**Purpose**: Tracks strategic questions asked by AI to fill data gaps

| Field Name | Data Type | Nullable | Description |
|------------|-----------|----------|-------------|
| `id` | integer | NO | Primary key |
| `contractor_id` | integer | NO | Foreign key to contractors table |
| `goal_id` | integer | YES | Foreign key to ai_concierge_goals (if question relates to specific goal) |
| `question_text` | text | NO | The actual question asked |
| `question_purpose` | text | NO | Why this question was asked (data gap being filled) |
| `question_type` | text | NO | Type: clarifying, exploratory, validating, prioritizing, reflecting |
| `asked_at` | timestamp | YES | When question was asked |
| `contractor_answer` | text | YES | Contractor's answer |
| `answer_received_at` | timestamp | YES | When answer was received |
| `answer_quality_score` | integer | YES | Quality score 1-5 |
| `led_to_goal_refinement` | boolean | YES | Did answer lead to goal refinement? |
| `question_naturalness_score` | integer | NO | How natural the question felt (1-5) |
| `created_at` | timestamp | YES | Record creation time |
| `updated_at` | timestamp | YES | Record last update time |

**Key Metrics for Dashboard:**
- Total questions asked
- Answer rate (COUNT with contractor_answer / COUNT total)
- Average answer quality score
- Average naturalness score
- Goal refinement rate (led_to_goal_refinement = true / total answered)
- Questions by type (GROUP BY question_type)

---

## Table 3: `ai_concierge_goals` (18 columns)

**Purpose**: Tracks contractor goals identified and managed by AI

| Field Name | Data Type | Nullable | Description |
|------------|-----------|----------|-------------|
| `id` | integer | NO | Primary key |
| `contractor_id` | integer | NO | Foreign key to contractors table |
| `goal_type` | varchar | NO | Type of goal (revenue, team, efficiency, etc.) |
| `goal_description` | text | NO | Description of the goal |
| `target_milestone` | varchar | YES | Target milestone or deadline |
| `priority_score` | integer | YES | Priority score (1-100) |
| `current_progress` | integer | YES | Progress percentage (0-100) |
| `next_milestone` | text | YES | Description of next milestone |
| `success_criteria` | jsonb | YES | Criteria for goal success |
| `pattern_source` | text | YES | Pattern that identified this goal |
| `pattern_confidence` | numeric | YES | Confidence in pattern match (0-100) |
| `data_gaps` | jsonb | YES | Identified data gaps for this goal |
| `status` | varchar | YES | Status: active, completed, abandoned, blocked |
| `trigger_condition` | varchar | YES | What triggered goal creation |
| `last_action_at` | timestamp | YES | When last action was taken on goal |
| `created_at` | timestamp | YES | Goal creation time |
| `updated_at` | timestamp | YES | Goal last update time |
| `completed_at` | timestamp | YES | Goal completion time |

**Key Metrics for Dashboard:**
- Total active goals (status = 'active')
- Completed goals (status = 'completed')
- Abandoned goals (status = 'abandoned')
- Average progress across active goals
- Average priority score
- Goals by status (GROUP BY status)
- Goals by type (GROUP BY goal_type)
- Stale goals (last_action_at > 30 days ago)

---

## Table 4: `ai_trust_indicators` (10 columns)

**Purpose**: Tracks trust-building events and cumulative trust scores

| Field Name | Data Type | Nullable | Description |
|------------|-----------|----------|-------------|
| `id` | integer | NO | Primary key |
| `contractor_id` | integer | NO | Foreign key to contractors table |
| `indicator_type` | text | NO | Type: positive_feedback, acted_on_suggestion, milestone_achieved, shared_vulnerability, asked_for_help, setback_shared, negative_feedback, ignored_suggestion |
| `indicator_description` | text | NO | Description of the trust event |
| `context_data` | jsonb | YES | Additional context about the event |
| `confidence_impact` | integer | NO | Impact on trust score (-10 to +10) |
| `cumulative_trust_score` | numeric | NO | Running trust score after this event (0-100) |
| `recorded_at` | timestamp | YES | When event was recorded |
| `created_at` | timestamp | YES | Record creation time |
| `updated_at` | timestamp | YES | Record last update time |

**Key Metrics for Dashboard:**
- Current trust score (latest cumulative_trust_score per contractor)
- Trust trend (score change over time)
- Positive events (indicator_type = positive types)
- Negative events (indicator_type = negative types)
- Trust distribution (how many contractors in each trust level)
- Events by type (GROUP BY indicator_type)

---

## Cross-Table Relationships

### Contractor → All IGE Tables
- `contractors.id` → `ai_proactive_messages.contractor_id`
- `contractors.id` → `ai_question_log.contractor_id`
- `contractors.id` → `ai_concierge_goals.contractor_id`
- `contractors.id` → `ai_trust_indicators.contractor_id`

### Goal → Question Relationship
- `ai_concierge_goals.id` → `ai_question_log.goal_id`

### Context Data Relationships (via JSONB)
- `ai_proactive_messages.context_data` may contain `goal_id`
- `ai_trust_indicators.context_data` may contain `goal_id`, `message_id`, `question_id`

---

## Dashboard Query Patterns

### Contractor Health Overview
```sql
SELECT
  c.id,
  c.first_name,
  c.last_name,
  COUNT(DISTINCT g.id) as active_goals,
  AVG(g.priority_score) as avg_priority,
  t.cumulative_trust_score as current_trust,
  COUNT(m.id) as total_messages_sent,
  COUNT(CASE WHEN m.contractor_response IS NOT NULL THEN 1 END) as messages_responded
FROM contractors c
LEFT JOIN ai_concierge_goals g ON g.contractor_id = c.id AND g.status = 'active'
LEFT JOIN ai_trust_indicators t ON t.contractor_id = c.id
  AND t.id = (SELECT id FROM ai_trust_indicators WHERE contractor_id = c.id ORDER BY recorded_at DESC LIMIT 1)
LEFT JOIN ai_proactive_messages m ON m.contractor_id = c.id AND m.sent_at IS NOT NULL
GROUP BY c.id, c.first_name, c.last_name, t.cumulative_trust_score
```

### System Health Metrics
```sql
-- Active goals count
SELECT COUNT(*) FROM ai_concierge_goals WHERE status = 'active';

-- Average trust score across all contractors
SELECT AVG(cumulative_trust_score) FROM (
  SELECT DISTINCT ON (contractor_id) cumulative_trust_score
  FROM ai_trust_indicators
  ORDER BY contractor_id, recorded_at DESC
) latest_scores;

-- Message response rate
SELECT
  COUNT(CASE WHEN contractor_response IS NOT NULL THEN 1 END)::decimal / COUNT(*) * 100 as response_rate_pct
FROM ai_proactive_messages
WHERE sent_at IS NOT NULL;

-- Question answer rate
SELECT
  COUNT(CASE WHEN contractor_answer IS NOT NULL THEN 1 END)::decimal / COUNT(*) * 100 as answer_rate_pct
FROM ai_question_log
WHERE asked_at IS NOT NULL;
```

---

## Field Validation Rules

### Enum Values (CHECK Constraints)

**ai_proactive_messages.message_type:**
- `check_in`
- `milestone_follow_up`
- `resource_suggestion`
- `encouragement`
- `course_correction`
- `celebration`

**ai_question_log.question_type:**
- `clarifying`
- `exploratory`
- `validating`
- `prioritizing`
- `reflecting`

**ai_concierge_goals.status:**
- `active`
- `completed`
- `abandoned`
- `blocked`

**ai_trust_indicators.indicator_type:**
- `positive_feedback`
- `acted_on_suggestion`
- `milestone_achieved`
- `shared_vulnerability`
- `asked_for_help`
- `setback_shared`
- `negative_feedback`
- `ignored_suggestion`

### Score Ranges

- `outcome_rating`: 1-5
- `answer_quality_score`: 1-5
- `question_naturalness_score`: 1-5
- `priority_score`: 1-100
- `current_progress`: 0-100
- `pattern_confidence`: 0-100
- `confidence_impact`: -10 to +10
- `cumulative_trust_score`: 0-100

---

## JSONB Field Structures

### ai_proactive_messages.context_data
```json
{
  "goal_id": 123,
  "pattern_data": { ... },
  "style": "friendly",
  "last_conversation": "description"
}
```

### ai_concierge_goals.success_criteria
```json
{
  "revenue_target": 500000,
  "team_size": 5,
  "timeframe": "6 months"
}
```

### ai_concierge_goals.data_gaps
```json
{
  "current_challenges": null,
  "budget_constraints": null,
  "timeline_flexibility": null
}
```

### ai_trust_indicators.context_data
```json
{
  "goal_id": 123,
  "message_id": 456,
  "question_id": 789,
  "related_event": "description"
}
```

---

**End of Database Fields Reference**
