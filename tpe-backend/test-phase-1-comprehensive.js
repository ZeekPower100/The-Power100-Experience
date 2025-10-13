/**
 * Phase 1 Day 4: Comprehensive Integration Testing
 *
 * Tests all Phase 1 components working together:
 * 1. Materialized views with different time scenarios
 * 2. Context Assembler querying and formatting
 * 3. Event View Refresher LISTEN/NOTIFY
 * 4. AI Concierge Controller integration
 * 5. End-to-end event context flow
 */

const contextAssembler = require('./src/services/contextAssembler');
const eventViewRefresher = require('./src/services/eventViewRefresher');
const aiConciergeController = require('./src/controllers/aiConciergeController');
const db = require('./src/config/database.postgresql');

// Test scenarios
const testScenarios = {
  contractor1: 1,
  contractor2: 2,
  testContractor: {
    name: 'Test User',
    company_name: 'Test Home Improvement Co',
    focus_areas: JSON.stringify(['customer_retention', 'operational_efficiency']),
    revenue_tier: '$1M-$5M',
    team_size: '10-25'
  }
};

async function testScenario1_MaterializedViews() {
  console.log('\n' + '='.repeat(70));
  console.log('SCENARIO 1: Materialized Views Data Accuracy');
  console.log('='.repeat(70));

  try {
    // Test view contents for contractor 1
    console.log('\n📊 Querying mv_sessions_now for contractor 1...');
    const sessionsNow = await contextAssembler.getSessionsNow(testScenarios.contractor1);
    console.log(`✅ Found ${sessionsNow.length} active sessions`);

    if (sessionsNow.length > 0) {
      console.log('\nActive session details:');
      sessionsNow.forEach((session, i) => {
        console.log(`  ${i + 1}. "${session.session_title}" by ${session.speaker_name}`);
        console.log(`     Location: ${session.session_location}`);
        console.log(`     Relevance: ${session.relevance_score}/100`);
        console.log(`     Focus area matches: ${session.focus_area_match_count}`);
      });
    }

    console.log('\n📊 Querying mv_sessions_next_60 for contractor 1...');
    const sessionsNext60 = await contextAssembler.getSessionsNext60(testScenarios.contractor1);
    console.log(`✅ Found ${sessionsNext60.length} upcoming sessions`);

    if (sessionsNext60.length > 0) {
      console.log('\nUpcoming session details:');
      sessionsNext60.forEach((session, i) => {
        const minutesRounded = Math.round(session.minutes_until_start);
        console.log(`  ${i + 1}. "${session.session_title}" by ${session.speaker_name}`);
        console.log(`     Starts in: ${minutesRounded} minutes`);
        console.log(`     Priority: ${session.priority_score}/100`);
        console.log(`     Match count: ${session.match_count}`);
      });
    }

    // Test context stats
    console.log('\n📊 Getting context stats...');
    const stats = await contextAssembler.getContextStats();
    console.log('Context statistics:');
    console.log(`  Contractors with active sessions: ${stats.contractors_with_active_sessions}`);
    console.log(`  Contractors with upcoming sessions: ${stats.contractors_with_upcoming_sessions}`);
    console.log(`  Events with active sessions: ${stats.events_with_active_sessions}`);
    console.log(`  Events with upcoming sessions: ${stats.events_with_upcoming_sessions}`);

    console.log('\n✅ Scenario 1 passed!');
    return true;
  } catch (error) {
    console.error('❌ Scenario 1 failed:', error);
    return false;
  }
}

