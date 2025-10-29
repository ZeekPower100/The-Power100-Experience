// DATABASE-CHECKED: event_agenda_items and event_speakers columns verified on 2025-10-28
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');
const OpenAI = require('openai');

// Lazy initialization of OpenAI client (only when first used)
let openaiClient = null;
function getOpenAIClient() {
  if (!openaiClient) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required for AI processing');
    }
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
  return openaiClient;
}

// Focus areas taxonomy from the system (verified against database JSONB structure)
const FOCUS_AREAS = [
  { value: 'greenfield_growth', label: 'Market Expansion', description: 'Expanding into new markets and territories' },
  { value: 'team_building', label: 'Team Development', description: 'Building and developing high-performing teams' },
  { value: 'operational_efficiency', label: 'Operations & Efficiency', description: 'Streamlining processes and improving productivity' },
  { value: 'marketing_sales', label: 'Marketing & Sales', description: 'Growing revenue through marketing and sales strategies' },
  { value: 'financial_management', label: 'Financial Management', description: 'Managing finances, budgeting, and cash flow' },
  { value: 'technology_implementation', label: 'Technology & Digital', description: 'Implementing technology solutions and digital transformation' },
  { value: 'customer_experience', label: 'Customer Experience', description: 'Enhancing customer satisfaction and retention' },
  { value: 'strategic_planning', label: 'Strategic Planning', description: 'Long-term planning and business strategy' },
  { value: 'culture_development', label: 'Culture & Leadership', description: 'Building company culture and leadership development' },
  { value: 'talent_management', label: 'Talent Management', description: 'Recruiting, retaining, and developing talent' }
];

/**
 * Extract focus areas from session content using AI
 * Database fields used: title (VARCHAR), description (TEXT)
 * @param {Object} session - Session data from event_agenda_items
 * @returns {Array} Array of focus area values
 */
async function extractFocusAreasFromSession(session) {
  try {
    // Database field mapping: event_agenda_items table
    const { title, description, synopsis } = session;

    const focusAreasStr = FOCUS_AREAS.map(fa =>
      `- "${fa.value}": ${fa.label} - ${fa.description}`
    ).join('\n');

    const prompt = `You are analyzing a session at a business growth conference for contractors.

Session Information:
- Title: ${title || 'Not provided'}
- Description: ${description || synopsis || 'Not provided'}

Available Focus Areas (these are the ONLY valid values):
${focusAreasStr}

Based on the session title and description, identify which 1-3 focus areas are MOST relevant to this session.

Return ONLY a JSON object with this exact format:
{
  "focus_areas": ["value1", "value2"],
  "confidence": "high|medium|low",
  "reasoning": "Brief explanation of why these focus areas were chosen"
}

The "focus_areas" array must ONLY contain values from the list above (e.g., "marketing_sales", "team_building").
Choose 1-3 focus areas, prioritizing the most relevant ones.

IMPORTANT: Return ONLY valid JSON. No additional text.`;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an AI that analyzes business conference sessions and maps them to specific focus areas. You MUST respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent categorization
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content;
    console.log(`[AI Focus Extractor] Session "${title}":`, responseText);

    const parsed = safeJsonParse(responseText, null);

    if (!parsed || !Array.isArray(parsed.focus_areas)) {
      console.error('[AI Focus Extractor] Invalid response format');
      return [];
    }

    // Validate that all returned focus areas are in our taxonomy
    const validFocusAreas = parsed.focus_areas.filter(fa =>
      FOCUS_AREAS.some(validFA => validFA.value === fa)
    );

    console.log(`[AI Focus Extractor] ✅ Extracted for "${title}":`, validFocusAreas);
    console.log(`[AI Focus Extractor] Confidence: ${parsed.confidence}, Reasoning: ${parsed.reasoning}`);

    return validFocusAreas;

  } catch (error) {
    console.error('[AI Focus Extractor] Error:', error.message);
    return [];
  }
}

/**
 * Extract focus areas from speaker bio using AI
 * Database fields used: name (VARCHAR), title (VARCHAR), company (VARCHAR), bio (TEXT)
 * @param {Object} speaker - Speaker data from event_speakers table
 * @returns {Array} Array of focus area values
 */
