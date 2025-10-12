// DATABASE-CHECKED: entity_embeddings columns verified on October 2025
// ================================================================
// Knowledge Base Indexer
// ================================================================
// Purpose: Index all entities (partners, books, podcasts) into entity_embeddings for hybrid search
// Reference: docs/features/ai-concierge/phase-0/PHASE-0-HYBRID-SEARCH-IMPLEMENTATION.md
//
// Process:
// 1. Assemble content from entity data
// 2. Generate OpenAI embeddings
// 3. Store in entity_embeddings with BM25 and vector indexes
// 4. Track indexing progress and errors
// ================================================================

const { query } = require('../config/database');
const contentAssembler = require('./knowledgeContentAssembler');
const embeddingService = require('./embeddingService');

/**
 * Index a single entity
 * @param {string} entityType - Entity type (strategic_partner, book, podcast)
 * @param {number} entityId - Entity ID
 * @returns {Promise<object>} - Indexing result
 */
async function indexEntity(entityType, entityId) {
  try {
    // Step 1: Assemble content
    console.log(`Indexing ${entityType}:${entityId} - Assembling content...`);
    const { content, metadata } = await contentAssembler.assembleContent(entityType, entityId);

    // Step 2: Generate embedding
    console.log(`Indexing ${entityType}:${entityId} - Generating embedding...`);
    const embedding = await embeddingService.generateEmbedding(content);

    // Step 3: Store in database (upsert)
    console.log(`Indexing ${entityType}:${entityId} - Storing in database...`);
    const upsertQuery = `
      INSERT INTO entity_embeddings (
        entity_type,
        entity_id,
        embedding_type,
        content,
        content_embedding,
        metadata,
        model_version,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, 'hybrid_search', $3, $4, $5, 'text-embedding-ada-002', NOW(), NOW()
      )
      ON CONFLICT (entity_type, entity_id)
      DO UPDATE SET
        content = EXCLUDED.content,
        content_embedding = EXCLUDED.content_embedding,
        metadata = EXCLUDED.metadata,
        model_version = EXCLUDED.model_version,
        updated_at = NOW()
      RETURNING id, created_at, updated_at
    `;

    const result = await query(upsertQuery, [
      entityType,
      entityId,
      content,
      `[${embedding.join(',')}]`, // Convert array to vector string
      JSON.stringify(metadata)
    ]);

    const record = result.rows[0];
    const isNew = record.created_at.getTime() === record.updated_at.getTime();

    console.log(`✓ Indexed ${entityType}:${entityId} (${isNew ? 'new' : 'updated'})`);

    return {
      success: true,
      entityType,
      entityId,
      recordId: record.id,
      isNew,
      contentLength: content.length,
      tokenEstimate: embeddingService.estimateTokenCount(content)
    };
  } catch (error) {
    console.error(`✗ Failed to index ${entityType}:${entityId}:`, error.message);

    return {
      success: false,
      entityType,
      entityId,
      error: error.message
    };
  }
}

/**
 * Index multiple entities in batch with progress tracking
 * @param {Array<{entityType: string, entityId: number}>} entities - Entities to index
 * @param {object} options - Indexing options
 * @param {number} options.batchSize - Embeddings per batch (default: 20)
 * @param {number} options.delayBetweenBatches - Delay in ms (default: 1000)
 * @param {function} options.onProgress - Progress callback
 * @returns {Promise<object>} - Indexing summary
 */
