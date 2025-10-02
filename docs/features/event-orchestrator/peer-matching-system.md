# 🤝 Peer Matching System - Event Networking Intelligence

**Intelligent Peer-to-Peer Connection System for Events**

*Last Updated: September 26, 2025*
*Status: Production Ready*
*Phase: Event Orchestrator Phase 5*

---

## 📋 Overview & Purpose

The Peer Matching System intelligently connects contractors at events with non-competing peers who share similar business challenges but operate in different geographic markets. Unlike random networking, our AI-driven matching ensures every introduction is valuable, relevant, and has high potential for long-term collaboration.

### Key Benefits
- **Strategic Connections**: Match based on business challenges, not just industry
- **Non-Competing**: Geographic separation ensures no market competition
- **Similar Scale**: Connect with peers at similar business stages
- **Smart Timing**: Coordinate introductions during breaks and downtime
- **Mutual Opt-in**: Both parties agree before contact info is shared
- **Track Success**: PCR scoring measures connection quality

### Use Cases
1. **Peer Learning**: Share strategies with someone facing same challenges
2. **Best Practice Exchange**: Learn from peers in different markets
3. **Problem Solving**: Get fresh perspectives from outside your market
4. **Long-term Relationships**: Build ongoing peer advisory relationships
5. **Market Expansion**: Learn about operating in new markets

---

## 🏗️ Technical Architecture

### Database Schema

```sql
CREATE TABLE event_peer_matches (
  id SERIAL PRIMARY KEY,
  event_id INTEGER REFERENCES events(id),
  contractor1_id INTEGER REFERENCES contractors(id),
  contractor2_id INTEGER REFERENCES contractors(id),

  -- Matching Algorithm Data
  match_type VARCHAR(50), -- 'ideal_peer', 'focus_area_match', 'scale_match', 'general_match'
  match_criteria JSONB, -- Detailed scoring breakdown
  match_score NUMERIC(5,2), -- Overall match quality (0-1)
  match_reason TEXT, -- Human-readable explanation

  -- Introduction Flow
  introduction_sent_time TIMESTAMP,
  introduction_message TEXT,
  contractor1_response BOOLEAN, -- Did they say yes?
  contractor2_response BOOLEAN,

  -- Connection Status
  connection_made BOOLEAN DEFAULT FALSE,
  meeting_scheduled BOOLEAN DEFAULT FALSE,
  meeting_time TIMESTAMP,
  meeting_location VARCHAR(255),

  -- Feedback
  feedback_contractor1 TEXT,
  feedback_contractor2 TEXT,
  pcr_score NUMERIC(5,2), -- Quality rating from both parties

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_peer_match_event ON event_peer_matches(event_id);
CREATE INDEX idx_peer_match_contractor1 ON event_peer_matches(contractor1_id);
CREATE INDEX idx_peer_match_contractor2 ON event_peer_matches(contractor2_id);
CREATE INDEX idx_peer_match_score ON event_peer_matches(match_score);
```

### API Endpoints

#### 1. Find Peer Matches
```http
GET /api/event-messaging/event/:eventId/contractor/:contractorId/peer-matches

Query Parameters:
- maxMatches (default: 3): Number of matches to return
- minScore (default: 0.6): Minimum match score threshold
- excludeMatched (default: true): Filter out already matched contractors
```

**Response:**
```json
{
  "success": true,
  "count": 3,
  "matches": [
    {
      "id": 456,
      "first_name": "Sarah",
      "last_name": "Johnson",
      "company_name": "ABC Contractors",
      "service_area": "Dallas, TX",
      "matchScore": 0.87,
      "matchType": "ideal_peer",
      "matchReason": "Both focused on hiring and operations. Different markets (Phoenix, AZ vs Dallas, TX). Similar business size.",
      "matchCriteria": {
        "focusAreas": 0.9,
        "geographic": 1.0,
        "businessScale": 0.8,
        "industry": 0.75
      }
    }
  ]
}
```

