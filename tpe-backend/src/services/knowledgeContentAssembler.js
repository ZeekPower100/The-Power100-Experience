// DATABASE-CHECKED: strategic_partners, books, podcasts, events columns verified on October 2025
// ================================================================
// Knowledge Content Assembler Service
// ================================================================
// Purpose: Assemble rich text content from entities for hybrid search indexing
// Reference: docs/features/ai-concierge/phase-0/PHASE-0-HYBRID-SEARCH-IMPLEMENTATION.md
//
// Database Fields Verified:
// - strategic_partners: id, company_name, ai_summary, ai_tags, focus_areas, ai_insights, ai_generated_differentiators (21 AI fields total)
// - books: id, title, author, ai_summary, focus_areas_covered, topics (53 columns total)
// - podcasts: id, title, host, ai_summary, focus_areas_covered, topics (53 columns total)
// - events: id, name, date, location, event_type, ai_summary, ai_tags, focus_areas_covered, topics (52 columns total)
// ================================================================

const { query } = require('../config/database');

/**
 * Assembles searchable content from strategic partners
 * @param {number} partnerId - Partner ID
 * @returns {Promise<{content: string, metadata: object}>}
 */
async function assemblePartnerContent(partnerId) {
  const result = await query(`
    SELECT
      id,
      company_name,
      ai_summary,
      ai_tags,
      focus_areas,
      ai_insights,
      ai_generated_differentiators,
      value_proposition,
      ideal_customer,
      service_areas,
      services_offered
    FROM strategic_partners
    WHERE id = $1
  `, [partnerId]);

  if (result.rows.length === 0) {
    throw new Error(`Partner ${partnerId} not found`);
  }

  const partner = result.rows[0];

  // Assemble rich text content for indexing
  const content = `
${partner.company_name}

Summary: ${partner.ai_summary || 'No summary available'}

Focus Areas: ${Array.isArray(partner.focus_areas) ? partner.focus_areas.join(', ') : 'None'}

Differentiators: ${partner.ai_generated_differentiators || 'None'}

Value Proposition: ${partner.value_proposition || 'None'}

Ideal Client Profile: ${partner.ideal_customer || 'None'}

Service Areas: ${Array.isArray(partner.service_areas) ? partner.service_areas.join(', ') : 'None'}

Services Offered: ${Array.isArray(partner.services_offered) ? partner.services_offered.join(', ') : 'None'}

Tags: ${Array.isArray(partner.ai_tags) ? partner.ai_tags.join(', ') : 'None'}

Insights: ${partner.ai_insights || 'None'}
  `.trim();

  // Metadata for filtering and context
  const metadata = {
    entity_name: partner.company_name,
    entity_type: 'strategic_partner',
    focus_areas: partner.focus_areas || [],
    tags: partner.ai_tags || [],
    has_summary: !!partner.ai_summary,
    has_differentiators: !!partner.ai_generated_differentiators
  };

  return { content, metadata };
}

/**
 * Assembles searchable content from books
 * @param {number} bookId - Book ID
 * @returns {Promise<{content: string, metadata: object}>}
 */
async function assembleBookContent(bookId) {
  const result = await query(`
    SELECT
      id,
      title,
      author,
      ai_summary,
      focus_areas_covered,
      topics,
      key_takeaways,
      target_audience,
      difficulty_level
    FROM books
    WHERE id = $1
  `, [bookId]);

  if (result.rows.length === 0) {
    throw new Error(`Book ${bookId} not found`);
  }

  const book = result.rows[0];

  // Assemble rich text content
  const content = `
${book.title} by ${book.author}

Summary: ${book.ai_summary || 'No summary available'}

Focus Areas: ${Array.isArray(book.focus_areas_covered) ? book.focus_areas_covered.join(', ') : 'None'}

Topics: ${Array.isArray(book.topics) ? book.topics.join(', ') : 'None'}

Key Takeaways: ${book.key_takeaways || 'None'}

Target Audience: ${book.target_audience || 'General business professionals'}

Difficulty Level: ${book.difficulty_level || 'Not specified'}
  `.trim();

  // Metadata
  const metadata = {
    entity_name: book.title,
    entity_type: 'book',
    author: book.author,
    focus_areas: book.focus_areas_covered || [],
    topics: book.topics || [],
    difficulty_level: book.difficulty_level,
    target_audience: book.target_audience
  };

  return { content, metadata };
}

/**
 * Assembles searchable content from podcasts
 * @param {number} podcastId - Podcast ID
 * @returns {Promise<{content: string, metadata: object}>}
 */
async function assemblePodcastContent(podcastId) {
  const result = await query(`
    SELECT
      id,
      title,
      host,
      ai_summary,
      focus_areas_covered,
      topics,
      actionable_insights,
      target_audience,
      episode_count,
      frequency
    FROM podcasts
    WHERE id = $1
  `, [podcastId]);

  if (result.rows.length === 0) {
    throw new Error(`Podcast ${podcastId} not found`);
  }

  const podcast = result.rows[0];

  // Assemble rich text content
  const content = `
${podcast.title} hosted by ${podcast.host}

Summary: ${podcast.ai_summary || 'No summary available'}

Focus Areas: ${Array.isArray(podcast.focus_areas_covered) ? podcast.focus_areas_covered.join(', ') : 'None'}

Topics: ${Array.isArray(podcast.topics) ? podcast.topics.join(', ') : 'None'}

Key Insights: ${podcast.actionable_insights || 'None'}

Target Audience: ${podcast.target_audience || 'Business professionals'}

Episodes: ${podcast.episode_count || 'Multiple'} | Frequency: ${podcast.frequency || 'Regular'}
  `.trim();

  // Metadata
  const metadata = {
    entity_name: podcast.title,
    entity_type: 'podcast',
    host: podcast.host,
    focus_areas: podcast.focus_areas_covered || [],
    topics: podcast.topics || [],
    episode_count: podcast.episode_count,
    frequency: podcast.frequency,
    target_audience: podcast.target_audience
  };

  return { content, metadata };
}

