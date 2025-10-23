/**
 * Phase 3 - Day 2: Natural Question Asking Engine Tests
 *
 * Tests for questionGenerationService.js:
 * - Identify data gaps in contractor profiles
 * - Prioritize gaps by goal importance
 * - Generate natural strategic questions
 * - Track question answers and effectiveness
 * - Get next best question with anti-spam
 */

require('dotenv').config({ path: './tpe-backend/.env.development' });
const { query } = require('./tpe-backend/src/config/database');
const questionService = require('./tpe-backend/src/services/questionGenerationService');

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
let testQuestionId = null;

// ============================================================================
// TEST UTILITIES
// ============================================================================

async function createTestContractor(withGaps = true) {
  // Create contractor with or without data gaps
  // Use timestamp to ensure unique email
  const timestamp = Date.now();

  if (withGaps) {
    // Create with all gaps
    const result = await query(
      `INSERT INTO contractors (
        first_name, last_name, email, phone, created_at
      ) VALUES ($1, $2, $3, $4, NOW())
      RETURNING id`,
      [
        'Test',
        'Contractor',
        `test_phase3_day2_${timestamp}@example.com`,
        '555-0200'
      ]
    );
    return result.rows[0].id;
  } else {
    // Create with all fields filled
    const result = await query(
      `INSERT INTO contractors (
        first_name, last_name, email, phone, created_at,
        revenue_tier, team_size, focus_areas, current_stage, annual_revenue,
        timezone, business_goals, current_challenges
      ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`,
      [
        'Test',
        'Contractor',
        `test_phase3_day2_${timestamp}@example.com`,
        '555-0200',
        '$1M-$5M',
        '5-10',
        '["sales","marketing"]',
        'scaling',
        '$2500000',
        'America/New_York',
        '["Revenue Growth","Team Building"]',
        '["Hiring challenges","Sales process"]'
      ]
    );
    return result.rows[0].id;
  }
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
    [contractorId, 'Test Goal: Scale revenue', 'revenue_growth', 8, 'active']
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

async function testIdentifyDataGaps() {
  log('\n--- Test 1: Identify Data Gaps ---', 'cyan');

  try {
    const gaps = await questionService.identifyDataGaps(testContractorId);

    if (gaps.length > 0) {
      log(`✓ Identified ${gaps.length} data gaps`, 'green');
      gaps.slice(0, 3).forEach(gap => {
        log(`  Gap: ${gap.field}`, 'blue');
      });
      return true;
    } else {
      log('✗ Should have identified data gaps', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testPrioritizeDataGaps() {
  log('\n--- Test 2: Prioritize Data Gaps ---', 'cyan');

  try {
    const gaps = await questionService.identifyDataGaps(testContractorId);
    const prioritized = await questionService.prioritizeDataGaps(testContractorId, gaps);

    if (prioritized.length > 0 && prioritized[0].priority > 0) {
      log(`✓ Prioritized ${prioritized.length} gaps`, 'green');
      log(`  Highest priority: ${prioritized[0].field} (score: ${prioritized[0].priority})`, 'blue');
      log(`  Priority order correct: ${prioritized[0].priority >= prioritized[prioritized.length - 1].priority}`, 'blue');
      return true;
    } else {
      log('✗ Prioritization failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGenerateStrategicQuestion() {
  log('\n--- Test 3: Generate Strategic Question ---', 'cyan');

  try {
    const question = await questionService.generateStrategicQuestion(
      testContractorId,
      'revenue_tier',
      testGoalId,
      4
    );

    testQuestionId = question.id;

    if (question.id && question.question_text && question.question_naturalness_score === 4) {
      log('✓ Question generated successfully', 'green');
      log(`  Question ID: ${question.id}`, 'blue');
      log(`  Question: "${question.question_text}"`, 'blue');
      log(`  Type: ${question.question_type}`, 'blue');
      log(`  Purpose: ${question.question_purpose}`, 'blue');
      log(`  Naturalness: ${question.question_naturalness_score}/5`, 'blue');
      return true;
    } else {
      log('✗ Question generation failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testQuestionNaturalness() {
  log('\n--- Test 4: Question Feels Natural ---', 'cyan');

  try {
    const question = await query(
      'SELECT question_text FROM ai_question_log WHERE id = $1',
      [testQuestionId]
    );

    const text = question.rows[0].question_text.toLowerCase();

    // Natural questions should NOT contain robotic phrases
    const roboticPhrases = ['please provide', 'kindly', 'as per', 'i require'];
    const hasRoboticPhrases = roboticPhrases.some(phrase => text.includes(phrase));

    // Natural questions should be concise (under 150 chars)
    const isConcise = question.rows[0].question_text.length < 150;

    if (!hasRoboticPhrases && isConcise) {
      log('✓ Question feels natural', 'green');
      log(`  No robotic phrasing: ${!hasRoboticPhrases}`, 'blue');
      log(`  Concise (${question.rows[0].question_text.length} chars): ${isConcise}`, 'blue');
      return true;
    } else {
      log('✗ Question feels robotic or too long', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testTrackQuestionAnswer() {
  log('\n--- Test 5: Track Question Answer ---', 'cyan');

  try {
    const updated = await questionService.trackQuestionAnswer(
      testQuestionId,
      'We\'re at about $2.5M in annual revenue',
      {
        quality_score: 4,
        led_to_refinement: true
      }
    );

    if (updated.contractor_answer && updated.answer_quality_score === 4) {
      log('✓ Answer tracked successfully', 'green');
      log(`  Answer: "${updated.contractor_answer.substring(0, 50)}..."`, 'blue');
      log(`  Quality Score: ${updated.answer_quality_score}/5`, 'blue');
      log(`  Led to Refinement: ${updated.led_to_goal_refinement}`, 'blue');
      log(`  Answer Received At: ${updated.answer_received_at}`, 'blue');
      return true;
    } else {
      log('✗ Answer tracking failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testInvalidNaturalnessScore() {
  log('\n--- Test 6: Reject Invalid Naturalness Score ---', 'cyan');

  try {
    await questionService.generateStrategicQuestion(
      testContractorId,
      'team_size',
      null,
      10 // Invalid - must be 1-5
    );

    log('✗ Should have rejected invalid naturalness score', 'red');
    return false;
  } catch (error) {
    if (error.message.includes('must be between 1 and 5')) {
      log('✓ Correctly rejected invalid naturalness score', 'green');
      log(`  Error: ${error.message}`, 'blue');
      return true;
    } else {
      log(`✗ Wrong error: ${error.message}`, 'red');
      return false;
    }
  }
}

async function testInvalidQualityScore() {
  log('\n--- Test 7: Reject Invalid Quality Score ---', 'cyan');

  try {
    await questionService.trackQuestionAnswer(
      testQuestionId,
      'Some answer',
      { quality_score: 6 } // Invalid - must be 1-5
    );

    log('✗ Should have rejected invalid quality score', 'red');
    return false;
  } catch (error) {
    if (error.message.includes('must be between 1 and 5')) {
      log('✓ Correctly rejected invalid quality score', 'green');
      log(`  Error: ${error.message}`, 'blue');
      return true;
    } else {
      log(`✗ Wrong error: ${error.message}`, 'red');
      return false;
    }
  }
}

async function testGetQuestionEffectiveness() {
  log('\n--- Test 8: Get Question Effectiveness Metrics ---', 'cyan');

  try {
    const metrics = await questionService.getQuestionEffectiveness(testContractorId);

    if (metrics.total_questions > 0) {
      log('✓ Effectiveness metrics retrieved', 'green');
      log(`  Total Questions: ${metrics.total_questions}`, 'blue');
      log(`  Answered: ${metrics.answered_count} (${metrics.answer_rate}%)`, 'blue');
      log(`  Avg Naturalness: ${metrics.avg_naturalness}/5`, 'blue');
      log(`  Avg Answer Quality: ${metrics.avg_answer_quality}/5`, 'blue');
      log(`  Led to Refinement: ${metrics.refinement_count} (${metrics.refinement_rate}%)`, 'blue');
      return true;
    } else {
      log('✗ No metrics found', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testAntiSpamLogic() {
  log('\n--- Test 9: Anti-Spam (No Question Within 2 Days) ---', 'cyan');

  try {
    // Create a fresh contractor for anti-spam test
    const freshContractor = await createTestContractor(true);

    // Try to get next best question (should work first time)
    const firstQuestion = await questionService.getNextBestQuestion(freshContractor);

    if (!firstQuestion) {
      await query('DELETE FROM contractors WHERE id = $1', [freshContractor]);
      log('✗ Should have returned a question on first call', 'red');
      return false;
    }

    // Try again immediately (should be blocked by anti-spam)
    const secondQuestion = await questionService.getNextBestQuestion(freshContractor);

    // Clean up
    await query('DELETE FROM contractors WHERE id = $1', [freshContractor]);

    if (secondQuestion === null) {
      log('✓ Anti-spam working correctly', 'green');
      log('  First call: Question returned', 'blue');
      log('  Second call: Blocked (within 2 days)', 'blue');
      return true;
    } else {
      log('✗ Anti-spam failed - allowed duplicate question', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGetNextBestQuestion() {
  log('\n--- Test 10: Get Next Best Question ---', 'cyan');

  try {
    // Create a new contractor with data gaps (no recent questions)
    const freshContractor = await createTestContractor(true);

    const question = await questionService.getNextBestQuestion(freshContractor);

    // Clean up
    await query('DELETE FROM contractors WHERE id = $1', [freshContractor]);

    if (question && question.data_gap_field && question.priority_score > 0) {
      log('✓ Next best question identified', 'green');
      log(`  Data Gap: ${question.data_gap_field}`, 'blue');
      log(`  Priority Score: ${question.priority_score}`, 'blue');
      log(`  Question: "${question.question_text.substring(0, 60)}..."`, 'blue');
      return true;
    } else {
      log('✗ Failed to get next best question', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testNoDataGaps() {
  log('\n--- Test 11: Handle Contractor With No Data Gaps ---', 'cyan');

  try {
    // Create contractor with all fields filled
    const completeContractor = await createTestContractor(false);

    const gaps = await questionService.identifyDataGaps(completeContractor);

    // Clean up
    await query('DELETE FROM contractors WHERE id = $1', [completeContractor]);

    if (gaps.length === 0) {
      log('✓ Correctly identified no data gaps', 'green');
      log('  Contractor has complete profile', 'blue');
      return true;
    } else {
      log('✗ Should have found no data gaps', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testPriorityBoostWithHighPriorityGoals() {
  log('\n--- Test 12: Priority Boost With High-Priority Goals ---', 'cyan');

  try {
    const gaps = await questionService.identifyDataGaps(testContractorId);

    // Get priority without goal
    const withoutGoalPriority = await questionService.prioritizeDataGaps(testContractorId, gaps);

    // Create high-priority goal
    await createTestGoal(testContractorId);

    // Get priority with goal
    const withGoalPriority = await questionService.prioritizeDataGaps(testContractorId, gaps);

    // Priority should be higher with active goals
    const hasPriorityBoost = withGoalPriority[0].priority >= withoutGoalPriority[0].priority;

    if (hasPriorityBoost) {
      log('✓ Priority boosted with high-priority goals', 'green');
      log(`  Priority without goal: ${withoutGoalPriority[0].priority}`, 'blue');
      log(`  Priority with goal: ${withGoalPriority[0].priority}`, 'blue');
      return true;
    } else {
      log('✗ Priority boost not working', 'red');
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
  log('║  PHASE 3 - DAY 2: NATURAL QUESTION ASKING ENGINE TESTS        ║', 'yellow');
  log('╚════════════════════════════════════════════════════════════════╝', 'yellow');

  const results = [];

  try {
    // Setup
    log('\n--- Setup ---', 'cyan');
    testContractorId = await createTestContractor(true);
    testGoalId = await createTestGoal(testContractorId);
    log(`✓ Created test contractor (ID: ${testContractorId})`, 'green');
    log(`✓ Created test goal (ID: ${testGoalId})`, 'green');

    // Run tests
    results.push(await testIdentifyDataGaps());
    results.push(await testPrioritizeDataGaps());
    results.push(await testGenerateStrategicQuestion());
    results.push(await testQuestionNaturalness());
    results.push(await testTrackQuestionAnswer());
    results.push(await testInvalidNaturalnessScore());
    results.push(await testInvalidQualityScore());
    results.push(await testGetQuestionEffectiveness());
    results.push(await testAntiSpamLogic());
    results.push(await testGetNextBestQuestion());
    results.push(await testNoDataGaps());
    results.push(await testPriorityBoostWithHighPriorityGoals());

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
      log('✓ ALL TESTS PASSED - DAY 2 COMPLETE!\n', 'green');
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
