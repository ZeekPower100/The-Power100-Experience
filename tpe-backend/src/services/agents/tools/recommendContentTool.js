// DATABASE-CHECKED: entity_embeddings, books, podcasts, video_content, podcast_episodes, shows columns verified on 2026-02-18
// ================================================================
// Recommend Content Tool (LangGraph Agent Tool)
// ================================================================
// Purpose: Find and recommend books, podcasts, show episodes, and partners
//          for Inner Circle members.
// Uses: hybridSearchService for semantic + keyword search
//       Direct DB search as fallback for video_content/podcast_episodes
//       (when embeddings don't exist yet for newer content)
// Context: Inner Circle agent — recommends content tied to member goals
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const hybridSearchService = require('../../hybridSearchService');
const { query } = require('../../../config/database');
const { safeJsonParse } = require('../../../utils/jsonHelpers');

// Zod schema for input validation
const RecommendContentSchema = z.object({
  memberId: z.number().int().positive().describe('The Inner Circle member ID'),
  searchQuery: z.string().min(1).describe('What the member is looking for — goals, topics, challenges. Be specific.'),
  contentTypes: z.array(z.enum(['books', 'podcasts', 'videos', 'episodes', 'partners'])).default(['books', 'podcasts', 'videos']).describe('Types of content to search for. "videos" = show episodes from video_content, "episodes" = podcast_episodes, "podcasts" = legacy podcast shows'),
  limit: z.number().int().positive().default(5).describe('Maximum number of recommendations to return (default: 5)')
});

/**
 * Direct DB search for video_content (show episodes)
 * Fallback when hybrid search returns no results (no embeddings yet)
 */
async function searchVideoDirect(searchQuery, limit) {
  const result = await query(`
    SELECT vc.id, vc.title, vc.description, vc.ai_summary, vc.ai_key_topics,
           vc.ai_insights, vc.duration_seconds, vc.thumbnail_url, vc.file_url,
           vc.episode_number, vc.show_id,
           s.name as show_name, s.slug as show_slug
    FROM video_content vc
    LEFT JOIN shows s ON vc.show_id = s.id
    WHERE vc.is_active = true
      AND vc.show_id IS NOT NULL
      AND (
        vc.title ILIKE $1
        OR vc.description ILIKE $1
        OR vc.ai_summary ILIKE $1
        OR vc.ai_key_topics::text ILIKE $1
      )
    ORDER BY vc.created_at DESC
    LIMIT $2
  `, [`%${searchQuery}%`, limit]);

  return result.rows;
}

/**
 * Direct DB search for podcast_episodes
 * Fallback when hybrid search returns no results
 */
async function searchEpisodesDirect(searchQuery, limit) {
  const result = await query(`
    SELECT pe.id, pe.title, pe.description, pe.ai_summary, pe.ai_key_topics,
           pe.duration_seconds, pe.audio_url, pe.episode_number, pe.publish_date,
           pe.guest_names, pe.show_id,
           s.name as show_name, s.slug as show_slug
    FROM podcast_episodes pe
    LEFT JOIN shows s ON pe.show_id = s.id
    WHERE (
        pe.title ILIKE $1
        OR pe.description ILIKE $1
        OR pe.ai_summary ILIKE $1
      )
    ORDER BY pe.publish_date DESC NULLS LAST
    LIMIT $2
  `, [`%${searchQuery}%`, limit]);

  return result.rows;
}

/**
 * Recommend Content Tool Function
 * Called by LangGraph agent when member needs resource recommendations
 */
