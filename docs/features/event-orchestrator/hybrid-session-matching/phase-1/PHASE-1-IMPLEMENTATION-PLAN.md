# Phase 1: Hybrid Session Matching System
**Phase Name:** Hybrid Session Matching (Agenda + Speaker Data)
**Timeline:** 3-4 hours
**Status:** Ready for Implementation
**Database Schema:** Verified October 28, 2025

---

## 🎯 Phase 1 Overview

**Goal:** "Match contractors to event sessions using ALL available data - session content, speaker expertise, or both"

Phase 1 implements intelligent hybrid session matching that analyzes whatever data exists for event sessions. The system will match contractors to sessions based on agenda item content (title, synopsis, focus areas) AND/OR speaker data (bio, expertise, company) - using whichever signals are available.

### Primary Objectives
1. **Create Unified Session Query** that LEFT JOINs agenda items + speakers
2. **Update AI Recommendation Logic** to analyze all available session data
3. **Modify Message Generation** to create recommendations from sessions (not just speakers)
4. **Update Speaker Handlers** to work with session-based recommendations
5. **Test All Scenarios** (speaker only, session only, both, neither)

### Success Metrics
- ✅ Recommendations generated for sessions with NO speaker_id
- ✅ Stronger recommendations when BOTH agenda + speaker data exist
- ✅ System gracefully handles partial data (no crashes)
- ✅ All existing speaker-based features still work
- ✅ Backward compatibility with existing event_messages

---

## 📅 Implementation Tasks

### Task 1: Create Unified Session Data Service (1 hour)

#### Objectives
- Build service that queries BOTH event_agenda_items and event_speakers
- Return combined data structure with all available fields
- Handle NULL speaker_id gracefully

#### Implementation

**File**: `tpe-backend/src/services/eventOrchestrator/sessionDataService.js` (NEW)

