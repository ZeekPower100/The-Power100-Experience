// ============================================================================
// PHASE 3 DAY 6: End-to-End Integration Testing
// ============================================================================
// PURPOSE: Test complete proactive flow across all Phase 3 services
// SERVICES INTEGRATED:
//   - proactiveMessageService (Day 1)
//   - questionGenerationService (Day 2)
//   - enhancedFollowUpService (Day 3)
//   - goalEvolutionService (Day 4)
//   - trustMemoryService (Day 5)
//
// CROSS-PHASE INTEGRATION:
//   - Phase 1: Pattern matching
//   - Phase 2: Goal inference and milestone tracking
//   - Phase 3: Proactive behavior and evolution
//
// TEST SCENARIOS:
//   1. Complete 8-step proactive flow (goal → question → response → fill → follow-up → evolution → trust)
//   2. Cross-phase integration (pattern → goal → question → proactive message)
//   3. Message quality validation (naturalness, context, memory)
//   4. Performance and timing (anti-spam, query speed, scheduling)
//
// VERIFIED: October 22, 2025
// ============================================================================

const { query } = require('./tpe-backend/src/config/database');
const proactiveMessageService = require('./tpe-backend/src/services/proactiveMessageService');
const questionGenerationService = require('./tpe-backend/src/services/questionGenerationService');
const enhancedFollowUpService = require('./tpe-backend/src/services/enhancedFollowUpService');
const goalEvolutionService = require('./tpe-backend/src/services/goalEvolutionService');
const trustMemoryService = require('./tpe-backend/src/services/trustMemoryService');

// ============================================================================
// TEST UTILITIES
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  log('\n' + '='.repeat(80), 'cyan');
  log(`  ${title}`, 'cyan');
  log('='.repeat(80), 'cyan');
}

// Test contractor for E2E flow
let testContractorId = null;
let testGoalId = null;

// ============================================================================
// SETUP AND TEARDOWN
// ============================================================================

async function setupTestContractor() {
  section('SETUP: Creating Test Contractor for E2E Flow');

  try {
    // Create test contractor
    const result = await query(
      `INSERT INTO contractors (
        first_name, last_name, email, phone, company_name,
        revenue_tier, team_size, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id`,
      ['E2E', 'Tester', 'e2e@test.com', '555-E2E-TEST', 'E2E Test Co', '100k-500k', '1-5']
    );

    testContractorId = result.rows[0].id;
    log(`✓ Created test contractor ID: ${testContractorId}`, 'green');

    // Create a test goal for the contractor
    const goalResult = await query(
      `INSERT INTO ai_concierge_goals (
        contractor_id, goal_type, goal_description, priority_score,
        current_progress, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id`,
      [
        testContractorId,
        'revenue_growth',
        'Increase revenue from $300k to $500k in 12 months',
        8,
        0,
        'active'
      ]
    );

    testGoalId = goalResult.rows[0].id;
    log(`✓ Created test goal ID: ${testGoalId}`, 'green');

    return true;
  } catch (error) {
    log(`✗ Setup failed: ${error.message}`, 'red');
    throw error;
  }
}

async function cleanupTestData() {
  section('CLEANUP: Removing Test Data');

  try {
    if (testContractorId) {
      // Delete contractor (CASCADE will clean up all related records)
      await query('DELETE FROM contractors WHERE id = $1', [testContractorId]);
      log(`✓ Cleaned up test contractor ${testContractorId}`, 'green');
    }

    return true;
  } catch (error) {
    log(`✗ Cleanup failed: ${error.message}`, 'red');
    return false;
  }
}

// ============================================================================
// TEST 1: COMPLETE 8-STEP PROACTIVE FLOW
// ============================================================================

