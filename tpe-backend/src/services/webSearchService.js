// DATABASE-CHECKED: No database operations, external API only
// Verified October 29, 2025
// ================================================================
// BRAVE SEARCH API INTEGRATION:
// - Endpoint: https://api.search.brave.com/res/v1/web/search
// - API Key: process.env.BRAVE_API_KEY (BSAIsM5XhAD8Qpr6jbCrVq2gFKYBz_Z)
// - Rate Limit: 2,000 queries/month (free tier)
// - No database reads or writes
// - Purpose: Supplemental context for AI Concierge (database-first)
// ================================================================

const axios = require('axios');

/**
 * Search the web using Brave Search API
 *
 * CRITICAL: This is SUPPLEMENTAL ONLY. Database queries come first!
 * Web search adds external context when database fields are NULL/sparse.
 *
 * @param {string} query - Search query string
 * @param {string} purpose - Why search is needed (for logging)
 * @param {number} maxResults - Maximum results to return (default: 5)
 * @returns {Object} Search results formatted for AI consumption
 */
async function searchWeb(query, purpose = 'general', maxResults = 5) {
  try {
    // Validate inputs
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      throw new Error('Query must be a non-empty string');
    }

    if (maxResults < 1 || maxResults > 20) {
      throw new Error('maxResults must be between 1 and 20');
    }

    // Check for API key
    const apiKey = process.env.BRAVE_API_KEY;
    if (!apiKey) {
      console.error('[Web Search] BRAVE_API_KEY not configured');
      return {
        success: false,
        error: 'Web search not configured (missing API key)',
        query,
        results: []
      };
    }

    const startTime = Date.now();

    // Call Brave Search API
    console.log(`[Web Search] Query: "${query}" | Purpose: ${purpose} | Max Results: ${maxResults}`);

    const response = await axios.get('https://api.search.brave.com/res/v1/web/search', {
      params: {
        q: query,
        count: maxResults,
        search_lang: 'en',
        country: 'US',
        safesearch: 'moderate',
        freshness: 'pm' // Past month for fresher results
      },
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      },
      timeout: 10000 // 10 second timeout
    });

    const elapsed = Date.now() - startTime;

    // Extract and format results
    const webResults = response.data.web?.results || [];
    const formattedResults = webResults.map((result, index) => ({
      rank: index + 1,
      title: result.title,
      url: result.url,
      description: result.description,
      published_date: result.age || null,
      relevance_score: result.score || null
    }));

    console.log(`[Web Search] ✅ Found ${formattedResults.length} results in ${elapsed}ms`);

    // Log usage for monitoring rate limits (2,000 queries/month)
    logWebSearchUsage({
      timestamp: new Date().toISOString(),
      query,
      purpose,
      resultCount: formattedResults.length,
      elapsedMs: elapsed,
      success: true
    });

    return {
      success: true,
      query,
      purpose,
      resultCount: formattedResults.length,
      results: formattedResults,
      metadata: {
        searchType: 'web',
        provider: 'Brave Search',
        timestamp: new Date().toISOString(),
        elapsedMs: elapsed
      }
    };

  } catch (error) {
    console.error('[Web Search] ❌ Error:', error.message);

    // Log failed usage
    logWebSearchUsage({
      timestamp: new Date().toISOString(),
      query,
      purpose,
      resultCount: 0,
      elapsedMs: 0,
      success: false,
      error: error.message
    });

    // Return graceful error response
    return {
      success: false,
      error: error.response?.data?.message || error.message,
      query,
      results: [],
      metadata: {
        searchType: 'web',
        provider: 'Brave Search',
        timestamp: new Date().toISOString()
      }
    };
  }
}

/**
 * Format web search results for AI Concierge consumption
 * Converts raw search results into natural language context
 *
 * @param {Object} searchResponse - Response from searchWeb()
 * @returns {string} Formatted context for AI
 */
function formatResultsForAI(searchResponse) {
  if (!searchResponse.success || searchResponse.results.length === 0) {
    return `Web search found no additional context for "${searchResponse.query}".`;
  }

  let formatted = `Web Search Results for "${searchResponse.query}":\n\n`;

  searchResponse.results.forEach((result, index) => {
    formatted += `${index + 1}. **${result.title}**\n`;
    formatted += `   ${result.description}\n`;
    formatted += `   Source: ${result.url}\n`;
    if (result.published_date) {
      formatted += `   Published: ${result.published_date}\n`;
    }
    formatted += `\n`;
  });

  formatted += `\n💡 **Important**: Present database insights first, then mention these web results as supplemental context.`;

  return formatted;
}

/**
 * Log web search usage for rate limit monitoring
 * Brave Search free tier: 2,000 queries/month
 *
 * @param {Object} usage - Usage details
 */
function logWebSearchUsage(usage) {
  // For now, just console log. Future: Store in database for analytics
  const logEntry = {
    timestamp: usage.timestamp,
    query: usage.query,
    purpose: usage.purpose,
    resultCount: usage.resultCount,
    elapsedMs: usage.elapsedMs,
    success: usage.success,
    error: usage.error || null
  };

  console.log('[Web Search Usage]', JSON.stringify(logEntry));

  // TODO Phase 2: Store in web_search_usage table for:
  // - Rate limit monitoring (stay under 2,000/month)
  // - Popular queries analysis
  // - Performance tracking
  // - Cost monitoring if upgrading to paid tier
}

/**
 * Check if web search should be used based on database field status
 *
 * CRITICAL: This enforces database-first strategy!
 * Only return true if database fields are NULL/sparse.
 *
 * @param {string} fieldValue - Database field value
 * @param {number} minLength - Minimum acceptable length (default: 50)
 * @returns {boolean} True if web search should supplement
 */
function shouldUseWebSearch(fieldValue, minLength = 50) {
  // NULL or undefined - definitely need enrichment
  if (fieldValue === null || fieldValue === undefined) {
    return true;
  }

  // Empty string - need enrichment
  if (typeof fieldValue === 'string' && fieldValue.trim().length === 0) {
    return true;
  }

  // Sparse content - might need enrichment
  if (typeof fieldValue === 'string' && fieldValue.trim().length < minLength) {
    return true;
  }

  // Database has good content - NO web search needed
  return false;
}

/**
 * Build intelligent search query for specific enrichment purposes
 *
 * @param {string} entityType - Type of entity (partner, contractor, event, etc.)
 * @param {string} entityName - Name of entity
 * @param {string} enrichmentGoal - What to enrich (description, differentiators, etc.)
 * @returns {string} Optimized search query
 */
function buildEnrichmentQuery(entityType, entityName, enrichmentGoal) {
  const queryTemplates = {
    partner_description: `${entityName} company overview services`,
    partner_differentiators: `${entityName} unique advantages competitive differentiation`,
    contractor_trends: `contractor business ${entityName} trends 2025`,
    industry_insights: `construction contractor ${entityName} best practices`,
    event_context: `${entityName} conference agenda speakers`,
    book_summary: `${entityName} book key takeaways insights`
  };

  const queryKey = `${entityType}_${enrichmentGoal}`;
  return queryTemplates[queryKey] || `${entityName} ${enrichmentGoal}`;
}

module.exports = {
  searchWeb,
  formatResultsForAI,
  shouldUseWebSearch,
  buildEnrichmentQuery,
  logWebSearchUsage
};