async function extractFocusAreasFromSpeaker(speaker) {
  try {
    // Database field mapping: event_speakers table
    const { name, bio, company, title } = speaker;

    const focusAreasStr = FOCUS_AREAS.map(fa =>
      `- "${fa.value}": ${fa.label} - ${fa.description}`
    ).join('\n');

    const prompt = `You are analyzing a speaker at a business growth conference for contractors.

Speaker Information:
- Name: ${name || 'Not provided'}
- Title: ${title || 'Not provided'}
- Company: ${company || 'Not provided'}
- Bio: ${bio || 'Not provided'}

Available Focus Areas (these are the ONLY valid values):
${focusAreasStr}

Based on the speaker's background and expertise, identify which 1-3 focus areas are MOST aligned with their knowledge and what they would likely speak about.

Return ONLY a JSON object with this exact format:
{
  "focus_areas": ["value1", "value2"],
  "confidence": "high|medium|low",
  "reasoning": "Brief explanation of why these focus areas were chosen"
}

The "focus_areas" array must ONLY contain values from the list above (e.g., "marketing_sales", "team_building").
Choose 1-3 focus areas, prioritizing the most relevant ones.

IMPORTANT: Return ONLY valid JSON. No additional text.`;

    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an AI that analyzes speaker profiles and maps them to specific focus areas. You MUST respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 300,
      response_format: { type: "json_object" }
    });

    const responseText = completion.choices[0].message.content;
    console.log(`[AI Focus Extractor - Speaker] "${name}":`, responseText);

    const parsed = safeJsonParse(responseText, null);

    if (!parsed || !Array.isArray(parsed.focus_areas)) {
      console.error('[AI Focus Extractor - Speaker] Invalid response format');
      return [];
    }

    // Validate that all returned focus areas are in our taxonomy
    const validFocusAreas = parsed.focus_areas.filter(fa =>
      FOCUS_AREAS.some(validFA => validFA.value === fa)
    );

    console.log(`[AI Focus Extractor - Speaker] ✅ Extracted for "${name}":`, validFocusAreas);
    console.log(`[AI Focus Extractor - Speaker] Confidence: ${parsed.confidence}, Reasoning: ${parsed.reasoning}`);

    return validFocusAreas;

  } catch (error) {
    console.error('[AI Focus Extractor - Speaker] Error:', error.message);
    return [];
  }
}

/**
 * Batch process multiple sessions with rate limiting
 * @param {Array} sessions - Array of session objects from event_agenda_items
 * @returns {Array} Array of sessions with extracted focus_areas
 */
async function batchProcessSessions(sessions) {
  console.log(`[AI Focus Extractor] Batch processing ${sessions.length} sessions...`);
  const results = [];

  for (const session of sessions) {
    try {
      const focusAreas = await extractFocusAreasFromSession(session);
      results.push({
        ...session,
        focus_areas: focusAreas,
        ai_processed: true,
        ai_processed_at: new Date().toISOString()
      });

      // Rate limiting - wait 1 second between calls to avoid OpenAI rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[AI Focus Extractor] ❌ Error processing session "${session.title}":`, error.message);
      results.push({
        ...session,
        focus_areas: [],
        ai_processed: false,
        ai_error: error.message
      });
    }
  }

  console.log(`[AI Focus Extractor] ✅ Batch processing complete: ${results.length} sessions processed`);
  return results;
}

/**
 * Batch process multiple speakers with rate limiting
 * @param {Array} speakers - Array of speaker objects from event_speakers
 * @returns {Array} Array of speakers with extracted focus_areas
 */
async function batchProcessSpeakers(speakers) {
  console.log(`[AI Focus Extractor] Batch processing ${speakers.length} speakers...`);
  const results = [];

  for (const speaker of speakers) {
    try {
      const focusAreas = await extractFocusAreasFromSpeaker(speaker);
      results.push({
        ...speaker,
        focus_areas: focusAreas,
        ai_processed: true,
        ai_processed_at: new Date().toISOString()
      });

      // Rate limiting - wait 1 second between calls to avoid OpenAI rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[AI Focus Extractor] ❌ Error processing speaker "${speaker.name}":`, error.message);
      results.push({
        ...speaker,
        focus_areas: [],
        ai_processed: false,
        ai_error: error.message
      });
    }
  }

  console.log(`[AI Focus Extractor] ✅ Batch processing complete: ${results.length} speakers processed`);
  return results;
}

module.exports = {
  extractFocusAreasFromSession,
  extractFocusAreasFromSpeaker,
  batchProcessSessions,
  batchProcessSpeakers,
  FOCUS_AREAS
};