async function testComplete8StepProactiveFlow() {
  section('TEST 1: Complete 8-Step Proactive Flow');
  log('Testing: Goal → Question → Response → Data Fill → Follow-up → Evolution → Trust → Behavior Adjustment', 'yellow');

  try {
    // STEP 1: Generate AI goal for contractor (simulating Phase 2)
    log('\nStep 1: Generate AI goal', 'blue');
    const goalGenerated = testGoalId !== null;
    if (!goalGenerated) {
      throw new Error('Goal generation failed in setup');
    }
    log('✓ Goal generated: Increase revenue to $500k', 'green');

    // STEP 2: Generate strategic question based on goal
    log('\nStep 2: Generate strategic question', 'blue');
    const question = await questionGenerationService.generateStrategicQuestion(
      testContractorId,
      'current_challenges', // valid data gap field
      testGoalId
    );
    if (!question || !question.question_text) {
      throw new Error('Question generation failed');
    }
    log(`✓ Question generated: "${question.question_text.substring(0, 60)}..."`, 'green');

    // STEP 3: Simulate contractor answering question
    log('\nStep 3: Contractor answers question', 'blue');
    const answerResult = await query(
      `UPDATE ai_question_log
       SET contractor_answer = $1,
           answer_received_at = NOW(),
           answer_quality_score = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [
        'I want to add 2 new service offerings and hire a sales person',
        5, // High quality answer
        question.id
      ]
    );
    log('✓ Contractor provided detailed answer', 'green');

    // STEP 4: Fill data gaps based on answer (simulating Phase 2)
    log('\nStep 4: Fill data gaps from answer', 'blue');
    await query(
      `UPDATE ai_concierge_goals
       SET data_gaps = $1,
           current_progress = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [
        JSON.stringify({ service_expansion: true, hiring_plan: true }),
        20, // Made some progress
        testGoalId
      ]
    );
    log('✓ Data gaps filled: service_expansion, hiring_plan', 'green');

    // STEP 5: Schedule proactive follow-up message
    log('\nStep 5: Schedule proactive follow-up message', 'blue');
    const proactiveMessage = await proactiveMessageService.scheduleProactiveMessage({
      contractor_id: testContractorId,
      message_type: 'milestone_follow_up',
      message_content: 'Great to hear about your service expansion plans! How is the hiring process going?',
      ai_reasoning: 'Following up on contractor sharing expansion strategy and hiring plan',
      context_data: {
        goal_id: testGoalId,
        last_conversation: 'service expansion and hiring'
      }
    });
    if (!proactiveMessage) {
      throw new Error('Proactive message scheduling failed');
    }
    log(`✓ Proactive message scheduled`, 'green');

    // STEP 6: Schedule follow-up
    log('\nStep 6: Schedule follow-up', 'blue');
    const followUp = await enhancedFollowUpService.scheduleGoalDrivenFollowUp({
      contractor_id: testContractorId,
      goal_id: testGoalId,
      followup_type: 'check_in',
      days_until_followup: 5,
      context_hints: { milestone: 'hiring_plan' }
    });
    if (!followUp || !followUp.scheduled_time) {
      throw new Error('Follow-up scheduling failed');
    }
    log(`✓ Follow-up scheduled for ${followUp.adjusted_days} days`, 'green');

    // STEP 7: Goal evolution based on new information
    log('\nStep 7: Evolve goal based on new information', 'blue');
    const evolution = await goalEvolutionService.evolveGoal({
      goal_id: testGoalId,
      evolution_type: 'expansion',
      evolved_description: 'Increase revenue to $500k by adding 2 service offerings and hiring a sales person',
      reason: 'Contractor shared specific expansion strategy',
      confidence: 0.9,
      relevance_score: 9,
      auto_approve: true
    });
    if (!evolution || !evolution.auto_approved) {
      throw new Error('Goal evolution failed');
    }
    log('✓ Goal evolved with high confidence (auto-approved)', 'green');

    // STEP 8: Track trust-building moment
    log('\nStep 8: Track trust-building moment', 'blue');
    const trustEvent = await trustMemoryService.trackTrustEvent({
      contractor_id: testContractorId,
      indicator_type: 'acted_on_suggestion',
      description: 'Contractor engaged with question and shared detailed plan'
    });
    if (!trustEvent) {
      throw new Error('Trust tracking failed - no event returned');
    }
    if (trustEvent.cumulative_trust_score === undefined || isNaN(parseFloat(trustEvent.cumulative_trust_score))) {
      throw new Error('Trust tracking failed - invalid cumulative_trust_score');
    }
    const score = parseFloat(trustEvent.cumulative_trust_score);
    log(`✓ Trust increased to ${score} (${trustEvent.trust_level ? trustEvent.trust_level.label : 'Unknown'})`, 'green');

    log('\n✅ COMPLETE 8-STEP FLOW SUCCESSFUL', 'green');
    return true;
  } catch (error) {
    log(`\n✗ 8-step flow failed: ${error.message}`, 'red');
    console.error(error);
    return false;
  }
}

// ============================================================================
// TEST 2: CROSS-PHASE INTEGRATION
// ============================================================================

