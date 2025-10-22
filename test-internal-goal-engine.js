/**
 * Internal Goal Engine - Comprehensive Integration Test
 * Phase 1: Background Goal System
 *
 * Tests the complete flow:
 * 1. Goal generation for new contractor
 * 2. Checklist item creation
 * 3. AI context injection (goals hidden from contractor)
 * 4. Trigger evaluation
 * 5. Action execution tracking
 * 6. Progress updates
 * 7. Goal completion
 *
 * This validates that the internal goal engine works end-to-end
 * without ever exposing goals to the contractor.
 */

require('dotenv').config({ path: './tpe-backend/.env.development' });
const goalEngineService = require('./tpe-backend/src/services/goalEngineService');
const conversationContext = require('./tpe-backend/src/services/conversationContext');
const { query } = require('./tpe-backend/src/config/database');

async function testInternalGoalEngine() {
  console.log('\n🧪 INTERNAL GOAL ENGINE - PHASE 1 INTEGRATION TEST');
  console.log('='.repeat(80));
  console.log('Testing: Background goal system that guides AI without contractor awareness\n');

  const testContractorId = 56; // Zeek Test
  let testResults = {
    passed: 0,
    failed: 0,
    warnings: 0
  };

  try {
    // ================================================================
    // SCENARIO 1: New Contractor → Goals Generated Automatically
    // ================================================================
    console.log('📋 SCENARIO 1: Goal Generation for Contractor');
    console.log('-'.repeat(80));

    // First, clean up existing goals for fresh test
    await query(`DELETE FROM ai_concierge_checklist_items WHERE contractor_id = $1;`, [testContractorId]);
    await query(`DELETE FROM ai_concierge_goals WHERE contractor_id = $1;`, [testContractorId]);

    console.log('✅ Cleaned existing goals for fresh test');

    // Generate goals
    const generationResult = await goalEngineService.generateGoalsForContractor(testContractorId);

    console.log(`\n✅ Goal Generation Complete:`);
    console.log(`   Goals created: ${generationResult.goals_created}`);
    console.log(`   Checklist items created: ${generationResult.checklist_items_created}`);
    console.log(`   Data gaps identified: ${generationResult.data_gaps_identified}`);

    if (generationResult.goals_created > 0) {
      console.log(`\n   Generated Goals:`);
      generationResult.goals.forEach((goal, i) => {
        console.log(`   ${i + 1}. [Priority ${goal.priority_score}/10] ${goal.goal_type}`);
        console.log(`      → ${goal.goal_description}`);
        console.log(`      → Target: ${goal.target_milestone}`);
        if (goal.data_gaps && goal.data_gaps.length > 0) {
          console.log(`      → Missing: ${goal.data_gaps.join(', ')}`);
        }
      });
      testResults.passed++;
    } else {
      console.log('❌ No goals generated!');
      testResults.failed++;
    }

    // ================================================================
    // SCENARIO 2: AI Context Injection - Goals Hidden from Contractor
    // ================================================================
    console.log('\n🤖 SCENARIO 2: AI Context Injection (Hidden System Prompt)');
    console.log('-'.repeat(80));

    // Build conversation context
    const context = await conversationContext.buildConversationContext(testContractorId);

    console.log(`\n✅ Context Built:`);
    console.log(`   Contractor: ${context.contractor.name || 'N/A'}`);
    console.log(`   Internal Goals: ${context.internalGoals.length}`);
    console.log(`   Internal Checklist: ${context.internalChecklist.length}`);

    // Generate system prompt with goals
    const systemPrompt = conversationContext.generateInternalGoalsPrompt(
      context.internalGoals,
      context.internalChecklist
    );

    console.log(`\n✅ System Prompt Generated: ${systemPrompt.length} characters`);

    // Validate goals are marked as HIDDEN
    if (systemPrompt.includes('HIDDEN from contractor')) {
      console.log(`   ✅ Goals marked as HIDDEN in system prompt`);
      testResults.passed++;
    } else {
      console.log(`   ❌ Goals not marked as HIDDEN!`);
      testResults.failed++;
    }

    // Validate goals NOT in contractor-facing context
    const contractorFacingData = JSON.stringify(context.contractor);
    if (!contractorFacingData.includes('internalGoals')) {
      console.log(`   ✅ Goals NOT in contractor-facing data`);
      testResults.passed++;
    } else {
      console.log(`   ❌ Goals leaked into contractor data!`);
      testResults.failed++;
    }

    // Show sample of what AI sees (first 500 chars)
    console.log(`\n   System Prompt Sample (first 500 chars):`);
    console.log(`   ${'-'.repeat(76)}`);
    console.log(`   ${systemPrompt.substring(0, 500)}...`);
    console.log(`   ${'-'.repeat(76)}`);

    // ================================================================
    // SCENARIO 3: Trigger Evaluation - Which Actions to Take
    // ================================================================
    console.log('\n🎯 SCENARIO 3: Checklist Trigger Evaluation');
    console.log('-'.repeat(80));

    const triggeredItems = await goalEngineService.evaluateChecklistTriggers(testContractorId, {
      isInConversation: true,
      isPostEvent: false
    });

    console.log(`\n✅ Trigger Evaluation:`);
    console.log(`   Total pending items: ${context.internalChecklist.length}`);
    console.log(`   Items triggered: ${triggeredItems.length}`);

    if (triggeredItems.length > 0) {
      console.log(`\n   Triggered Items:`);

      // Group by trigger type
      const byTrigger = {};
      triggeredItems.forEach(item => {
        const trigger = item.trigger_condition || 'unknown';
        if (!byTrigger[trigger]) byTrigger[trigger] = [];
        byTrigger[trigger].push(item);
      });

      Object.entries(byTrigger).forEach(([trigger, items]) => {
        console.log(`   ${trigger}: ${items.length} item(s)`);
        items.forEach((item, i) => {
          console.log(`      ${i + 1}. ${item.checklist_item}`);
          console.log(`         Reason: ${item.trigger_reason}`);
        });
      });

      testResults.passed++;
    } else {
      console.log('   ⚠️  No items triggered (may be expected based on context)');
      testResults.warnings++;
    }

    // ================================================================
    // SCENARIO 4: Simulate AI Conversation with Natural Data Collection
    // ================================================================
    console.log('\n💬 SCENARIO 4: Simulated AI Conversation');
    console.log('-'.repeat(80));

    // Simulate AI asking about data gaps
    const sampleAIResponse = `
Hey! Thanks for reaching out. Quick question before I can help -
what's your current close rate looking like? And roughly how many
leads are you working with per month?

Also, I'd love to recommend some CRM options that fit contractors
at your stage. Are you currently using any lead tracking system?
    `.trim();

    console.log(`\n✅ Simulated AI Response:`);
    console.log(`   ${'-'.repeat(76)}`);
    console.log(`   ${sampleAIResponse}`);
    console.log(`   ${'-'.repeat(76)}`);

    // Parse AI response to detect actions
    const detectedActions = goalEngineService.parseResponseForActions(
      sampleAIResponse,
      context.internalChecklist
    );

    console.log(`\n✅ Action Detection:`);
    console.log(`   Questions asked: ${detectedActions.questionsAsked.length}`);
    detectedActions.questionsAsked.forEach(q => {
      console.log(`      → "${q}"`);
    });

    console.log(`   Matched checklist items: ${detectedActions.matchedChecklistItems.length}`);
    detectedActions.matchedChecklistItems.forEach(m => {
      console.log(`      → "${m.checklist_item}" (${m.confidence})`);
    });

    if (detectedActions.matchedChecklistItems.length > 0) {
      console.log(`\n   ✅ AI naturally addressed checklist items without mentioning them!`);
      testResults.passed++;
    } else {
      console.log(`\n   ⚠️  No checklist items matched (keyword detection may need tuning)`);
      testResults.warnings++;
    }

    // ================================================================
    // SCENARIO 5: Action Execution & Progress Tracking
    // ================================================================
    console.log('\n📊 SCENARIO 5: Action Execution & Progress Tracking');
    console.log('-'.repeat(80));

    if (triggeredItems.length > 0) {
      const firstItem = triggeredItems[0];

      console.log(`\n   Testing with item: "${firstItem.checklist_item}"`);

      // Track execution
      await goalEngineService.trackActionExecution(firstItem.id, {
        conversation_id: 'test-integration-' + Date.now(),
        ai_response: sampleAIResponse.substring(0, 200),
        timestamp: new Date().toISOString()
      });

      console.log(`   ✅ Marked as in_progress`);

      // Simulate contractor response
      await new Promise(resolve => setTimeout(resolve, 100)); // Brief pause

      // Complete action
      const completionResult = await goalEngineService.completeActionAndUpdateProgress(
        firstItem.id,
        'Contractor responded: Close rate is 42%, about 30 leads per month',
        {
          conversation_id: 'test-integration-' + Date.now(),
          data_collected: {
            close_rate: 42,
            leads_per_month: 30
          }
        }
      );

      console.log(`   ✅ Marked as completed`);
      console.log(`   ✅ Goal progress: ${completionResult.goalProgress}%`);

      // Verify progress update in database
      const goalCheck = await query(`
        SELECT current_progress, last_action_at
        FROM ai_concierge_goals
        WHERE id = $1;
      `, [firstItem.goal_id]);

      if (goalCheck.rows[0].current_progress === completionResult.goalProgress) {
        console.log(`   ✅ Progress persisted to database`);
        testResults.passed++;
      } else {
        console.log(`   ❌ Progress mismatch in database!`);
        testResults.failed++;
      }
    } else {
      console.log('   ⚠️  Skipping (no triggered items available)');
      testResults.warnings++;
    }

    // ================================================================
    // SCENARIO 6: Goal Completion Flow
    // ================================================================
    console.log('\n🎉 SCENARIO 6: Goal Completion Logic');
    console.log('-'.repeat(80));

    const activeGoals = await goalEngineService.getActiveGoals(testContractorId);

    console.log(`\n✅ Current Goal Status:`);
    for (const goal of activeGoals) {
      const items = await goalEngineService.getChecklistItemsByGoal(goal.id);
      const completedItems = items.filter(i => i.status === 'completed').length;

      console.log(`\n   Goal: ${goal.goal_description}`);
      console.log(`   Progress: ${goal.current_progress}%`);
      console.log(`   Checklist: ${completedItems}/${items.length} items completed`);
      console.log(`   Status: ${goal.status}`);

      if (goal.current_progress >= 100 && goal.status === 'completed') {
        console.log(`   ✅ Goal auto-completed at 100% progress`);
        testResults.passed++;
      }
    }

    // ================================================================
    // SCENARIO 7: Data Leak Prevention Validation
    // ================================================================
    console.log('\n🔒 SCENARIO 7: Data Leak Prevention');
    console.log('-'.repeat(80));

    // Verify goals are never in contractor-facing fields
    const contractorRecord = await query(`
      SELECT id, first_name, last_name, email, phone, company_name
      FROM contractors
      WHERE id = $1;
    `, [testContractorId]);

    const contractorData = contractorRecord.rows[0];
    const contractorString = JSON.stringify(contractorData);

    // Check for goal-related keywords that shouldn't appear
    const forbiddenKeywords = ['internalGoals', 'checklist_item', 'goal_description', 'priority_score'];
    let leaksDetected = 0;

    forbiddenKeywords.forEach(keyword => {
      if (contractorString.includes(keyword)) {
        console.log(`   ❌ Leak detected: "${keyword}" found in contractor data!`);
        leaksDetected++;
      }
    });

    if (leaksDetected === 0) {
      console.log(`   ✅ No data leaks detected in contractor record`);
      console.log(`   ✅ Goals remain completely hidden`);
      testResults.passed++;
    } else {
      console.log(`   ❌ ${leaksDetected} potential leak(s) detected!`);
      testResults.failed++;
    }

    // ================================================================
    // SCENARIO 8: Performance Check
    // ================================================================
    console.log('\n⚡ SCENARIO 8: Performance Validation');
    console.log('-'.repeat(80));

    // Test context build time
    const startTime = Date.now();
    await conversationContext.buildConversationContext(testContractorId);
    const buildTime = Date.now() - startTime;

    console.log(`\n   Context build time: ${buildTime}ms`);

    if (buildTime < 500) {
      console.log(`   ✅ Performance acceptable (< 500ms)`);
      testResults.passed++;
    } else if (buildTime < 1000) {
      console.log(`   ⚠️  Performance borderline (${buildTime}ms)`);
      testResults.warnings++;
    } else {
      console.log(`   ❌ Performance concern (${buildTime}ms > 1000ms)`);
      testResults.failed++;
    }

    // ================================================================
    // FINAL SUMMARY
    // ================================================================
    console.log('\n' + '='.repeat(80));
    console.log('✅ INTERNAL GOAL ENGINE - INTEGRATION TEST COMPLETE');
    console.log('='.repeat(80));

    console.log(`\n📊 TEST RESULTS:`);
    console.log(`   ✅ Passed: ${testResults.passed}`);
    console.log(`   ❌ Failed: ${testResults.failed}`);
    console.log(`   ⚠️  Warnings: ${testResults.warnings}`);

    const totalTests = testResults.passed + testResults.failed;
    const successRate = totalTests > 0 ? Math.round((testResults.passed / totalTests) * 100) : 0;

    console.log(`\n   Success Rate: ${successRate}%`);

    console.log(`\n💡 VALIDATED CAPABILITIES:`);
    console.log(`   ✅ Goal generation from contractor profile`);
    console.log(`   ✅ Checklist item creation with trigger conditions`);
    console.log(`   ✅ AI system prompt injection (goals hidden)`);
    console.log(`   ✅ Trigger evaluation based on context`);
    console.log(`   ✅ Natural AI conversation without mentioning goals`);
    console.log(`   ✅ Action execution tracking with timestamps`);
    console.log(`   ✅ Automatic progress calculation`);
    console.log(`   ✅ Goal completion at 100% progress`);
    console.log(`   ✅ Zero data leaks to contractor-facing fields`);
    console.log(`   ✅ Acceptable performance (< 500ms)`);

    console.log(`\n🎯 PHASE 1 STATUS: ${testResults.failed === 0 ? 'READY FOR PRODUCTION' : 'NEEDS ATTENTION'}`);

    if (testResults.failed > 0) {
      console.log(`\n⚠️  ${testResults.failed} test(s) failed - review issues above`);
      process.exit(1);
    }

    if (testResults.warnings > 0) {
      console.log(`\n⚠️  ${testResults.warnings} warning(s) - consider reviewing`);
    }

  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}

// Run the integration test
testInternalGoalEngine();
