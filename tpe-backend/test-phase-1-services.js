/**
 * Test Script for Phase 1 Services
 *
 * Tests:
 * 1. Context Assembler - Query materialized views
 * 2. Event View Refresher - Manual refresh and metrics
 */

const contextAssembler = require('./src/services/contextAssembler');
const eventViewRefresher = require('./src/services/eventViewRefresher');

async function testContextAssembler() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 1: Context Assembler Service');
  console.log('='.repeat(60));

  try {
    // Test 1: Get context stats
    console.log('\n📊 Getting context stats...');
    const stats = await contextAssembler.getContextStats();
    console.log('Stats:', JSON.stringify(stats, null, 2));

    // Test 2: Get event context for a contractor (use contractor ID 1)
    console.log('\n👤 Getting event context for contractor ID 1...');
    const context = await contextAssembler.getEventContext(1);
    console.log('Context:', JSON.stringify(context, null, 2));

    // Test 3: Format context for AI
    console.log('\n🤖 Formatting context for AI consumption...');
    const formattedContext = contextAssembler.formatForAI(context);
    console.log(formattedContext);

    console.log('\n✅ Context Assembler tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Context Assembler test failed:', error);
    return false;
  }
}

async function testEventViewRefresher() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST 2: Event View Refresher Service');
  console.log('='.repeat(60));

  try {
    // Test 1: Initialize the refresher
    console.log('\n🔧 Initializing Event View Refresher...');
    await eventViewRefresher.initialize();

    // Test 2: Check current metrics
    console.log('\n📈 Current metrics:');
    const metrics1 = eventViewRefresher.getMetrics();
    console.log(JSON.stringify(metrics1, null, 2));

    // Test 3: Check view freshness
    console.log('\n🔍 Checking view freshness...');
    const freshness = await eventViewRefresher.checkViewFreshness();
    console.log('Freshness check:', JSON.stringify(freshness, null, 2));

    // Test 4: Manual refresh
    console.log('\n🔄 Triggering manual refresh...');
    const refreshResult = await eventViewRefresher.manualRefresh();
    console.log('Refresh result:', JSON.stringify(refreshResult, null, 2));

    // Test 5: Check metrics after refresh
    console.log('\n📈 Metrics after refresh:');
    const metrics2 = eventViewRefresher.getMetrics();
    console.log(JSON.stringify(metrics2, null, 2));

    // Test 6: Verify listening status
    console.log('\n👂 Checking LISTEN status...');
    console.log('Is listening:', eventViewRefresher.isListening);

    console.log('\n✅ Event View Refresher tests passed!');
    return true;
  } catch (error) {
    console.error('❌ Event View Refresher test failed:', error);
    return false;
  }
}

async function runTests() {
  console.log('\n🧪 Starting Phase 1 Service Tests');
  console.log('Database: Local Development');
  console.log('Date:', new Date().toISOString());

  try {
    // Run Context Assembler tests
    const test1Passed = await testContextAssembler();

    // Run Event View Refresher tests
    const test2Passed = await testEventViewRefresher();

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Context Assembler: ${test1Passed ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Event View Refresher: ${test2Passed ? '✅ PASS' : '❌ FAIL'}`);

    if (test1Passed && test2Passed) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n⚠️  Some tests failed');
    }

    // Cleanup
    console.log('\n🧹 Cleaning up...');
    await eventViewRefresher.shutdown();

    process.exit(test1Passed && test2Passed ? 0 : 1);
  } catch (error) {
    console.error('\n❌ Test suite error:', error);
    await eventViewRefresher.shutdown();
    process.exit(1);
  }
}

// Run tests
runTests();
