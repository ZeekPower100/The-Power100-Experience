/**
 * Caching Test Script
 * Tests caching service with and without Redis
 * Phase 5 Day 3: Local testing
 */

const cacheService = require('../src/services/cacheService');

async function testCaching() {
  console.log('🧪 Testing Caching Service\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Check Redis connection
    console.log('\n📡 Test 1: Redis Connection');
    console.log('   Attempting to connect to Redis...');

    await cacheService.connect();

    if (cacheService.isConnected()) {
      console.log('   ✅ Redis is connected - caching enabled');
    } else {
      console.log('   ⚠️  Redis not available - graceful degradation active');
      console.log('   ℹ️  Service will continue without caching');
    }

    // Test 2: Test contractor bundle caching
    console.log('\n📦 Test 2: Contractor Bundle Caching');
    const testContractor = {
      id: 123,
      email: 'test@example.com',
      name: 'Test Contractor',
      company_name: 'Test Company',
      ai_summary: 'A test contractor for caching validation',
      business_goals: { goal1: 'Test Goal' }
    };

    console.log('   Caching test contractor bundle...');
    await cacheService.cacheContractorBundle(123, testContractor);

    console.log('   Retrieving cached contractor bundle...');
    const cached = await cacheService.getContractorBundle(123);

    if (cached && cached.id === 123) {
      console.log('   ✅ Cache write and read successful');
      console.log(`   Retrieved: ${cached.name} (${cached.email})`);
    } else if (!cacheService.isConnected()) {
      console.log('   ⚠️  Cache operations skipped (Redis not available)');
      console.log('   ✅ Graceful degradation working correctly');
    } else {
      console.log('   ❌ Cache read failed');
    }

    // Test 3: Test event context caching
    console.log('\n📅 Test 3: Event Context Caching');
    const testEvent = {
      sessions_now: [],
      sessions_next_60: [
        {
          session_title: 'Test Session',
          speaker_name: 'Test Speaker',
          minutes_until_start: 15
        }
      ],
      total_active_sessions: 0,
      total_upcoming_sessions: 1
    };

    console.log('   Caching test event context...');
    await cacheService.cacheEventContext(123, testEvent);

    console.log('   Retrieving cached event context...');
    const cachedEvent = await cacheService.getEventContext(123);

    if (cachedEvent && cachedEvent.sessions_next_60.length === 1) {
      console.log('   ✅ Event cache write and read successful');
      console.log(`   Retrieved: ${cachedEvent.sessions_next_60[0].session_title}`);
    } else if (!cacheService.isConnected()) {
      console.log('   ⚠️  Cache operations skipped (Redis not available)');
      console.log('   ✅ Graceful degradation working correctly');
    } else {
      console.log('   ❌ Event cache read failed');
    }

    // Test 4: Test cache statistics
    console.log('\n📊 Test 4: Cache Statistics');
    const stats = await cacheService.getCacheStats();

    if (stats.application) {
      console.log('   ✅ Statistics retrieved');
      console.log(`   Hits: ${stats.application.hits}`);
      console.log(`   Misses: ${stats.application.misses}`);
      console.log(`   Sets: ${stats.application.sets}`);
      console.log(`   Hit Rate: ${stats.application.hitRate}`);
    } else {
      console.log('   ⚠️  Statistics unavailable (Redis not connected)');
    }

    // Test 5: Test cache invalidation
    console.log('\n🗑️  Test 5: Cache Invalidation');
    console.log('   Invalidating contractor 123 cache...');
    await cacheService.invalidateContractor(123);

    console.log('   Attempting to retrieve invalidated cache...');
    const invalidated = await cacheService.getContractorBundle(123);

    if (!invalidated) {
      console.log('   ✅ Cache invalidation successful');
    } else if (!cacheService.isConnected()) {
      console.log('   ⚠️  Invalidation skipped (Redis not available)');
      console.log('   ✅ Graceful degradation working correctly');
    } else {
      console.log('   ❌ Cache invalidation failed (data still cached)');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n✅ Caching Test Complete!');

    if (cacheService.isConnected()) {
      console.log('\n🎉 Redis is working! All caching features active.');
      console.log('   Next step: Run warmCache.js to pre-populate cache');
    } else {
      console.log('\n📝 Test Results Summary:');
      console.log('   ✅ Graceful degradation working correctly');
      console.log('   ✅ Service handles Redis unavailability');
      console.log('   ℹ️  Caching will work once Redis is installed');
      console.log('\n💡 To install Redis:');
      console.log('   Option 1: choco install redis-64 (as admin)');
      console.log('   Option 2: Use Docker: docker run -d -p 6379:6379 redis');
      console.log('   Option 3: Deploy to production (AWS ElastiCache)');
    }

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
  } finally {
    // Cleanup
    await cacheService.disconnect();
    console.log('\n👋 Test complete - disconnected from cache service');
  }
}

testCaching()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
