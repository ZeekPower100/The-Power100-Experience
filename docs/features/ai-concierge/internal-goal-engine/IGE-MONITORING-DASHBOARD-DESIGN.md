# Internal Goal Engine (IGE) - Monitoring Dashboard Design

**Purpose**: Real-time monitoring and granular inspection of the Internal Goal Engine
**Status**: Design Phase
**Date**: October 23, 2025

---

## Design Principles

1. **Health First**: System health should be immediately visible
2. **Drill-Down Navigation**: Start broad, drill into specifics
3. **Real-Time Updates**: Live data, not cached
4. **Actionable Insights**: Show what needs attention
5. **Read-Only Initially**: View-only, editing comes later

---

## Dashboard Structure

### Level 1: System Overview (Landing Page)
**Route**: `/admindashboard/ige-monitor`

**Purpose**: 30-second health check of entire IGE system

**Sections:**

#### A. System Health Metrics (Top Row - 4 Cards)
```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│   Trust Score   │  Active Goals   │ Response Rate   │  Action Rate    │
│      78.5       │       342       │      67.3%      │     45.8%       │
│   ↑ +2.3 (7d)   │   ↑ +15 (7d)   │  ↓ -3.2% (7d)   │  ↑ +5.1% (7d)   │
│   [Chart icon]  │  [Chart icon]   │  [Chart icon]   │  [Chart icon]   │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

**Fields Used:**
- Trust Score: `AVG(cumulative_trust_score)` from latest per contractor
- Active Goals: `COUNT(*)` from `ai_concierge_goals` WHERE `status = 'active'`
- Response Rate: `COUNT(contractor_response) / COUNT(sent_at)` from `ai_proactive_messages`
- Action Rate: `COUNT(led_to_action = true) / COUNT(sent_at)` from `ai_proactive_messages`

#### B. Activity Timeline (Middle Section)
**Purpose**: Recent IGE activity across all contractors

```
Recent IGE Activity (Last 24 Hours)
────────────────────────────────────────────────────────────
🎯 Goal Created      | John Smith       | "Expand into new markets"        | 2 min ago
💬 Message Sent      | Sarah Johnson    | Check-in on team expansion       | 15 min ago
❓ Question Asked    | Mike Davis       | "What's your target revenue?"    | 1 hour ago
⭐ Trust Increased   | Emily Brown      | +8 points (acted on suggestion)  | 2 hours ago
🎉 Goal Completed    | James Wilson     | "Hire 3 new team members"        | 3 hours ago
```

**Fields Used:**
- Mixed query from all 4 tables, ORDER BY timestamp DESC LIMIT 20
- `ai_concierge_goals`: `created_at`, `goal_description`, `contractor_id`
- `ai_proactive_messages`: `sent_at`, `message_type`, `message_content`, `contractor_id`
- `ai_question_log`: `asked_at`, `question_text`, `contractor_id`
- `ai_trust_indicators`: `recorded_at`, `indicator_type`, `confidence_impact`, `contractor_id`

#### C. System Alerts (Right Sidebar)
**Purpose**: Issues requiring attention

```
⚠️ Needs Attention
────────────────────────────
🔴 3 contractors with trust < 30
🟡 15 goals stale (>30 days)
🟡 8 unanswered questions (>7 days)
🟢 All workers operational
```

**Fields Used:**
- Low trust: `COUNT(*)` WHERE `cumulative_trust_score < 30`
- Stale goals: `COUNT(*)` WHERE `status = 'active'` AND `last_action_at < NOW() - INTERVAL '30 days'`
- Unanswered questions: `COUNT(*)` WHERE `contractor_answer IS NULL` AND `asked_at < NOW() - INTERVAL '7 days'`

---

### Level 2: Contractor IGE View
**Route**: `/admindashboard/ige-monitor/contractor/:id`

**Purpose**: Complete IGE activity for a single contractor

**Sections:**

#### A. Contractor IGE Summary (Top)
```
┌──────────────────────────────────────────────────────────────────┐
│  John Smith (john@example.com)                                   │
│  Trust Score: 85 (High Trust)  |  Active Goals: 3  |  Messages: 12│
│  Last Activity: 2 hours ago                                      │
└──────────────────────────────────────────────────────────────────┘
```

**Fields Used:**
- Contractor: `first_name`, `last_name`, `email` from `contractors`
- Trust: Latest `cumulative_trust_score` from `ai_trust_indicators`
- Goals: `COUNT(*)` WHERE `contractor_id = :id` AND `status = 'active'`
- Messages: `COUNT(*)` WHERE `contractor_id = :id` AND `sent_at IS NOT NULL`

#### B. Active Goals (Tab 1)
```
Active Goals for John Smith
────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Expand into new markets                                  │
│ Priority: 85  |  Progress: 45%  |  Status: Active           │
│ Created: Oct 15, 2025  |  Last Action: 2 hours ago         │
│ Success Criteria: Revenue target $500k in 6 months         │
│ Data Gaps: budget_constraints, timeline_flexibility        │
│ [View Details] [View Related Activity]                     │
└─────────────────────────────────────────────────────────────┘
```

**Fields Used:**
- All fields from `ai_concierge_goals` WHERE `contractor_id = :id` AND `status = 'active'`
- Show: `goal_description`, `priority_score`, `current_progress`, `status`, `created_at`, `last_action_at`, `success_criteria`, `data_gaps`

#### C. Proactive Messages (Tab 2)
```
Proactive Messages for John Smith
────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│ 💬 Check-in on team expansion (Sent: 2 hours ago)          │
│ "Hey John, how's the hiring process going?"                │
│ AI Reasoning: Following up on expansion goal                │
│ Response: "Great! We've interviewed 5 candidates."         │
│ Outcome: ⭐⭐⭐⭐⭐ | Led to Action: ✅                        │
│ [View Full Conversation]                                   │
└─────────────────────────────────────────────────────────────┘
```

**Fields Used:**
- All from `ai_proactive_messages` WHERE `contractor_id = :id` ORDER BY `sent_at DESC`
- Show: `message_type`, `sent_at`, `message_content`, `ai_reasoning`, `contractor_response`, `outcome_rating`, `led_to_action`

#### D. Strategic Questions (Tab 3)
```
Strategic Questions for John Smith
────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│ ❓ "What's your target revenue for this expansion?"         │
│ Type: Clarifying  |  Purpose: Fill data gap                │
│ Asked: Oct 20, 2025  |  Answered: Oct 20, 2025             │
│ Answer: "$500k in the first 6 months"                      │
│ Quality: ⭐⭐⭐⭐ | Naturalness: ⭐⭐⭐⭐⭐                        │
│ Led to Goal Refinement: ✅                                  │
│ [View Goal]                                                │
└─────────────────────────────────────────────────────────────┘
```

**Fields Used:**
- All from `ai_question_log` WHERE `contractor_id = :id` ORDER BY `asked_at DESC`
- Show: `question_text`, `question_type`, `question_purpose`, `asked_at`, `answer_received_at`, `contractor_answer`, `answer_quality_score`, `question_naturalness_score`, `led_to_goal_refinement`

#### E. Trust Timeline (Tab 4)
```
Trust Timeline for John Smith
────────────────────────────────────────────────────────────
Current Trust Score: 85 (High Trust)