/**
 * Assembles searchable content from events
 * @param {number} eventId - Event ID
 * @returns {Promise<{content: string, metadata: object}>}
 */
async function assembleEventContent(eventId) {
  const result = await query(`
    SELECT
      id,
      name,
      date,
      end_date,
      location,
      format,
      event_type,
      description,
      ai_summary,
      focus_areas_covered,
      topics,
      ai_tags,
      target_audience,
      speaker_profiles,
      agenda_highlights,
      networking_opportunities,
      expected_attendance,
      price_range
    FROM events
    WHERE id = $1
  `, [eventId]);

  if (result.rows.length === 0) {
    throw new Error(`Event ${eventId} not found`);
  }

  const event = result.rows[0];

  // Format date
  const eventDate = event.date ? new Date(event.date).toLocaleDateString() : 'TBD';
  const endDate = event.end_date ? new Date(event.end_date).toLocaleDateString() : null;
  const dateRange = endDate && endDate !== eventDate ? `${eventDate} - ${endDate}` : eventDate;

  // Assemble rich text content
  const content = `
${event.name}

Date: ${dateRange}
Location: ${event.location || 'TBD'} | Format: ${event.format || 'Not specified'}
Event Type: ${event.event_type || 'Business Event'}

Summary: ${event.ai_summary || event.description || 'No summary available'}

Focus Areas: ${Array.isArray(event.focus_areas_covered) ? event.focus_areas_covered.join(', ') : 'None'}

Topics: ${event.topics || 'General business topics'}

Target Audience: ${event.target_audience || 'Business professionals'}

Speakers: ${event.speaker_profiles || 'TBD'}

Agenda Highlights: ${event.agenda_highlights || 'Details coming soon'}

Networking: ${event.networking_opportunities || 'Standard networking opportunities'}

Expected Attendance: ${event.expected_attendance || 'TBD'}

Investment: ${event.price_range || 'Contact for pricing'}

Tags: ${Array.isArray(event.ai_tags) ? event.ai_tags.join(', ') : 'None'}
  `.trim();

  // Metadata
  const metadata = {
    entity_name: event.name,
    entity_type: 'event',
    event_date: event.date,
    location: event.location,
    format: event.format,
    event_type: event.event_type,
    focus_areas: event.focus_areas_covered || [],
    topics: event.topics ? [event.topics] : [],
    tags: event.ai_tags || [],
    target_audience: event.target_audience,
    expected_attendance: event.expected_attendance
  };

  return { content, metadata };
}

/**
 * Universal content assembler - routes to appropriate entity handler
 * @param {string} entityType - Entity type (strategic_partner, book, podcast, event)
 * @param {number} entityId - Entity ID
 * @returns {Promise<{content: string, metadata: object}>}
 */
async function assembleContent(entityType, entityId) {
  switch (entityType) {
    case 'strategic_partner':
      return await assemblePartnerContent(entityId);
    case 'book':
      return await assembleBookContent(entityId);
    case 'podcast':
      return await assemblePodcastContent(entityId);
    case 'event':
      return await assembleEventContent(entityId);
    default:
      throw new Error(`Unsupported entity type: ${entityType}`);
  }
}

/**
 * Batch assemble content for multiple entities
 * @param {Array<{entityType: string, entityId: number}>} entities
 * @returns {Promise<Array<{entityType: string, entityId: number, content: string, metadata: object}>>}
 */
async function assembleContentBatch(entities) {
  const results = [];

  for (const { entityType, entityId } of entities) {
    try {
      const { content, metadata } = await assembleContent(entityType, entityId);
      results.push({
        entityType,
        entityId,
        content,
        metadata,
        success: true
      });
    } catch (error) {
      console.error(`Failed to assemble content for ${entityType}:${entityId}:`, error.message);
      results.push({
        entityType,
        entityId,
        content: null,
        metadata: null,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

/**
 * Get all entities that need indexing
 * @returns {Promise<Array<{entityType: string, entityId: number}>>}
 */
async function getAllEntitiesToIndex() {
  const entities = [];

  // Get all partners with AI summaries
  const partners = await query(`
    SELECT id FROM strategic_partners
    WHERE ai_summary IS NOT NULL
    ORDER BY id
  `);
  partners.rows.forEach(row => {
    entities.push({ entityType: 'strategic_partner', entityId: row.id });
  });

  // Get all books with AI summaries
  const books = await query(`
    SELECT id FROM books
    WHERE ai_summary IS NOT NULL
    ORDER BY id
  `);
  books.rows.forEach(row => {
    entities.push({ entityType: 'book', entityId: row.id });
  });

  // Get all podcasts with AI summaries
  const podcasts = await query(`
    SELECT id FROM podcasts
    WHERE ai_summary IS NOT NULL
    ORDER BY id
  `);
  podcasts.rows.forEach(row => {
    entities.push({ entityType: 'podcast', entityId: row.id });
  });

  // Get all events with AI summaries or descriptions
  const events = await query(`
    SELECT id FROM events
    WHERE ai_summary IS NOT NULL OR description IS NOT NULL
    ORDER BY id
  `);
  events.rows.forEach(row => {
    entities.push({ entityType: 'event', entityId: row.id });
  });

  return entities;
}

module.exports = {
  assemblePartnerContent,
  assembleBookContent,
  assemblePodcastContent,
  assembleEventContent,
  assembleContent,
  assembleContentBatch,
  getAllEntitiesToIndex
};
