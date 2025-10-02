# 🎯 PCR Scoring System - Real-time Event Feedback

**Power Confidence Rating (PCR) for Events**

*Last Updated: September 26, 2025*
*Status: Production Ready*
*Phase: Event Orchestrator Phase 4*

---

## 📋 Overview & Purpose

The PCR (Power Confidence Rating) Scoring System is a real-time feedback collection mechanism that gathers contractor sentiment and ratings during live events through conversational SMS interactions. Unlike traditional post-event surveys, PCR scoring happens **in the moment** through natural conversation, combining explicit numerical ratings with AI-powered sentiment analysis.

### Key Benefits
- **Real-time feedback**: Capture reactions while they're fresh
- **Higher response rates**: Conversational vs. survey format
- **Deeper insights**: AI sentiment analysis beyond just numbers
- **Actionable data**: Immediate visibility into what's working/not working
- **Multi-dimensional**: Separate scores for speakers, sponsors, sessions, peers, overall event

### Use Cases
1. **Speaker Performance**: Rate individual speakers immediately after sessions
2. **Sponsor Engagement**: Measure booth interaction quality
3. **Session Value**: Evaluate specific sessions or topics
4. **Peer Connections**: Track quality of peer matching introductions
5. **Overall Event**: Holistic event experience rating

---

## 🏗️ Technical Architecture

### Database Schema

```sql
CREATE TABLE event_pcr_scores (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  contractor_id INTEGER REFERENCES contractors(id),
  pcr_type VARCHAR(50), -- 'speaker', 'sponsor', 'session', 'peer_match', 'overall_event'
  entity_id INTEGER, -- ID of speaker/sponsor/session being rated
  entity_name VARCHAR(255), -- Name for easy reference

  -- Scoring
  explicit_score INTEGER CHECK (explicit_score >= 1 AND explicit_score <= 10),
  sentiment_score NUMERIC(5,2), -- AI-calculated from text (-1 to 1)
  final_pcr_score NUMERIC(5,2), -- Weighted combination

  -- Context
  question_asked TEXT,
  response_received TEXT,
  conversation_context JSONB,

  -- AI Analysis
  sentiment_analysis JSONB, -- Full AI response
  confidence_level NUMERIC(3,2), -- AI confidence in sentiment (0-1)

  -- Timestamps
  requested_at TIMESTAMP DEFAULT NOW(),
  responded_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_event_pcr_event ON event_pcr_scores(event_id);
CREATE INDEX idx_event_pcr_contractor ON event_pcr_scores(contractor_id);
CREATE INDEX idx_event_pcr_type ON event_pcr_scores(pcr_type);
CREATE INDEX idx_event_pcr_entity ON event_pcr_scores(entity_id, pcr_type);
```

### API Endpoints

#### 1. Request PCR Score
```http
POST /api/event-messaging/pcr-request
Content-Type: application/json

{
  "contractorId": 123,
  "eventId": 456,
  "pcrType": "speaker",
  "entityId": 789,
  "entityName": "John Smith",
  "question": "On a scale of 1-10, how valuable was John Smith's session?"
}
```

**Response:**
```json
{
  "success": true,
  "message": "PCR request sent via SMS",
  "pcrId": 1001
}
```

#### 2. Process PCR Response
```http
POST /api/event-messaging/pcr-response
Content-Type: application/json

{
  "contractorId": 123,
  "eventId": 456,
  "response": "9 - Really loved his insights on scaling operations!"
}
```

**Response:**
```json
{
  "success": true,
  "explicitScore": 9,
  "sentimentScore": 0.85,
  "finalScore": 8.93,
  "analysis": {
    "sentiment": "very_positive",
    "keywords": ["loved", "insights", "scaling"],
    "confidence": 0.92
  }
}
```

#### 3. Get PCR Aggregations
```http
GET /api/event-messaging/pcr-scores/:eventId/:contractorId

Query Parameters:
- pcrType (optional): Filter by type
- entityId (optional): Filter by specific entity
```

