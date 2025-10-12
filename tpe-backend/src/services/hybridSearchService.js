// DATABASE-CHECKED: entity_embeddings columns verified on October 2025
// ================================================================
// Hybrid Search Service (BM25 + Vector)
// ================================================================
// Purpose: Combine keyword search (BM25) and semantic search (pgvector) for optimal retrieval
// Reference: docs/features/ai-concierge/phase-0/PHASE-0-HYBRID-SEARCH-IMPLEMENTATION.md
//
// Database Fields Verified:
// - entity_embeddings: id, entity_type, entity_id, embedding_type, embedding, model_version, created_at, updated_at
// - New columns (after migration): content, content_embedding, metadata, contractor_id
//
// Search Algorithm:
// - BM25 Score: Keyword relevance using PostgreSQL full-text search
// - Vector Score: Semantic similarity using pgvector cosine distance
// - Hybrid Score: Weighted combination (default 40% BM25 + 60% vector)
// ================================================================

const { query } = require('../config/database');
const embeddingService = require('./embeddingService');

// Default weights for hybrid scoring
const DEFAULT_BM25_WEIGHT = 0.4;
const DEFAULT_VECTOR_WEIGHT = 0.6;

/**
 * Perform hybrid search across knowledge base
 * @param {string} queryText - Search query
 * @param {object} options - Search options
 * @param {number} options.contractorId - Filter by contractor (null = global knowledge)
 * @param {number} options.limit - Max results to return (default: 12)
 * @param {string[]} options.entityTypes - Filter by entity types (default: all)
 * @param {number} options.bm25Weight - BM25 score weight (default: 0.4)
 * @param {number} options.vectorWeight - Vector score weight (default: 0.6)
 * @param {number} options.minScore - Minimum hybrid score threshold (default: 0)
 * @returns {Promise<Array>} - Search results with scores
 */