async function testScenario2_ContextAssembly() {
  console.log('\n' + '='.repeat(70));
  console.log('SCENARIO 2: Context Assembly & Formatting');
  console.log('='.repeat(70));

  try {
    console.log('\n🔧 Assembling complete event context for contractor 1...');
    const eventContext = await contextAssembler.getEventContext(testScenarios.contractor1);

    console.log('\n✅ Event context assembled:');
    console.log(`  Total active sessions: ${eventContext.total_active_sessions}`);
    console.log(`  Total upcoming sessions: ${eventContext.total_upcoming_sessions}`);
    console.log(`  Context timestamp: ${eventContext.context_timestamp}`);

    console.log('\n📝 Formatting context for AI consumption...');
    const formattedContext = contextAssembler.formatForAI(eventContext);

    console.log('\n✅ Formatted context:');
    console.log('-'.repeat(70));
    console.log(formattedContext);
    console.log('-'.repeat(70));
    console.log(`\nFormatted context length: ${formattedContext.length} characters`);

    // Verify format structure
    const hasHeader = formattedContext.includes('EVENT CONTEXT');
    const hasNowSection = formattedContext.includes('SESSIONS HAPPENING RIGHT NOW') ||
                          formattedContext.includes('No sessions happening right now');
    const hasUpcomingSection = formattedContext.includes('UPCOMING SESSIONS') ||
                               formattedContext.includes('No sessions in the next 60 minutes');

    console.log('\n✅ Format validation:');
    console.log(`  Header present: ${hasHeader}`);
    console.log(`  "Now" section present: ${hasNowSection}`);
    console.log(`  "Upcoming" section present: ${hasUpcomingSection}`);

    if (!hasHeader || !hasNowSection || !hasUpcomingSection) {
      throw new Error('Formatted context missing required sections');
    }

    console.log('\n✅ Scenario 2 passed!');
    return true;
  } catch (error) {
    console.error('❌ Scenario 2 failed:', error);
    return false;
  }
}

async function testScenario3_ViewRefresher() {
  console.log('\n' + '='.repeat(70));
  console.log('SCENARIO 3: Event View Refresher Operations');
  console.log('='.repeat(70));

  try {
    console.log('\n🔧 Initializing Event View Refresher...');
    await eventViewRefresher.initialize();
    console.log('✅ Refresher initialized');

    console.log('\n📊 Initial metrics:');
    const initialMetrics = eventViewRefresher.getMetrics();
    console.log(`  Last refresh: ${initialMetrics.lastRefresh || 'Never'}`);
    console.log(`  Total refreshes: ${initialMetrics.totalRefreshes}`);
    console.log(`  Is listening: ${initialMetrics.isListening}`);
    console.log(`  Debounce: ${initialMetrics.debounceMs}ms`);

    console.log('\n🔄 Testing manual refresh...');
    const refreshResult = await eventViewRefresher.manualRefresh();
    console.log(`✅ Refresh completed in ${refreshResult.duration}ms`);

    console.log('\n📊 Metrics after refresh:');
    const afterMetrics = eventViewRefresher.getMetrics();
    console.log(`  Last refresh: ${afterMetrics.lastRefresh}`);
    console.log(`  Total refreshes: ${afterMetrics.totalRefreshes}`);
    console.log(`  Errors: ${afterMetrics.errors}`);

    console.log('\n🔍 Checking view freshness...');
    const freshness = await eventViewRefresher.checkViewFreshness();
    console.log(`  Needs refresh: ${freshness.needsRefresh}`);
    console.log(`  Reason: ${freshness.reason}`);

    console.log('\n🛑 Shutting down refresher...');
    await eventViewRefresher.shutdown();
    console.log('✅ Graceful shutdown completed');

    console.log('\n✅ Scenario 3 passed!');
    return true;
  } catch (error) {
    console.error('❌ Scenario 3 failed:', error);
    await eventViewRefresher.shutdown();
    return false;
  }
}

async function testScenario4_AIIntegration() {
  console.log('\n' + '='.repeat(70));
  console.log('SCENARIO 4: AI Concierge Controller Integration');
  console.log('='.repeat(70));

  try {
    console.log('\n💬 Testing AI response with event context...');

    const response = await aiConciergeController.generateAIResponse(
      'What sessions are happening at the event right now?',
      testScenarios.testContractor,
      testScenarios.contractor1
    );

    console.log('\n✅ AI response generated');
    console.log(`\nResponse preview (first 300 characters):`);
    console.log('-'.repeat(70));
    const preview = typeof response === 'string'
      ? response.substring(0, 300)
      : JSON.stringify(response, null, 2).substring(0, 300);
    console.log(preview + '...');
    console.log('-'.repeat(70));

    // Verify response is not empty
    if (!response || (typeof response === 'string' && response.length === 0)) {
      throw new Error('Empty AI response');
    }

    console.log('\n✅ Scenario 4 passed!');
    return true;
  } catch (error) {
    console.error('❌ Scenario 4 failed:', error);
    return false;
  }
}

