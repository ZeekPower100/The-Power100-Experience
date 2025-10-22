// DATABASE-CHECKED: business_growth_patterns, contractor_pattern_matches verified October 22, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - common_books (NOT commonBooks)
// - common_podcasts (NOT commonPodcasts)
// - common_events (NOT commonEvents)
// - sample_size (NOT sampleSize)
// - confidence_score (NOT confidenceScore)
// - match_score (NOT matchScore)
// ================================================================
// VERIFIED DATA TYPES:
// - common_books: JSONB (array of objects with title and usage_rate)
// - common_podcasts: JSONB (array of objects with name and usage_rate)
// - common_events: JSONB (array of objects with name and usage_rate)
// - sample_size: INTEGER (count of contractors)
// - confidence_score: NUMERIC(3,2) (0.00-1.00)
// - match_score: NUMERIC(3,2) (0.00-1.00)
// ================================================================

/**
 * Content Recommendation Service
 *
 * Phase 2: Pattern Learning & Intelligence
 * Day 5: Timeline Predictions & Content Recommendations
 *
 * Recommends books, podcasts, and events based on what successful
 * contractors consumed during their growth journey.
 *
 * Core Functions:
 * - getPatternBasedContentRecommendations() - Get all content recommendations
 * - getBookRecommendations() - Get book recommendations with usage rates
 * - getPodcastRecommendations() - Get podcast recommendations
 * - getEventRecommendations() - Get event recommendations
 */

const { query } = require('../config/database');

/**
 * Get all pattern-based content recommendations for a contractor
 * @param {number} contractorId - Contractor ID
 * @returns {Promise<Object>} Content recommendations (books, podcasts, events)
 */
async function getPatternBasedContentRecommendations(contractorId) {
  console.log(`[Content Recommendations] Getting content recommendations for contractor ${contractorId}`);

  try {
    // Get contractor's pattern matches
    const matchesResult = await query(`
      SELECT
        bgp.common_books,
        bgp.common_podcasts,
        bgp.common_events,
        bgp.sample_size,
        bgp.confidence_score,
        bgp.pattern_name,
        cpm.match_score
      FROM contractor_pattern_matches cpm
      JOIN business_growth_patterns bgp ON cpm.pattern_id = bgp.id
      WHERE cpm.contractor_id = $1
      ORDER BY cpm.match_score DESC;
    `, [contractorId]);

    if (matchesResult.rows.length === 0) {
      console.log(`[Content Recommendations] No patterns matched for contractor ${contractorId}`);
      return {
        books: [],
        podcasts: [],
        events: []
      };
    }

    console.log(`[Content Recommendations] Found ${matchesResult.rows.length} pattern match(es)`);

    // Aggregate content across all matched patterns
    const bookMap = new Map();
    const podcastMap = new Map();
    const eventMap = new Map();

    for (const match of matchesResult.rows) {
      // Weight by match score and confidence
      const weight = match.match_score * match.confidence_score;

      // Aggregate books
      if (match.common_books && Array.isArray(match.common_books)) {
        for (const book of match.common_books) {
          aggregateContent(bookMap, book, weight, match.pattern_name, match.sample_size);
        }
      }

      // Aggregate podcasts
      if (match.common_podcasts && Array.isArray(match.common_podcasts)) {
        for (const podcast of match.common_podcasts) {
          aggregateContent(podcastMap, podcast, weight, match.pattern_name, match.sample_size);
        }
      }

      // Aggregate events
      if (match.common_events && Array.isArray(match.common_events)) {
        for (const event of match.common_events) {
          aggregateContent(eventMap, event, weight, match.pattern_name, match.sample_size);
        }
      }
    }

    // Convert maps to sorted arrays
    const books = mapToSortedArray(bookMap, 'book');
    const podcasts = mapToSortedArray(podcastMap, 'podcast');
    const events = mapToSortedArray(eventMap, 'event');

    console.log(`[Content Recommendations] Generated ${books.length} book(s), ${podcasts.length} podcast(s), ${events.length} event(s)`);

    return {
      books,
      podcasts,
      events
    };

  } catch (error) {
    console.error('[Content Recommendations] Error generating recommendations:', error);
    throw error;
  }
}

