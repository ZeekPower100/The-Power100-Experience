# Event Peer Matching n8n Workflow

## Overview
Automated workflow that identifies and connects contractors at events who share the same role but operate in different geographic markets, facilitating valuable peer-to-peer learning and networking.

## Workflow Purpose
- **Match contractors** with similar roles/industries in different markets
- **Send SMS introductions** to both parties with context
- **Track engagement** and connection success
- **Feed learning data** to AI for future improvements

## Database Table
Uses `event_peer_matches` table with 21 columns tracking the full match lifecycle.

## Trigger Options

### Option 1: Manual Trigger (MVP)
**Endpoint**: `POST /api/events/:eventId/peer-matching/generate`

**Request Body**:
```json
{
  "event_id": 123,
  "match_criteria": {
    "min_distance_miles": 100,
    "same_industry": true,
    "same_role_title": false  // Similar roles, not exact
  }
}
```

### Option 2: Scheduled Trigger (Future)
- Run daily during event
- Generate matches for checked-in attendees
- Send introductions during break times

### Option 3: Real-time Trigger (Future)
- Trigger on attendee check-in
- Immediate match suggestions
- "Someone just like you checked in!"

## Matching Algorithm

### Matching Criteria
1. **Geographic Separation**: Different service areas (100+ miles apart)
2. **Role Similarity**: Same or similar job titles/roles
3. **Industry Alignment**: Same or complementary industries
4. **Event Attendance**: Both must be checked in

### Match Scoring
```javascript
match_score = (
  role_similarity * 0.4 +
  industry_match * 0.3 +
  geographic_diversity * 0.2 +
  complementary_skills * 0.1
) * 100
```

### SQL Query for Matches
```sql
WITH attendee_pool AS (
  SELECT
    c.id,
    c.name,
    c.phone,
    c.company_name,
    c.service_area,
    ea.event_id
  FROM contractors c
  INNER JOIN event_attendees ea ON c.id = ea.contractor_id
  WHERE ea.event_id = $1
    AND ea.checked_in = true
    AND ea.check_in_time IS NOT NULL
)
SELECT
  a1.id as contractor1_id,
  a1.name as contractor1_name,
  a1.phone as contractor1_phone,
  a1.service_area as contractor1_location,
  a2.id as contractor2_id,
  a2.name as contractor2_name,
  a2.phone as contractor2_phone,
  a2.service_area as contractor2_location,
  -- Calculate match score
  CASE
    WHEN a1.service_area != a2.service_area THEN 80
    ELSE 40
  END as base_score
FROM attendee_pool a1
CROSS JOIN attendee_pool a2
WHERE a1.id < a2.id  -- Avoid duplicate pairs
  AND a1.service_area != a2.service_area  -- Different markets
  AND NOT EXISTS (
    -- Avoid duplicate matches
    SELECT 1 FROM event_peer_matches epm
    WHERE epm.event_id = a1.event_id
      AND ((epm.contractor1_id = a1.id AND epm.contractor2_id = a2.id)
       OR  (epm.contractor1_id = a2.id AND epm.contractor2_id = a1.id))
  )
ORDER BY base_score DESC
LIMIT 20;
```

## n8n Workflow Structure

### Node 1: Webhook Trigger
- **Type**: Webhook
- **Method**: POST
- **Path**: `/webhook/event-peer-matching`
- **Authentication**: None (internal only)

**Expected Input**:
```json
{
  "event_id": 123,
  "min_matches": 5,
  "send_immediately": true
}
```

### Node 2: PostgreSQL - Fetch Event Details
- **Query**: Get event name and date
```sql
SELECT id, name, start_date, end_date
FROM events
WHERE id = {{ $json.event_id }};
```

### Node 3: PostgreSQL - Find Matches
- **Query**: Execute matching algorithm (SQL above)
- **Output**: Array of potential peer matches

### Node 4: Loop Through Matches
- **Type**: Loop Over Items
- **Batch Size**: 1 (process one match at a time)

### Node 5: Generate Match Record
- **Type**: PostgreSQL Insert
```sql
INSERT INTO event_peer_matches (
  event_id,
  contractor1_id,
  contractor2_id,
  match_type,
  match_criteria,
  match_score,
  match_reason,
  introduction_message,
  created_at
) VALUES (
  {{ $json.event_id }},
  {{ $json.contractor1_id }},
  {{ $json.contractor2_id }},
  'peer_networking',
  jsonb_build_object(
    'location1', {{ $json.contractor1_location }},
    'location2', {{ $json.contractor2_location }},
    'algorithm', 'geographic_diversity_v1'
  ),
  {{ $json.base_score }},
  'Same industry, different markets - great for peer learning',
  '',  -- Will be generated next
  NOW()
) RETURNING id, contractor1_id, contractor2_id;
```

