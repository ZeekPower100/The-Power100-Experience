/**
 * Phase 3 - Day 1: Proactive Message System Tests
 *
 * Tests for proactiveMessageService.js:
 * - Schedule proactive messages
 * - Generate follow-up messages
 * - Track message outcomes
 * - Evaluate proactive triggers
 */

require('dotenv').config({ path: './tpe-backend/.env.development' });
const { query } = require('./tpe-backend/src/config/database');
const proactiveMessageService = require('./tpe-backend/src/services/proactiveMessageService');

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
let testMessageId = null;

// ============================================================================
// TEST UTILITIES
// ============================================================================

async function createTestContractor() {
  const result = await query(
    `INSERT INTO contractors (
      first_name, last_name, email, phone, revenue_tier, created_at
    ) VALUES ($1, $2, $3, $4, $5, NOW())
    RETURNING id`,
    ['Test', 'Contractor', 'test_phase3_day1@example.com', '555-0100', '$1M-$5M']
  );
  return result.rows[0].id;
}

async function createTestGoal(contractorId) {
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
    [
      contractorId,
      'Test Goal: Scale to $5M revenue',
      'revenue_growth',
      8,
      'active'
    ]
  );
  return result.rows[0].id;
}

async function createTestChecklistItem(goalId, contractorId, status = 'pending') {
  const result = await query(
    `INSERT INTO ai_concierge_checklist_items (
      goal_id,
      contractor_id,
      checklist_item,
      status,
      created_at
    ) VALUES ($1, $2, $3, $4, NOW())
    RETURNING id`,
    [goalId, contractorId, 'Test checklist item', status]
  );
  return result.rows[0].id;
}

async function cleanup() {
  if (testContractorId) {
    // CASCADE will delete all related records
    await query('DELETE FROM contractors WHERE id = $1', [testContractorId]);
  }
}

// ============================================================================
// TEST SCENARIOS
// ============================================================================

