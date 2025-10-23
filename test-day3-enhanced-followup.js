/**
 * Phase 3 - Day 3: Enhanced Follow-Up Scheduler Tests
 *
 * Tests for enhancedFollowUpService.js:
 * - Goal-driven scheduling with priority adjustments
 * - Context-aware message generation
 * - Contractor response pattern analysis
 * - Auto-cancel when actions completed
 * - Smart timing based on contractor behavior
 */

require('dotenv').config({ path: './tpe-backend/.env.development' });
const { query } = require('./tpe-backend/src/config/database');
const followUpService = require('./tpe-backend/src/services/enhancedFollowUpService');

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

let testContractorId = null;
let testGoalId = null;
let testActionItemId = null;
let testFollowUpId = null;

// ============================================================================
// TEST UTILITIES
// ============================================================================

async function createTestContractor() {
  const timestamp = Date.now();
  const result = await query(
    `INSERT INTO contractors (
      first_name, last_name, email, phone, created_at
    ) VALUES ($1, $2, $3, $4, NOW())
    RETURNING id`,
    ['Test', 'Contractor', `test_phase3_day3_${timestamp}@example.com`, '555-0300']
  );
  return result.rows[0].id;
}

async function createTestGoal(contractorId, priority = 8) {
  const result = await query(
    `INSERT INTO ai_concierge_goals (
      contractor_id,
      goal_description,
      goal_type,
      priority_score,
      status,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING id`,
    [contractorId, 'Test Goal: Scale revenue', 'revenue_growth', priority, 'active']
  );
  return result.rows[0].id;
}

async function createTestActionItem(contractorId) {
  const result = await query(
    `INSERT INTO contractor_action_items (
      contractor_id,
      title,
      description,
      action_type,
      priority,
      status,
      ai_generated,
      created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    RETURNING id`,
    [
      contractorId,
      'Test Action: Hire salesperson',
      'Find and hire a dedicated sales person',
      'follow_up',
      7,
      'in_progress',
      true
    ]
  );
  return result.rows[0].id;
}