### Node 6: Generate Introduction Message (GPT-4)
- **Type**: OpenAI
- **Model**: gpt-4
- **System Prompt**:
```
You are crafting a warm, personal introduction between two contractors at a Power100 event.

Context:
- Person 1: {{ $json.contractor1_name }} from {{ $json.contractor1_location }}
- Person 2: {{ $json.contractor2_name }} from {{ $json.contractor2_location }}
- Event: {{ $node["Node 2"].json.name }}

Generate TWO introduction messages (one for each person):
1. Keep it conversational and friendly
2. Highlight why they should connect (different markets, peer learning)
3. Suggest they meet at the next break
4. Include a conversation starter

Format as JSON:
{
  "message_to_contractor1": "...",
  "message_to_contractor2": "..."
}
```

### Node 7: Send SMS to Contractor 1 (GHL)
- **Type**: HTTP Request
- **Method**: POST
- **URL**: GHL SMS API endpoint
- **Body**:
```json
{
  "contactId": "{{ $json.contractor1_ghl_id }}",
  "message": "{{ $json.message_to_contractor1 }}"
}
```

### Node 8: Send SMS to Contractor 2 (GHL)
- Same as Node 7, for contractor 2

### Node 9: Update Match Record
- **Type**: PostgreSQL Update
```sql
UPDATE event_peer_matches
SET
  introduction_sent_time = NOW(),
  introduction_message = {{ $json.message_to_contractor1 }} || ' | ' || {{ $json.message_to_contractor2 }},
  updated_at = NOW()
WHERE id = {{ $json.match_id }};
```

### Node 10: Log to AI Learning
- **Type**: PostgreSQL Insert
```sql
INSERT INTO ai_learning_events (
  contractor_id,
  event_type,
  event_data,
  timestamp,
  context
) VALUES
  ({{ $json.contractor1_id }}, 'peer_match_introduction',
   jsonb_build_object('match_id', {{ $json.match_id }}, 'peer_id', {{ $json.contractor2_id }}),
   NOW(), 'event_orchestrator'),
  ({{ $json.contractor2_id }}, 'peer_match_introduction',
   jsonb_build_object('match_id', {{ $json.match_id }}, 'peer_id', {{ $json.contractor1_id }}),
   NOW(), 'event_orchestrator');
```

### Node 11: Return Response
- **Type**: Respond to Webhook
```json
{
  "success": true,
  "matches_created": {{ $json.match_count }},
  "introductions_sent": {{ $json.sent_count }},
  "workflow_id": "peer-matching-v1",
  "timestamp": "{{ $now }}"
}
```

## Backend Integration

### Create API Endpoint
**File**: `tpe-backend/src/controllers/eventPeerMatchingController.js`

```javascript
const pool = require('../config/database');
const axios = require('axios');

// Generate peer matches for an event
exports.generatePeerMatches = async (req, res) => {
  const { eventId } = req.params;
  const { min_matches = 5, send_immediately = true } = req.body;

  try {
    // Trigger n8n workflow
    const response = await axios.post(
      'https://n8n.srv918843.hstgr.cloud/webhook/event-peer-matching',
      {
        event_id: eventId,
        min_matches,
        send_immediately
      }
    );

    res.json({
      success: true,
      message: 'Peer matching workflow triggered successfully',
      data: response.data
    });
  } catch (error) {
    console.error('Error triggering peer matching:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger peer matching workflow',
      error: error.message
    });
  }
};

// Get peer matches for an event
exports.getPeerMatches = async (req, res) => {
  const { eventId } = req.params;

  try {
    const result = await pool.query(`
      SELECT
        epm.*,
        c1.name as contractor1_name,
        c1.phone as contractor1_phone,
        c2.name as contractor2_name,
        c2.phone as contractor2_phone
      FROM event_peer_matches epm
      INNER JOIN contractors c1 ON epm.contractor1_id = c1.id
      INNER JOIN contractors c2 ON epm.contractor2_id = c2.id
      WHERE epm.event_id = $1
      ORDER BY epm.created_at DESC
    `, [eventId]);

    res.json({
      success: true,
      matches: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching peer matches:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch peer matches',
      error: error.message
    });
  }
};

// Update match status (when contractors respond)
exports.updateMatchStatus = async (req, res) => {
  const { matchId } = req.params;
  const { contractor_id, response_type, feedback } = req.body;

  try {
    // Determine which contractor is responding
    const matchResult = await pool.query(
      'SELECT contractor1_id, contractor2_id FROM event_peer_matches WHERE id = $1',
      [matchId]
    );

    if (matchResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Match not found' });
    }

    const match = matchResult.rows[0];
    const isContractor1 = match.contractor1_id === contractor_id;

    // Update appropriate response field
    const updateField = isContractor1 ? 'contractor1_response' : 'contractor2_response';
    const feedbackField = isContractor1 ? 'feedback_contractor1' : 'feedback_contractor2';

    await pool.query(`
      UPDATE event_peer_matches
      SET
        ${updateField} = $1,
        ${feedbackField} = $2,
        updated_at = NOW()
      WHERE id = $3
    `, [response_type === 'positive', feedback, matchId]);

    // Log to AI learning
    await pool.query(`
      INSERT INTO ai_learning_events (
        contractor_id, event_type, event_data, timestamp, context
      ) VALUES ($1, $2, $3, NOW(), 'peer_match_response')
    `, [
      contractor_id,
      'peer_match_response',
      JSON.stringify({ match_id: matchId, response_type, feedback })
    ]);

    res.json({
      success: true,
      message: 'Match status updated successfully'
    });
  } catch (error) {
    console.error('Error updating match status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update match status',
      error: error.message
    });
  }
};
```