#### 2. Create Peer Match
```http
POST /api/event-messaging/event/:eventId/peer-match
Content-Type: application/json

{
  "contractorId": 123,
  "peerId": 456,
  "matchData": {
    "matchType": "ideal_peer",
    "matchScore": 0.87,
    "matchReason": "Both focused on hiring and operations...",
    "matchCriteria": {
      "focusAreas": 0.9,
      "geographic": 1.0,
      "businessScale": 0.8,
      "industry": 0.75
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "match": {
    "id": 789,
    "event_id": 1,
    "contractor1_id": 123,
    "contractor2_id": 456,
    "match_score": 0.87,
    "created_at": "2025-09-26T10:00:00Z"
  }
}
```

#### 3. Send Peer Introduction
```http
POST /api/event-messaging/peer-match/:matchId/introduction
Content-Type: application/json

{
  "message": "Hey John! 👋\n\n🤝 Find Your Peer: I found someone perfect for you to meet!..."
}
```

#### 4. Record Response
```http
POST /api/event-messaging/peer-match/:matchId/response
Content-Type: application/json

{
  "contractorId": 123,
  "response": true
}
```

#### 5. Record Connection Made
```http
POST /api/event-messaging/peer-match/:matchId/connection
Content-Type: application/json

{
  "meetingDetails": {
    "scheduled": true,
    "time": "2025-09-26T12:30:00Z",
    "location": "Lunch area - Table 5"
  }
}
```

#### 6. Get Contractor Matches
```http
GET /api/event-messaging/event/:eventId/contractor/:contractorId/matches
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "matches": [
    {
      "id": 789,
      "match_score": 0.87,
      "contractor2_first_name": "Sarah",
      "contractor2_last_name": "Johnson",
      "contractor2_company": "ABC Contractors",
      "connection_made": true,
      "meeting_time": "2025-09-26T12:30:00Z",
      "pcr_score": 9.2
    }
  ]
}
```

---

## 🧮 Matching Algorithm

### Scoring Weights

The matching algorithm uses four weighted criteria:

| Criteria | Weight | Purpose |
|----------|--------|---------|
| **Focus Area Overlap** | 40% | Ensures shared business challenges |
| **Geographic Separation** | 25% | Guarantees non-competing markets |
| **Business Scale Similarity** | 20% | Matches similar-sized companies |
| **Industry Alignment** | 15% | Same vertical for relevant insights |

### 1. Focus Area Overlap (40%)

**Calculation**: Jaccard similarity of focus areas
```javascript
commonAreas / totalUniqueAreas
```

**Examples**:
- Both focus on "hiring" and "operations": **0.9 score**
- One overlap out of 4 total areas: **0.25 score**
- No overlap: **0.0 score**

**Why it matters**: Contractors want to talk with peers facing the same challenges.

### 2. Geographic Separation (25%)

**Scoring**:
- Different states: **1.0** (perfect - no competition)
- Same state, different cities: **0.5** (moderate separation)
- Same city: **0.2** (competing market - low score)

**Examples**:
- Phoenix, AZ vs Dallas, TX: **1.0**
- Dallas, TX vs Austin, TX: **0.5**
- Dallas, TX vs Dallas, TX: **0.2**

**Why it matters**: Peers in non-competing markets freely share strategies.

### 3. Business Scale Similarity (20%)

**Revenue Tier Comparison**:
```javascript
Revenue Tiers: under_500k, 500k_1m, 1m_2m, 2m_5m, 5m_10m, 10m_plus

Same tier: 1.0
Adjacent tier (e.g., 1m_2m vs 2m_5m): 0.8
2 tiers apart: 0.5
3+ tiers apart: 0.3
```

**Team Size Comparison**:
```javascript
Within 20% of each other: 1.0
Within 50%: 0.8
Within 100% (2x difference): 0.5
More than 2x different: 0.3
```