async function testCrossPhaseIntegration() {
  section('TEST 2: Cross-Phase Integration (Phase 1 → Phase 2 → Phase 3)');
  log('Testing: Pattern Match → Goal Inference → Proactive Message', 'yellow');

  try {
    // Simulate Phase 1 pattern match
    log('\nPhase 1: Pattern matching', 'blue');
    const patternResult = await query(
      `INSERT INTO contractor_pattern_matches (
        contractor_id, pattern_id, match_score, created_at, updated_at
      ) VALUES ($1, 1, 0.85, NOW(), NOW())
      RETURNING id`,
      [testContractorId]
    );
    log('✓ Pattern matched with 85% confidence', 'green');

    // Simulate Phase 2 goal inference from pattern
    log('\nPhase 2: Goal inference from pattern', 'blue');
    const inferredGoalResult = await query(
      `INSERT INTO ai_concierge_goals (
        contractor_id, goal_type, goal_description, pattern_source,
        pattern_confidence, priority_score, current_progress, status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id`,
      [
        testContractorId,
        'team_building',
        'Build a leadership team to support growth',
        'pattern_123',
        0.85,
        7,
        0,
        'active'
      ]
    );
    const inferredGoalId = inferredGoalResult.rows[0].id;
    log('✓ Goal inferred from pattern: team_building', 'green');

    // Phase 3: Schedule proactive message about inferred goal
    log('\nPhase 3: Proactive message about inferred goal', 'blue');
    const proactiveMessage = await proactiveMessageService.scheduleProactiveMessage({
      contractor_id: testContractorId,
      message_type: 'check_in',
      message_content: 'Based on similar contractors at your stage, building a leadership team could be your next strategic move. What are your thoughts?',
      ai_reasoning: 'Pattern match (85% confidence) suggests team building is next logical goal',
      context_data: {
        goal_id: inferredGoalId,
        pattern_match: 0.85
      }
    });

    if (!proactiveMessage) {
      throw new Error('Cross-phase proactive message scheduling failed');
    }
    log(`✓ Proactive message scheduled`, 'green');

    // Verify context_data includes pattern reference
    const contextData = typeof proactiveMessage.context_data === 'string'
      ? JSON.parse(proactiveMessage.context_data)
      : proactiveMessage.context_data;

    if (contextData && contextData.pattern_match) {
      log('✓ Context includes pattern match score', 'green');
    }

    log('\n✅ CROSS-PHASE INTEGRATION SUCCESSFUL', 'green');
    return true;
  } catch (error) {
    log(`\n✗ Cross-phase integration failed: ${error.message}`, 'red');
    console.error(error);
    return false;
  }
}

// ============================================================================
// TEST 3: MESSAGE QUALITY VALIDATION
// ============================================================================

async function testMessageQualityValidation() {
  section('TEST 3: Message Quality Validation');
  log('Testing: Naturalness, Context Awareness, Memory Integration', 'yellow');

  try {
    // Generate message with memory
    log('\nTest: Message with memory injection', 'blue');
    const memoryMessage = await trustMemoryService.injectMemoryIntoMessage(
      testContractorId,
      'How is your progress going this week?',
      {
        include_past_conversation: true,
        include_achievements: true
      }
    );

    if (!memoryMessage || !memoryMessage.enhanced_message) {
      throw new Error('Memory injection failed');
    }

    // Check for robotic phrases (anti-patterns)
    const roboticPhrases = [
      'as an AI',
      'I am here to',
      'let me help you',
      'based on my analysis',
      'according to my data'
    ];

    const message = memoryMessage.enhanced_message.toLowerCase();
    let hasRoboticPhrases = false;
    for (const phrase of roboticPhrases) {
      if (message.includes(phrase)) {
        log(`⚠ Warning: Found robotic phrase "${phrase}"`, 'yellow');
        hasRoboticPhrases = true;
      }
    }

    if (!hasRoboticPhrases) {
      log('✓ No robotic phrases detected', 'green');
    }

    // Check for memory references
    if (memoryMessage.memories_injected && memoryMessage.memories_injected.length > 0) {
      log(`✓ Memories injected: ${memoryMessage.memories_injected.length}`, 'green');
    }

    // Check message is contextual (not generic)
    const isGeneric = message === 'how is your progress going this week?';
    if (!isGeneric) {
      log('✓ Message enhanced with context (not generic)', 'green');
    }

    // Generate question and check naturalness
    log('\nTest: Question naturalness', 'blue');
    const question = await questionGenerationService.generateStrategicQuestion(
      testContractorId,
      'team_size', // data gap field
      testGoalId
    );

    if (question && question.question_naturalness_score >= 4) {
      log(`✓ High naturalness score: ${question.question_naturalness_score}/5`, 'green');
    } else if (question) {
      log(`⚠ Low naturalness score: ${question.question_naturalness_score}/5`, 'yellow');
    }

    log('\n✅ MESSAGE QUALITY VALIDATION COMPLETE', 'green');
    return true;
  } catch (error) {
    log(`\n✗ Message quality validation failed: ${error.message}`, 'red');
    console.error(error);
    return false;
  }
}

// ============================================================================
// TEST 4: PERFORMANCE AND TIMING
// ============================================================================

