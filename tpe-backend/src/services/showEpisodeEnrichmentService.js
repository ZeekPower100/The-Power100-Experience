// DATABASE-CHECKED: video_content, podcast_episodes columns verified on 2026-02-18
// ================================================================
// Show Episode Enrichment Service
// ================================================================
// Purpose: AI enrichment for video show episodes. Takes a transcript
//          + metadata and generates: summary, pillar classification,
//          key takeaways, tags, and timestamp chapters.
//
// This is ADDITIVE — does NOT replace:
//   - podcastProcessingService (audio podcast RSS → Whisper → analysis)
//   - videoAnalysisService (partner demo scoring via Vision API)
//
// Uses: getYouTubeTranscript() from VideoAnalysisService for transcript
// Writes: AI fields on video_content table (ai_summary, ai_insights,
//         ai_key_topics, ai_processing_status)
// ================================================================

const OpenAI = require('openai');
const { query } = require('../config/database');
const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');
const VideoAnalysisService = require('./videoAnalysisService');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const videoService = new VideoAnalysisService();

// Power100 content pillars
const PILLARS = ['Growth', 'Culture', 'Community', 'Innovation'];

/**
 * Enrich a show episode with AI-generated metadata
 * @param {object} params
 * @param {number} params.videoContentId - video_content table ID
 * @param {string} params.youtubeUrl - YouTube video URL
 * @param {object} params.metadata - Pre-fetched metadata (title, description, etc.)
 * @returns {Promise<object>} Enrichment results
 */
async function enrichShowEpisode({ videoContentId, youtubeUrl, metadata = {} }) {
  console.log(`[Episode Enrichment] Starting enrichment for video_content.id=${videoContentId}`);

  try {
    // Mark as processing
    await query(
      "UPDATE video_content SET ai_processing_status = 'processing' WHERE id = $1",
      [videoContentId]
    );

    // Step 1: Get transcript
    console.log('[Episode Enrichment] Fetching transcript...');
    const transcript = await videoService.getYouTubeTranscript(youtubeUrl);

    if (!transcript.hasTranscript) {
      console.log('[Episode Enrichment] No transcript available — enriching from metadata only');
    }

    // Step 2: Run GPT enrichment
    console.log('[Episode Enrichment] Running GPT-4o enrichment...');
    const enrichment = await generateEnrichment(transcript, metadata);

    // Step 3: Write AI fields to video_content
    console.log('[Episode Enrichment] Writing AI fields to database...');
    await query(`
      UPDATE video_content SET
        ai_summary = $2,
        ai_insights = $3,
        ai_key_topics = $4,
        ai_processing_status = 'enriched',
        last_ai_analysis = NOW()
      WHERE id = $1
    `, [
      videoContentId,
      enrichment.summary,
      safeJsonStringify(enrichment.insights),
      safeJsonStringify(enrichment.topics)
    ]);

    // Step 4: Also update podcast_episodes AI fields if a matching row exists
    if (metadata.showId && metadata.episodeNumber) {
      await query(`
        UPDATE podcast_episodes SET
          ai_summary = $3,
          ai_insights = $4,
          ai_key_topics = $5,
          ai_processing_status = 'enriched',
          last_ai_analysis = NOW()
        WHERE show_id = $1 AND episode_number = $2
      `, [
        metadata.showId,
        metadata.episodeNumber,
        enrichment.summary,
        safeJsonStringify(enrichment.insights),
        safeJsonStringify(enrichment.topics)
      ]);
    }

    console.log(`[Episode Enrichment] Complete for video_content.id=${videoContentId}`);

    return {
      success: true,
      videoContentId,
      enrichment
    };

  } catch (error) {
    console.error(`[Episode Enrichment] Failed for video_content.id=${videoContentId}:`, error.message);

    // Mark as failed
    await query(
      "UPDATE video_content SET ai_processing_status = 'enrichment_failed' WHERE id = $1",
      [videoContentId]
    ).catch(() => {});

    return {
      success: false,
      videoContentId,
      error: error.message
    };
  }
}

/**
 * Generate AI enrichment from transcript + metadata using GPT-4o
 * @param {object} transcript - { fullText, segments, hasTranscript }
 * @param {object} metadata - { title, description, showName, hosts, durationFormatted }
 * @returns {Promise<object>} Enrichment payload
 */