**Final Scale Score**: Average of revenue and team size scores

**Why it matters**: Similar-sized businesses face similar operational challenges.

### 4. Industry Alignment (15%)

**Calculation**: Services offered overlap
```javascript
commonServices / max(servicesCount1, servicesCount2)
```

**Examples**:
- Both in HVAC: **1.0**
- Both in home services: **0.7**
- One HVAC, one electrical: **0.5**

**Why it matters**: Industry context makes advice more actionable.

### Overall Match Score

```javascript
finalScore = (focusScore × 0.40) +
             (geoScore × 0.25) +
             (scaleScore × 0.20) +
             (industryScore × 0.15)
```

**Match Types Based on Score**:
- **0.8+**: "ideal_peer" - Perfect match
- **0.7-0.79**: "focus_area_match" - Strong on challenges
- **0.6-0.69**: "scale_match" - Similar business size
- **<0.6**: Not recommended (filtered out by default)

---

## 💬 SMS Conversation Flow

### Phase 1: Introduction Prompt

**Message Template**:
```
Hey {firstName}! 👋

🤝 Find Your Peer: I found someone perfect for you to meet!

{peerName} from {peerCompany} ({peerLocation}) - you're both focused on {commonFocusAreas}.

They're in a non-competing market, so this is a great chance to share strategies!

Reply YES to get an intro, or LATER if you want to connect during a break.
```

**Example**:
```
Hey John! 👋

🤝 Find Your Peer: I found someone perfect for you to meet!

Sarah Johnson from ABC Contractors (Dallas, TX) - you're both focused on hiring and operations.

They're in a non-competing market, so this is a great chance to share strategies!

Reply YES to get an intro, or LATER if you want to connect during a break.
```

### Phase 2: Response Handling

**Scenario A: Both Say "YES" Immediately**
```
Great news, John! 🎉

Sarah Johnson (ABC Contractors) also wants to connect!

📱 555-123-4567
✉️ sarah@abccontractors.com

I've sent them your info too. Enjoy the conversation!
```

**Scenario B: One Says "LATER"**
```
No problem! I'll check back with you during the next break.

Break time is at 10:30 AM. Perfect time to connect!
```

### Phase 3: Break-Time Coordination

**5 Minutes Before Break**:
```
Hey John!

☕ Break time in 5 minutes!

Want to meet Sarah at the networking area? They're waiting to connect with you.

Reply YES to confirm or SKIP if you need this break.
```

### Phase 4: Contact Exchange (After Both Agree)

**Sent to Both Parties**:
```
Great news, {firstName}! 🎉

{peerName} ({peerCompany}) also wants to connect!

📱 {peerPhone}
✉️ {peerEmail}

I've sent them your info too. Enjoy the conversation!
```

### Phase 5: Post-Connection Follow-up

**After Meeting (2-3 hours later)**:
```
Hey John!

How was your chat with Sarah?

Reply with a quick rating (1-10) to help us make better matches in the future!
```

---

## 📍 Smart Timing System

### Optimal Prompt Times

The system suggests 5 key times to prompt peer introductions:

#### 1. Arrival Time (15 min before event start)
```javascript
{
  time: eventStart - 15min,
  context: 'arrival',
  message: 'Perfect timing to meet before the first session!'
}
```

#### 2. Coffee/Morning Break (5 min before break)
```javascript
{
  time: breakStart - 5min,
  context: 'break',
  location: 'networking area',
  message: 'Break time - perfect for a quick peer chat!'
}
```

#### 3. Lunch (5 min after lunch starts)
```javascript
{
  time: lunchStart + 5min,
  context: 'lunch',
  location: 'lunch area',
  message: 'Grab lunch together and talk shop!'
}
```

#### 4. Afternoon Break (5 min before)
```javascript
{
  time: afternoonBreak - 5min,
  context: 'break',
  location: 'networking area',
  message: 'Another great time to connect!'
}
```