```javascript
// DATABASE-CHECKED: event_agenda_items, event_speakers columns verified October 28, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// event_agenda_items: id, event_id, title, synopsis, focus_areas (JSONB),
//                     key_takeaways (JSONB), speaker_id (nullable), start_time,
//                     end_time, location, ai_summary, ai_keywords (JSONB)
// event_speakers: id, name, bio, session_title, session_description,
//                 focus_areas (JSONB), ai_summary, ai_key_points (JSONB)
// ================================================================

const { query } = require('../../config/database');
const { safeJsonParse } = require('../../utils/jsonHelpers');

/**
 * Get all event sessions with unified agenda + speaker data
 * LEFT JOIN ensures we get sessions even without speaker_id
 *
 * @param {number} eventId - Event ID
 * @returns {Promise<Array>} Unified session objects with all available data
 */
async function getEventSessions(eventId) {
  const result = await query(`
    SELECT
      -- Agenda item data (ALWAYS available)
      ai.id as agenda_item_id,
      ai.event_id,
      ai.title as session_title,
      ai.synopsis as session_synopsis,
      ai.description as session_description,
      ai.focus_areas as agenda_focus_areas,
      ai.key_takeaways as agenda_key_takeaways,
      ai.target_audience as agenda_target_audience,
      ai.skill_level,
      ai.start_time,
      ai.end_time,
      ai.location,
      ai.track,
      ai.capacity,
      ai.item_type,
      ai.ai_summary as agenda_ai_summary,
      ai.ai_keywords as agenda_ai_keywords,

      -- Speaker data (may be NULL if no speaker_id)
      ai.speaker_id,
      es.name as speaker_name,
      es.title as speaker_title,
      es.company as speaker_company,
      es.bio as speaker_bio,
      es.headshot_url as speaker_headshot,
      es.session_title as speaker_session_title,
      es.session_description as speaker_session_description,
      es.focus_areas as speaker_focus_areas,
      es.target_audience as speaker_target_audience,
      es.pcr_score as speaker_pcr_score,
      es.ai_summary as speaker_ai_summary,
      es.ai_key_points as speaker_ai_key_points,
      es.relevance_keywords as speaker_relevance_keywords

    FROM event_agenda_items ai
    LEFT JOIN event_speakers es ON ai.speaker_id = es.id
    WHERE ai.event_id = $1
      AND ai.item_type = 'session'
      AND ai.status IN ('scheduled', 'confirmed', 'tentative')
    ORDER BY ai.start_time
  `, [eventId]);

  // Parse JSONB fields and create unified session objects
  return result.rows.map(row => {
    // Combine focus areas from both sources
    const agendaFocusAreas = safeJsonParse(row.agenda_focus_areas, []);
    const speakerFocusAreas = safeJsonParse(row.speaker_focus_areas, []);
    const combinedFocusAreas = [...new Set([...agendaFocusAreas, ...speakerFocusAreas])];

    // Combine target audience from both sources
    const agendaTargetAudience = safeJsonParse(row.agenda_target_audience, []);
    const speakerTargetAudience = safeJsonParse(row.speaker_target_audience, []);
    const combinedTargetAudience = [...new Set([...agendaTargetAudience, ...speakerTargetAudience])];

    // Combine AI insights
    const agendaKeywords = safeJsonParse(row.agenda_ai_keywords, []);
    const speakerKeywords = safeJsonParse(row.speaker_relevance_keywords, []);
    const combinedKeywords = [...new Set([...agendaKeywords, ...speakerKeywords])];

    return {
      // Core identifiers
      agenda_item_id: row.agenda_item_id,
      event_id: row.event_id,
      speaker_id: row.speaker_id, // May be NULL

      // Session content (prioritize agenda, fallback to speaker)
      title: row.session_title || row.speaker_session_title,
      synopsis: row.session_synopsis,
      description: row.session_description || row.speaker_session_description,

      // Matching signals (combined from both sources)
      focus_areas: combinedFocusAreas,
      target_audience: combinedTargetAudience,
      keywords: combinedKeywords,
      key_takeaways: safeJsonParse(row.agenda_key_takeaways, []),
      skill_level: row.skill_level,

      // Logistics
      start_time: row.start_time,
      end_time: row.end_time,
      location: row.location,
      track: row.track,
      capacity: row.capacity,

      // Speaker info (may all be NULL)
      speaker: row.speaker_id ? {
        id: row.speaker_id,
        name: row.speaker_name,
        title: row.speaker_title,
        company: row.speaker_company,
        bio: row.speaker_bio,
        headshot_url: row.speaker_headshot,
        pcr_score: row.speaker_pcr_score
      } : null,

      // AI summaries (use best available)
      ai_summary: row.speaker_ai_summary || row.agenda_ai_summary,
      ai_key_points: safeJsonParse(row.speaker_ai_key_points, []),

      // Data completeness flags (for debugging/analytics)
      has_speaker_data: !!row.speaker_id,
      has_session_content: !!(row.session_synopsis || row.session_description),
      data_richness_score: calculateDataRichness(row)
    };
  });
}

/**
 * Calculate how much data we have for this session (0-1 score)
 * Used to prioritize data-rich sessions in recommendations
 */
function calculateDataRichness(row) {
  let score = 0;
  let maxScore = 0;

  // Session content signals (weight: 0.5)
  maxScore += 0.5;
  if (row.session_synopsis) score += 0.15;
  if (row.session_description) score += 0.15;
  if (row.agenda_focus_areas && JSON.parse(row.agenda_focus_areas || '[]').length > 0) score += 0.1;
  if (row.agenda_key_takeaways && JSON.parse(row.agenda_key_takeaways || '[]').length > 0) score += 0.1;

  // Speaker data signals (weight: 0.5)
  maxScore += 0.5;
  if (row.speaker_id) {
    if (row.speaker_bio) score += 0.2;
    if (row.speaker_company) score += 0.1;
    if (row.speaker_focus_areas && JSON.parse(row.speaker_focus_areas || '[]').length > 0) score += 0.1;
    if (row.speaker_ai_summary) score += 0.1;
  }

  return score / maxScore; // Normalize to 0-1
}

/**
 * Get single session with unified data
 * @param {number} agendaItemId - Agenda item ID
 * @returns {Promise<Object|null>} Unified session object or null
 */
async function getSessionById(agendaItemId) {
  const result = await query(`
    SELECT
      ai.id as agenda_item_id,
      ai.event_id,
      ai.title as session_title,
      ai.synopsis as session_synopsis,
      ai.description as session_description,
      ai.focus_areas as agenda_focus_areas,
      ai.key_takeaways as agenda_key_takeaways,
      ai.start_time,
      ai.end_time,
      ai.location,
      ai.speaker_id,
      es.name as speaker_name,
      es.bio as speaker_bio,
      es.company as speaker_company,
      es.session_title as speaker_session_title,
      es.session_description as speaker_session_description,
      es.ai_summary as speaker_ai_summary
    FROM event_agenda_items ai
    LEFT JOIN event_speakers es ON ai.speaker_id = es.id
    WHERE ai.id = $1
  `, [agendaItemId]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    agenda_item_id: row.agenda_item_id,
    event_id: row.event_id,
    title: row.session_title || row.speaker_session_title,
    synopsis: row.session_synopsis,
    description: row.session_description || row.speaker_session_description,
    focus_areas: safeJsonParse(row.agenda_focus_areas, []),
    key_takeaways: safeJsonParse(row.agenda_key_takeaways, []),
    start_time: row.start_time,
    end_time: row.end_time,
    location: row.location,
    speaker: row.speaker_id ? {
      id: row.speaker_id,
      name: row.speaker_name,
      bio: row.speaker_bio,
      company: row.speaker_company,
      ai_summary: row.speaker_ai_summary
    } : null,
    has_speaker_data: !!row.speaker_id
  };
}

module.exports = {
  getEventSessions,
  getSessionById
};
```