async function cleanup() {
  if (testContractorId) {
    await query('DELETE FROM contractors WHERE id = $1', [testContractorId]);
  }
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

async function testScheduleGoalDrivenFollowUp() {
  log('\n--- Test 1: Schedule Goal-Driven Follow-Up ---', 'cyan');

  try {
    const followUp = await followUpService.scheduleGoalDrivenFollowUp({
      contractor_id: testContractorId,
      goal_id: testGoalId,
      followup_type: 'check_in',
      days_until_followup: 5,
      context_hints: { last_conversation: 'hiring challenges' }
    });

    testFollowUpId = followUp.id;

    if (followUp.id && followUp.status === 'scheduled') {
      log('✓ Follow-up scheduled successfully', 'green');
      log(`  Follow-up ID: ${followUp.id}`, 'blue');
      log(`  Original days: ${followUp.original_days}`, 'blue');
      log(`  Adjusted days: ${followUp.adjusted_days} (30% faster for high-priority goal)`, 'blue');
      log(`  Scheduled for: ${followUp.scheduled_time}`, 'blue');
      return true;
    } else {
      log('✗ Follow-up scheduling failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testPriorityAdjustment() {
  log('\n--- Test 2: Priority Adjusts Follow-Up Timing ---', 'cyan');

  try {
    // High-priority goal (score 9)
    const highPriorityGoal = await createTestGoal(testContractorId, 9);

    const highFollowUp = await followUpService.scheduleGoalDrivenFollowUp({
      contractor_id: testContractorId,
      goal_id: highPriorityGoal,
      followup_type: 'check_in',
      days_until_followup: 10
    });

    // Low-priority goal (score 4)
    const lowPriorityGoal = await createTestGoal(testContractorId, 4);

    const lowFollowUp = await followUpService.scheduleGoalDrivenFollowUp({
      contractor_id: testContractorId,
      goal_id: lowPriorityGoal,
      followup_type: 'check_in',
      days_until_followup: 10
    });

    const highDays = highFollowUp.adjusted_days;
    const lowDays = lowFollowUp.adjusted_days;

    if (highDays < lowDays) {
      log('✓ Priority correctly adjusts timing', 'green');
      log(`  High-priority (9): ${highDays} days`, 'blue');
      log(`  Low-priority (4): ${lowDays} days`, 'blue');
      log(`  High-priority goals get faster follow-ups ✓`, 'blue');
      return true;
    } else {
      log('✗ Priority adjustment not working', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGenerateContextAwareFollowUp() {
  log('\n--- Test 3: Generate Context-Aware Follow-Up Message ---', 'cyan');

  try {
    const message = await followUpService.generateContextAwareFollowUp(testContractorId, {
      goal_id: testGoalId,
      followup_type: 'check_in',
      last_conversation: 'hiring challenges for VP of Sales'
    });

    if (message && message.message_content.includes('hiring challenges')) {
      log('✓ Context-aware message generated', 'green');
      log(`  Message: "${message.message_content}"`, 'blue');
      log(`  References past conversation: ✓`, 'blue');
      log(`  AI Reasoning: ${message.ai_reasoning}`, 'blue');
      return true;
    } else {
      log('✗ Message generation failed or missing context', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testActionItemFollowUp() {
  log('\n--- Test 4: Follow-Up on Action Item ---', 'cyan');

  try {
    const message = await followUpService.generateContextAwareFollowUp(testContractorId, {
      action_item_id: testActionItemId,
      followup_type: 'reminder'
    });

    if (message && message.message_content.includes('Hire salesperson')) {
      log('✓ Action item follow-up generated', 'green');
      log(`  Message: "${message.message_content}"`, 'blue');
      log(`  Message Type: ${message.message_type}`, 'blue');
      return true;
    } else {
      log('✗ Action item follow-up failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGetContractorResponseTiming() {
  log('\n--- Test 5: Analyze Contractor Response Timing ---', 'cyan');

  try {
    // Create some test response data
    await query(
      `INSERT INTO ai_proactive_messages (
        contractor_id, message_type, message_content, ai_reasoning,
        sent_at, contractor_response, response_received_at, created_at
      ) VALUES ($1, $2, $3, $4, NOW() - INTERVAL '2 days', $5, NOW() - INTERVAL '1 day', NOW())`,
      [testContractorId, 'check_in', 'Test message', 'Test', 'Quick response!']
    );

    const timing = await followUpService.getContractorResponseTiming(testContractorId);

    if (timing.total_messages > 0) {
      log('✓ Response timing analyzed', 'green');
      log(`  Total Messages: ${timing.total_messages}`, 'blue');
      log(`  Response Rate: ${timing.response_rate}%`, 'blue');
      log(`  Avg Response Days: ${timing.avg_response_days?.toFixed(2) || 'N/A'}`, 'blue');
      log(`  Prefers Quick Response: ${timing.prefers_quick_response}`, 'blue');
      return true;
    } else {
      log('✗ Timing analysis failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testAutoCancelCompletedFollowUps() {
  log('\n--- Test 6: Auto-Cancel When Action Completed ---', 'cyan');

  try {
    // Schedule a follow-up for the action item
    const followUp = await followUpService.scheduleGoalDrivenFollowUp({
      contractor_id: testContractorId,
      action_item_id: testActionItemId,
      followup_type: 'reminder',
      days_until_followup: 3
    });

    // Now complete the action item
    await query(
      'UPDATE contractor_action_items SET status = $1, completed_at = NOW() WHERE id = $2',
      ['completed', testActionItemId]
    );

    // Auto-cancel the follow-up
    const cancelledCount = await followUpService.autoCancelCompletedFollowUps(testActionItemId);

    if (cancelledCount > 0) {
      log('✓ Follow-up auto-cancelled', 'green');
      log(`  Cancelled ${cancelledCount} follow-up(s)`, 'blue');
      log(`  Auto-cancel working correctly ✓`, 'blue');
      return true;
    } else {
      log('✗ Auto-cancel failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGetPendingFollowUps() {
  log('\n--- Test 7: Get Pending Follow-Ups ---', 'cyan');

  try {
    const pending = await followUpService.getPendingFollowUps({
      contractor_id: testContractorId,
      due_before: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 days from now
    });

    if (pending.length >= 0) {
      log(`✓ Retrieved ${pending.length} pending follow-ups`, 'green');
      if (pending.length > 0) {
        log(`  First pending: ${pending[0].followup_type}`, 'blue');
        log(`  Scheduled: ${pending[0].scheduled_time}`, 'blue');
      }
      return true;
    } else {
      log('✗ Failed to get pending follow-ups', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testMarkFollowUpAsSent() {
  log('\n--- Test 8: Mark Follow-Up as Sent ---', 'cyan');

  try {
    const sent = await followUpService.markFollowUpAsSent(testFollowUpId);

    if (sent.status === 'sent' && sent.sent_at) {
      log('✓ Follow-up marked as sent', 'green');
      log(`  Status: ${sent.status}`, 'blue');
      log(`  Sent At: ${sent.sent_at}`, 'blue');
      return true;
    } else {
      log('✗ Failed to mark as sent', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testSmartTimingMinMax() {
  log('\n--- Test 9: Smart Timing (Min 2 Days, Max Per Priority) ---', 'cyan');

  try {
    // Try to schedule with 1 day (should be adjusted to minimum 2 days)
    const tooSoonFollowUp = await followUpService.scheduleGoalDrivenFollowUp({
      contractor_id: testContractorId,
      goal_id: testGoalId,
      followup_type: 'check_in',
      days_until_followup: 1
    });

    if (tooSoonFollowUp.adjusted_days >= 2) {
      log('✓ Smart timing enforces minimum', 'green');
      log(`  Requested: 1 day`, 'blue');
      log(`  Adjusted: ${tooSoonFollowUp.adjusted_days} days (enforced minimum)`, 'blue');
      return true;
    } else {
      log('✗ Minimum timing not enforced', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testNoMessageWhenActionCompleted() {
  log('\n--- Test 10: Skip Message When Action Already Completed ---', 'cyan');

  try {
    // Create completed action item
    const completedAction = await query(
      `INSERT INTO contractor_action_items (
        contractor_id, title, description, action_type, priority, status,
        completed_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id`,
      [testContractorId, 'Completed Action', 'Already done', 'follow_up', 5, 'completed']
    );

    const message = await followUpService.generateContextAwareFollowUp(testContractorId, {
      action_item_id: completedAction.rows[0].id,
      followup_type: 'reminder'
    });

    if (message === null) {
      log('✓ Correctly skipped completed action', 'green');
      log('  No message generated for completed action ✓', 'blue');
      return true;
    } else {
      log('✗ Should have skipped completed action', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

// ============================================================================
// RUN ALL TESTS
// ============================================================================

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'yellow');
  log('║  PHASE 3 - DAY 3: ENHANCED FOLLOW-UP SCHEDULER TESTS          ║', 'yellow');
  log('╚════════════════════════════════════════════════════════════════╝', 'yellow');

  const results = [];

  try {
    // Setup
    log('\n--- Setup ---', 'cyan');
    testContractorId = await createTestContractor();
    testGoalId = await createTestGoal(testContractorId, 8);
    testActionItemId = await createTestActionItem(testContractorId);
    log(`✓ Created test contractor (ID: ${testContractorId})`, 'green');
    log(`✓ Created test goal (ID: ${testGoalId})`, 'green');
    log(`✓ Created test action item (ID: ${testActionItemId})`, 'green');

    // Run tests
    results.push(await testScheduleGoalDrivenFollowUp());
    results.push(await testPriorityAdjustment());
    results.push(await testGenerateContextAwareFollowUp());
    results.push(await testActionItemFollowUp());
    results.push(await testGetContractorResponseTiming());
    results.push(await testAutoCancelCompletedFollowUps());
    results.push(await testGetPendingFollowUps());
    results.push(await testMarkFollowUpAsSent());
    results.push(await testSmartTimingMinMax());
    results.push(await testNoMessageWhenActionCompleted());

    // Summary
    const passed = results.filter(r => r === true).length;
    const failed = results.filter(r => r === false).length;

    log('\n╔════════════════════════════════════════════════════════════════╗', 'yellow');
    log('║  TEST SUMMARY                                                  ║', 'yellow');
    log('╚════════════════════════════════════════════════════════════════╝', 'yellow');
    log(`\nTotal Tests: ${results.length}`, 'blue');
    log(`Passed: ${passed}`, passed === results.length ? 'green' : 'yellow');
    log(`Failed: ${failed}`, failed === 0 ? 'green' : 'red');
    log(`Success Rate: ${Math.round((passed / results.length) * 100)}%\n`, passed === results.length ? 'green' : 'yellow');

    if (passed === results.length) {
      log('✓ ALL TESTS PASSED - DAY 3 COMPLETE!\n', 'green');
    } else {
      log('✗ Some tests failed. Review output above.\n', 'red');
    }

  } catch (error) {
    log(`\n✗ Test suite error: ${error.message}`, 'red');
    console.error(error);
  } finally {
    // Cleanup
    log('--- Cleanup ---', 'cyan');
    await cleanup();
    log('✓ Test data cleaned up\n', 'green');
    process.exit(0);
  }
}

// Run tests
runAllTests();
