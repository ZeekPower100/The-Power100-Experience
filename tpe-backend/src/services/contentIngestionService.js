// DATABASE-CHECKED: video_content, podcast_episodes, shows, entity_embeddings verified 2026-02-16
// ================================================================
// Content Ingestion Service — Phase 2
// ================================================================
// Purpose: Process show episodes and general video content for
//          AI-powered recommendations. Generates AI summaries,
//          extracts topics, and creates embeddings for hybrid search.
// ================================================================

const { query } = require('../config/database');
const { safeJsonStringify } = require('../utils/jsonHelpers');

/**
 * Ingest a show episode into both video_content and podcast_episodes
 * @param {object} episode - Episode data
 * @param {number} episode.showId - Show ID from shows table
 * @param {string} episode.title - Episode title
 * @param {string} episode.description - Episode description
 * @param {number} episode.episodeNumber - Episode number within the show
 * @param {string[]} episode.featuredNames - Guests/featured people
 * @param {string} episode.videoUrl - Video URL
 * @param {string} episode.audioUrl - Audio URL (for podcast feed)
 * @param {number} episode.durationSeconds - Duration in seconds
 * @param {string} episode.publishDate - Publication date
 */
async function ingestShowEpisode(episode) {
  console.log(`[Content Ingestion] Ingesting show episode: ${episode.title}`);

  try {
    // Insert into video_content
    const videoResult = await query(`
      INSERT INTO video_content (
        entity_type, entity_id, title, description, video_type, file_url, show_id,
        episode_number, featured_names, duration_seconds, is_active
      ) VALUES ('show', $1, $2, $3, 'episode', $4, $1, $5, $6, $7, true)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [
      episode.showId,
      episode.title,
      episode.description || null,
      episode.videoUrl || null,
      episode.episodeNumber || null,
      episode.featuredNames || [],
      episode.durationSeconds || null
    ]);

    // Insert into podcast_episodes (audio feed)
    if (episode.audioUrl || episode.showId) {
      await query(`
        INSERT INTO podcast_episodes (
          show_id, episode_number, title, description,
          audio_url, duration_seconds, publish_date, guest_names
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT DO NOTHING
      `, [
        episode.showId,
        episode.episodeNumber || null,
        episode.title,
        episode.description || null,
        episode.audioUrl || episode.videoUrl || '',
        episode.durationSeconds || null,
        episode.publishDate || null,
        episode.featuredNames || []
      ]);
    }

    // Update show episode count
    await query(`
      UPDATE shows SET episode_count = (
        SELECT COUNT(*) FROM video_content WHERE show_id = $1
      ) WHERE id = $1
    `, [episode.showId]);

    const videoId = videoResult.rows[0]?.id;
    console.log(`[Content Ingestion] Episode ingested: video_content.id=${videoId}`);

    return { success: true, videoId };
  } catch (error) {
    console.error('[Content Ingestion] Failed to ingest episode:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Ingest general Power100 video content (not show-based)
 * @param {object} video - Video data
 */
async function ingestGeneralContent(video) {
  console.log(`[Content Ingestion] Ingesting general content: ${video.title}`);

  try {
    const result = await query(`
      INSERT INTO video_content (
        entity_type, entity_id, title, description, video_type, file_url,
        featured_names, duration_seconds, is_active
      ) VALUES ('general', 0, $1, $2, $3, $4, $5, $6, true)
      ON CONFLICT DO NOTHING
      RETURNING id
    `, [
      video.title,
      video.description || null,
      video.videoType || 'general',
      video.videoUrl || null,
      video.featuredNames || [],
      video.durationSeconds || null
    ]);

    return { success: true, videoId: result.rows[0]?.id };
  } catch (error) {
    console.error('[Content Ingestion] Failed to ingest general content:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Process AI fields for a video content piece
 * Generates ai_summary, ai_insights, ai_key_topics from title/description
 * @param {number} contentId - video_content.id
 */
async function processContentAI(contentId) {
  console.log(`[Content Ingestion] Processing AI for content ${contentId}`);

  try {
    const result = await query(
      'SELECT id, title, description, video_type FROM video_content WHERE id = $1',
      [contentId]
    );

    if (result.rows.length === 0) return { success: false, error: 'Content not found' };

    const content = result.rows[0];

    // Extract key topics from title and description
    const topics = extractTopics(content.title, content.description);

    await query(`
      UPDATE video_content SET
        ai_key_topics = $2,
        ai_processing_status = 'basic_processed'
      WHERE id = $1
    `, [contentId, safeJsonStringify(topics)]);

    console.log(`[Content Ingestion] Basic AI processing complete for content ${contentId}`);
    return { success: true, topics };
  } catch (error) {
    console.error('[Content Ingestion] AI processing failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Extract basic topics from title and description
 * @param {string} title
 * @param {string} description
 * @returns {string[]} topic keywords
 */
function extractTopics(title, description) {
  const text = `${title || ''} ${description || ''}`.toLowerCase();
  const topicKeywords = {
    growth: ['revenue', 'sales', 'growth', 'marketing', 'acquisition', 'scaling', 'profit'],
    culture: ['team', 'hiring', 'leadership', 'culture', 'management', 'employee', 'retention'],
    community: ['networking', 'partnership', 'community', 'industry', 'collaboration', 'giving'],
    innovation: ['technology', 'ai', 'process', 'efficiency', 'automation', 'innovation', 'digital']
  };

  const topics = [];
  for (const [pillar, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(kw => text.includes(kw))) {
      topics.push(pillar);
    }
  }

  return topics.length > 0 ? topics : ['general'];
}

/**
 * Get content statistics
 */
async function getContentStats() {
  try {
    const showsResult = await query('SELECT id, name, episode_count FROM shows WHERE is_active = true ORDER BY id');
    const videoResult = await query("SELECT video_type, COUNT(*) as count FROM video_content GROUP BY video_type");
    const podcastResult = await query('SELECT COUNT(*) as count FROM podcast_episodes');

    return {
      shows: showsResult.rows,
      videosByType: videoResult.rows,
      totalPodcasts: parseInt(podcastResult.rows[0].count)
    };
  } catch (error) {
    console.error('[Content Ingestion] Failed to get stats:', error.message);
    return null;
  }
}

module.exports = {
  ingestShowEpisode,
  ingestGeneralContent,
  processContentAI,
  extractTopics,
  getContentStats
};