#### Database Fields Used (Verified October 28, 2025)
- **event_agenda_items** (25 columns):
  - `id`, `event_id`, `title`, `synopsis`, `description` (TEXT)
  - `focus_areas` (JSONB), `key_takeaways` (JSONB), `target_audience` (JSONB)
  - `speaker_id` (INTEGER, nullable)
  - `start_time`, `end_time` (TIMESTAMP)
  - `location`, `track`, `skill_level` (VARCHAR)
  - `item_type` (VARCHAR), `status` (VARCHAR)
  - `ai_summary` (TEXT), `ai_keywords` (JSONB)

- **event_speakers** (23 columns):
  - `id`, `event_id`, `name`, `title`, `company` (VARCHAR)
  - `bio`, `session_title`, `session_description` (TEXT)
  - `focus_areas` (JSONB), `target_audience` (JSONB)
  - `ai_summary` (TEXT), `ai_key_points` (JSONB), `relevance_keywords` (JSONB)
  - `pcr_score` (NUMERIC), `headshot_url` (VARCHAR)

#### Success Criteria
- [ ] Service created with unified session query
- [ ] LEFT JOIN handles NULL speaker_id correctly
- [ ] JSONB fields parsed safely
- [ ] Data richness score calculated
- [ ] Both getEventSessions() and getSessionById() working

---

### Task 2: Update Recommendation Generation Logic (1-1.5 hours)

#### Objectives
- Modify AI recommendation prompts to analyze session content + speaker data
- Generate recommendations from agenda items (with or without speaker)
- Update personalization_data structure to include agenda_item_id

#### Implementation

**File**: `tpe-backend/src/services/eventOrchestrator/sessionRecommendationService.js` (NEW)

```javascript
// DATABASE-CHECKED: event_agenda_items, event_speakers, contractors, event_messages verified October 28, 2025
// ================================================================
// VERIFIED FIELD NAMES (contractors):
// - focus_areas (TEXT), primary_focus_area (VARCHAR)
// - business_goals (JSONB), current_challenges (JSONB)
// ================================================================

const { getEventSessions } = require('./sessionDataService');
const { query } = require('../../config/database');
const { safeJsonParse, safeJsonStringify } = require('../../utils/jsonHelpers');
const aiConciergeController = require('../../controllers/aiConciergeController');

/**
 * Generate personalized session recommendations for contractor
 * Uses HYBRID matching: session content + speaker expertise
 *
 * @param {number} contractorId - Contractor ID
 * @param {number} eventId - Event ID
 * @param {Object} contractor - Full contractor object
 * @returns {Promise<Array>} Top 3 recommended sessions
 */
async function generateSessionRecommendations(contractorId, eventId, contractor) {
  // Get all sessions (hybrid data)
  const sessions = await getEventSessions(eventId);

  if (sessions.length === 0) {
    return [];
  }

  // Get contractor matching context
  const contractorFocusAreas = contractor.focus_areas ?
    contractor.focus_areas.split(',').map(f => f.trim()) : [];
  const contractorGoals = safeJsonParse(contractor.business_goals, []);
  const contractorChallenges = safeJsonParse(contractor.current_challenges, []);

  // Build AI matching prompt with HYBRID signals
  const matchingPrompt = `
