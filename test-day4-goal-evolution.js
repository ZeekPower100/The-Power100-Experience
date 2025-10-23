/**
 * Phase 3 - Day 4: Goal Evolution & Adaptation Tests
 *
 * Tests for goalEvolutionService.js:
 * - Goal evolution with different evolution types
 * - Automatic goal adjustment based on contractor behavior
 * - New goal generation when appropriate
 * - Abandoned goal analysis and insights
 * - Evolution history tracking
 */

require('dotenv').config({ path: './tpe-backend/.env.development' });
const { query } = require('./tpe-backend/src/config/database');
const goalEvolutionService = require('./tpe-backend/src/services/goalEvolutionService');

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
let testGoalId2 = null;

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
    ['Test', 'Contractor', `test_phase3_day4_${timestamp}@example.com`, '555-0400']
  );
  return result.rows[0].id;
}

async function createTestGoal(contractorId, priorityScore = 7, status = 'active', lastActionDaysAgo = 0) {
  const lastActionAt = new Date();
  lastActionAt.setDate(lastActionAt.getDate() - lastActionDaysAgo);

  const result = await query(
    `INSERT INTO ai_concierge_goals (
      contractor_id,
      goal_type,
      goal_description,
      priority_score,
      current_progress,
      status,
      last_action_at,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    RETURNING id`,
    [
      contractorId,
      'revenue_growth',
      'Test Goal: Increase annual revenue to $1M',
      priorityScore,
      25, // 25% progress
      status,
      lastActionAt
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

async function testEvolveGoal() {
  log('\n--- Test 1: Evolve Goal (Refinement) ---', 'cyan');

  try {
    const evolution = await goalEvolutionService.evolveGoal({
      goal_id: testGoalId,
      evolution_type: 'refinement',
      evolved_description: 'Refined Goal: Increase MRR to $85K/month by Q2 2026',
      reason: 'Contractor feedback indicated focus on monthly recurring revenue',
      confidence: 0.85,
      relevance_score: 9,
      auto_approve: true
    });

    if (evolution.evolution && evolution.auto_approved) {
      log('✓ Goal evolved successfully', 'green');
      log(`  Evolution ID: ${evolution.evolution.id}`, 'blue');
      log(`  Evolution Type: ${evolution.evolution.evolution_type}`, 'blue');
      log(`  Confidence: ${evolution.evolution.ai_confidence_in_change}`, 'blue');
      log(`  Relevance Score: ${evolution.evolution.goal_relevance_score}`, 'blue');
      log(`  Auto-Approved: ${evolution.auto_approved}`, 'blue');

      // Verify goal was updated
      const goalCheck = await query('SELECT goal_description FROM ai_concierge_goals WHERE id = $1', [testGoalId]);
      if (goalCheck.rows[0].goal_description.includes('Refined Goal')) {
        log('  ✓ Goal description updated in database', 'blue');
        return true;
      } else {
        log('  ✗ Goal description not updated', 'red');
        return false;
      }
    } else {
      log('✗ Goal evolution failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testEvolveGoalPendingApproval() {
  log('\n--- Test 2: Evolve Goal (Pending Approval) ---', 'cyan');

  try {
    const evolution = await goalEvolutionService.evolveGoal({
      goal_id: testGoalId,
      evolution_type: 'expansion',
      evolved_description: 'Expanded Goal: Add product line to reach $1.5M annual revenue',
      reason: 'Pattern data suggests expansion opportunity',
      confidence: 0.65,
      relevance_score: 8,
      auto_approve: false // Wait for contractor approval
    });

    if (evolution.evolution && !evolution.auto_approved) {
      log('✓ Goal evolution logged (pending approval)', 'green');
      log(`  Evolution ID: ${evolution.evolution.id}`, 'blue');
      log(`  Contractor Approved: ${evolution.evolution.contractor_approved}`, 'blue');
      log(`  Message: ${evolution.message}`, 'blue');

      // Verify goal was NOT updated (pending approval)
      const goalCheck = await query('SELECT goal_description FROM ai_concierge_goals WHERE id = $1', [testGoalId]);
      if (!goalCheck.rows[0].goal_description.includes('Expanded Goal')) {
        log('  ✓ Goal NOT updated (waiting for approval) ✓', 'blue');
        return true;
      } else {
        log('  ✗ Goal was updated (should be pending)', 'red');
        return false;
      }
    } else {
      log('✗ Evolution pending logic failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testAdjustGoalsBasedOnBehavior() {
  log('\n--- Test 3: Automatic Goal Adjustment Based on Behavior ---', 'cyan');

  try {
    // Create goals with different activity patterns
    const activeGoal = await createTestGoal(testContractorId, 6, 'active', 3); // Active 3 days ago
    const stalledGoal = await createTestGoal(testContractorId, 8, 'active', 35); // Stalled 35 days ago
    const abandonedGoal = await createTestGoal(testContractorId, 7, 'active', 65); // Abandoned 65 days ago

    const adjustments = await goalEvolutionService.adjustGoalsBasedOnBehavior(testContractorId);

    const hasIncreasedPriority = adjustments.increased_priority.some(a => a.goal_id === activeGoal);
    const hasLoweredPriority = adjustments.lowered_priority.some(a => a.goal_id === stalledGoal);
    const hasMarkedAbandoned = adjustments.marked_abandoned.some(a => a.goal_id === abandonedGoal);

    if (hasIncreasedPriority && hasLoweredPriority && hasMarkedAbandoned) {
      log('✓ Automatic adjustments working correctly', 'green');
      log(`  Increased Priority: ${adjustments.increased_priority.length} goal(s)`, 'blue');
      log(`  Lowered Priority: ${adjustments.lowered_priority.length} goal(s)`, 'blue');
      log(`  Marked Stalled: ${adjustments.marked_stalled.length} goal(s)`, 'blue');
      log(`  Marked Abandoned: ${adjustments.marked_abandoned.length} goal(s)`, 'blue');

      if (adjustments.increased_priority.length > 0) {
        const adj = adjustments.increased_priority[0];
        log(`  Example: Priority ${adj.old_priority} → ${adj.new_priority} (${adj.reason})`, 'blue');
      }

      return true;
    } else {
      log('✗ Not all adjustment types triggered', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGenerateNewGoal() {
  log('\n--- Test 4: Generate New Goal When Appropriate ---', 'cyan');

  try {
    const newGoal = await goalEvolutionService.generateNewGoal({
      contractor_id: testContractorId,
      goal_type: 'team_building',
      goal_description: 'Hire VP of Sales by Q1 2026',
      reason: 'Previous goal completed: reached $1M revenue milestone',
      priority_score: 8,
      trigger_context: { completed_goal_id: testGoalId }
    });

    if (newGoal.generated && newGoal.goal) {
      log('✓ New goal generated successfully', 'green');
      log(`  Goal ID: ${newGoal.goal.id}`, 'blue');
      log(`  Goal Type: ${newGoal.goal.goal_type}`, 'blue');
      log(`  Description: ${newGoal.goal.goal_description}`, 'blue');
      log(`  Priority: ${newGoal.goal.priority_score}`, 'blue');
      log(`  Reason: ${newGoal.reason}`, 'blue');
      log(`  Active Goals: ${newGoal.active_goal_count}`, 'blue');
      return true;
    } else {
      log('✗ Goal generation failed', 'red');
      log(`  Generated: ${newGoal.generated}`, 'red');
      log(`  Reason: ${newGoal.reason || 'Unknown'}`, 'red');
      log(`  Active Goal Count: ${newGoal.active_goal_count || 'Unknown'}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    console.error(error);
    return false;
  }
}

async function testMaxGoalsLimit() {
  log('\n--- Test 5: Max Goals Limit (4 Active Goals) ---', 'cyan');

  try {
    // Create 4 active goals (including existing ones)
    const currentCount = await query(
      'SELECT COUNT(*) as count FROM ai_concierge_goals WHERE contractor_id = $1 AND status = $2',
      [testContractorId, 'active']
    );
    const current = parseInt(currentCount.rows[0].count);

    // Create goals up to limit of 4
    const goalsNeeded = 4 - current;
    for (let i = 0; i < goalsNeeded; i++) {
      await createTestGoal(testContractorId, 5, 'active', 5);
    }

    // Try to create 5th goal (should be blocked)
    const blockedGoal = await goalEvolutionService.generateNewGoal({
      contractor_id: testContractorId,
      goal_type: 'operations',
      goal_description: 'This should be blocked',
      reason: 'Testing max goals limit',
      priority_score: 5
    });

    if (!blockedGoal.generated && blockedGoal.reason.includes('Max active goals')) {
      log('✓ Max goals limit enforced correctly', 'green');
      log(`  Blocked Reason: ${blockedGoal.reason}`, 'blue');
      log(`  Active Goal Count: ${blockedGoal.active_goal_count}`, 'blue');
      return true;
    } else {
      log('✗ Max goals limit not enforced', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGetEvolutionHistory() {
  log('\n--- Test 6: Get Goal Evolution History ---', 'cyan');

  try {
    const history = await goalEvolutionService.getGoalEvolutionHistory(testGoalId);

    if (history.length >= 2) { // Should have at least 2 evolutions from tests 1 and 2
      log('✓ Evolution history retrieved', 'green');
      log(`  Total Evolutions: ${history.length}`, 'blue');
      log(`  Latest Evolution Type: ${history[0].evolution_type}`, 'blue');
      log(`  Original Description: "${history[0].original_description.substring(0, 50)}..."`, 'blue');
      log(`  Evolved Description: "${history[0].evolved_description.substring(0, 50)}..."`, 'blue');
      return true;
    } else {
      log('✗ Not enough evolution history', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGoalCompletionEvolution() {
  log('\n--- Test 7: Goal Completion Evolution ---', 'cyan');

  try {
    // Create a goal to complete
    const completionGoal = await createTestGoal(testContractorId, 8, 'active', 2);

    const evolution = await goalEvolutionService.evolveGoal({
      goal_id: completionGoal,
      evolution_type: 'goal_completion',
      evolved_description: 'Goal Completed: Increased annual revenue to $1M',
      reason: 'Contractor achieved revenue milestone',
      confidence: 1.0,
      relevance_score: 10,
      auto_approve: true
    });

    if (evolution.auto_approved) {
      // Check if goal status changed to completed
      const goalCheck = await query(
        'SELECT status, completed_at FROM ai_concierge_goals WHERE id = $1',
        [completionGoal]
      );

      if (goalCheck.rows[0].status === 'completed' && goalCheck.rows[0].completed_at) {
        log('✓ Goal completion evolution working', 'green');
        log(`  Status: ${goalCheck.rows[0].status}`, 'blue');
        log(`  Completed At: ${goalCheck.rows[0].completed_at}`, 'blue');
        return true;
      } else {
        log('✗ Goal not marked completed', 'red');
        return false;
      }
    } else {
      log('✗ Completion evolution failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testAnalyzeAbandonedGoals() {
  log('\n--- Test 8: Analyze Abandoned Goals ---', 'cyan');

  try {
    // First ensure we have some abandoned goals from test 3
    const analysis = await goalEvolutionService.analyzeAbandonedGoals(testContractorId);

    if (analysis.abandoned_by_type && analysis.common_reasons && analysis.insights) {
      log('✓ Abandoned goals analyzed', 'green');
      log(`  Abandoned Types: ${analysis.abandoned_by_type.length}`, 'blue');
      log(`  Common Reasons: ${analysis.common_reasons.length}`, 'blue');
      log(`  Insights Generated: ${analysis.insights.length}`, 'blue');

      if (analysis.abandoned_by_type.length > 0) {
        const type = analysis.abandoned_by_type[0];
        log(`  Example: ${type.goal_type} (${type.count} abandoned, avg ${type.avg_days_active} days)`, 'blue');
      }

      if (analysis.insights.length > 0) {
        log(`  Insight: "${analysis.insights[0]}"`, 'blue');
      }

      return true;
    } else {
      log('✗ Analysis incomplete', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testValidationConstraints() {
  log('\n--- Test 9: Validation Constraints ---', 'cyan');

  try {
    let errorsDetected = 0;

    // Test 1: Invalid evolution_type
    try {
      await goalEvolutionService.evolveGoal({
        goal_id: testGoalId,
        evolution_type: 'invalid_type',
        evolved_description: 'Test',
        reason: 'Test',
        confidence: 0.5,
        relevance_score: 5
      });
      log('  ✗ Invalid evolution_type not caught', 'red');
    } catch (error) {
      if (error.message.includes('Invalid evolution_type')) {
        log('  ✓ Invalid evolution_type rejected', 'green');
        errorsDetected++;
      }
    }

    // Test 2: Confidence out of range
    try {
      await goalEvolutionService.evolveGoal({
        goal_id: testGoalId,
        evolution_type: 'refinement',
        evolved_description: 'Test',
        reason: 'Test',
        confidence: 1.5, // Out of range
        relevance_score: 5
      });
      log('  ✗ Out-of-range confidence not caught', 'red');
    } catch (error) {
      if (error.message.includes('Confidence must be between 0 and 1')) {
        log('  ✓ Out-of-range confidence rejected', 'green');
        errorsDetected++;
      }
    }

    // Test 3: Relevance score out of range
    try {
      await goalEvolutionService.evolveGoal({
        goal_id: testGoalId,
        evolution_type: 'refinement',
        evolved_description: 'Test',
        reason: 'Test',
        confidence: 0.5,
        relevance_score: 15 // Out of range
      });
      log('  ✗ Out-of-range relevance_score not caught', 'red');
    } catch (error) {
      if (error.message.includes('Relevance score must be between 1 and 10')) {
        log('  ✓ Out-of-range relevance_score rejected', 'green');
        errorsDetected++;
      }
    }

    if (errorsDetected === 3) {
      log('✓ All validation constraints working', 'green');
      return true;
    } else {
      log(`✗ Only ${errorsDetected}/3 validation constraints working`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testPriorityChangeEvolution() {
  log('\n--- Test 10: Priority Change Evolution ---', 'cyan');

  try {
    // Get current priority
    const beforeCheck = await query('SELECT priority_score FROM ai_concierge_goals WHERE id = $1', [testGoalId2]);
    const priorityBefore = beforeCheck.rows[0].priority_score;

    const evolution = await goalEvolutionService.evolveGoal({
      goal_id: testGoalId2,
      evolution_type: 'priority_change',
      evolved_description: 'Updated priority based on contractor engagement',
      reason: 'Contractor actively working on this goal',
      confidence: 0.9,
      relevance_score: 8,
      auto_approve: true
    });

    // Check if priority increased
    const afterCheck = await query('SELECT priority_score FROM ai_concierge_goals WHERE id = $1', [testGoalId2]);
    const priorityAfter = afterCheck.rows[0].priority_score;

    if (priorityAfter > priorityBefore && evolution.auto_approved) {
      log('✓ Priority change evolution working', 'green');
      log(`  Priority Before: ${priorityBefore}`, 'blue');
      log(`  Priority After: ${priorityAfter}`, 'blue');
      log(`  Increased by: +${priorityAfter - priorityBefore}`, 'blue');
      return true;
    } else {
      log('✗ Priority not changed correctly', 'red');
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
  log('║  PHASE 3 - DAY 4: GOAL EVOLUTION & ADAPTATION TESTS           ║', 'yellow');
  log('╚════════════════════════════════════════════════════════════════╝', 'yellow');

  const results = [];

  try {
    // Setup
    log('\n--- Setup ---', 'cyan');
    testContractorId = await createTestContractor();
    testGoalId = await createTestGoal(testContractorId, 8, 'active', 10);
    testGoalId2 = await createTestGoal(testContractorId, 5, 'active', 5);
    log(`✓ Created test contractor (ID: ${testContractorId})`, 'green');
    log(`✓ Created test goal 1 (ID: ${testGoalId})`, 'green');
    log(`✓ Created test goal 2 (ID: ${testGoalId2})`, 'green');

    // Run tests (Test 4 before Test 3 to avoid hitting max goals limit)
    results.push(await testEvolveGoal());
    results.push(await testEvolveGoalPendingApproval());
    results.push(await testGenerateNewGoal());
    results.push(await testAdjustGoalsBasedOnBehavior());
    results.push(await testMaxGoalsLimit());
    results.push(await testGetEvolutionHistory());
    results.push(await testGoalCompletionEvolution());
    results.push(await testAnalyzeAbandonedGoals());
    results.push(await testValidationConstraints());
    results.push(await testPriorityChangeEvolution());

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
      log('✓ ALL TESTS PASSED - DAY 4 COMPLETE!\n', 'green');
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
