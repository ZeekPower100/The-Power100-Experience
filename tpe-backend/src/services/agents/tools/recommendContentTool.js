// DATABASE-CHECKED: entity_embeddings, books, podcasts columns verified on 2026-02-16
// ================================================================
// Recommend Content Tool (LangGraph Agent Tool)
// ================================================================
// Purpose: Find and recommend books, podcasts, and resources for Inner Circle members
// Uses: hybridSearchService for semantic + keyword search
// Context: Inner Circle agent — recommends content tied to member goals
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const hybridSearchService = require('../../hybridSearchService');
const { query } = require('../../../config/database');

// Zod schema for input validation
const RecommendContentSchema = z.object({
  memberId: z.number().int().positive().describe('The Inner Circle member ID'),
  searchQuery: z.string().min(1).describe('What the member is looking for — goals, topics, challenges. Be specific.'),
  contentTypes: z.array(z.enum(['books', 'podcasts', 'partners'])).default(['books', 'podcasts']).describe('Types of content to search for'),
  limit: z.number().int().positive().default(5).describe('Maximum number of recommendations to return (default: 5)')
});

/**
 * Recommend Content Tool Function
 * Called by LangGraph agent when member needs resource recommendations
 */
const recommendContentFunction = async ({ memberId, searchQuery, contentTypes = ['books', 'podcasts'], limit = 5 }) => {
  console.log(`[Recommend Content Tool] Searching for member ${memberId}: "${searchQuery}"`);
  console.log(`[Recommend Content Tool] Content types: ${contentTypes.join(', ')}, limit: ${limit}`);

  try {
    const results = [];

    // Search each content type using hybrid search
    for (const contentType of contentTypes) {
      let searchResults = [];

      if (contentType === 'books') {
        searchResults = await hybridSearchService.searchBooks(searchQuery, { limit });
      } else if (contentType === 'podcasts') {
        searchResults = await hybridSearchService.searchPodcasts(searchQuery, { limit });
      } else if (contentType === 'partners') {
        searchResults = await hybridSearchService.searchPartners(searchQuery, { limit });
      }

      for (const result of searchResults) {
        results.push({
          type: contentType,
          entityId: result.entityId,
          score: result.scores?.hybrid || 0,
          ...result
        });
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
      } else if (result.type === 'podcasts' && result.entityId) {
        const podcastResult = await query(
          'SELECT id, title, host, ai_summary, topics, key_takeaways FROM podcasts WHERE id = $1',
          [result.entityId]
        );
        detail = podcastResult.rows?.[0];
      } else if (result.type === 'partners' && result.entityId) {
        const partnerResult = await query(
          'SELECT id, company_name, ai_summary, value_proposition, powerconfidence_score FROM strategic_partners WHERE id = $1 AND is_active = true',
          [result.entityId]
        );
        detail = partnerResult.rows?.[0];
      }

      if (detail) {
        enriched.push({
          type: result.type,
          score: Math.round(result.score * 100),
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
    description: `Find and recommend books, podcasts, and partners for an Inner Circle member.

Use this tool when:
- Member asks for book or podcast recommendations
- Member needs resources related to their PowerMove goals
- Member wants to learn about a specific topic (marketing, operations, hiring, etc.)
- You want to proactively suggest content that supports their current focus areas
- Member asks about partners (ONLY if partner_recommendation_unlocked = true)

IMPORTANT - Partner Gating:
- Do NOT search for 'partners' content type if the member's partner_recommendation_unlocked is false
- If they ask about partners and are gated, guide them toward creating a PowerMove first
- Once unlocked, only recommend partners when genuinely tied to their PowerMove goals

The tool uses hybrid search (BM25 keyword + vector semantic) to find the most relevant content.

Returns: JSON with enriched recommendations including titles, summaries, and relevance scores.`,
    schema: RecommendContentSchema
  }
);

module.exports = recommendContentTool;