/**
 * Aggregate content item with weighted usage rates
 * @param {Map} contentMap - Map to store aggregated content
 * @param {Object} item - Content item from pattern
 * @param {number} weight - Weight factor (match_score * confidence_score)
 * @param {string} patternName - Pattern name for tracking
 * @param {number} sampleSize - Pattern sample size
 */
function aggregateContent(contentMap, item, weight, patternName, sampleSize) {
  // Get content identifier (title for books, name for podcasts/events)
  const identifier = item.title || item.name;

  if (!identifier) {
    return; // Skip items without identifier
  }

  if (!contentMap.has(identifier)) {
    contentMap.set(identifier, {
      identifier,
      title: item.title,
      name: item.name,
      author: item.author,
      description: item.description,
      total_usage_rate: 0,
      pattern_count: 0,
      patterns: [],
      total_weight: 0,
      total_sample_size: 0
    });
  }

  const existing = contentMap.get(identifier);
  existing.total_usage_rate += (item.usage_rate || 0) * weight;
  existing.pattern_count += 1;
  existing.total_weight += weight;
  existing.total_sample_size += sampleSize;
  existing.patterns.push({
    pattern_name: patternName,
    usage_rate: item.usage_rate,
    sample_size: sampleSize
  });
}

/**
 * Convert content map to sorted array with recommendations
 * @param {Map} contentMap - Aggregated content map
 * @param {string} contentType - Type of content (book, podcast, event)
 * @returns {Array} Sorted recommendations
 */
function mapToSortedArray(contentMap, contentType) {
  const recommendations = [];

  for (const [identifier, content] of contentMap.entries()) {
    // Calculate weighted average usage rate
    const avgUsageRate = content.total_weight > 0
      ? content.total_usage_rate / content.total_weight
      : 0;

    recommendations.push({
      identifier,
      title: content.title,
      name: content.name,
      author: content.author,
      description: content.description,
      usage_rate: Math.round(avgUsageRate * 100) / 100,
      usage_percentage: Math.round(avgUsageRate * 100),
      pattern_count: content.pattern_count,
      total_contractors: content.total_sample_size,
      patterns: content.patterns,
      message: formatContentMessage(content.title || content.name, avgUsageRate, content.total_sample_size, contentType)
    });
  }

  // Sort by usage rate (highest first)
  recommendations.sort((a, b) => b.usage_rate - a.usage_rate);

  return recommendations;
}

/**
 * Format human-readable content recommendation message
 * @param {string} contentName - Name of the content
 * @param {number} usageRate - Usage rate (0-1)
 * @param {number} sampleSize - Number of contractors
 * @param {string} contentType - Type of content
 * @returns {string} Formatted message
 */
function formatContentMessage(contentName, usageRate, sampleSize, contentType) {
  const percentage = Math.round(usageRate * 100);

  let action = 'used';
  if (contentType === 'book') {
    action = 'read';
  } else if (contentType === 'podcast') {
    action = 'listened to';
  } else if (contentType === 'event') {
    action = 'attended';
  }

  return `${percentage}% of ${sampleSize} successful contractors ${action} "${contentName}"`;
}

/**
 * Get book recommendations only
 * @param {number} contractorId - Contractor ID
 * @param {number} limit - Maximum number of recommendations (default 10)
 * @returns {Promise<Array>} Book recommendations
 */
async function getBookRecommendations(contractorId, limit = 10) {
  try {
    const recommendations = await getPatternBasedContentRecommendations(contractorId);
    return recommendations.books.slice(0, limit);
  } catch (error) {
    console.error('[Content Recommendations] Error getting book recommendations:', error);
    throw error;
  }
}

/**
 * Get podcast recommendations only
 * @param {number} contractorId - Contractor ID
 * @param {number} limit - Maximum number of recommendations (default 10)
 * @returns {Promise<Array>} Podcast recommendations
 */
