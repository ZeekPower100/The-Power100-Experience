// DATABASE-CHECKED: event_agenda_items, event_speakers, contractors, event_messages verified October 28, 2025
// ================================================================
// VERIFIED FIELD NAMES (contractors):
// - focus_areas (TEXT) ⚠️ COMMA-SEPARATED STRING, NOT JSONB!
// - primary_focus_area (VARCHAR)
// - business_goals (JSONB)
// - current_challenges (JSONB)
// ================================================================
// CRITICAL DATA TYPE DIFFERENCES:
// - contractors.focus_areas: TEXT (split by comma!)
//   Example: "sales, marketing, operations"
//   Parse: contractor.focus_areas.split(',').map(f => f.trim())
// - agenda/speaker.focus_areas: JSONB arrays
//   Example: ["sales", "marketing", "operations"]
//   Parse: safeJsonParse(row.focus_areas, [])
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
  console.log('[SessionRecommendation] Generating recommendations for contractor:', contractorId, 'at event:', eventId);

  // Get all sessions (hybrid data)
  const sessions = await getEventSessions(eventId);

  if (sessions.length === 0) {
    console.log('[SessionRecommendation] No sessions found for event:', eventId);
    return [];
  }

  console.log(`[SessionRecommendation] Found ${sessions.length} sessions for matching`);

  // Get contractor matching context
  // ⚠️ CRITICAL: contractors.focus_areas is TEXT (comma-separated), NOT JSONB!
  const contractorFocusAreas = contractor.focus_areas ?
    contractor.focus_areas.split(',').map(f => f.trim()) : [];
  const contractorGoals = safeJsonParse(contractor.business_goals, []);
  const contractorChallenges = safeJsonParse(contractor.current_challenges, []);

  console.log('[SessionRecommendation] Contractor profile:', {
    focus_areas: contractorFocusAreas,
    primary_focus: contractor.primary_focus_area,
    goals_count: contractorGoals.length,
    challenges_count: contractorChallenges.length
  });

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
   ${s.description ? `Description: ${s.description.substring(0, 200)}${s.description.length > 200 ? '...' : ''}` : ''}
   ${s.focus_areas.length > 0 ? `Focus Areas: ${s.focus_areas.join(', ')}` : ''}
   ${s.key_takeaways.length > 0 ? `Key Takeaways: ${s.key_takeaways.join(', ')}` : ''}

   ${s.speaker ? `SPEAKER INFO:
   Name: ${s.speaker.name}
   ${s.speaker.title ? `Title: ${s.speaker.title}` : ''}
   ${s.speaker.company ? `Company: ${s.speaker.company}` : ''}
   ${s.speaker.bio ? `Bio: ${s.speaker.bio.substring(0, 150)}${s.speaker.bio.length > 150 ? '...' : ''}` : ''}` : 'NO SPEAKER ASSIGNED (match on session content only)'}

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
  console.log('[SessionRecommendation] Sending request to AI Concierge for matching');
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
    console.log(`[SessionRecommendation] AI successfully recommended ${recommendations.length} sessions`);
  } catch (error) {
    console.error('[SessionRecommendation] AI response parse error:', error);
    console.log('[SessionRecommendation] Falling back to simple matching algorithm');

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

    console.log('[SessionRecommendation] Fallback generated', recommendations.length, 'recommendations');
  }

  return recommendations;
}

/**
 * Simple fallback matching by focus area overlap
 * Used when AI parsing fails
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