[Line chart showing trust score over time]

Trust Events
────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│ ⭐ Acted on suggestion (+8)                                 │
│ "Contractor implemented AI's hiring recommendation"        │
│ Recorded: 2 hours ago  |  Score After: 85                  │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Milestone achieved (+10)                                │
│ "Completed hiring goal milestone"                         │
│ Recorded: 1 day ago  |  Score After: 77                    │
└─────────────────────────────────────────────────────────────┘
```

**Fields Used:**
- All from `ai_trust_indicators` WHERE `contractor_id = :id` ORDER BY `recorded_at DESC`
- Show: `indicator_type`, `indicator_description`, `confidence_impact`, `cumulative_trust_score`, `recorded_at`

---

### Level 3: Entity Detail View
**Route**: `/admindashboard/ige-monitor/goal/:id`
**Route**: `/admindashboard/ige-monitor/message/:id`
**Route**: `/admindashboard/ige-monitor/question/:id`

**Purpose**: Deep dive into a specific goal, message, or question

#### A. Goal Detail View
```
Goal Detail: Expand into new markets
────────────────────────────────────────────────────────────
┌─────────────────────────────────────────────────────────────┐
│ Contractor: John Smith (john@example.com)                   │
│ Goal Type: Business Development                            │
│ Priority: 85  |  Progress: 45%  |  Status: Active          │
│                                                             │
│ Description:                                               │
│ "Expand into new markets by hiring 5 new sales team       │
│  members and opening 2 regional offices"                   │
│                                                             │
│ Target Milestone: Q2 2026                                  │
│ Next Milestone: "Hire first 2 sales reps by Dec 2025"     │
│                                                             │
│ Success Criteria:                                          │
│ • Revenue target: $500k in 6 months                        │
│ • Team size: 5 new hires                                   │
│ • Regional offices: 2                                       │
│                                                             │
│ Data Gaps:                                                 │
│ • budget_constraints: Not collected                        │
│ • timeline_flexibility: Not collected                       │
│                                                             │
│ Pattern Source: Market Expansion Pattern                   │
│ Pattern Confidence: 87%                                    │
│                                                             │
│ Trigger: AI detected growth readiness from conversation    │
│                                                             │
│ Timeline:                                                  │
│ Created: Oct 15, 2025                                      │
│ Last Action: 2 hours ago                                   │
│ Updated: Oct 20, 2025                                      │
└─────────────────────────────────────────────────────────────┘