async function getPodcastRecommendations(contractorId, limit = 10) {
  try {
    const recommendations = await getPatternBasedContentRecommendations(contractorId);
    return recommendations.podcasts.slice(0, limit);
  } catch (error) {
    console.error('[Content Recommendations] Error getting podcast recommendations:', error);
    throw error;
  }
}

/**
 * Get event recommendations only
 * @param {number} contractorId - Contractor ID
 * @param {number} limit - Maximum number of recommendations (default 10)
 * @returns {Promise<Array>} Event recommendations
 */
async function getEventRecommendations(contractorId, limit = 10) {
  try {
    const recommendations = await getPatternBasedContentRecommendations(contractorId);
    return recommendations.events.slice(0, limit);
  } catch (error) {
    console.error('[Content Recommendations] Error getting event recommendations:', error);
    throw error;
  }
}

/**
 * Get top content recommendations across all types
 * @param {number} contractorId - Contractor ID
 * @param {number} limitPerType - Maximum per content type (default 5)
 * @returns {Promise<Object>} Top recommendations
 */
async function getTopContentRecommendations(contractorId, limitPerType = 5) {
  try {
    const recommendations = await getPatternBasedContentRecommendations(contractorId);

    return {
      books: recommendations.books.slice(0, limitPerType),
      podcasts: recommendations.podcasts.slice(0, limitPerType),
      events: recommendations.events.slice(0, limitPerType),
      total_count: recommendations.books.length + recommendations.podcasts.length + recommendations.events.length
    };
  } catch (error) {
    console.error('[Content Recommendations] Error getting top recommendations:', error);
    throw error;
  }
}

/**
 * Generate content-based checklist items
 * Creates actionable checklist items from content recommendations
 * @param {number} contractorId - Contractor ID
 * @param {number} limit - Maximum items to generate (default 5)
 * @returns {Promise<Array>} Checklist items
 */
async function generateContentChecklistItems(contractorId, limit = 5) {
  console.log(`[Content Recommendations] Generating checklist items for contractor ${contractorId}`);

  try {
    const recommendations = await getPatternBasedContentRecommendations(contractorId);
    const checklistItems = [];

    // Add top books
    for (const book of recommendations.books.slice(0, Math.min(3, limit))) {
      checklistItems.push({
        checklist_item: `Read "${book.title || book.name}"${book.author ? ` by ${book.author}` : ''} (recommended by ${book.usage_percentage}% of successful contractors)`,
        item_type: 'content_recommendation',
        trigger_condition: 'immediately',
        source: 'pattern_analysis',
        content_type: 'book',
        content_name: book.title || book.name,
        usage_percentage: book.usage_percentage
      });
    }

    // Add top podcasts
    for (const podcast of recommendations.podcasts.slice(0, Math.min(2, limit - checklistItems.length))) {
      checklistItems.push({
        checklist_item: `Listen to "${podcast.name}" podcast (recommended by ${podcast.usage_percentage}% of successful contractors)`,
        item_type: 'content_recommendation',
        trigger_condition: 'immediately',
        source: 'pattern_analysis',
        content_type: 'podcast',
        content_name: podcast.name,
        usage_percentage: podcast.usage_percentage
      });
    }

    // Add top events
    for (const event of recommendations.events.slice(0, Math.min(1, limit - checklistItems.length))) {
      checklistItems.push({
        checklist_item: `Attend "${event.name}" (attended by ${event.usage_percentage}% of successful contractors)`,
        item_type: 'content_recommendation',
        trigger_condition: 'when_available',
        source: 'pattern_analysis',
        content_type: 'event',
        content_name: event.name,
        usage_percentage: event.usage_percentage
      });
    }

    console.log(`[Content Recommendations] Generated ${checklistItems.length} checklist item(s)`);

    return checklistItems.slice(0, limit);

  } catch (error) {
    console.error('[Content Recommendations] Error generating checklist items:', error);
    throw error;
  }
}

module.exports = {
  getPatternBasedContentRecommendations,
  getBookRecommendations,
  getPodcastRecommendations,
  getEventRecommendations,
  getTopContentRecommendations,
  generateContentChecklistItems,
  formatContentMessage
};