const recommendContentFunction = async ({ memberId, searchQuery, contentTypes = ['books', 'podcasts', 'videos'], limit = 5 }) => {
  console.log(`[Recommend Content Tool] Searching for member ${memberId}: "${searchQuery}"`);
  console.log(`[Recommend Content Tool] Content types: ${contentTypes.join(', ')}, limit: ${limit}`);

  try {
    const results = [];

    // Search each content type
    for (const contentType of contentTypes) {
      let searchResults = [];

      // Hybrid search (embedding-based)
      if (contentType === 'books') {
        searchResults = await hybridSearchService.searchBooks(searchQuery, { limit });
      } else if (contentType === 'podcasts') {
        searchResults = await hybridSearchService.searchPodcasts(searchQuery, { limit });
      } else if (contentType === 'partners') {
        searchResults = await hybridSearchService.searchPartners(searchQuery, { limit });
      } else if (contentType === 'videos') {
        searchResults = await hybridSearchService.searchVideoContent(searchQuery, { limit });
      } else if (contentType === 'episodes') {
        searchResults = await hybridSearchService.searchEpisodes(searchQuery, { limit });
      }

      for (const result of searchResults) {
        results.push({
          type: contentType,
          entityId: result.entityId,
          score: result.scores?.hybrid || 0,
          ...result
        });
      }

      // Fallback: direct DB search for videos/episodes when hybrid returns nothing
      // (embeddings may not exist yet for recently ingested content)
      if (searchResults.length === 0 && (contentType === 'videos' || contentType === 'episodes')) {
        console.log(`[Recommend Content Tool] No hybrid results for ${contentType}, falling back to direct DB search`);

        let directResults = [];
        if (contentType === 'videos') {
          directResults = await searchVideoDirect(searchQuery, limit);
        } else if (contentType === 'episodes') {
          directResults = await searchEpisodesDirect(searchQuery, limit);
        }

        for (const row of directResults) {
          results.push({
            type: contentType,
            entityId: row.id,
            score: 0.5, // Fixed score for direct matches
            directMatch: true
          });
        }
      }
    }

    // Sort by hybrid score descending
    results.sort((a, b) => b.score - a.score);

    // Trim to limit
    const topResults = results.slice(0, limit);

    if (topResults.length === 0) {
      console.log('[Recommend Content Tool] No results found');
      return JSON.stringify({
        success: true,
        recommendations: [],
        message: 'No content found matching that query. Try different keywords or broader topics.',
        memberId,
        searchQuery
      });
    }

    // Enrich results with full details from their respective tables
    const enriched = [];
    for (const result of topResults) {
      let detail = null;

      if (result.type === 'books' && result.entityId) {
        const bookResult = await query(
          'SELECT id, title, author, ai_summary, topics, key_takeaways FROM books WHERE id = $1',
          [result.entityId]
        );
        detail = bookResult.rows?.[0];
        if (detail) detail.contentType = 'book';

      } else if (result.type === 'podcasts' && result.entityId) {
        const podcastResult = await query(
          'SELECT id, title, host, ai_summary, topics, key_takeaways FROM podcasts WHERE id = $1',
          [result.entityId]
        );
        detail = podcastResult.rows?.[0];
        if (detail) detail.contentType = 'podcast_show';

      } else if (result.type === 'videos' && result.entityId) {
        const videoResult = await query(`
          SELECT vc.id, vc.title, vc.ai_summary, vc.ai_key_topics, vc.ai_insights,
                 vc.duration_seconds, vc.file_url, vc.thumbnail_url, vc.episode_number,
                 s.name as show_name, s.slug as show_slug
          FROM video_content vc
          LEFT JOIN shows s ON vc.show_id = s.id
          WHERE vc.id = $1
        `, [result.entityId]);
        detail = videoResult.rows?.[0];
        if (detail) {
          detail.contentType = 'show_episode';
          // Parse AI fields for richer recommendations
          const insights = safeJsonParse(detail.ai_insights, {});
          detail.pillar = insights.pillar || null;
          detail.key_takeaways = insights.key_takeaways || safeJsonParse(detail.ai_key_topics, []);
          detail.chapters = insights.chapters || [];
        }

      } else if (result.type === 'episodes' && result.entityId) {
        const episodeResult = await query(`
          SELECT pe.id, pe.title, pe.ai_summary, pe.ai_key_topics, pe.duration_seconds,
                 pe.audio_url, pe.publish_date, pe.guest_names, pe.episode_number,
                 s.name as show_name, s.slug as show_slug
          FROM podcast_episodes pe
          LEFT JOIN shows s ON pe.show_id = s.id
          WHERE pe.id = $1
        `, [result.entityId]);
        detail = episodeResult.rows?.[0];
        if (detail) {
          detail.contentType = 'podcast_episode';
          detail.key_takeaways = safeJsonParse(detail.ai_key_topics, []);
        }

      } else if (result.type === 'partners' && result.entityId) {
        const partnerResult = await query(
          'SELECT id, company_name, ai_summary, value_proposition, powerconfidence_score FROM strategic_partners WHERE id = $1 AND is_active = true',
          [result.entityId]
        );
        detail = partnerResult.rows?.[0];
        if (detail) detail.contentType = 'partner';
      }

      if (detail) {
        enriched.push({
          type: result.type,
          score: Math.round(result.score * 100),
          directMatch: result.directMatch || false,
          ...detail
        });
      }
    }

    console.log(`[Recommend Content Tool] Returning ${enriched.length} enriched recommendations`);

    return JSON.stringify({
      success: true,
      recommendations: enriched,
      message: `Found ${enriched.length} recommendations for "${searchQuery}"`,
      memberId,
      searchQuery,
      contentTypes
    });
  } catch (error) {
    console.error('[Recommend Content Tool] Error:', error.message);

    return JSON.stringify({
      success: false,
      error: error.message,
      memberId,
      searchQuery
    });
  }
};

// Create the LangChain tool
const recommendContentTool = tool(
  recommendContentFunction,
  {
    name: 'recommend_content',
    description: `Find and recommend books, podcasts, show episodes, and partners for an Inner Circle member.

Use this tool when:
- Member asks for book or podcast recommendations
- Member wants to watch a specific show (PowerChat, Inner Circle with Greg & Paul, Outside The Lines)
- Member needs resources related to their PowerMove goals
- Member wants to learn about a specific topic (marketing, operations, hiring, etc.)
- You want to proactively suggest content that supports their current focus areas
- Member asks about partners (ONLY if partner_recommendation_unlocked = true)

Content types available:
- "books": Recommended business books
- "podcasts": Legacy podcast show data
- "videos": Show episodes from PowerChat, Inner Circle, Outside The Lines (video_content table)
- "episodes": Individual podcast episodes with transcripts and AI analysis
- "partners": Strategic partners (gated — see below)

IMPORTANT - Partner Gating:
- Do NOT search for 'partners' content type if the member's partner_recommendation_unlocked is false
- If they ask about partners and are gated, guide them toward creating a PowerMove first
- Once unlocked, only recommend partners when genuinely tied to their PowerMove goals

The tool uses hybrid search (BM25 keyword + vector semantic) with direct database fallback for newer content.

Returns: JSON with enriched recommendations including titles, summaries, show names, and relevance scores.`,
    schema: RecommendContentSchema
  }
);

module.exports = recommendContentTool;