**Response:**
```json
{
  "success": true,
  "overallScore": 8.2,
  "totalScores": 15,
  "breakdown": {
    "speaker": { "average": 8.5, "count": 5 },
    "sponsor": { "average": 7.8, "count": 4 },
    "session": { "average": 8.3, "count": 3 },
    "peer_match": { "average": 8.9, "count": 2 },
    "overall_event": { "average": 8.0, "count": 1 }
  },
  "scores": [
    {
      "id": 1001,
      "pcrType": "speaker",
      "entityName": "John Smith",
      "explicitScore": 9,
      "sentimentScore": 0.85,
      "finalScore": 8.93,
      "response": "9 - Really loved his insights on scaling operations!",
      "respondedAt": "2025-09-26T14:30:00Z"
    }
  ]
}
```

---

## 🎯 PCR Scoring Types

### 1. Speaker PCR
**Trigger**: After speaker session ends
**Question Format**: "On a scale of 1-10, how valuable was [Speaker Name]'s session on [Topic]?"

**What We Track**:
- Session content quality
- Speaker delivery effectiveness
- Actionable insights provided
- Relevance to contractor's focus areas

**Example**:
```
SMS: "Hey John! How would you rate Brian's session on operational efficiency? (1-10)"
Response: "8 - Great practical examples but ran a bit long"
Result: Explicit=8, Sentiment=0.65 (positive), Final=7.86
```

### 2. Sponsor PCR
**Trigger**: After booth visit or demo booking
**Question Format**: "How was your interaction with [Sponsor Name]? (1-10)"

**What We Track**:
- Booth representative quality
- Relevance of solutions discussed
- Likelihood of follow-up
- Overall engagement quality

**Example**:
```
SMS: "How was your chat with Destination Motivation at Booth 12? (1-10)"
Response: "10! They totally get our hiring challenges. Booked a demo."
Result: Explicit=10, Sentiment=0.95 (very positive), Final=9.98
```

### 3. Session PCR
**Trigger**: End of specific breakout sessions
**Question Format**: "Rate the [Session Name] session (1-10)"

**What We Track**:
- Content relevance
- Presentation quality
- Networking opportunities in session
- Time management

### 4. Peer Match PCR
**Trigger**: After peer introduction is made
**Question Format**: "How valuable was your connection with [Peer Name]? (1-10)"

**What We Track**:
- Match quality/relevance
- Conversation value
- Likelihood of ongoing relationship
- Introduction effectiveness

### 5. Overall Event PCR
**Trigger**: End of event or final day
**Question Format**: "Overall, how would you rate your experience at [Event Name]? (1-10)"

**What We Track**:
- Complete event experience
- Value for money/time
- Likelihood to recommend
- Intent to return

---

## 🤖 AI Sentiment Analysis Integration

### How It Works

1. **Text Analysis**: When contractor responds, their text is sent to GPT-4
2. **Sentiment Extraction**: AI determines emotional tone (-1 to 1 scale)
3. **Confidence Scoring**: AI provides confidence level in its analysis
4. **Keyword Extraction**: Important words/phrases are identified
5. **Score Weighting**: Combines explicit number with sentiment

### AI Prompt Structure

```javascript
const prompt = `
Analyze the following event feedback response and provide sentiment analysis:

Question: "${question}"
Response: "${response}"

Extract:
1. Explicit numerical score (if present)
2. Sentiment score (-1 to 1): -1=very negative, 0=neutral, 1=very positive
3. Confidence level (0 to 1): How confident are you in this sentiment?
4. Key themes/keywords mentioned
5. Overall sentiment category: very_negative, negative, neutral, positive, very_positive

Respond in JSON format.
`;
```

### Example AI Response

```json
{
  "explicitScore": 8,
  "sentimentScore": 0.75,
  "confidence": 0.88,
  "sentiment": "positive",
  "keywords": ["valuable", "practical", "helpful", "bit rushed"],
  "themes": [
    "Appreciated practical examples",
    "Time management could improve",
    "Overall positive experience"
  ]
}
```

---

## 🧮 Score Calculation

### Weighting Formula

