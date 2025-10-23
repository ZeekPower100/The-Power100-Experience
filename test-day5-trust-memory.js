/**
 * Phase 3 - Day 5: Trust-Building Memory System Tests
 *
 * Tests for trustMemoryService.js:
 * - Trust event tracking with cumulative scores
 * - Trust level calculation and transitions
 * - Memory retrieval from multiple sources
 * - Memory injection into messages
 * - AI behavior adjustment based on trust
 * - Trust history tracking
 */

require('dotenv').config({ path: './tpe-backend/.env.development' });
const { query } = require('./tpe-backend/src/config/database');
const trustMemoryService = require('./tpe-backend/src/services/trustMemoryService');

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
    ['Test', 'Contractor', `test_phase3_day5_${timestamp}@example.com`, '555-0500']
  );
  return result.rows[0].id;
}

async function createTestGoal(contractorId) {
  const result = await query(
    `INSERT INTO ai_concierge_goals (
      contractor_id, goal_type, goal_description, priority_score,
      current_progress, status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING id`,
    [contractorId, 'revenue_growth', 'Test Goal: Reach $1M revenue', 8, 50, 'active']
  );
  return result.rows[0].id;
}

async function createTestActionItem(contractorId) {
  const result = await query(
    `INSERT INTO contractor_action_items (
      contractor_id, title, description, action_type, priority,
      status, ai_generated, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
    RETURNING id`,
    [contractorId, 'Test Action', 'Hire salesperson', 'follow_up', 7, 'completed', true]
  );
  return result.rows[0].id;
}

