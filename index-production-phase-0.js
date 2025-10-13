// ================================================================
// Phase 0: Production Database Indexing Script
// ================================================================
// Indexes knowledge base entities in PRODUCTION database
// ================================================================

// Load environment variables
require('dotenv').config({ path: './tpe-backend/.env' });

// Override database config to use production
process.env.DB_HOST = 'tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com';
process.env.DB_USER = 'tpeadmin';
process.env.DB_PASSWORD = 'dBP0wer100!!';
process.env.DB_NAME = 'tpedb';
process.env.DB_PORT = '5432';

const knowledgeIndexer = require('./tpe-backend/src/services/knowledgeIndexer');

async function indexProduction() {
  console.log('=== Phase 0: Production Database Indexing ===\n');
  console.log('⚠️  WARNING: Indexing PRODUCTION database');
  console.log(`Database: ${process.env.DB_HOST}\n`);

  try {
    // Check current status
    console.log('Checking current indexing status...');
    const statusBefore = await knowledgeIndexer.getIndexingStatus();
    console.log(`Total entities: ${statusBefore.totalEntities}`);
    console.log(`Already indexed: ${statusBefore.totalIndexed}`);
    console.log(`Pending: ${statusBefore.totalEntities - statusBefore.totalIndexed}\n`);

    if (statusBefore.totalEntities === statusBefore.totalIndexed) {
      console.log('✅ All entities already indexed in production!');
      process.exit(0);
    }

    // Index all entities
    console.log('Starting indexing...');
    const indexResult = await knowledgeIndexer.indexAll({
      batchSize: 10,
      delayBetweenBatches: 1000,
      onProgress: (progress) => {
        const percent = Math.round((progress.current / progress.total) * 100);
        console.log(`  Progress: ${progress.current}/${progress.total} (${percent}%)`);
      }
    });

    console.log(`\n✅ Production indexing complete!`);
    console.log(`  Successful: ${indexResult.successful}`);
    console.log(`  Failed: ${indexResult.failed}`);
    console.log(`  Total tokens: ${indexResult.totalTokens.toLocaleString()}`);
    console.log(`  Est. cost: $${indexResult.estimatedCost.toFixed(4)}`);
    console.log(`  Duration: ${indexResult.duration}\n`);

    if (indexResult.failed > 0) {
      console.log('⚠️  Some entities failed to index:');
      indexResult.errors?.forEach(error => {
        console.log(`  - ${error}`);
      });
    }

    process.exit(indexResult.failed > 0 ? 1 : 0);

  } catch (error) {
    console.error('❌ Production indexing failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run indexing
indexProduction();