Related Activity
────────────────────────────────────────────────────────────
Messages (3):
• Check-in on team expansion (2 hours ago)
• Resource suggestion: Hiring platform (3 days ago)
• Encouragement on progress (1 week ago)

Questions (2):
• "What's your target revenue?" (5 days ago)
• "What's your hiring timeline?" (6 days ago)

Trust Events (1):
• Acted on suggestion (+8) (2 hours ago)
```

**Fields Used:**
- All fields from `ai_concierge_goals` WHERE `id = :id`
- Related contractor data from `contractors`
- Related messages from `ai_proactive_messages` WHERE `context_data->>'goal_id' = :id`
- Related questions from `ai_question_log` WHERE `goal_id = :id`
- Related trust events from `ai_trust_indicators` WHERE `context_data->>'goal_id' = :id`

---

## Component Hierarchy

```
IGE Monitoring Dashboard
│
├── System Overview Page
│   ├── HealthMetricsCards (4 cards)
│   ├── ActivityTimeline
│   ├── SystemAlerts
│   └── ContractorSearchBar
│
├── Contractor IGE View
│   ├── ContractorIGESummary
│   └── TabNavigation
│       ├── ActiveGoalsTab
│       │   └── GoalCard (repeating)
│       ├── ProactiveMessagesTab
│       │   └── MessageCard (repeating)
│       ├── StrategicQuestionsTab
│       │   └── QuestionCard (repeating)
│       └── TrustTimelineTab
│           ├── TrustChart
│           └── TrustEventCard (repeating)
│
└── Entity Detail Views
    ├── GoalDetailView
    │   ├── GoalDetailsCard
    │   └── RelatedActivitySection
    ├── MessageDetailView
    │   ├── MessageDetailsCard
    │   └── ConversationThread
    └── QuestionDetailView
        ├── QuestionDetailsCard
        └── AnswerAnalysis
```

---

## API Endpoints Required

### System Overview
```
GET /api/ige-monitor/system-health
GET /api/ige-monitor/recent-activity?limit=20
GET /api/ige-monitor/system-alerts
```

### Contractor Views
```
GET /api/ige-monitor/contractor/:id/summary
GET /api/ige-monitor/contractor/:id/goals
GET /api/ige-monitor/contractor/:id/messages
GET /api/ige-monitor/contractor/:id/questions
GET /api/ige-monitor/contractor/:id/trust-timeline
```

### Entity Details
```
GET /api/ige-monitor/goal/:id
GET /api/ige-monitor/message/:id
GET /api/ige-monitor/question/:id
```

### Search & Filter
```
GET /api/ige-monitor/contractors/search?query=john
GET /api/ige-monitor/contractors/filter?trust_score_min=0&trust_score_max=30
```

---

## UI/UX Design Notes

### Color Coding
- **Trust Levels:**
  - 0-20: Red (#FB0401)
  - 21-40: Orange (#FF8C00)
  - 41-60: Yellow (#FFC107)
  - 61-80: Light Green (#8BC34A)
  - 81-100: Dark Green (#28a745)

- **Goal Status:**
  - Active: Blue (#007bff)
  - Completed: Green (#28a745)
  - Abandoned: Gray (#6c757d)
  - Blocked: Red (#FB0401)

- **Message Types:**
  - Check-in: Blue
  - Milestone Follow-up: Purple
  - Resource Suggestion: Teal
  - Encouragement: Green
  - Course Correction: Orange
  - Celebration: Gold

### Icons
- 🎯 Goals
- 💬 Messages
- ❓ Questions
- ⭐ Trust Events
- 🔴 Critical Alert
- 🟡 Warning
- 🟢 Success

### Responsive Design
- Desktop: Full layout with sidebar
- Tablet: Collapsible sidebar
- Mobile: Stack layout with bottom navigation

---

## Future Enhancements (Phase 2)

1. **Editing Capabilities**
   - Edit goal descriptions, progress, priority
   - Manually adjust trust scores
   - Archive or delete messages/questions

2. **Advanced Filtering**
   - Filter by date range
   - Filter by message type, question type
   - Filter by trust level, goal status

3. **Bulk Actions**
   - Bulk goal status updates
   - Bulk message deletion
   - Export data to CSV

4. **Real-Time Updates**
   - WebSocket connection for live updates
   - Notifications for new activity
   - Auto-refresh every 30 seconds

5. **Analytics**
   - Trust score trends over time
   - Message effectiveness analysis
   - Goal completion rates
   - Contractor engagement patterns

---

**End of Design Document**