TASK: Recommend the top 3 event sessions for this contractor based on ALL available data.

CONTRACTOR PROFILE:
- Primary Focus: ${contractor.primary_focus_area || 'Not specified'}
- Focus Areas: ${contractorFocusAreas.join(', ') || 'Not specified'}
- Business Goals: ${JSON.stringify(contractorGoals)}
- Current Challenges: ${JSON.stringify(contractorChallenges)}
- Company: ${contractor.company_name || 'Not specified'}
- Revenue Range: ${contractor.revenue_range || 'Not specified'}

AVAILABLE SESSIONS (${sessions.length} total):
${sessions.map((s, idx) => `
${idx + 1}. "${s.title}"
   Time: ${s.start_time ? new Date(s.start_time).toLocaleString() : 'TBD'}
   Location: ${s.location || 'TBD'}

   SESSION CONTENT:
   ${s.synopsis ? `Synopsis: ${s.synopsis}` : ''}
   ${s.description ? `Description: ${s.description.substring(0, 200)}...` : ''}
   ${s.focus_areas.length > 0 ? `Focus Areas: ${s.focus_areas.join(', ')}` : ''}
   ${s.key_takeaways.length > 0 ? `Key Takeaways: ${s.key_takeaways.join(', ')}` : ''}

   ${s.speaker ? `SPEAKER INFO:
   Name: ${s.speaker.name}
   ${s.speaker.title ? `Title: ${s.speaker.title}` : ''}
   ${s.speaker.company ? `Company: ${s.speaker.company}` : ''}
   ${s.speaker.bio ? `Bio: ${s.speaker.bio.substring(0, 150)}...` : ''}` : 'NO SPEAKER ASSIGNED (match on session content only)'}

   AI Summary: ${s.ai_summary || 'Not available'}
   Data Richness: ${(s.data_richness_score * 100).toFixed(0)}%
`).join('\n')}

MATCHING INSTRUCTIONS:
1. **Use ALL available signals**: Session content (title, synopsis, focus areas, key takeaways) + Speaker data (bio, expertise, company)
2. **Session content can be MORE important than speaker name** - a session about "Scaling Sales Teams" is valuable regardless of who's speaking
3. **If no speaker assigned, match purely on session content** - this is valid and can still be a strong recommendation
4. **Prioritize sessions with high data richness** when match quality is similar
5. **Consider timing and logistics** - don't recommend conflicting sessions

RESPOND WITH JSON ONLY (no markdown):
{
  "recommended_sessions": [
    {
      "agenda_item_id": <number>,
      "speaker_id": <number or null>,
      "title": "<session title>",
      "match_score": <0-100>,
      "match_reasons": ["reason 1", "reason 2", "reason 3"],
      "data_source": "<session_content | speaker_data | both>",
      "start_time": "<ISO timestamp>",
      "location": "<location>"
    }
  ]
}