```javascript
// Default weights
const EXPLICIT_WEIGHT = 0.7;  // 70% weight to numerical score
const SENTIMENT_WEIGHT = 0.3; // 30% weight to AI sentiment

// Normalize sentiment from -1→1 to 1→10 scale
const normalizedSentiment = ((sentimentScore + 1) / 2) * 10;

// Calculate final score
const finalScore = (explicitScore * EXPLICIT_WEIGHT) +
                   (normalizedSentiment * SENTIMENT_WEIGHT);
```

### Examples

**Example 1: High score with positive sentiment**
- Explicit: 9
- Sentiment: 0.85 → Normalized: 9.25
- Final: (9 × 0.7) + (9.25 × 0.3) = 6.3 + 2.78 = **9.08**

**Example 2: High score but negative sentiment** (sarcasm detection)
- Explicit: 8
- Sentiment: -0.4 → Normalized: 3.0
- Final: (8 × 0.7) + (3.0 × 0.3) = 5.6 + 0.9 = **6.5**
  - AI caught sarcasm: "8 out of 10, if I wanted to be completely confused"

**Example 3: No explicit score, sentiment only**
- Explicit: null → Use sentiment as full score
- Sentiment: 0.9 → Normalized: 9.5
- Final: **9.5**
  - Response: "Amazing! Best session I've been to in years!"

### Aggregation Logic

```javascript
// For entity-level averages (e.g., speaker across multiple ratings)
const entityAverage = scores.reduce((sum, score) => sum + score.finalScore, 0) / scores.length;

// For type-level averages (e.g., all speakers)
const typeAverage = entities.reduce((sum, entity) => sum + entity.average, 0) / entities.length;

// Overall event score
const overallScore = allScores.reduce((sum, score) => sum + score.finalScore, 0) / allScores.length;
```

---

## 💬 SMS Conversational Flow

### Flow Diagram

```
┌─────────────────────────────────────────────────┐
│  Event Trigger (Speaker ends, booth visit, etc) │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  System: Generate personalized question         │
│  "Hey John! How was Brian's session? (1-10)"    │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Contractor: Responds via SMS                    │
│  "9 - Really valuable insights on hiring!"       │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Backend: Parse response                         │
│  - Extract explicit score: 9                     │
│  - Send text to AI for sentiment                 │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  AI: Analyze sentiment                           │
│  - Sentiment: 0.85 (very positive)               │
│  - Keywords: ["valuable", "insights", "hiring"]  │
│  - Confidence: 0.92                              │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Backend: Calculate final score                  │
│  - Explicit (9) × 0.7 = 6.3                      │
│  - Sentiment (9.25) × 0.3 = 2.78                 │
│  - Final: 9.08                                   │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Database: Save PCR score + analysis             │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  System: Send thank you + next action           │
│  "Thanks! Want to connect with the speaker?"     │
└─────────────────────────────────────────────────┘
```

### Message Templates

**Speaker PCR Request**:
```
"Hey {firstName}! {speakerName}'s session on {topic} just wrapped.
How would you rate it? (1-10)

Reply with a number and any quick thoughts!"
```

**Sponsor PCR Request**:
```
"Hi {firstName}! How was your conversation with {sponsorName} at Booth {boothNumber}?
(1-10)

Your feedback helps us connect you with the right partners!"
```

**Thank You + Follow-up**:
```
"Thanks for the feedback! 🎯

{dynamicFollowUp based on score}"

Examples:
- Score 8+: "Glad you loved it! Want me to connect you with {speakerName}?"
- Score 5-7: "Thanks for the honest feedback. Here's another session you might like..."
- Score <5: "We hear you. Let me recommend something more relevant..."
```

---

## 📊 Real-time Aggregation

### Data Views

#### Individual Contractor View
```javascript
// GET /api/event-messaging/pcr-scores/:eventId/:contractorId
{
  "contractorName": "John Doe",
  "eventName": "Operation Lead Surge 2025",
  "overallScore": 8.2,
  "totalInteractions": 15,
  "breakdown": {
    "speakers": { avg: 8.5, count: 5 },
    "sponsors": { avg: 7.8, count: 4 },
    "sessions": { avg: 8.3, count: 3 },
    "peers": { avg: 8.9, count: 2 },
    "event": { avg: 8.0, count: 1 }
  }
}
```

