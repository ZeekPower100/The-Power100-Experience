// DATABASE-CHECKED: contractors, ai_concierge_sessions verified October 16, 2025
// ================================================================
// VERIFIED FIELD NAMES:
// - contractors: id, email, name, company_name, focus_areas, revenue_tier, team_size
// - contractors AI fields: ai_summary, ai_insights, ai_tags, ai_quality_score
// - contractors engagement: engagement_score, churn_risk, growth_potential, next_best_action
// - contractors goals: business_goals, current_challenges
// - contractors preferences: communication_preferences, learning_preferences
// - ai_concierge_sessions: contractor_id, started_at
// ================================================================

/**
 * Cache Warming Script
 * Pre-populates cache with frequently accessed data
 * Phase 5 Day 3: Caching Strategy Implementation
 */

const { query } = require('../src/config/database');
const cacheService = require('../src/services/cacheService');
const contextAssembler = require('../src/services/contextAssembler');

async function warmCache() {
  console.log('🔥 Starting Cache Warming Process...\n');
  console.log('='.repeat(60));

  try {
    // Step 1: Connect to Redis
    console.log('\n📡 Connecting to Redis...');
    await cacheService.connect();

    if (!cacheService.isConnected()) {
      console.log('⚠️  Redis not connected - skipping cache warming');
      console.log('   Cache warming requires Redis to be running');
      return;
    }

    console.log('✅ Redis connected successfully\n');

    // Step 2: Find active contractors (those with recent activity)
    console.log('📊 Finding active contractors (last 7 days)...');
    const activeContractors = await query(`
      SELECT DISTINCT contractor_id
      FROM ai_concierge_sessions
      WHERE started_at > NOW() - INTERVAL '7 days'
      ORDER BY started_at DESC
      LIMIT 100
    `);

    console.log(`   Found ${activeContractors.rows.length} active contractors\n`);

    // Step 3: Cache contractor bundles
    console.log('💾 Caching contractor bundles...');
    let contractorsCached = 0;

    for (const row of activeContractors.rows) {
      try {
        // Query contractor data with all AI-enhanced fields
        const contractor = await query(`
          SELECT
            id, email, name, company_name, phone,
            focus_areas, revenue_tier, team_size, annual_revenue,
            ai_summary, ai_insights, ai_tags, ai_quality_score,
            engagement_score, churn_risk, growth_potential, next_best_action,
            business_goals, current_challenges,
            communication_preferences, learning_preferences
          FROM contractors
          WHERE id = $1
        `, [row.contractor_id]);

        if (contractor.rows.length > 0) {
          const contractorData = contractor.rows[0];

          // Build contractor bundle
          const bundle = {
            id: contractorData.id,
            email: contractorData.email,
            name: contractorData.name,
            company_name: contractorData.company_name,
            phone: contractorData.phone,
            focus_areas: contractorData.focus_areas,
            revenue_tier: contractorData.revenue_tier,
            team_size: contractorData.team_size,
            annual_revenue: contractorData.annual_revenue,
            ai_summary: contractorData.ai_summary,
            ai_insights: contractorData.ai_insights,
            ai_tags: contractorData.ai_tags,
            ai_quality_score: contractorData.ai_quality_score,
            engagement_score: contractorData.engagement_score,
            churn_risk: contractorData.churn_risk,
            growth_potential: contractorData.growth_potential,
            next_best_action: contractorData.next_best_action,
            business_goals: contractorData.business_goals,
            current_challenges: contractorData.current_challenges,
            communication_preferences: contractorData.communication_preferences,
            learning_preferences: contractorData.learning_preferences
          };

          // Cache contractor bundle
          await cacheService.cacheContractorBundle(row.contractor_id, bundle);
          contractorsCached++;

          if (contractorsCached % 10 === 0) {
            console.log(`   Cached ${contractorsCached}/${activeContractors.rows.length} contractor bundles...`);
          }
        }
      } catch (error) {
        console.error(`   Error caching contractor ${row.contractor_id}:`, error.message);
      }
    }

    console.log(`✅ Cached ${contractorsCached} contractor bundles\n`);

    // Step 4: Cache event contexts for active contractors
    console.log('📅 Caching event contexts...');
    let eventContextsCached = 0;

    for (const row of activeContractors.rows) {
      try {
        // Use context assembler to get and cache event context
        await contextAssembler.getEventContext(row.contractor_id);
        eventContextsCached++;

        if (eventContextsCached % 10 === 0) {
          console.log(`   Cached ${eventContextsCached}/${activeContractors.rows.length} event contexts...`);
        }
      } catch (error) {
        console.error(`   Error caching event context for contractor ${row.contractor_id}:`, error.message);
      }
    }

    console.log(`✅ Cached ${eventContextsCached} event contexts\n`);

    // Step 5: Display cache statistics
    console.log('='.repeat(60));
    console.log('\n📈 Cache Warming Complete!');
    console.log(`   Contractor Bundles: ${contractorsCached} cached`);
    console.log(`   Event Contexts: ${eventContextsCached} cached`);

    const stats = await cacheService.getCacheStats();
    console.log(`\n📊 Cache Statistics:`);
    console.log(`   Total Sets: ${stats.application.sets}`);
    console.log(`   Hit Rate: ${stats.application.hitRate}`);

    console.log('\n' + '='.repeat(60));

  } catch (error) {
    console.error('\n❌ Cache Warming Error:', error.message);
    console.log('\nNote: Ensure Redis is running and database is accessible.');
  } finally {
    // Disconnect from Redis
    await cacheService.disconnect();
  }
}

// Run cache warming
warmCache()
  .then(() => {
    console.log('\n✅ Cache warming process complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