Return top 3 sessions ranked by match_score.
`;

  // Get AI recommendations
  const aiResponse = await aiConciergeController.generateAIResponse(
    matchingPrompt,
    contractor,
    contractorId,
    null // No event context needed for this call
  );

  // Parse AI response
  let recommendations;
  try {
    const cleanJson = aiResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanJson);
    recommendations = parsed.recommended_sessions || [];
  } catch (error) {
    console.error('[SessionRecommendation] AI response parse error:', error);
    // Fallback: Basic scoring by focus area overlap
    recommendations = sessions
      .map(s => ({
        agenda_item_id: s.agenda_item_id,
        speaker_id: s.speaker_id,
        title: s.title,
        match_score: calculateSimpleMatchScore(s, contractorFocusAreas),
        match_reasons: ['Basic focus area match'],
        data_source: s.has_speaker_data ? 'both' : 'session_content',
        start_time: s.start_time,
        location: s.location
      }))
      .sort((a, b) => b.match_score - a.match_score)
      .slice(0, 3);
  }

  return recommendations;
}

/**
 * Simple fallback matching by focus area overlap
 */
function calculateSimpleMatchScore(session, contractorFocusAreas) {
  const sessionFocusAreas = session.focus_areas.map(f => f.toLowerCase());
  const contractorFocus = contractorFocusAreas.map(f => f.toLowerCase());

  const overlap = sessionFocusAreas.filter(sf =>
    contractorFocus.some(cf => sf.includes(cf) || cf.includes(sf))
  ).length;

  // Base score on overlap + data richness
  const overlapScore = (overlap / Math.max(sessionFocusAreas.length, 1)) * 70;
  const richnessBonus = session.data_richness_score * 30;

  return Math.round(overlapScore + richnessBonus);
}

module.exports = {
  generateSessionRecommendations
};
```

#### Database Fields Used
- **contractors**: `focus_areas` (TEXT), `primary_focus_area` (VARCHAR), `business_goals` (JSONB), `current_challenges` (JSONB)

#### Success Criteria
- [ ] Recommendations generated with session content + speaker data
- [ ] Works when speaker_id is NULL
- [ ] match_reasons explain why session was recommended
- [ ] data_source indicates what data was used (session_content, speaker_data, both)
- [ ] AI parsing has fallback logic

---

### Task 3: Update Message Generation and Storage (0.5 hours)

#### Objectives
- Update event_messages to store agenda_item_id in personalization_data
- Modify message generation to include session-based context
- Ensure backward compatibility with existing speaker-based messages

#### Implementation

**File**: `tpe-backend/src/services/eventOrchestrator/sessionMessageService.js` (UPDATE existing or CREATE)