async function testScheduleProactiveMessage() {
  log('\n--- Test 1: Schedule Proactive Message ---', 'cyan');

  try {
    const message = await proactiveMessageService.scheduleProactiveMessage({
      contractor_id: testContractorId,
      message_type: 'check_in',
      message_content: 'Hi! Just checking in on your progress this week.',
      ai_reasoning: 'Routine check-in to maintain engagement',
      context_data: {
        test: true,
        goal_id: testGoalId
      }
    });

    testMessageId = message.id;

    if (message.id && message.message_type === 'check_in') {
      log('✓ Message scheduled successfully', 'green');
      log(`  Message ID: ${message.id}`, 'blue');
      log(`  Type: ${message.message_type}`, 'blue');
      log(`  Content: "${message.message_content.substring(0, 50)}..."`, 'blue');
      return true;
    } else {
      log('✗ Message scheduling failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testInvalidMessageType() {
  log('\n--- Test 2: Reject Invalid Message Type ---', 'cyan');

  try {
    await proactiveMessageService.scheduleProactiveMessage({
      contractor_id: testContractorId,
      message_type: 'invalid_type', // Should fail
      message_content: 'Test message',
      ai_reasoning: 'Test'
    });

    log('✗ Should have rejected invalid message type', 'red');
    return false;
  } catch (error) {
    if (error.message.includes('Invalid message_type')) {
      log('✓ Correctly rejected invalid message type', 'green');
      log(`  Error: ${error.message}`, 'blue');
      return true;
    } else {
      log(`✗ Wrong error: ${error.message}`, 'red');
      return false;
    }
  }
}

async function testGenerateFollowUpMessage() {
  log('\n--- Test 3: Generate Follow-Up Message ---', 'cyan');

  try {
    const followUp = await proactiveMessageService.generateFollowUpMessage(
      testContractorId,
      {
        goal_id: testGoalId,
        milestone_name: 'Hire first salesperson'
      }
    );

    if (followUp.id && followUp.message_type === 'milestone_follow_up') {
      log('✓ Follow-up message generated', 'green');
      log(`  Message ID: ${followUp.id}`, 'blue');
      log(`  Type: ${followUp.message_type}`, 'blue');
      log(`  Content: "${followUp.message_content}"`, 'blue');
      log(`  AI Reasoning: "${followUp.ai_reasoning}"`, 'blue');
      return true;
    } else {
      log('✗ Follow-up generation failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testTrackMessageOutcome() {
  log('\n--- Test 4: Track Message Outcome ---', 'cyan');

  try {
    const updated = await proactiveMessageService.trackMessageOutcome(testMessageId, {
      contractor_response: 'Things are going great! Thanks for checking in.',
      conversation_continued: true,
      outcome_rating: 5,
      led_to_action: false
    });

    if (updated.contractor_response && updated.outcome_rating === 5) {
      log('✓ Message outcome tracked', 'green');
      log(`  Response: "${updated.contractor_response.substring(0, 50)}..."`, 'blue');
      log(`  Outcome Rating: ${updated.outcome_rating}/5`, 'blue');
      log(`  Conversation Continued: ${updated.conversation_continued}`, 'blue');
      log(`  Led to Action: ${updated.led_to_action}`, 'blue');
      return true;
    } else {
      log('✗ Outcome tracking failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testInvalidOutcomeRating() {
  log('\n--- Test 5: Reject Invalid Outcome Rating ---', 'cyan');

  try {
    await proactiveMessageService.trackMessageOutcome(testMessageId, {
      outcome_rating: 10 // Should fail (must be 1-5)
    });

    log('✗ Should have rejected invalid outcome rating', 'red');
    return false;
  } catch (error) {
    if (error.message.includes('must be between 1 and 5')) {
      log('✓ Correctly rejected invalid outcome rating', 'green');
      log(`  Error: ${error.message}`, 'blue');
      return true;
    } else {
      log(`✗ Wrong error: ${error.message}`, 'red');
      return false;
    }
  }
}

async function testGetScheduledMessages() {
  log('\n--- Test 6: Get Scheduled Messages ---', 'cyan');

  try {
    const messages = await proactiveMessageService.getScheduledMessages(testContractorId);

    if (messages.length > 0) {
      log(`✓ Retrieved ${messages.length} scheduled messages`, 'green');
      log(`  Most recent: "${messages[0].message_content.substring(0, 50)}..."`, 'blue');
      return true;
    } else {
      log('✗ No messages found', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testMarkMessageAsSent() {
  log('\n--- Test 7: Mark Message as Sent ---', 'cyan');

  try {
    const sent = await proactiveMessageService.markMessageAsSent(testMessageId);

    if (sent.sent_at) {
      log('✓ Message marked as sent', 'green');
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

async function testEvaluateProactiveTriggersHighPriorityGoal() {
  log('\n--- Test 8: Evaluate Triggers - High Priority Goal ---', 'cyan');

  try {
    // Create a high-priority goal with pending checklist items
    const highPriorityGoal = await query(
      `INSERT INTO ai_concierge_goals (
        contractor_id, goal_description, goal_type, priority_score, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id`,
      [testContractorId, 'Critical: Hire VP of Sales', 'revenue_growth', 9, 'active']
    );

    await createTestChecklistItem(highPriorityGoal.rows[0].id, testContractorId, 'pending');

    const triggers = await proactiveMessageService.evaluateProactiveTriggers(testContractorId);

    const highPriorityTrigger = triggers.find(t => t.trigger_type === 'high_priority_goal');

    if (highPriorityTrigger) {
      log('✓ High-priority goal trigger identified', 'green');
      log(`  Trigger Type: ${highPriorityTrigger.trigger_type}`, 'blue');
      log(`  Message Type: ${highPriorityTrigger.message_type}`, 'blue');
      log(`  Content: "${highPriorityTrigger.message_content}"`, 'blue');
      log(`  AI Reasoning: "${highPriorityTrigger.ai_reasoning}"`, 'blue');
      return true;
    } else {
      log('✗ High-priority trigger not found', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testEvaluateProactiveTriggersStalled() {
  log('\n--- Test 9: Evaluate Triggers - Stalled Goal ---', 'cyan');

  try {
    // Create a goal that's 8 days old (stalled)
    const stalledGoal = await query(
      `INSERT INTO ai_concierge_goals (
        contractor_id, goal_description, goal_type, priority_score, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days')
      RETURNING id`,
      [testContractorId, 'Stalled: Build sales process', 'revenue_growth', 7, 'active']
    );

    const triggers = await proactiveMessageService.evaluateProactiveTriggers(testContractorId);

    const stalledTrigger = triggers.find(t => t.trigger_type === 'stalled_goal');

    if (stalledTrigger) {
      log('✓ Stalled goal trigger identified', 'green');
      log(`  Trigger Type: ${stalledTrigger.trigger_type}`, 'blue');
      log(`  Message Type: ${stalledTrigger.message_type}`, 'blue');
      log(`  Content: "${stalledTrigger.message_content}"`, 'blue');
      log(`  Days Stalled: ${stalledTrigger.context_data.days_stalled}`, 'blue');
      return true;
    } else {
      log('✗ Stalled goal trigger not found', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testEvaluateProactiveTriggersCelebration() {
  log('\n--- Test 10: Evaluate Triggers - Milestone Celebration ---', 'cyan');

  try {
    // Create a recently completed checklist item
    const celebrationGoal = await query(
      `INSERT INTO ai_concierge_goals (
        contractor_id, goal_description, goal_type, priority_score, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id`,
      [testContractorId, 'Achievement goal', 'revenue_growth', 6, 'active']
    );

    await query(
      `INSERT INTO ai_concierge_checklist_items (
        goal_id, contractor_id, checklist_item, status, completed_at, created_at
      ) VALUES ($1, $2, $3, $4, NOW() - INTERVAL '1 day', NOW())`,
      [celebrationGoal.rows[0].id, testContractorId, 'Hired first sales rep', 'completed']
    );

    const triggers = await proactiveMessageService.evaluateProactiveTriggers(testContractorId);

    const celebrationTrigger = triggers.find(t => t.trigger_type === 'milestone_achieved');

    if (celebrationTrigger) {
      log('✓ Milestone celebration trigger identified', 'green');
      log(`  Trigger Type: ${celebrationTrigger.trigger_type}`, 'blue');
      log(`  Message Type: ${celebrationTrigger.message_type}`, 'blue');
      log(`  Content: "${celebrationTrigger.message_content}"`, 'blue');
      return true;
    } else {
      log('✗ Celebration trigger not found', 'red');
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
  log('║  PHASE 3 - DAY 1: PROACTIVE MESSAGE SYSTEM TESTS              ║', 'yellow');
  log('╚════════════════════════════════════════════════════════════════╝', 'yellow');

  const results = [];

  try {
    // Setup
    log('\n--- Setup ---', 'cyan');
    testContractorId = await createTestContractor();
    testGoalId = await createTestGoal(testContractorId);
    log(`✓ Created test contractor (ID: ${testContractorId})`, 'green');
    log(`✓ Created test goal (ID: ${testGoalId})`, 'green');

    // Run tests
    results.push(await testScheduleProactiveMessage());
    results.push(await testInvalidMessageType());
    results.push(await testGenerateFollowUpMessage());
    results.push(await testTrackMessageOutcome());
    results.push(await testInvalidOutcomeRating());
    results.push(await testGetScheduledMessages());
    results.push(await testMarkMessageAsSent());
    results.push(await testEvaluateProactiveTriggersHighPriorityGoal());
    results.push(await testEvaluateProactiveTriggersStalled());
    results.push(await testEvaluateProactiveTriggersCelebration());

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
      log('✓ ALL TESTS PASSED - DAY 1 COMPLETE!\n', 'green');
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
