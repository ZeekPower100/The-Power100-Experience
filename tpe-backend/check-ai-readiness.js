const { Pool } = require('pg');
require('dotenv').config({ path: '.env.development' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tpedb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'TPXP0stgres!!'
});

async function checkAIReadiness() {
  try {
    console.log('🤖 AI Database Readiness Assessment\n');
    console.log('=' .repeat(50));
    
    // Check contractors table
    console.log('\n📊 CONTRACTORS TABLE:');
    const contractorColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'contractors'
      ORDER BY ordinal_position
    `);
    
    const contractorAIFields = [
      'ai_summary', 'ai_tags', 'ai_quality_score', 'engagement_score',
      'learning_preferences', 'communication_preferences', 'business_goals',
      'current_challenges', 'ai_interactions', 'recommendations_received',
      'churn_risk', 'growth_potential', 'next_best_action', 'lifecycle_stage'
    ];
    
    const existingContractorFields = contractorColumns.rows.map(r => r.column_name);
    const missingContractorAI = contractorAIFields.filter(f => !existingContractorFields.includes(f));
    
    console.log(`  ✅ Existing fields: ${existingContractorFields.length}`);
    console.log(`  ❌ Missing AI fields: ${missingContractorAI.length}`);
    if (missingContractorAI.length > 0) {
      console.log(`     Missing: ${missingContractorAI.slice(0, 5).join(', ')}...`);
    }
    
    // Check partners table
    console.log('\n🤝 PARTNERS TABLE:');
    const partnerColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'strategic_partners'
      ORDER BY ordinal_position
    `);
    
    const partnerAIFields = [
      'ai_summary', 'ai_tags', 'ai_insights', 'ai_quality_score',
      'ai_relevance_scores', 'total_recommendations', 'positive_outcomes',
      'engagement_rate', 'success_stories', 'implementation_difficulty',
      'time_to_value', 'last_ai_analysis', 'ai_confidence_score'
    ];
    
    const existingPartnerFields = partnerColumns.rows.map(r => r.column_name);
    const missingPartnerAI = partnerAIFields.filter(f => !existingPartnerFields.includes(f));
    
    console.log(`  ✅ Existing fields: ${existingPartnerFields.length}`);
    console.log(`  ❌ Missing AI fields: ${missingPartnerAI.length}`);
    if (missingPartnerAI.length > 0) {
      console.log(`     Missing: ${missingPartnerAI.slice(0, 5).join(', ')}...`);
    }
    
    // Check books table
    console.log('\n📚 BOOKS TABLE:');
    const bookColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'books'
      ORDER BY ordinal_position
    `);
    
    const bookAIFields = [
      'ai_summary', 'ai_tags', 'ai_insights', 'actionable_ratio',
      'implementation_guides', 'completion_rate', 'prerequisite_knowledge',
      'companion_resources', 'chapter_summaries', 'key_concepts',
      'related_entities', 'engagement_metrics'
    ];
    
    const existingBookFields = bookColumns.rows.map(r => r.column_name);
    const missingBookAI = bookAIFields.filter(f => !existingBookFields.includes(f));
    
    console.log(`  ✅ Existing fields: ${existingBookFields.length}`);
    console.log(`  ❌ Missing AI fields: ${missingBookAI.length}`);
    
    // Check events table  
    console.log('\n📅 EVENTS TABLE:');
    const eventColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'events'
      ORDER BY ordinal_position
    `);
    
    const eventAIFields = [
      'ai_summary', 'ai_tags', 'historical_attendance', 'post_event_support',
      'implementation_support', 'roi_tracking', 'networking_opportunities',
      'speaker_credentials', 'session_recordings', 'follow_up_resources'
    ];
    
    const existingEventFields = eventColumns.rows.map(r => r.column_name);
    const missingEventAI = eventAIFields.filter(f => !existingEventFields.includes(f));
    
    console.log(`  ✅ Existing fields: ${existingEventFields.length}`);
    console.log(`  ❌ Missing AI fields: ${missingEventAI.length}`);
    
    // Check podcasts table
    console.log('\n🎧 PODCASTS TABLE:');
    const podcastColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'podcasts'
      ORDER BY ordinal_position
    `);
    
    const podcastAIFields = [
      'ai_summary', 'ai_tags', 'episode_transcripts', 'actionable_insights',
      'guest_credentials', 'episode_consistency', 'community_engagement',
      'topic_depth_analysis', 'implementation_examples', 'roi_discussions'
    ];
    
    const existingPodcastFields = podcastColumns.rows.map(r => r.column_name);
    const missingPodcastAI = podcastAIFields.filter(f => !existingPodcastFields.includes(f));
    
    console.log(`  ✅ Existing fields: ${existingPodcastFields.length}`);
    console.log(`  ❌ Missing AI fields: ${missingPodcastAI.length}`);
    
    // Check for interaction tracking tables
    console.log('\n📈 INTERACTION TRACKING:');
    const interactionTables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('ai_interactions', 'recommendation_history', 'engagement_metrics', 'feedback_loops')
    `);
    
    const existingTables = interactionTables.rows.map(r => r.table_name);
    const requiredTables = ['ai_interactions', 'recommendation_history', 'engagement_metrics', 'feedback_loops'];
    const missingTables = requiredTables.filter(t => !existingTables.includes(t));
    
    console.log(`  ✅ Existing tracking tables: ${existingTables.length}`);
    console.log(`  ❌ Missing tracking tables: ${missingTables.length}`);
    if (missingTables.length > 0) {
      console.log(`     Missing: ${missingTables.join(', ')}`);
    }
    
    // Calculate overall readiness score
    console.log('\n');
    console.log('=' .repeat(50));
    console.log('🎯 OVERALL AI READINESS SCORE:');
    
    const totalRequired = 
      contractorAIFields.length + 
      partnerAIFields.length + 
      bookAIFields.length + 
      eventAIFields.length + 
      podcastAIFields.length + 
      requiredTables.length;
      
    const totalMissing = 
      missingContractorAI.length + 
      missingPartnerAI.length + 
      missingBookAI.length + 
      missingEventAI.length + 
      missingPodcastAI.length + 
      missingTables.length;
      
    const readinessScore = Math.round(((totalRequired - totalMissing) / totalRequired) * 100);
    
    console.log(`  📊 ${readinessScore}% Ready`);
    console.log(`  Required fields: ${totalRequired}`);
    console.log(`  Missing fields: ${totalMissing}`);
    
    if (readinessScore < 30) {
      console.log('\n  ⚠️  Status: MAJOR WORK NEEDED');
      console.log('  The database needs significant AI-focused enhancements');
    } else if (readinessScore < 60) {
      console.log('\n  ⚠️  Status: MODERATE WORK NEEDED');
      console.log('  Core structure exists but AI fields are missing');
    } else if (readinessScore < 80) {
      console.log('\n  ✅ Status: GOOD FOUNDATION');
      console.log('  Most structure in place, needs AI-specific fields');
    } else {
      console.log('\n  🚀 Status: AI-READY');
      console.log('  Database is well-prepared for AI implementation');
    }
    
    console.log('\n📝 RECOMMENDATIONS:');
    console.log('  1. Add AI-specific fields to all entity tables');
    console.log('  2. Create interaction tracking tables');
    console.log('  3. Implement JSON/JSONB fields for flexible AI data');
    console.log('  4. Add vector embedding columns for semantic search');
    console.log('  5. Create feedback loop mechanisms');
    
  } catch (error) {
    console.error('❌ Assessment failed:', error);
  } finally {
    await pool.end();
  }
}

checkAIReadiness();