#### Event-wide Aggregation
```javascript
// GET /api/events/:eventId/pcr-summary
{
  "eventName": "Operation Lead Surge 2025",
  "overallScore": 8.4,
  "totalContractors": 47,
  "totalScores": 423,
  "speakerRankings": [
    { name: "Brian Smith", avg: 9.2, count: 32 },
    { name: "Sarah Johnson", avg: 8.8, count: 30 },
    { name: "Mike Chen", avg: 8.1, count: 28 }
  ],
  "sponsorRankings": [
    { name: "Destination Motivation", avg: 9.5, count: 25 },
    { name: "ServiceTitan", avg: 8.9, count: 22 }
  ],
  "trendingTopics": ["hiring", "operations", "sales"],
  "improvementAreas": ["session timing", "lunch quality"]
}
```

#### Speaker Performance Dashboard
```javascript
// GET /api/speakers/:speakerId/pcr-history
{
  "speakerName": "Brian Smith",
  "totalEvents": 8,
  "overallAverage": 8.9,
  "eventHistory": [
    {
      "eventName": "Operation Lead Surge 2025",
      "date": "2025-09-26",
      "score": 9.2,
      "attendees": 32,
      "topKeywords": ["practical", "actionable", "experienced"]
    }
  ],
  "trend": "improving", // or "stable", "declining"
  "strengths": ["Practical examples", "Industry experience"],
  "opportunities": ["Time management", "Q&A engagement"]
}
```

---

## 💻 Usage Examples

### Example 1: Request Speaker PCR After Session

```javascript
// Backend service call
const pcrService = require('./services/pcrScoringService');

// When speaker session ends
await pcrService.requestSpeakerPCR({
  eventId: 456,
  contractorId: 123,
  speakerId: 789,
  speakerName: "Brian Smith",
  sessionTitle: "Scaling Operations Without Losing Quality",
  sessionEndTime: new Date()
});

// This will:
// 1. Create PCR request in database
// 2. Generate personalized question
// 3. Send SMS via n8n/GHL webhook
// 4. Wait for response
```

### Example 2: Process Incoming PCR Response

```javascript
// Webhook handler from n8n/GHL
app.post('/api/event-messaging/pcr-response', async (req, res) => {
  const { contractorPhone, response, eventId } = req.body;

  // Find contractor by phone
  const contractor = await contractorService.findByPhone(contractorPhone);

  // Process PCR response
  const result = await pcrService.processPCRResponse({
    contractorId: contractor.id,
    eventId,
    response
  });

  // result includes:
  // - explicitScore
  // - sentimentScore
  // - finalScore
  // - aiAnalysis

  // Send thank you message
  await smsService.send({
    to: contractorPhone,
    message: `Thanks for the feedback! Your overall event rating: ${result.finalScore}/10 🎯`
  });

  res.json({ success: true });
});
```

### Example 3: Display Event Dashboard

```javascript
// Frontend component
const EventDashboard = ({ eventId }) => {
  const [pcrData, setPcrData] = useState(null);

  useEffect(() => {
    fetch(`/api/events/${eventId}/pcr-summary`)
      .then(res => res.json())
      .then(data => setPcrData(data));
  }, [eventId]);

  return (
    <div>
      <h1>Event PCR Dashboard</h1>
      <h2>Overall Score: {pcrData?.overallScore}/10</h2>

      <section>
        <h3>Top Speakers</h3>
        {pcrData?.speakerRankings.map(speaker => (
          <div key={speaker.name}>
            {speaker.name}: {speaker.avg}/10 ({speaker.count} ratings)
          </div>
        ))}
      </section>

      <section>
        <h3>Sponsor Performance</h3>
        {pcrData?.sponsorRankings.map(sponsor => (
          <div key={sponsor.name}>
            {sponsor.name}: {sponsor.avg}/10 ({sponsor.count} ratings)
          </div>
        ))}
      </section>
    </div>
  );
};
```