async function indexBatch(entities, options = {}) {
  const {
    batchSize = 20,
    delayBetweenBatches = 1000,
    onProgress = null
  } = options;

  console.log(`Starting batch indexing of ${entities.length} entities...`);
  console.log(`Batch size: ${batchSize}, Delay: ${delayBetweenBatches}ms`);

  const results = {
    total: entities.length,
    successful: 0,
    failed: 0,
    new: 0,
    updated: 0,
    errors: [],
    totalTokens: 0,
    estimatedCost: 0,
    startTime: new Date(),
    endTime: null,
    duration: null
  };

  // Process entities in batches
  for (let i = 0; i < entities.length; i += batchSize) {
    const batch = entities.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(entities.length / batchSize);

    console.log(`\n--- Batch ${batchNumber}/${totalBatches} (${batch.length} entities) ---`);

    // Process batch sequentially (to avoid rate limits)
    for (const entity of batch) {
      const result = await indexEntity(entity.entityType, entity.entityId);

      if (result.success) {
        results.successful++;
        if (result.isNew) {
          results.new++;
        } else {
          results.updated++;
        }
        results.totalTokens += result.tokenEstimate;
      } else {
        results.failed++;
        results.errors.push({
          entityType: result.entityType,
          entityId: result.entityId,
          error: result.error
        });
      }

      // Progress callback
      if (onProgress) {
        onProgress({
          current: results.successful + results.failed,
          total: results.total,
          successful: results.successful,
          failed: results.failed
        });
      }
    }

    // Delay between batches (except last batch)
    if (i + batchSize < entities.length) {
      console.log(`Waiting ${delayBetweenBatches}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  // Calculate final stats
  results.endTime = new Date();
  results.duration = `${Math.round((results.endTime - results.startTime) / 1000)}s`;
  results.estimatedCost = embeddingService.calculateCost(results.totalTokens);

  console.log('\n=== Indexing Complete ===');
  console.log(`Total: ${results.total}`);
  console.log(`Successful: ${results.successful} (${results.new} new, ${results.updated} updated)`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total Tokens: ${results.totalTokens.toLocaleString()}`);
  console.log(`Estimated Cost: $${results.estimatedCost.toFixed(4)}`);
  console.log(`Duration: ${results.duration}`);

  if (results.errors.length > 0) {
    console.log(`\nErrors (${results.errors.length}):`);
    results.errors.forEach(err => {
      console.log(`  - ${err.entityType}:${err.entityId}: ${err.error}`);
    });
  }

  return results;
}

/**
 * Index all entities in the knowledge base
 * @param {object} options - Indexing options
 * @returns {Promise<object>} - Indexing summary
 */
async function indexAll(options = {}) {
  console.log('Fetching all entities to index...');

  // Get all entities
  const entities = await contentAssembler.getAllEntitiesToIndex();

  console.log(`Found ${entities.length} entities to index:`);

  // Count by type
  const counts = entities.reduce((acc, entity) => {
    acc[entity.entityType] = (acc[entity.entityType] || 0) + 1;
    return acc;
  }, {});

  Object.entries(counts).forEach(([type, count]) => {
    console.log(`  - ${type}: ${count}`);
  });

  // Index all entities
  return await indexBatch(entities, options);
}

/**
 * Re-index specific entity types
 * @param {string[]} entityTypes - Entity types to re-index
 * @param {object} options - Indexing options
 * @returns {Promise<object>}
 */
async function reindexEntityTypes(entityTypes, options = {}) {
  console.log(`Re-indexing entity types: ${entityTypes.join(', ')}`);

  // Get all entities
  const allEntities = await contentAssembler.getAllEntitiesToIndex();

  // Filter by types
  const entities = allEntities.filter(entity =>
    entityTypes.includes(entity.entityType)
  );

  console.log(`Found ${entities.length} entities to re-index`);

  if (entities.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      message: 'No entities found for specified types'
    };
  }

  return await indexBatch(entities, options);
}

/**
 * Delete index entries for an entity
 * @param {string} entityType - Entity type
 * @param {number} entityId - Entity ID
 * @returns {Promise<boolean>}
 */
async function deleteEntityIndex(entityType, entityId) {
  try {
    const deleteQuery = `
      DELETE FROM entity_embeddings
      WHERE entity_type = $1 AND entity_id = $2
      RETURNING id
    `;

    const result = await query(deleteQuery, [entityType, entityId]);

    if (result.rows.length > 0) {
      console.log(`Deleted index for ${entityType}:${entityId}`);
      return true;
    } else {
      console.log(`No index found for ${entityType}:${entityId}`);
      return false;
    }
  } catch (error) {
    console.error(`Failed to delete index for ${entityType}:${entityId}:`, error.message);
    throw error;
  }
}

/**
 * Clear all indexes (DANGEROUS - use with caution)
 * @param {boolean} confirm - Must be true to proceed
 * @returns {Promise<number>} - Number of deleted records
 */
async function clearAllIndexes(confirm = false) {
  if (!confirm) {
    throw new Error('Must explicitly confirm to clear all indexes');
  }

  console.log('WARNING: Clearing all indexes...');

  const deleteQuery = `
    DELETE FROM entity_embeddings
    WHERE embedding_type = 'hybrid_search'
    RETURNING id
  `;

  const result = await query(deleteQuery);
  const deletedCount = result.rows.length;

  console.log(`Deleted ${deletedCount} index entries`);

  return deletedCount;
}

/**
 * Get indexing progress and statistics
 * @returns {Promise<object>}
 */
async function getIndexingStatus() {
  // Get total entities
  const allEntities = await contentAssembler.getAllEntitiesToIndex();

  // Get indexed entities
  const indexedQuery = `
    SELECT entity_type, COUNT(*) as count
    FROM entity_embeddings
    WHERE embedding_type = 'hybrid_search'
      AND content IS NOT NULL
      AND content_embedding IS NOT NULL
    GROUP BY entity_type
  `;

  const indexedResult = await query(indexedQuery);

  const indexed = indexedResult.rows.reduce((acc, row) => {
    acc[row.entity_type] = parseInt(row.count);
    return acc;
  }, {});

  // Calculate totals by type
  const totalByType = allEntities.reduce((acc, entity) => {
    acc[entity.entityType] = (acc[entity.entityType] || 0) + 1;
    return acc;
  }, {});

  const status = {
    totalEntities: allEntities.length,
    totalIndexed: Object.values(indexed).reduce((sum, count) => sum + count, 0),
    byType: {}
  };

  Object.keys(totalByType).forEach(type => {
    const total = totalByType[type];
    const indexedCount = indexed[type] || 0;
    status.byType[type] = {
      total,
      indexed: indexedCount,
      pending: total - indexedCount,
      percentage: Math.round((indexedCount / total) * 100)
    };
  });

  status.overallPercentage = Math.round((status.totalIndexed / status.totalEntities) * 100);

  return status;
}

module.exports = {
  indexEntity,
  indexBatch,
  indexAll,
  reindexEntityTypes,
  deleteEntityIndex,
  clearAllIndexes,
  getIndexingStatus
};
