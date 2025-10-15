// DATABASE-CHECKED: Tests use existing verified database tables
// ================================================================
// Guard Test Suite - Phase 3 Day 3
// ================================================================
// Purpose: Test all AI Action Guard scenarios to ensure proper functionality
// Run with: node tpe-backend/src/services/guards/test-guards.js
// ================================================================

const AIActionGuards = require('./aiActionGuards');
const GuardLogger = require('./guardLogger');

// Test contractor ID (assumes contractor 1 exists in database)
const TEST_CONTRACTOR_ID = 1;
const NON_EXISTENT_CONTRACTOR_ID = 999999;

/**
 * Test Suite Runner
 */
async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║         AI ACTION GUARDS - TEST SUITE                          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log('');

  let testsPassed = 0;
  let testsFailed = 0;

  // Test 1: Permission Check - Valid Contractor
  console.log('🧪 Test 1: canCreateActionItem() - Valid Contractor');
  try {
    const result = await AIActionGuards.canCreateActionItem(TEST_CONTRACTOR_ID);
    console.log('   Result:', JSON.stringify(result, null, 2));

    if (result.allowed !== undefined && result.reason) {
      console.log('   ✅ PASS - Returns proper structure');
      testsPassed++;

      // Log this check
      await GuardLogger.logGuardCheck(TEST_CONTRACTOR_ID, 'create_action_item_permission_test', result);
    } else {
      console.log('   ❌ FAIL - Missing required fields');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ FAIL - Error:', error.message);
    testsFailed++;
  }
  console.log('');

  // Test 2: Permission Check - Non-existent Contractor
  console.log('🧪 Test 2: canCreateActionItem() - Non-existent Contractor');
  try {
    const result = await AIActionGuards.canCreateActionItem(NON_EXISTENT_CONTRACTOR_ID);
    console.log('   Result:', JSON.stringify(result, null, 2));

    if (!result.allowed && result.reason === 'Contractor not found') {
      console.log('   ✅ PASS - Correctly blocks non-existent contractor');
      testsPassed++;
    } else {
      console.log('   ❌ FAIL - Should block non-existent contractor');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ FAIL - Error:', error.message);
    testsFailed++;
  }
  console.log('');

  // Test 3: Action Item Limit Check
  console.log('🧪 Test 3: checkActionItemLimit() - Count Active Items');
  try {
    const result = await AIActionGuards.checkActionItemLimit(TEST_CONTRACTOR_ID);
    console.log('   Result:', JSON.stringify(result, null, 2));

    if (result.current !== undefined && result.max !== undefined) {
      console.log('   ✅ PASS - Returns current and max counts');
      testsPassed++;

      // Log this check
      await GuardLogger.logGuardCheck(TEST_CONTRACTOR_ID, 'action_item_limit_test', result);
    } else {
      console.log('   ❌ FAIL - Missing current or max fields');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ FAIL - Error:', error.message);
    testsFailed++;
  }
  console.log('');

  // Test 4: Rate Limit Check
  console.log('🧪 Test 4: checkRateLimit() - Action Item Create');
  try {
    const result = await AIActionGuards.checkRateLimit(TEST_CONTRACTOR_ID, 'action_item_create');
    console.log('   Result:', JSON.stringify(result, null, 2));

    if (result.current !== undefined && result.limit !== undefined) {
      console.log('   ✅ PASS - Returns current count and limit');
      testsPassed++;

      // Log this check
      await GuardLogger.logGuardCheck(TEST_CONTRACTOR_ID, 'rate_limit_action_item_create_test', result);
    } else {
      console.log('   ❌ FAIL - Missing current or limit fields');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ FAIL - Error:', error.message);
    testsFailed++;
  }
  console.log('');

  // Test 5: Rate Limit - Unknown Operation
  console.log('🧪 Test 5: checkRateLimit() - Unknown Operation');
  try {
    const result = await AIActionGuards.checkRateLimit(TEST_CONTRACTOR_ID, 'unknown_operation');
    console.log('   Result:', JSON.stringify(result, null, 2));

    if (result.allowed === true && result.reason.includes('No rate limit')) {
      console.log('   ✅ PASS - Allows unknown operations by default');
      testsPassed++;
    } else {
      console.log('   ❌ FAIL - Should allow unknown operations');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ FAIL - Error:', error.message);
    testsFailed++;
  }
  console.log('');

  // Test 6: Partner Access Check - Valid Partner
  console.log('🧪 Test 6: canAccessPartner() - Valid Partner (assumes partner 1 exists)');
  try {
    const result = await AIActionGuards.canAccessPartner(TEST_CONTRACTOR_ID, 1);
    console.log('   Result:', JSON.stringify(result, null, 2));

    if (result.allowed !== undefined && result.reason) {
      console.log('   ✅ PASS - Returns proper structure');
      testsPassed++;

      // Log this check
      await GuardLogger.logGuardCheck(TEST_CONTRACTOR_ID, 'partner_access_test', result);
    } else {
      console.log('   ❌ FAIL - Missing required fields');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ FAIL - Error:', error.message);
    testsFailed++;
  }
  console.log('');

  // Test 7: Comprehensive Check
  console.log('🧪 Test 7: canCreateActionItemComprehensive() - All Checks');
  try {
    const result = await AIActionGuards.canCreateActionItemComprehensive(TEST_CONTRACTOR_ID);
    console.log('   Result:', JSON.stringify(result, null, 2));

    if (result.checksRun && result.checksRun.length === 3) {
      console.log('   ✅ PASS - Runs all 3 checks (permission, rate limit, item limit)');
      testsPassed++;

      // Log comprehensive check result
      await GuardLogger.logGuardCheck(TEST_CONTRACTOR_ID, 'comprehensive_check_test', result);
    } else {
      console.log('   ❌ FAIL - Should run 3 checks');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ FAIL - Error:', error.message);
    testsFailed++;
  }
  console.log('');

  // Test 8: Guard Logger - Get Recent Violations
  console.log('🧪 Test 8: GuardLogger.getRecentViolations()');
  try {
    const violations = await GuardLogger.getRecentViolations(TEST_CONTRACTOR_ID, 10);
    console.log('   Found', violations.length, 'recent violations');

    if (Array.isArray(violations)) {
      console.log('   ✅ PASS - Returns array of violations');
      testsPassed++;
    } else {
      console.log('   ❌ FAIL - Should return array');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ FAIL - Error:', error.message);
    testsFailed++;
  }
  console.log('');

  // Test 9: Guard Logger - Get Stats
  console.log('🧪 Test 9: GuardLogger.getGuardStats()');
  try {
    const stats = await GuardLogger.getGuardStats(TEST_CONTRACTOR_ID, 30);
    console.log('   Stats:', JSON.stringify(stats, null, 2));

    if (stats.total_checks !== undefined && stats.checks_passed !== undefined) {
      console.log('   ✅ PASS - Returns guard statistics');
      testsPassed++;
    } else {
      console.log('   ❌ FAIL - Missing statistics fields');
      testsFailed++;
    }
  } catch (error) {
    console.log('   ❌ FAIL - Error:', error.message);
    testsFailed++;
  }
  console.log('');

  // Test Summary
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║                     TEST SUMMARY                               ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');
  console.log(`   Tests Passed: ${testsPassed}`);
  console.log(`   Tests Failed: ${testsFailed}`);
  console.log(`   Total Tests:  ${testsPassed + testsFailed}`);
  console.log('');

  if (testsFailed === 0) {
    console.log('   🎉 ALL TESTS PASSED! AI Action Guards are working correctly.');
  } else {
    console.log('   ⚠️  SOME TESTS FAILED. Review errors above.');
  }

  console.log('');
  console.log('══════════════════════════════════════════════════════════════════');

  // Exit with appropriate code
  process.exit(testsFailed === 0 ? 0 : 1);
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runTests };