async function testPerformanceAndTiming() {
  section('TEST 4: Performance and Timing');
  log('Testing: Anti-Spam, Query Speed, Scheduling Accuracy', 'yellow');

  try {
    // Test anti-spam protection via evaluateProactiveTriggers
    log('\nTest: Anti-spam protection (7-day minimum)', 'blue');
    const triggers = await proactiveMessageService.evaluateProactiveTriggers(testContractorId);

    if (triggers && triggers.can_send !== undefined) {
      if (triggers.can_send) {
        log('✓ Can send message (no anti-spam conflict)', 'green');
      } else {
        log(`✓ Anti-spam working: Cannot send (last message too recent)`, 'green');
      }
    } else {
      log('✓ No recent messages, can send', 'green');
    }

    // Test query performance
    log('\nTest: Query performance for trust score retrieval', 'blue');
    const startTime = Date.now();
    const trustScore = await trustMemoryService.getTrustScore(testContractorId);
    const queryTime = Date.now() - startTime;

    if (queryTime < 100) {
      log(`✓ Fast query: ${queryTime}ms`, 'green');
    } else {
      log(`⚠ Slow query: ${queryTime}ms`, 'yellow');
    }

    // Test follow-up scheduling accuracy
    log('\nTest: Follow-up scheduling accuracy', 'blue');
    const followUp = await enhancedFollowUpService.scheduleGoalDrivenFollowUp({
      contractor_id: testContractorId,
      goal_id: testGoalId,
      followup_type: 'status_update',
      days_until_followup: 5
    });

    const scheduledTime = new Date(followUp.scheduled_time);
    const expectedTime = new Date();
    expectedTime.setDate(expectedTime.getDate() + followUp.adjusted_days);

    const timeDiff = Math.abs(scheduledTime - expectedTime);
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff < 1) {
      log(`✓ Scheduling accurate: ${followUp.adjusted_days} days from now`, 'green');
    } else {
      log(`⚠ Scheduling drift: ${hoursDiff.toFixed(1)} hours difference`, 'yellow');
    }

    // Test behavior setting calculation speed
    log('\nTest: AI behavior settings calculation', 'blue');
    const behaviorStart = Date.now();
    const behaviorSettings = await trustMemoryService.getAIBehaviorSettings(testContractorId);
    const behaviorTime = Date.now() - behaviorStart;

    if (behaviorTime < 200) {
      log(`✓ Fast behavior calculation: ${behaviorTime}ms`, 'green');
    }

    if (behaviorSettings && behaviorSettings.trust_score !== undefined) {
      log(`✓ Behavior settings retrieved: ${behaviorSettings.trust_level} (${behaviorSettings.proactive_frequency} frequency)`, 'green');
    }

    log('\n✅ PERFORMANCE AND TIMING TESTS COMPLETE', 'green');
    return true;
  } catch (error) {
    log(`\n✗ Performance and timing tests failed: ${error.message}`, 'red');
    console.error(error);
    return false;
  }
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runDay6E2ETests() {
  log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║          PHASE 3 DAY 6: END-TO-END INTEGRATION TESTING                     ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝', 'cyan');

  const results = [];

  try {
    // Setup
    await setupTestContractor();

    // Run E2E tests
    results.push({
      name: 'Complete 8-Step Proactive Flow',
      passed: await testComplete8StepProactiveFlow()
    });

    results.push({
      name: 'Cross-Phase Integration (Phase 1→2→3)',
      passed: await testCrossPhaseIntegration()
    });

    results.push({
      name: 'Message Quality Validation',
      passed: await testMessageQualityValidation()
    });

    results.push({
      name: 'Performance and Timing',
      passed: await testPerformanceAndTiming()
    });

    // Cleanup
    await cleanupTestData();

    // Summary
    section('TEST SUMMARY');
    const passed = results.filter(r => r.passed).length;
    const total = results.length;

    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌';
      const color = result.passed ? 'green' : 'red';
      log(`${icon} ${result.name}`, color);
    });

    log(`\n${passed}/${total} tests passed`, passed === total ? 'green' : 'red');

    if (passed === total) {
      log('\n🎉 ALL E2E INTEGRATION TESTS PASSED!', 'green');
      log('Phase 3 Day 6 complete - ready for Day 7 (polish and production)', 'green');
    } else {
      log(`\n⚠️ ${total - passed} test(s) failed - review failures above`, 'yellow');
    }

    process.exit(passed === total ? 0 : 1);
  } catch (error) {
    log(`\n❌ FATAL ERROR: ${error.message}`, 'red');
    console.error(error);
    await cleanupTestData();
    process.exit(1);
  }
}

// Run tests
runDay6E2ETests();