async function generateEnrichment(transcript, metadata) {
  const transcriptText = transcript.hasTranscript
    ? transcript.fullText.substring(0, 12000)
    : '';

  const transcriptSegments = transcript.hasTranscript
    ? transcript.segments.slice(0, 200)
    : [];

  const prompt = `You are an AI content analyst for The Power 100 Experience (TPX), a platform that connects home improvement contractors with business growth resources, mentorship, and industry partners.

Analyze this show episode and generate structured enrichment data.

EPISODE INFO:
- Title: ${metadata.title || 'Unknown'}
- Show: ${metadata.showName || 'Unknown'}
- Hosts: ${metadata.hosts || 'Unknown'}
- Duration: ${metadata.durationFormatted || 'Unknown'}
- Description: ${metadata.description || 'None provided'}

${transcriptText ? `TRANSCRIPT (first 12000 chars):
${transcriptText}` : 'NO TRANSCRIPT AVAILABLE — analyze based on title and description only.'}

${transcriptSegments.length > 0 ? `TRANSCRIPT SEGMENTS (with timestamps in seconds):
${transcriptSegments.map(s => `[${Math.floor(s.start)}s] ${s.text}`).join('\n').substring(0, 3000)}` : ''}

Generate a JSON response with these EXACT fields:

{
  "summary": "A 2-3 sentence executive summary of the episode. What's it about and why should a contractor watch it?",

  "excerpt": "A 1-sentence teaser/hook for display on the portal card (max 150 chars)",

  "pillar": "One of: Growth, Culture, Community, Innovation — the PRIMARY Power100 pillar this episode aligns with",

  "pillar_reasoning": "Brief explanation of why this pillar was chosen",

  "key_takeaways": [
    "Actionable takeaway 1 (specific enough to implement)",
    "Actionable takeaway 2",
    "Actionable takeaway 3",
    "Actionable takeaway 4 (if applicable)",
    "Actionable takeaway 5 (if applicable)"
  ],

  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],

  "chapters": [
    {
      "timestamp_seconds": 0,
      "timestamp_display": "0:00",
      "title": "Chapter title",
      "description": "What's discussed in this segment"
    }
  ],

  "speakers": [
    {
      "name": "Speaker name",
      "role": "Host / Guest / Expert",
      "topics_discussed": ["topic1", "topic2"]
    }
  ],

  "target_audience": {
    "revenue_tiers": ["$1M-$3M", "$3M-$5M"],
    "business_stages": ["growth", "scaling"],
    "relevance_note": "Why this episode matters to these contractors"
  },

  "content_value_score": 85
}

RULES:
- chapters: Derive from transcript segment timestamps if available. Create 4-8 logical chapters. If no transcript, create 2-3 estimated chapters from the title/description.
- pillar: Must be exactly one of: Growth, Culture, Community, Innovation
- tags: 5-8 lowercase tags relevant to contractor business topics
- key_takeaways: 3-5 specific, actionable items a contractor could implement
- speakers: Extract from transcript patterns or metadata. Include hosts.
- content_value_score: 0-100 rating of how valuable this is for a contractor audience

Return ONLY the JSON object, no markdown formatting.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 2500,
    temperature: 0.3
  });

  const result = safeJsonParse(completion.choices[0].message.content, {});

  // Validate pillar
  if (!PILLARS.includes(result.pillar)) {
    result.pillar = 'Growth'; // Default fallback
  }

  // Structure into our DB fields
  return {
    summary: result.summary || 'Episode summary pending.',
    excerpt: result.excerpt || '',
    insights: {
      pillar: result.pillar,
      pillar_reasoning: result.pillar_reasoning || '',
      key_takeaways: result.key_takeaways || [],
      chapters: result.chapters || [],
      speakers: result.speakers || [],
      target_audience: result.target_audience || {},
      content_value_score: result.content_value_score || 0,
      tags: result.tags || []
    },
    topics: result.tags || []
  };
}

/**
 * Re-enrich an existing episode (e.g., after transcript becomes available)
 * @param {number} videoContentId - video_content table ID
 * @returns {Promise<object>}
 */
async function reEnrichEpisode(videoContentId) {
  const result = await query(`
    SELECT vc.id, vc.title, vc.description, vc.file_url, vc.show_id, vc.episode_number,
           s.name as show_name, s.hosts
    FROM video_content vc
    LEFT JOIN shows s ON vc.show_id = s.id
    WHERE vc.id = $1
  `, [videoContentId]);

  if (result.rows.length === 0) {
    throw new Error(`video_content.id=${videoContentId} not found`);
  }

  const row = result.rows[0];
  return enrichShowEpisode({
    videoContentId,
    youtubeUrl: row.file_url,
    metadata: {
      title: row.title,
      description: row.description,
      showId: row.show_id,
      showName: row.show_name,
      hosts: row.hosts,
      episodeNumber: row.episode_number
    }
  });
}

module.exports = {
  enrichShowEpisode,
  generateEnrichment,
  reEnrichEpisode
};