async function testScenario5_EndToEnd() {
  console.log('\n' + '='.repeat(70));
  console.log('SCENARIO 5: End-to-End Flow Verification');
  console.log('='.repeat(70));

  try {
    console.log('\n🔄 Testing complete flow: Database → Views → Context → AI');

    // 1. Verify database has sessions
    console.log('\n1️⃣ Checking database for event sessions...');
    const sessionCheck = await db.query(
      'SELECT COUNT(*) as total FROM event_speakers WHERE session_time IS NOT NULL AND session_end IS NOT NULL'
    );
    const totalSessions = parseInt(sessionCheck.rows[0].total);
    console.log(`   ✅ Found ${totalSessions} sessions with complete time data`);

    if (totalSessions === 0) {
      throw new Error('No sessions in database - cannot test end-to-end flow');
    }

    // 2. Verify materialized views exist
    console.log('\n2️⃣ Verifying materialized views exist...');
    const viewCheck = await db.query(
      `SELECT COUNT(*) as view_count FROM pg_matviews
       WHERE matviewname IN ('mv_sessions_now', 'mv_sessions_next_60')`
    );
    const viewCount = parseInt(viewCheck.rows[0].view_count);
    console.log(`   ✅ Found ${viewCount}/2 materialized views`);

    if (viewCount !== 2) {
      throw new Error('Materialized views not found in database');
    }

    // 3. Test Context Assembler can query views
    console.log('\n3️⃣ Testing Context Assembler...');
    const context = await contextAssembler.getEventContext(testScenarios.contractor1);
    console.log(`   ✅ Context assembled: ${context.total_active_sessions + context.total_upcoming_sessions} total sessions`);

    // 4. Test formatted output
    console.log('\n4️⃣ Testing context formatting...');
    const formatted = contextAssembler.formatForAI(context);
    console.log(`   ✅ Formatted context: ${formatted.length} characters`);

    // 5. Test AI integration
    console.log('\n5️⃣ Testing AI Concierge integration...');
    const aiResponse = await aiConciergeController.generateAIResponse(
      'Tell me about current event sessions',
      testScenarios.testContractor,
      testScenarios.contractor1
    );
    console.log(`   ✅ AI response generated successfully`);

    console.log('\n✅ Scenario 5 passed! Complete end-to-end flow verified');
    return true;
  } catch (error) {
    console.error('❌ Scenario 5 failed:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║  Phase 1 Day 4: Comprehensive Integration Testing                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log('\nDatabase: Local Development');
  console.log('Date:', new Date().toISOString());

  const results = {
    scenario1: false,
    scenario2: false,
    scenario3: false,
    scenario4: false,
    scenario5: false
  };

  try {
    results.scenario1 = await testScenario1_MaterializedViews();
    results.scenario2 = await testScenario2_ContextAssembly();
    results.scenario3 = await testScenario3_ViewRefresher();
    results.scenario4 = await testScenario4_AIIntegration();
    results.scenario5 = await testScenario5_EndToEnd();

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Scenario 1 - Materialized Views:        ${results.scenario1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Scenario 2 - Context Assembly:          ${results.scenario2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Scenario 3 - Event View Refresher:      ${results.scenario3 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Scenario 4 - AI Integration:            ${results.scenario4 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Scenario 5 - End-to-End Flow:           ${results.scenario5 ? '✅ PASS' : '❌ FAIL'}`);

    const allPassed = Object.values(results).every(result => result === true);
    const passCount = Object.values(results).filter(result => result === true).length;

    console.log('\n' + '='.repeat(70));
    if (allPassed) {
      console.log('🎉 ALL TESTS PASSED! Phase 1 is ready for production.');
    } else {
      console.log(`⚠️  ${passCount}/5 tests passed. Review failed scenarios above.`);
    }
    console.log('='.repeat(70));

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    process.exit(1);
  }
}

// Run all tests
runAllTests();