#### 5. Post-Event Networking (30 min before event ends)
```javascript
{
  time: eventEnd - 30min,
  context: 'networking',
  message: 'Last chance to connect before everyone leaves!'
}
```

### Timing Strategy

**Immediate Matching** (check-in time):
- Best for: High-score matches (0.85+)
- Reason: Don't wait - these are perfect matches

**Break-time Matching**:
- Best for: Medium-score matches (0.7-0.84)
- Reason: Lower pressure, natural networking time

**Lunch Matching**:
- Best for: All matches
- Reason: Longest unstructured time, relaxed setting

**End-of-day Matching**:
- Best for: Rescuing missed opportunities
- Reason: Last chance before everyone leaves

---

## 🎯 Match Type Definitions

### Ideal Peer (0.8+ score)
**Criteria**:
- Focus area overlap > 0.8
- Geographic separation > 0.8
- High overall score

**Characteristics**:
- Same business challenges
- Different markets
- Similar company size
- Same industry

**Value Proposition**: "This person is dealing with the exact same issues you are, but in a market far enough away that you can share openly."

**Example**:
```
John (Phoenix HVAC, $2M, 15 employees, focused on hiring)
Sarah (Dallas HVAC, $2.5M, 18 employees, focused on hiring)
Score: 0.89
```

### Focus Area Match (0.7-0.79)
**Criteria**:
- Focus area overlap > 0.6
- May be in same state or closer geographically

**Characteristics**:
- Shared challenges are primary driver
- Geographic separation might be less
- Industry alignment strong

**Value Proposition**: "You're both tackling the same problems - worth connecting even if you're in nearby markets."

**Example**:
```
John (Phoenix HVAC, $2M, focused on hiring + operations)
Mike (Tucson HVAC, $5M, focused on hiring + customer retention)
Score: 0.74
```

### Scale Match (0.6-0.69)
**Criteria**:
- Business scale similarity > 0.8
- May have fewer focus area overlaps

**Characteristics**:
- Similar company size
- Facing similar growth stage challenges
- Different focus areas but similar operations

**Value Proposition**: "You're at the same stage of growth - they understand your operational challenges."

**Example**:
```
John (Phoenix HVAC, $2M, 15 employees)
Lisa (San Diego Plumbing, $2.2M, 16 employees)
Score: 0.67
```

### General Match (<0.6)
**Status**: Filtered out by default

**Why**: Below quality threshold for proactive introductions. These matches might happen organically but shouldn't be system-recommended.

---

## 💻 Usage Examples

### Example 1: Find Matches at Event Check-in

```javascript
// When contractor checks in to event
const contractorId = 123;
const eventId = 456;

// Find top 3 peer matches
const matches = await fetch(
  `/api/event-messaging/event/${eventId}/contractor/${contractorId}/peer-matches?maxMatches=3&minScore=0.7`
);

const response = await matches.json();
console.log(`Found ${response.count} matches`);

// Top match
const topMatch = response.matches[0];
console.log(`Best match: ${topMatch.first_name} ${topMatch.last_name}`);
console.log(`Score: ${topMatch.matchScore}`);
console.log(`Reason: ${topMatch.matchReason}`);
```

### Example 2: Create Match and Send Introduction

```javascript
// Create the match record
const matchResult = await fetch(`/api/event-messaging/event/${eventId}/peer-match`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contractorId: 123,
    peerId: 456,
    matchData: topMatch
  })
});

const match = await matchResult.json();
const matchId = match.match.id;

// Generate and send introduction SMS
const introMessage = peerMatchingService.generatePeerIntroductionSMS(
  contractor1,
  contractor2,
  match
);

await fetch(`/api/event-messaging/peer-match/${matchId}/introduction`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message: introMessage })
});
```

### Example 3: Handle SMS Response