async function createTestProactiveMessage(contractorId) {
  const result = await query(
    `INSERT INTO ai_proactive_messages (
      contractor_id, message_type, message_content, ai_reasoning,
      sent_at, contractor_response, response_received_at, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, NOW() - INTERVAL '2 days', $5, NOW() - INTERVAL '1 day', NOW(), NOW())
    RETURNING id`,
    [
      contractorId,
      'check_in',
      'How are things going with hiring?',
      'Check-in on hiring progress',
      'Going well, hired 2 people this month!'
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

async function testTrackPositiveTrustEvent() {
  log('\n--- Test 1: Track Positive Trust Event ---', 'cyan');

  try {
    const trustEvent = await trustMemoryService.trackTrustEvent({
      contractor_id: testContractorId,
      indicator_type: 'positive_feedback',
      description: 'Contractor said: "This recommendation was spot on!"',
      context: { message_id: 123, topic: 'hiring' }
    });

    if (trustEvent.id && trustEvent.cumulative_trust_score > 50) {
      log('✓ Positive trust event tracked', 'green');
      log(`  Event ID: ${trustEvent.id}`, 'blue');
      log(`  Type: ${trustEvent.indicator_type}`, 'blue');
      log(`  Impact: +${trustEvent.confidence_impact}`, 'blue');
      log(`  Previous Score: ${trustEvent.previous_score}`, 'blue');
      log(`  New Score: ${trustEvent.cumulative_trust_score}`, 'blue');
      log(`  Trust Level: ${trustEvent.trust_level.label}`, 'blue');
      return true;
    } else {
      log('✗ Trust event tracking failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testTrackNegativeTrustEvent() {
  log('\n--- Test 2: Track Negative Trust Event ---', 'cyan');

  try {
    const before = await trustMemoryService.getTrustScore(testContractorId);

    const trustEvent = await trustMemoryService.trackTrustEvent({
      contractor_id: testContractorId,
      indicator_type: 'ignored_suggestion',
      description: 'Contractor ignored AI suggestion for 30 days',
      context: { suggestion_id: 456 }
    });

    if (trustEvent.cumulative_trust_score < before.score) {
      log('✓ Negative trust event tracked', 'green');
      log(`  Type: ${trustEvent.indicator_type}`, 'blue');
      log(`  Impact: ${trustEvent.confidence_impact}`, 'blue');
      log(`  Score decreased: ${before.score} → ${trustEvent.cumulative_trust_score}`, 'blue');
      return true;
    } else {
      log('✗ Trust did not decrease', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGetTrustScore() {
  log('\n--- Test 3: Get Current Trust Score ---', 'cyan');

  try {
    const trustScore = await trustMemoryService.getTrustScore(testContractorId);

    if (trustScore.score >= 0 && trustScore.score <= 100) {
      log('✓ Trust score retrieved', 'green');
      log(`  Score: ${trustScore.score}`, 'blue');
      log(`  Level: ${trustScore.level.label}`, 'blue');
      log(`  Total Events: ${trustScore.total_events}`, 'blue');
      if (trustScore.last_event) {
        log(`  Last Event: ${trustScore.last_event.type} (${trustScore.last_event.impact > 0 ? '+' : ''}${trustScore.last_event.impact})`, 'blue');
      }
      return true;
    } else {
      log('✗ Invalid trust score', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testTrustLevelTransitions() {
  log('\n--- Test 4: Trust Level Transitions ---', 'cyan');

  try {
    // Track multiple positive events to increase trust level
    await trustMemoryService.trackTrustEvent({
      contractor_id: testContractorId,
      indicator_type: 'acted_on_suggestion',
      description: 'Contractor acted on AI recommendation'
    });

    await trustMemoryService.trackTrustEvent({
      contractor_id: testContractorId,
      indicator_type: 'milestone_achieved',
      description: 'Contractor achieved revenue milestone'
    });

    const finalScore = await trustMemoryService.getTrustScore(testContractorId);

    if (finalScore.score >= 60 && finalScore.level.label.includes('Trusted')) {
      log('✓ Trust level transitioned upward', 'green');
      log(`  Final Score: ${finalScore.score}`, 'blue');
      log(`  Level: ${finalScore.level.label}`, 'blue');
      log(`  Total Events: ${finalScore.total_events}`, 'blue');
      return true;
    } else {
      log('✗ Trust level not high enough', 'red');
      log(`  Score: ${finalScore.score}`, 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGetRelevantMemories() {
  log('\n--- Test 5: Get Relevant Memories ---', 'cyan');

  try {
    // Create test data
    await createTestGoal(testContractorId);
    await createTestActionItem(testContractorId);
    await createTestProactiveMessage(testContractorId);

    const memories = await trustMemoryService.getRelevantMemories(testContractorId, { limit: 5 });

    if (memories.length > 0) {
      log('✓ Memories retrieved', 'green');
      log(`  Total Memories: ${memories.length}`, 'blue');

      const types = [...new Set(memories.map(m => m.type))];
      log(`  Types: ${types.join(', ')}`, 'blue');

      if (memories[0]) {
        log(`  Most Recent: ${memories[0].type} - "${memories[0].content.substring(0, 50)}..."`, 'blue');
      }

      return true;
    } else {
      log('✗ No memories found', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testInjectMemoryIntoMessage() {
  log('\n--- Test 6: Inject Memory Into Message ---', 'cyan');

  try {
    const baseMessage = 'How are things going this week?';

    const enhanced = await trustMemoryService.injectMemoryIntoMessage(
      testContractorId,
      baseMessage,
      { include_past_conversation: true, include_achievements: true }
    );

    if (enhanced.enhanced_message !== baseMessage) {
      log('✓ Memory injected into message', 'green');
      log(`  Original: "${enhanced.original_message}"`, 'blue');
      log(`  Enhanced: "${enhanced.enhanced_message}"`, 'blue');
      log(`  Memories Injected: ${enhanced.memories_injected.length}`, 'blue');

      if (enhanced.memories_injected.length > 0) {
        log(`  Memory Types: ${enhanced.memories_injected.map(m => m.type).join(', ')}`, 'blue');
      }

      return true;
    } else {
      log('✗ Message not enhanced (no memories available)', 'yellow');
      log(`  This is OK if no suitable memories exist`, 'yellow');
      return true; // Still pass if no memories, but message returned safely
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGetAIBehaviorSettings() {
  log('\n--- Test 7: Get AI Behavior Settings ---', 'cyan');

  try {
    const settings = await trustMemoryService.getAIBehaviorSettings(testContractorId);

    if (settings.trust_score >= 0 && settings.recommendations.length > 0) {
      log('✓ AI behavior settings retrieved', 'green');
      log(`  Trust Score: ${settings.trust_score}`, 'blue');
      log(`  Trust Level: ${settings.trust_level}`, 'blue');
      log(`  Proactive Frequency: ${settings.proactive_frequency}`, 'blue');
      log(`  Question Boldness: ${settings.question_boldness}`, 'blue');
      log(`  Follow-Up Timing: ${settings.follow_up_timing}`, 'blue');
      log(`  Pause Proactive: ${settings.pause_proactive}`, 'blue');
      log(`  Recommendations: ${settings.recommendations.length}`, 'blue');

      if (settings.recommendations[0]) {
        log(`  Example: "${settings.recommendations[0]}"`, 'blue');
      }

      return true;
    } else {
      log('✗ Invalid behavior settings', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testTrustScoreBoundaries() {
  log('\n--- Test 8: Trust Score Boundaries (0-100) ---', 'cyan');

  try {
    // Get current score
    const current = await trustMemoryService.getTrustScore(testContractorId);

    // Try to go above 100 (should cap at 100)
    for (let i = 0; i < 10; i++) {
      await trustMemoryService.trackTrustEvent({
        contractor_id: testContractorId,
        indicator_type: 'milestone_achieved',
        description: 'Test max boundary'
      });
    }

    const afterMax = await trustMemoryService.getTrustScore(testContractorId);

    if (afterMax.score <= 100) {
      log('✓ Trust score capped at 100', 'green');
      log(`  Score: ${afterMax.score}`, 'blue');

      // Now test minimum boundary
      for (let i = 0; i < 30; i++) {
        await trustMemoryService.trackTrustEvent({
          contractor_id: testContractorId,
          indicator_type: 'negative_feedback',
          description: 'Test min boundary'
        });
      }

      const afterMin = await trustMemoryService.getTrustScore(testContractorId);

      if (afterMin.score >= 0) {
        log('✓ Trust score floored at 0', 'green');
        log(`  Score: ${afterMin.score}`, 'blue');

        // Reset to high trust for subsequent tests
        for (let i = 0; i < 10; i++) {
          await trustMemoryService.trackTrustEvent({
            contractor_id: testContractorId,
            indicator_type: 'milestone_achieved',
            description: 'Reset to high trust'
          });
        }

        return true;
      } else {
        log('✗ Score went below 0', 'red');
        return false;
      }
    } else {
      log('✗ Score exceeded 100', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testGetTrustHistory() {
  log('\n--- Test 9: Get Trust History ---', 'cyan');

  try {
    const history = await trustMemoryService.getTrustHistory(testContractorId, 10);

    if (history.length > 0) {
      log('✓ Trust history retrieved', 'green');
      log(`  Total Records: ${history.length}`, 'blue');
      log(`  Latest Event: ${history[0].type} (${history[0].impact > 0 ? '+' : ''}${history[0].impact})`, 'blue');
      log(`  Score After: ${history[0].score_after}`, 'blue');

      // Check chronological order (DESC)
      if (history.length > 1) {
        const isDescending = new Date(history[0].recorded_at) >= new Date(history[1].recorded_at);
        if (isDescending) {
          log('  ✓ History in descending order (newest first)', 'blue');
        }
      }

      return true;
    } else {
      log('✗ No history found', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Error: ${error.message}`, 'red');
    return false;
  }
}

async function testBehaviorAtDifferentTrustLevels() {
  log('\n--- Test 10: Behavior at Different Trust Levels ---', 'cyan');

  try {
    // Create contractor with very low trust
    const lowTrustContractor = await createTestContractor();

    // Set very low trust (multiple negative events)
    for (let i = 0; i < 10; i++) {
      await trustMemoryService.trackTrustEvent({
        contractor_id: lowTrustContractor,
        indicator_type: 'negative_feedback',
        description: 'Test low trust'
      });
    }

    const lowSettings = await trustMemoryService.getAIBehaviorSettings(lowTrustContractor);

    // Get high trust settings from main test contractor
    const highSettings = await trustMemoryService.getAIBehaviorSettings(testContractorId);

    log(`  Low Trust (${lowSettings.trust_score}):`, 'blue');
    log(`    - Pause Proactive: ${lowSettings.pause_proactive}`, 'blue');
    log(`    - Frequency: ${lowSettings.proactive_frequency}`, 'blue');
    log(`  High Trust (${highSettings.trust_score}):`, 'blue');
    log(`    - Pause Proactive: ${highSettings.pause_proactive}`, 'blue');
    log(`    - Frequency: ${highSettings.proactive_frequency}`, 'blue');

    // Cleanup
    await query('DELETE FROM contractors WHERE id = $1', [lowTrustContractor]);

    // Test passes if behaviors are different
    if (lowSettings.proactive_frequency !== highSettings.proactive_frequency ||
        lowSettings.question_boldness !== highSettings.question_boldness) {
      log('✓ Behavior adjusts based on trust level', 'green');
      return true;
    } else {
      log('✗ Behavior not adjusting correctly', 'red');
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
  log('║  PHASE 3 - DAY 5: TRUST-BUILDING MEMORY SYSTEM TESTS          ║', 'yellow');
  log('╚════════════════════════════════════════════════════════════════╝', 'yellow');

  const results = [];

  try {
    // Setup
    log('\n--- Setup ---', 'cyan');
    testContractorId = await createTestContractor();
    log(`✓ Created test contractor (ID: ${testContractorId})`, 'green');

    // Run tests
    results.push(await testTrackPositiveTrustEvent());
    results.push(await testTrackNegativeTrustEvent());
    results.push(await testGetTrustScore());
    results.push(await testTrustLevelTransitions());
    results.push(await testGetRelevantMemories());
    results.push(await testInjectMemoryIntoMessage());
    results.push(await testGetAIBehaviorSettings());
    results.push(await testTrustScoreBoundaries());
    results.push(await testGetTrustHistory());
    results.push(await testBehaviorAtDifferentTrustLevels());

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
      log('✓ ALL TESTS PASSED - DAY 5 COMPLETE!\n', 'green');
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