```javascript
// DATABASE-CHECKED: event_messages columns verified October 28, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - personalization_data (JSONB) - stores recommendation context
// - message_type (VARCHAR) - 'session_recommendation'
// - message_content (TEXT) - actual message text
// ================================================================

const { query } = require('../../config/database');
const { safeJsonStringify } = require('../../utils/jsonHelpers');

/**
 * Save session recommendation to event_messages
 * NOW includes agenda_item_id for session-based tracking
 *
 * @param {Object} params - Message parameters
 * @returns {Promise<number>} Message ID
 */
async function saveSessionRecommendation(params) {
  const {
    contractor_id,
    event_id,
    recommended_sessions, // Array of session objects
    ghl_contact_id,
    ghl_location_id,
    scheduled_time
  } = params;

  // Build personalization_data with BOTH agenda_item_id and speaker_id
  const personalizationData = {
    recommended_sessions: recommended_sessions.map(s => ({
      agenda_item_id: s.agenda_item_id, // NEW: Track by agenda item
      speaker_id: s.speaker_id || null, // May be null
      speaker_name: s.speaker?.name || null,
      session_title: s.title,
      match_score: s.match_score,
      match_reasons: s.match_reasons,
      data_source: s.data_source, // NEW: What data was used
      session_time: s.start_time,
      session_location: s.location
    }))
  };

  // Generate message content
  const messageContent = buildRecommendationMessage(recommended_sessions);

  const result = await query(`
    INSERT INTO event_messages (
      contractor_id,
      event_id,
      message_type,
      message_content,
      personalization_data,
      ghl_contact_id,
      ghl_location_id,
      scheduled_time,
      status,
      direction,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', 'outbound', NOW())
    RETURNING id
  `, [
    contractor_id,
    event_id,
    'session_recommendation', // Changed from 'speaker_recommendation'
    messageContent,
    safeJsonStringify(personalizationData),
    ghl_contact_id,
    ghl_location_id,
    scheduled_time || new Date()
  ]);

  return result.rows[0].id;
}

/**
 * Build user-friendly message text from recommendations
 */
function buildRecommendationMessage(sessions) {
  const lines = [
    "🎯 Here are your top 3 recommended sessions at the event:"
  ];

  sessions.forEach((s, idx) => {
    const speakerInfo = s.speaker ? ` by ${s.speaker.name}` : '';
    const time = s.start_time ? ` at ${new Date(s.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}` : '';

    lines.push(`\n${idx + 1}. "${s.title}"${speakerInfo}${time}`);
    if (s.match_reasons && s.match_reasons.length > 0) {
      lines.push(`   Why: ${s.match_reasons[0]}`);
    }
  });

  lines.push("\n\nReply with a number (1-3) to learn more about that session!");

  return lines.join('\n');
}

module.exports = {
  saveSessionRecommendation
};
```

#### Database Fields Used
- **event_messages** (28 columns):
  - `contractor_id`, `event_id` (INTEGER)
  - `message_type` (VARCHAR) - 'session_recommendation'
  - `message_content` (TEXT)
  - `personalization_data` (JSONB) - stores agenda_item_id + speaker_id
  - `scheduled_time` (TIMESTAMP)
  - `status` (VARCHAR), `direction` (VARCHAR)

#### Success Criteria
- [ ] personalization_data includes agenda_item_id
- [ ] speaker_id stored as null when not available
- [ ] data_source indicates matching strategy
- [ ] Message text works with or without speaker names
- [ ] Backward compatible with existing speaker-based messages

---

### Task 4: Update Speaker Handlers for Session-Based Responses (0.5-1 hour)

#### Objectives
- Modify speakerHandlers.js to query by agenda_item_id instead of speaker_id
- Handle requests when contractor asks about session numbers
- Provide details using session content + optional speaker info

#### Implementation

**File**: `tpe-backend/src/services/eventOrchestrator/speakerHandlers.js` (UPDATE)

Find the `handleSpeakerDetails` function (currently lines 12-277) and update:

```javascript
// At top of file, add:
const { getSessionById } = require('./sessionDataService');

// In handleSpeakerDetails function, replace speaker query (lines 150-163):

// OLD CODE (speaker-only):
// const speakerResult = await query(`
//   SELECT id, name, session_title, session_description, bio
//   FROM event_speakers WHERE id = $1
// `, [selectedSpeaker.speaker_id]);

// NEW CODE (session-based):
const sessionData = await getSessionById(selectedSession.agenda_item_id);

if (!sessionData) {
  return {
    success: false,
    error: `Session ${speakerNum} not found`
  };
}

// Build comprehensive context for AI (works with or without speaker)
const sessionContext = {
  agenda_item_id: sessionData.agenda_item_id,
  title: sessionData.title,
  synopsis: sessionData.synopsis,
  description: sessionData.description,
  focus_areas: sessionData.focus_areas,
  key_takeaways: sessionData.key_takeaways,
  start_time: sessionData.start_time,
  end_time: sessionData.end_time,
  location: sessionData.location,
  speaker: sessionData.speaker, // May be null
  has_speaker_data: sessionData.has_speaker_data
};

// Update AI prompt (lines 206-212):
const prompt = `I'm at the Power100 event and just asked about Session ${speakerNum}:

SESSION DETAILS:
Title: "${sessionContext.title}"
Time: ${sessionContext.start_time ? new Date(sessionContext.start_time).toLocaleString() : 'TBD'}
Location: ${sessionContext.location || 'TBD'}

CONTENT:
${sessionContext.synopsis || sessionContext.description || 'No detailed description available'}
${sessionContext.key_takeaways.length > 0 ? `\nKey Takeaways:\n${sessionContext.key_takeaways.map(kt => `- ${kt}`).join('\n')}` : ''}
${sessionContext.focus_areas.length > 0 ? `\nFocus Areas: ${sessionContext.focus_areas.join(', ')}` : ''}

${sessionContext.speaker ? `SPEAKER:
Name: ${sessionContext.speaker.name}
${sessionContext.speaker.title ? `Title: ${sessionContext.speaker.title}` : ''}
${sessionContext.speaker.company ? `Company: ${sessionContext.speaker.company}` : ''}
${sessionContext.speaker.bio ? `Bio: ${sessionContext.speaker.bio}` : ''}` : 'NOTE: No speaker assigned yet - match based on session content.'}

Please provide helpful details about this session in a conversational SMS-friendly way (320 chars max).
- Focus on why this session matches my business goals
- Include timing and location
- ${sessionContext.speaker ? 'Mention the speaker briefly' : 'Focus on session content since no speaker is assigned'}
- End with clear call-to-action
`;
```

#### Success Criteria
- [ ] Handler queries by agenda_item_id instead of speaker_id only
- [ ] Works when speaker_id is null
- [ ] AI prompt includes session content prominently
- [ ] Speaker info included when available
- [ ] Responses make sense for sessions without speakers

---

### Task 5: Testing and Validation (0.5 hours)

#### Test Scenarios

**Scenario 1: Session with Speaker Data** (Both sources)
```sql
-- Test data: Agenda item with speaker_id
INSERT INTO event_agenda_items (event_id, title, synopsis, speaker_id, start_time, item_type, focus_areas)
VALUES (1, 'Scaling Sales Teams', 'Learn how to scale...', 5, '2025-11-15 10:00:00', 'session', '["sales", "team_building"]');
```
Expected: Recommendation uses BOTH session content and speaker expertise

**Scenario 2: Session WITHOUT Speaker** (Session content only)
```sql
-- Test data: Agenda item with NO speaker_id
INSERT INTO event_agenda_items (event_id, title, synopsis, speaker_id, start_time, item_type, focus_areas)
VALUES (1, 'Marketing Automation Workshop', 'Hands-on workshop...', NULL, '2025-11-15 14:00:00', 'session', '["marketing", "automation"]');
```
Expected: Recommendation generated from session content alone, no crash

**Scenario 3: Speaker with Minimal Session Details**
```sql
-- Test data: Has speaker_id but minimal synopsis
INSERT INTO event_agenda_items (event_id, title, synopsis, speaker_id, start_time, item_type)
VALUES (1, 'Keynote Address', NULL, 3, '2025-11-15 09:00:00', 'session');
```
Expected: Recommendation uses speaker bio and expertise

**Scenario 4: Existing Speaker-Based Messages** (Backward compatibility)
```sql
-- Query existing messages to ensure they still work
SELECT * FROM event_messages
WHERE message_type = 'speaker_recommendation'
AND personalization_data->>'speaker_id' IS NOT NULL
LIMIT 5;
```
Expected: Old messages with speaker_id still load and display correctly

#### Manual Testing Commands

```bash
# Test unified session query
curl http://localhost:5000/api/event-orchestrator/sessions/1

# Test recommendation generation (existing contractor)
curl -X POST http://localhost:5000/api/event-orchestrator/recommendations \
  -H "Content-Type: application/json" \
  -d '{"contractor_id": 1, "event_id": 1}'

# Test speaker handler (should now work for sessions)
# (Send SMS: "2" after receiving recommendations)
```

#### Success Criteria
- [ ] All 4 test scenarios pass
- [ ] No NULL pointer errors when speaker_id is missing
- [ ] Recommendations generated for sessions without speakers
- [ ] Backward compatibility with existing speaker-based messages
- [ ] AI responses make sense for all data availability scenarios

---

## 🏗️ Architecture Changes

### Before (Speaker-Only Matching):
```
event_speakers table
    ↓ (query by speaker_id)
Speaker Recommendation Service
    ↓
AI generates recommendations from speaker bio/expertise
    ↓
event_messages (personalization_data has speaker_id only)
```

### After (Hybrid Session Matching):
```
event_agenda_items ←LEFT JOIN→ event_speakers
    ↓ (unified session query)
Session Data Service (combines all available data)
    ↓
Session Recommendation Service
    ↓ (analyzes session content + speaker data)
AI generates recommendations from ALL available signals
    ↓
event_messages (personalization_data has agenda_item_id + speaker_id)
```

### Data Flow

```
1. Contractor registers for event
   ↓
2. System queries unified sessions (agenda items + speakers)
   ↓
3. Session Recommendation Service analyzes:
   - Session title, synopsis, description
   - Focus areas, key takeaways, target audience
   - Speaker bio, expertise, company (if available)
   - AI summaries and keywords
   ↓
4. Ranks sessions by match score (uses ALL signals)
   ↓
5. Stores recommendations in event_messages:
   - agenda_item_id (always present)
   - speaker_id (may be null)
   - data_source ('session_content', 'speaker_data', or 'both')
   ↓
6. Contractor receives personalized session recommendations
   ↓
7. Contractor asks about specific session (e.g., "2")
   ↓
8. System queries by agenda_item_id (not speaker_id)
   ↓
9. Returns session details with optional speaker info
```

---

## 📊 Database Changes

### New Fields in personalization_data (JSONB)

**Before**:
```json
{
  "recommended_speakers": [
    {
      "speaker_id": 5,
      "speaker_name": "John Smith",
      "session_title": "Scaling Sales",
      "match_score": 85
    }
  ]
}
```

**After (Hybrid)**:
```json
{
  "recommended_sessions": [
    {
      "agenda_item_id": 123,
      "speaker_id": 5,
      "speaker_name": "John Smith",
      "session_title": "Scaling Sales",
      "match_score": 85,
      "match_reasons": ["Aligns with sales focus area", "Company at similar stage"],
      "data_source": "both",
      "session_time": "2025-11-15T10:00:00Z",
      "session_location": "Main Hall"
    }
  ]
}
```

### Schema Impact
- ✅ NO new tables needed
- ✅ NO new columns needed
- ✅ Only JSONB structure change (backward compatible)
- ✅ Existing speaker-based messages still work

---

## 🔑 Key Technical Achievements

### 1. Graceful Degradation ✅
- Works with full data (session + speaker)
- Works with partial data (session only OR speaker only)
- Works with minimal data (basic title/time)
- Never crashes due to missing speaker_id

### 2. Stronger Matching ✅
- Session content often MORE relevant than speaker name
- Combines multiple signals for better recommendations
- AI analyzes actual content, not just metadata
- Data richness score prioritizes well-described sessions

### 3. Backward Compatibility ✅
- Existing speaker-based messages still work
- Old personalization_data structure still readable
- No breaking changes to existing endpoints
- Gradual migration path (no big bang deployment)

### 4. Database Alignment ✅
- 100% verified field names (October 28, 2025)
- JSONB fields handled correctly (no stringify errors)
- LEFT JOIN handles NULL speaker_id gracefully
- All queries use exact database column names

---

## 📝 Success Criteria Summary

Phase 1 is COMPLETE when:
- ✅ Sessions recommended even without speaker_id
- ✅ Recommendations use session content as primary signal
- ✅ Speaker data enhances recommendations when available
- ✅ All 4 test scenarios pass (see Task 5)
- ✅ No NULL errors in production
- ✅ Backward compatibility verified
- ✅ Data richness score working
- ✅ AI responses make sense for all data scenarios

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All database field names verified against actual schema
- [ ] Test all 4 scenarios in development
- [ ] Verify LEFT JOIN performance on production data
- [ ] Check existing event_messages for compatibility

### Deployment
- [ ] Deploy new sessionDataService.js
- [ ] Deploy updated sessionRecommendationService.js
- [ ] Update speakerHandlers.js with session-based logic
- [ ] Test with real event data (Growth Mastery Summit 2025)

### Post-Deployment
- [ ] Monitor for NULL errors
- [ ] Verify recommendations generating for sessions without speakers
- [ ] Check AI response quality for session-only matches
- [ ] Validate backward compatibility with old messages

---

## 📚 Files Modified/Created

### New Files (3)
```
tpe-backend/src/services/eventOrchestrator/sessionDataService.js
tpe-backend/src/services/eventOrchestrator/sessionRecommendationService.js
tpe-backend/src/services/eventOrchestrator/sessionMessageService.js
```

### Modified Files (1)
```
tpe-backend/src/services/eventOrchestrator/speakerHandlers.js
```

### Documentation Files (2)
```
docs/features/event-orchestrator/hybrid-session-matching/phase-1/PHASE-1-IMPLEMENTATION-PLAN.md
docs/features/event-orchestrator/hybrid-session-matching/phase-1/PHASE-1-PRE-FLIGHT-CHECKLIST.md
```

---

**Phase 1 Timeline:** 3-4 hours
**Status:** Ready for Implementation
**Database Schema:** Verified October 28, 2025
**Next Review:** After Task 1 completion

---

**Last Updated:** October 28, 2025
**Created By:** TPX Development Team
**Status:** ✅ Ready for Implementation