```javascript
// Webhook from SMS service (contractor responds "YES")
app.post('/webhook/sms-response', async (req, res) => {
  const { phone, message } = req.body;

  // Find contractor by phone
  const contractor = await findContractorByPhone(phone);

  // Check if response is for peer match
  const pendingMatch = await findPendingPeerMatch(contractor.id);

  if (pendingMatch && message.toLowerCase().includes('yes')) {
    // Record positive response
    await fetch(`/api/event-messaging/peer-match/${pendingMatch.id}/response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractorId: contractor.id,
        response: true
      })
    });

    // Check if both parties have responded
    const match = await getMatch(pendingMatch.id);

    if (match.contractor1_response && match.contractor2_response) {
      // Both said yes - exchange contact info!
      await sendContactExchange(match);

      // Record connection made
      await fetch(`/api/event-messaging/peer-match/${match.id}/connection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingDetails: { scheduled: false }
        })
      });
    }
  }

  res.json({ success: true });
});
```

### Example 4: Schedule Break-Time Prompts

```javascript
// Get event schedule
const eventSchedule = {
  startTime: '2025-09-26T09:00:00Z',
  breaks: [
    { start: '2025-09-26T10:30:00Z', location: 'Networking Area' },
    { start: '2025-09-26T14:30:00Z', location: 'Networking Area' }
  ],
  lunch: { start: '2025-09-26T12:00:00Z', location: 'Lunch Area' },
  endTime: '2025-09-26T17:00:00Z'
};

// Get suggested prompt times
const promptTimes = peerMatchingService.getSuggestedPromptTimes(eventSchedule);

// Schedule matches for each time slot
promptTimes.forEach(slot => {
  if (slot.context === 'break') {
    // Schedule break-time coordination messages
    scheduleBreakTimePrompt(slot.time, slot.location);
  }
});
```

---

## 📊 Success Metrics

### Match Quality Indicators

**High-Quality Match** (What to aim for):
- Match score > 0.75
- Both parties respond "YES"
- Meeting actually happens
- PCR score > 7.5
- Follow-up contact after event

**Medium-Quality Match**:
- Match score 0.6-0.75
- At least one party responds positively
- PCR score 5-7.5

**Low-Quality Match** (Learn and improve):
- Match score < 0.6
- No response or both decline
- PCR score < 5

### Key Performance Indicators (KPIs)

1. **Match Acceptance Rate**: % of introductions that both parties accept
2. **Connection Rate**: % of accepted matches that actually meet
3. **Average PCR Score**: Quality rating from contractors
4. **Follow-up Rate**: % that exchange contact info for post-event follow-up
5. **Long-term Value**: Do they stay in touch 30/60/90 days later?

### Analytics Queries

```sql
-- Overall match performance for an event
SELECT
  COUNT(*) as total_matches,
  AVG(match_score) as avg_match_score,
  COUNT(CASE WHEN contractor1_response = true AND contractor2_response = true THEN 1 END) as mutual_accepts,
  COUNT(CASE WHEN connection_made = true THEN 1 END) as actual_connections,
  AVG(pcr_score) as avg_quality_rating
FROM event_peer_matches
WHERE event_id = 456;

-- Best performing match types
SELECT
  match_type,
  COUNT(*) as count,
  AVG(match_score) as avg_score,
  AVG(CASE WHEN connection_made THEN 1 ELSE 0 END) as connection_rate,
  AVG(pcr_score) as avg_rating
FROM event_peer_matches
GROUP BY match_type
ORDER BY avg_rating DESC;

-- Contractor with most successful peer connections
SELECT
  c.id,
  c.first_name,
  c.last_name,
  COUNT(*) as total_matches,
  AVG(epm.pcr_score) as avg_rating
FROM contractors c
INNER JOIN event_peer_matches epm
  ON c.id = epm.contractor1_id OR c.id = epm.contractor2_id
WHERE epm.connection_made = true
GROUP BY c.id, c.first_name, c.last_name
ORDER BY avg_rating DESC
LIMIT 10;
```

---

## 🚀 Future Enhancements

### Phase 1: Enhanced Matching (Q4 2025)
- [ ] Industry-specific matching criteria (HVAC vs Plumbing vs Electrical)
- [ ] Experience level matching (years in business)
- [ ] Technology stack alignment (same tools = better conversations)
- [ ] Previous event history (have they met before?)
- [ ] Personality type matching (DISC profiles)

### Phase 2: AI Learning (Q1 2026)
- [ ] Learn from successful matches
- [ ] Predict match quality before introduction
- [ ] Auto-adjust weights based on feedback
- [ ] Identify "super connectors" who make great introductions
- [ ] Recommend timing based on contractor behavior patterns

### Phase 3: Group Matching (Q2 2026)
- [ ] Match 3-4 contractors for roundtable discussions
- [ ] Topic-based group sessions
- [ ] Mastermind group formation
- [ ] Post-event peer advisory groups

### Phase 4: Cross-Event Matching (Q3 2026)
- [ ] Match contractors who attended different events
- [ ] Virtual peer introductions between events
- [ ] Build long-term peer networks
- [ ] Ongoing peer advisory relationships

### Phase 5: Integration & Automation (Q4 2026)
- [ ] Auto-match at check-in
- [ ] Real-time location-based prompts (beacon technology)
- [ ] Video introductions for virtual events
- [ ] LinkedIn integration for post-event connection
- [ ] Calendar integration for scheduling follow-ups

---

## 🔒 Privacy & Best Practices

### Consent & Opt-in
- Contractors must opt-in to peer matching at registration
- Can opt-out at any time via SMS ("STOP PEER")
- Contact info only shared after both parties agree
- Can decline specific matches without penalty

### Data Protection
- Match criteria stored securely
- SMS messages encrypted in transit
- Phone numbers never shown until mutual agreement
- GDPR/CCPA compliant deletion on request

### Quality Control
- Minimum match score threshold (0.6) prevents low-quality matches
- Limit introductions to 3-5 per event (avoid overwhelming)
- Space out prompts (no more than 1 per hour)
- Learn from declined matches to improve algorithm

### Best Practices for Event Organizers
1. **Set Expectations**: Tell contractors about peer matching during registration
2. **Provide Context**: Explain why you're matching them (share the algorithm basics)
3. **Respect Boundaries**: If someone declines, don't push
4. **Create Opportunities**: Have designated networking areas/times
5. **Measure Success**: Track PCR scores and improve matching criteria

---

## 📖 Related Documentation

- [Event Orchestrator Overview](./event-orchestrator-overview.md)
- [PCR Scoring System](./pcr-scoring-system.md)
- [SMS Integration Guide](../sms-integration.md)
- [Event Messaging System](./event-messaging-system.md)
- [AI Concierge Architecture](../../AI-FIRST-STRATEGY.md)

---

## 🛠️ Technical Implementation

### Key Files

**Backend**:
- `tpe-backend/src/services/peerMatchingService.js` - Core matching logic & SMS generation
- `tpe-backend/src/controllers/eventMessagingController.js` - API endpoints (lines 303-453)
- `tpe-backend/src/routes/eventMessagingRoutes.js` - API routes (lines 32-50)

**Database**:
- `event_peer_matches` table - Match records & tracking
- `contractors` table - Profile data for matching
- `event_attendees` table - Who's at the event

**Frontend** (Future):
- Admin dashboard for viewing matches
- Contractor-facing match history
- Event organizer analytics

### Environment Variables

```bash
# No additional env vars required beyond existing SMS integration
# Matching algorithm uses existing contractor data
# SMS sending uses existing n8n/GHL webhooks
```

---

**Document Version**: 1.0
**Last Updated**: September 26, 2025
**Status**: Production Ready - Backend Complete, Frontend TBD
**Maintainer**: The Power100 Experience Development Team