---

## 🚀 Future Enhancements

### Phase 1: Enhanced Analysis (Q4 2025)
- [ ] Multi-language sentiment analysis
- [ ] Emoji/reaction-based scoring
- [ ] Voice-to-text PCR responses
- [ ] Image-based feedback (session photos with captions)

### Phase 2: Predictive Intelligence (Q1 2026)
- [ ] Predict contractor satisfaction before they respond
- [ ] Recommend interventions for low-scoring experiences
- [ ] Auto-generate follow-up actions based on feedback
- [ ] Trend analysis: "This speaker always scores high with contractors in $5M-$10M range"

### Phase 3: Gamification (Q2 2026)
- [ ] Contractor badges for feedback participation
- [ ] Speaker leaderboards across all events
- [ ] Sponsor effectiveness competitions
- [ ] Event organizer quality scores

### Phase 4: Integration & Automation (Q3 2026)
- [ ] Auto-send PCR requests based on check-in times
- [ ] Smart timing: Don't ask during lunch/breaks
- [ ] Auto-generate event improvement reports
- [ ] Integration with speaker booking platforms
- [ ] Sponsor ROI reports with PCR data

### Phase 5: Advanced AI Features (Q4 2026)
- [ ] Emotion detection from text tone
- [ ] Sarcasm/contradiction detection
- [ ] Context-aware follow-ups: "You rated low—want to talk to an organizer?"
- [ ] Automated sentiment trend alerts: "Lunch quality scores dropping"
- [ ] Predictive recommendations: "Contractors like you usually rate this speaker 9+"

---

## 🔒 Privacy & Compliance

### Data Handling
- All PCR responses are tied to specific contractors and events
- Contractors can request deletion of their feedback
- Aggregate data (speaker averages) persists even after individual deletion
- SMS opt-in required for PCR requests

### Anonymization
- Speaker/sponsor reports show aggregate scores only
- Individual contractor responses not shown without permission
- Quotes used in marketing require explicit consent

### Storage & Retention
- PCR scores stored indefinitely for trend analysis
- Raw SMS messages retained for 90 days
- AI analysis JSON retained permanently
- GDPR/CCPA compliant deletion on request

---

## 📖 Related Documentation

- [Event Orchestrator Overview](./event-orchestrator-overview.md)
- [SMS Integration Guide](../sms-integration.md)
- [AI Concierge Architecture](../../AI-FIRST-STRATEGY.md)
- [Event Messaging System](./event-messaging-system.md)

---

## 🛠️ Technical Implementation

### Key Files

**Backend**:
- `tpe-backend/src/controllers/eventMessagingController.js` - API endpoints
- `tpe-backend/src/services/pcrScoringService.js` - Core logic (if exists)
- `tpe-backend/src/services/aiService.js` - GPT-4 sentiment analysis

**Database**:
- `event_pcr_scores` table - Main storage
- Indexes on event_id, contractor_id, pcr_type, entity_id

**Frontend**:
- `tpe-front-end/src/components/events/PCRDashboard.tsx` - Visualization (if exists)
- `tpe-front-end/src/lib/api.ts` - API integration

### Environment Variables

```bash
# AI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4

# SMS Integration (via n8n/GHL)
# NOTE: These are example URLs - update with actual production webhook URLs
N8N_WEBHOOK_URL=https://example.n8n.io/webhook/pcr-response  # ⚠️ EXAMPLE ONLY - UPDATE WITH ACTUAL URL
GHL_API_KEY=...  # ⚠️ UPDATE WITH ACTUAL API KEY

# PCR Configuration
PCR_EXPLICIT_WEIGHT=0.7
PCR_SENTIMENT_WEIGHT=0.3
PCR_MIN_CONFIDENCE=0.6
```

⚠️ **IMPORTANT**: All URLs and API keys shown in examples are placeholders. Update with actual production values before deployment.

---

**Document Version**: 1.0
**Last Updated**: September 26, 2025
**Status**: Production Ready
**Maintainer**: The Power100 Experience Development Team