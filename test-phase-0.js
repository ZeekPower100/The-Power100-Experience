// ================================================================
// Phase 0: Hybrid Search Testing Script
// ================================================================
// Tests knowledge indexing and hybrid search functionality
// ================================================================

// Load environment variables
require('dotenv').config({ path: './tpe-backend/.env' });

const knowledgeIndexer = require('./tpe-backend/src/services/knowledgeIndexer');
const aiKnowledge = require('./tpe-backend/src/services/aiKnowledgeService');
const hybridSearch = require('./tpe-backend/src/services/hybridSearchService');

async function runTests() {
  console.log('=== Phase 0: Hybrid Search Testing ===\n');

  try {
    // Test 1: Check current indexing status
    console.log('Test 1: Checking indexing status...');
    const statusBefore = await knowledgeIndexer.getIndexingStatus();
    console.log(`Total entities: ${statusBefore.totalEntities}`);
    console.log(`Already indexed: ${statusBefore.totalIndexed}`);
    console.log(`Pending: ${statusBefore.totalEntities - statusBefore.totalIndexed}\n`);

    // Test 2: Index all entities
    if (statusBefore.totalEntities > statusBefore.totalIndexed) {
      console.log('Test 2: Indexing knowledge base...');
      const indexResult = await knowledgeIndexer.indexAll({
        batchSize: 10,
        delayBetweenBatches: 1000,
        onProgress: (progress) => {
          const percent = Math.round((progress.current / progress.total) * 100);
          console.log(`  Progress: ${progress.current}/${progress.total} (${percent}%)`);
        }
      });

      console.log(`\n✅ Indexing complete!`);
      console.log(`  Successful: ${indexResult.successful}`);
      console.log(`  Failed: ${indexResult.failed}`);
      console.log(`  Total tokens: ${indexResult.totalTokens.toLocaleString()}`);
      console.log(`  Est. cost: $${indexResult.estimatedCost.toFixed(4)}`);
      console.log(`  Duration: ${indexResult.duration}\n`);
    } else {
      console.log('Test 2: All entities already indexed ✅\n');
    }

    // Test 3: Get index statistics
    console.log('Test 3: Index statistics...');
    const stats = await hybridSearch.getIndexStats();
    console.log(`  Total entries: ${stats.totalEntries}`);
    console.log(`  With content: ${stats.entriesWithContent}`);
    console.log(`  With embedding: ${stats.entriesWithEmbedding}`);
    console.log(`  Avg content length: ${stats.avgContentLength} chars`);
    console.log('  By type:');
    stats.typeBreakdown.forEach(type => {
      console.log(`    - ${type.entityType}: ${type.withEmbedding}/${type.count} indexed`);
    });
    console.log('');

    // Test 4: Test hybrid search
    console.log('Test 4: Testing hybrid search...');
    const searchResult = await aiKnowledge.searchKnowledge('business operations and efficiency', {
      limit: 5
    });
    console.log(`  Total results: ${searchResult.totalResults}`);
    if (searchResult.topRecommendation) {
      console.log(`  Top result: ${searchResult.topRecommendation.name} (${searchResult.topRecommendation.entityType})`);
      console.log(`  Score: ${searchResult.topRecommendation.score.toFixed(3)}`);
    }
    console.log('');

    // Test 5: Test performance
    console.log('Test 5: Performance test...');
    const perfResult = await hybridSearch.testSearchPerformance('leadership and team management');
    console.log(`  Total time: ${perfResult.totalTime}`);
    console.log(`  Embedding time: ${perfResult.embeddingTime}`);
    console.log(`  Search time: ${perfResult.searchTime}`);
    console.log(`  Results: ${perfResult.resultsCount}`);
    console.log(`  Top score: ${perfResult.topScore.toFixed(3)}`);
    console.log('');

    console.log('=== All Tests Passed! ===\n');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests
runTests();