async function search(queryText, options = {}) {
  const {
    contractorId = null,
    limit = 12,
    entityTypes = null,
    bm25Weight = DEFAULT_BM25_WEIGHT,
    vectorWeight = DEFAULT_VECTOR_WEIGHT,
    minScore = 0
  } = options;

  if (!queryText || typeof queryText !== 'string') {
    throw new Error('Query text must be a non-empty string');
  }

  // Generate query embedding
  console.log('Generating query embedding...');
  const queryEmbedding = await embeddingService.generateEmbedding(queryText);

  // Build SQL query with dynamic parameter numbers
  const limitParam = entityTypes ? '$7' : '$6';
  const entityTypeParam = '$6';

  let searchQuery = `
    WITH bm25_results AS (
      SELECT
        id,
        entity_type,
        entity_id,
        content,
        metadata,
        ts_rank(to_tsvector('english', content), plainto_tsquery('english', $1)) AS bm25_score
      FROM entity_embeddings
      WHERE content IS NOT NULL
        AND (contractor_id = $2 OR contractor_id IS NULL)
        ${entityTypes ? `AND entity_type = ANY(${entityTypeParam}::text[])` : ''}
    ),
    vector_results AS (
      SELECT
        id,
        entity_type,
        entity_id,
        1 - (content_embedding <=> $3::vector) AS vector_score
      FROM entity_embeddings
      WHERE content_embedding IS NOT NULL
        AND (contractor_id = $2 OR contractor_id IS NULL)
        ${entityTypes ? `AND entity_type = ANY(${entityTypeParam}::text[])` : ''}
    )
    SELECT
      ee.id,
      ee.entity_type,
      ee.entity_id,
      ee.content,
      ee.metadata,
      ee.created_at,
      ee.updated_at,
      COALESCE(bm25.bm25_score, 0) AS bm25_score,
      COALESCE(vs.vector_score, 0) AS vector_score,
      ($4 * COALESCE(bm25.bm25_score, 0) + $5 * COALESCE(vs.vector_score, 0)) AS hybrid_score
    FROM entity_embeddings ee
    LEFT JOIN bm25_results bm25 ON ee.id = bm25.id
    LEFT JOIN vector_results vs ON ee.id = vs.id
    WHERE
      (ee.contractor_id = $2 OR ee.contractor_id IS NULL)
      AND ee.content IS NOT NULL
      AND ee.content_embedding IS NOT NULL
      ${entityTypes ? `AND ee.entity_type = ANY(${entityTypeParam}::text[])` : ''}
      AND ($4 * COALESCE(bm25.bm25_score, 0) + $5 * COALESCE(vs.vector_score, 0)) >= ${minScore}
    ORDER BY hybrid_score DESC
    LIMIT ${limitParam}
  `;

  // Prepare query parameters
  const queryParams = [
    queryText,                           // $1
    contractorId,                        // $2
    `[${queryEmbedding.join(',')}]`,    // $3 (vector as string)
    bm25Weight,                          // $4
    vectorWeight,                        // $5
  ];

  // Add entityTypes parameter if provided
  if (entityTypes) {
    queryParams.push(entityTypes);       // $6
  }

  queryParams.push(limit);               // $7 (or $6 if no entityTypes)

  // Execute search
  console.log('Executing hybrid search...');
  const result = await query(searchQuery, queryParams);

  // Format results
  const formattedResults = result.rows.map(row => ({
    id: row.id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    content: row.content,
    metadata: row.metadata,
    scores: {
      bm25: parseFloat(row.bm25_score),
      vector: parseFloat(row.vector_score),
      hybrid: parseFloat(row.hybrid_score)
    },
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));

  console.log(`Found ${formattedResults.length} results`);

  return formattedResults;
}

/**
 * Search for strategic partners only
 * @param {string} queryText - Search query
 * @param {object} options - Search options
 * @returns {Promise<Array>}
 */
async function searchPartners(queryText, options = {}) {
  return await search(queryText, {
    ...options,
    entityTypes: ['strategic_partner']
  });
}

/**
 * Search for books only
 * @param {string} queryText - Search query
 * @param {object} options - Search options
 * @returns {Promise<Array>}
 */
async function searchBooks(queryText, options = {}) {
  return await search(queryText, {
    ...options,
    entityTypes: ['book']
  });
}

/**
 * Search for podcasts only
 * @param {string} queryText - Search query
 * @param {object} options - Search options
 * @returns {Promise<Array>}
 */
async function searchPodcasts(queryText, options = {}) {
  return await search(queryText, {
    ...options,
    entityTypes: ['podcast']
  });
}

/**
 * Search with contractor-specific personalization
 * @param {string} queryText - Search query
 * @param {number} contractorId - Contractor ID
 * @param {object} options - Search options
 * @returns {Promise<Array>}
 */
async function searchPersonalized(queryText, contractorId, options = {}) {
  if (!contractorId) {
    throw new Error('Contractor ID is required for personalized search');
  }

  return await search(queryText, {
    ...options,
    contractorId
  });
}

/**
 * Get statistics about search index
 * @returns {Promise<object>}
 */
async function getIndexStats() {
  const statsQuery = `
    SELECT
      COUNT(*) AS total_entries,
      COUNT(DISTINCT entity_type) AS entity_types,
      COUNT(CASE WHEN content IS NOT NULL THEN 1 END) AS entries_with_content,
      COUNT(CASE WHEN content_embedding IS NOT NULL THEN 1 END) AS entries_with_embedding,
      COUNT(CASE WHEN contractor_id IS NOT NULL THEN 1 END) AS personalized_entries,
      AVG(LENGTH(content)) AS avg_content_length,
      MIN(created_at) AS oldest_entry,
      MAX(updated_at) AS newest_entry
    FROM entity_embeddings
  `;

  const result = await query(statsQuery);
  const stats = result.rows[0];

  // Get entity type breakdown
  const typeBreakdownQuery = `
    SELECT
      entity_type,
      COUNT(*) AS count,
      COUNT(CASE WHEN content IS NOT NULL THEN 1 END) AS with_content,
      COUNT(CASE WHEN content_embedding IS NOT NULL THEN 1 END) AS with_embedding
    FROM entity_embeddings
    GROUP BY entity_type
    ORDER BY count DESC
  `;

  const typeBreakdown = await query(typeBreakdownQuery);

  return {
    totalEntries: parseInt(stats.total_entries),
    entityTypes: parseInt(stats.entity_types),
    entriesWithContent: parseInt(stats.entries_with_content),
    entriesWithEmbedding: parseInt(stats.entries_with_embedding),
    personalizedEntries: parseInt(stats.personalized_entries),
    avgContentLength: Math.round(parseFloat(stats.avg_content_length)),
    oldestEntry: stats.oldest_entry,
    newestEntry: stats.newest_entry,
    typeBreakdown: typeBreakdown.rows.map(row => ({
      entityType: row.entity_type,
      count: parseInt(row.count),
      withContent: parseInt(row.with_content),
      withEmbedding: parseInt(row.with_embedding)
    }))
  };
}

/**
 * Test search performance
 * @param {string} queryText - Test query
 * @returns {Promise<object>} - Performance metrics
 */
async function testSearchPerformance(queryText) {
  const startTime = Date.now();

  // Test embedding generation
  const embeddingStart = Date.now();
  const queryEmbedding = await embeddingService.generateEmbedding(queryText);
  const embeddingTime = Date.now() - embeddingStart;

  // Test search query
  const searchStart = Date.now();
  const results = await search(queryText, { limit: 12 });
  const searchTime = Date.now() - searchStart;

  const totalTime = Date.now() - startTime;

  return {
    query: queryText,
    totalTime: `${totalTime}ms`,
    embeddingTime: `${embeddingTime}ms`,
    searchTime: `${searchTime}ms`,
    resultsCount: results.length,
    topScore: results.length > 0 ? results[0].scores.hybrid : 0,
    avgScore: results.length > 0
      ? (results.reduce((sum, r) => sum + r.scores.hybrid, 0) / results.length).toFixed(4)
      : 0
  };
}

module.exports = {
  search,
  searchPartners,
  searchBooks,
  searchPodcasts,
  searchPersonalized,
  getIndexStats,
  testSearchPerformance,
  DEFAULT_BM25_WEIGHT,
  DEFAULT_VECTOR_WEIGHT
};
