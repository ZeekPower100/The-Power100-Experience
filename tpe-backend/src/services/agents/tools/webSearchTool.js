// DATABASE-CHECKED: No database operations, external API only
// Verified October 29, 2025
// ================================================================
// Web Search Tool (LangGraph Agent Tool)
// ================================================================
// Purpose: Supplement database knowledge with real-time web search
// Uses: Brave Search API via webSearchService
// AI Model: Autonomous decision-making via LangGraph agent
// ================================================================
// CRITICAL: DATABASE-FIRST STRATEGY
// - This tool is SUPPLEMENTAL ONLY
// - AI must check database FIRST before using web search
// - Web search adds context when database fields are NULL/sparse
// ================================================================

const { z } = require('zod');
const { tool } = require('@langchain/core/tools');
const webSearchService = require('../../webSearchService');

// Zod schema for input validation
const WebSearchSchema = z.object({
  query: z.string().min(3).max(200).describe('Search query string (3-200 characters)'),
  purpose: z.string().optional().describe('Why this search is needed (e.g., "enrich_partner_description", "trend_analysis", "industry_research")'),
  maxResults: z.number().int().min(1).max(10).default(5).describe('Maximum search results to return (1-10, default: 5)')
});

/**
 * Web Search Tool Function
 * Called by LangGraph agent when database knowledge is insufficient
 *
 * CRITICAL: AI agent should only call this after checking database!
 * This is for supplemental context, not primary data.
 */
const webSearchFunction = async ({ query, purpose = 'general', maxResults = 5 }) => {
  console.log(`[Web Search Tool] Query: "${query}" | Purpose: ${purpose} | Max Results: ${maxResults}`);

  try {
    // Validate query
    if (!query || query.trim().length === 0) {
      return JSON.stringify({
        success: false,
        error: 'Query cannot be empty',
        query,
        results: []
      });
    }

    // Call web search service
    const searchResponse = await webSearchService.searchWeb(query, purpose, maxResults);

    // Check if search was successful
    if (!searchResponse.success) {
      console.log(`[Web Search Tool] ❌ Search failed: ${searchResponse.error}`);
      return JSON.stringify({
        success: false,
        error: searchResponse.error,
        query,
        results: [],
        message: 'Web search unavailable. Relying on database knowledge only.'
      });
    }

    console.log(`[Web Search Tool] ✅ Found ${searchResponse.resultCount} results`);

    // Format results for AI consumption
    const formattedContext = webSearchService.formatResultsForAI(searchResponse);

    // Return structured response
    return JSON.stringify({
      success: true,
      query,
      purpose,
      resultCount: searchResponse.resultCount,
      results: searchResponse.results,
      formattedContext,
      metadata: searchResponse.metadata,
      instruction: '⚠️ IMPORTANT: Present database insights FIRST, then add these web results as supplemental context.'
    });

  } catch (error) {
    console.error('[Web Search Tool] Error:', error);

    return JSON.stringify({
      success: false,
      error: error.message,
      query,
      results: [],
      message: 'Web search failed. Relying on database knowledge only.'
    });
  }
};

// Create the LangChain tool
const webSearchTool = tool(
  webSearchFunction,
  {
    name: 'web_search',
    description: `Search the web for real-time information to supplement database knowledge.

⚠️ CRITICAL: DATABASE-FIRST STRATEGY
This tool is SUPPLEMENTAL ONLY. You MUST:
1. Check database FIRST (contractors, strategic_partners, events, books tables)
2. Only use web search if database fields are NULL, sparse (<50 chars), or insufficient
3. Present database data PROMINENTLY, web results as supplemental context
4. Never rely solely on web search when database has information

Use this tool when:
- Partner company_description is NULL or < 50 characters (needs enrichment)
- Contractor needs current industry trends (query database patterns first, then add web context)
- Event context requires recent news or updates not in database
- Book/podcast information is incomplete in database

DO NOT use this tool when:
- Database has comprehensive information (ai_summary, company_description > 50 chars)
- Question can be fully answered from first-party data
- Contractor asks about their own data (always in database)
- Partner information is complete in database

The tool uses Brave Search API (2,000 queries/month limit).
Returns: JSON with search results formatted for AI consumption.`,
    schema: WebSearchSchema
  }
);

module.exports = webSearchTool;