### Create Routes
**File**: `tpe-backend/src/routes/eventPeerMatchingRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const eventPeerMatchingController = require('../controllers/eventPeerMatchingController');

// Generate peer matches for an event
router.post('/events/:eventId/peer-matching/generate',
  eventPeerMatchingController.generatePeerMatches
);

// Get peer matches for an event
router.get('/events/:eventId/peer-matching',
  eventPeerMatchingController.getPeerMatches
);

// Update match status (contractor response)
router.put('/peer-matches/:matchId/status',
  eventPeerMatchingController.updateMatchStatus
);

module.exports = router;
```

### Register Routes in server.js
```javascript
const eventPeerMatchingRoutes = require('./routes/eventPeerMatchingRoutes');
app.use('/api', eventPeerMatchingRoutes);
```

## Testing

### Manual Test
```bash
# Generate peer matches
curl -X POST http://localhost:5000/api/events/1/peer-matching/generate \
  -H "Content-Type: application/json" \
  -d '{
    "min_matches": 5,
    "send_immediately": true
  }'

# Get matches for event
curl http://localhost:5000/api/events/1/peer-matching

# Update match status
curl -X PUT http://localhost:5000/api/peer-matches/1/status \
  -H "Content-Type: application/json" \
  -d '{
    "contractor_id": 123,
    "response_type": "positive",
    "feedback": "Great connection! We scheduled a call."
  }'
```

## Success Metrics

### Track in Dashboard
1. **Match Generation Rate**: Matches created per event
2. **Introduction Response Rate**: % of contractors who respond
3. **Connection Success Rate**: % who actually connect
4. **Meeting Scheduled Rate**: % who schedule follow-up
5. **PCR Score Impact**: Do peer matches improve event PCR?

### AI Learning Data
- Which match criteria lead to connections?
- What introduction messages get responses?
- Which industries benefit most from peer matching?
- Optimal timing for introductions (start, break, end)?

## Future Enhancements

### Phase 2: Smart Timing
- Send introductions during breaks
- Avoid interrupting sessions
- CEO override for timing

### Phase 3: Multi-Match
- Connect small groups (3-4 contractors)
- Industry-specific roundtables
- Experience-level cohorts

### Phase 4: Post-Event Follow-up
- Check if connection persisted
- Monthly peer group formation
- Mastermind group creation

## Deployment Checklist

- [ ] Create n8n workflow with all 11 nodes
- [ ] Test webhook endpoint
- [ ] Add controller to backend
- [ ] Add routes to server.js
- [ ] Test with sample event data
- [ ] Verify SMS delivery
- [ ] Check database logging
- [ ] Monitor AI learning events
- [ ] Document in AI-First Strategy
- [ ] Add to event orchestrator admin UI

## Notes
- Uses existing GHL SMS infrastructure
- Leverages GPT-4 for personalized introductions
- Feeds all interactions to AI learning system
- Fully automated - no manual intervention required
- Can be triggered via admin UI or API

## Related Documentation
- `docs/AI-FIRST-STRATEGY.md` - Event Orchestrator Phase 5
- Event Check-In workflow (reference implementation)
- `event_peer_matches` table schema
- AI learning events tracking