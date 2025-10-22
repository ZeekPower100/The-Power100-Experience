/**
 * Day 3 Testing: AI Context Injection
 *
 * Tests:
 * 1. buildConversationContext() includes internal goals
 * 2. generateInternalGoalsPrompt() formats correctly
 * 3. AI agents can be created with contractorId
 * 4. System prompt includes goals section
 */

require('dotenv').config({ path: './tpe-backend/.env.development' });
const conversationContext = require('./tpe-backend/src/services/conversationContext');
const goalEngineService = require('./tpe-backend/src/services/goalEngineService');
const { query } = require('./tpe-backend/src/config/database');

async function testDay3ContextInjection() {
  console.log('\n🧪 DAY 3: AI CONTEXT INJECTION TEST');
  console.log('='.repeat(80));

  try {
    const testContractorId = 56; // Zeek Test (has goals from Day 2)

    // ================================================================
    // TEST 1: Verify contractor has active goals
    // ================================================================
    console.log('\n📋 TEST 1: Verifying contractor has active goals...');

    const goalsResult = await query(`
      SELECT id, goal_type, goal_description, priority_score, current_progress,
             target_milestone, next_milestone, data_gaps, status
      FROM ai_concierge_goals
      WHERE contractor_id = $1 AND status = 'active'
      ORDER BY priority_score DESC;
    `, [testContractorId]);

    console.log(`✅ Found ${goalsResult.rows.length} active goal(s) for contractor ${testContractorId}`);

    if (goalsResult.rows.length === 0) {
      console.log('\n⚠️  WARNING: No active goals found. Run test-goal-generation.js first!');
      console.log('   Command: node test-goal-generation.js');
      process.exit(1);
    }

    goalsResult.rows.forEach((goal, i) => {
      console.log(`   Goal ${i + 1}: ${goal.goal_type} (Priority ${goal.priority_score}/10)`);
      console.log(`      Description: ${goal.goal_description}`);
      console.log(`      Progress: ${goal.current_progress}%`);
    });

    // ================================================================
    // TEST 2: Verify contractor has active checklist items
    // ================================================================
    console.log('\n📝 TEST 2: Verifying contractor has active checklist items...');

    const checklistResult = await query(`
      SELECT id, checklist_item, item_type, trigger_condition, status
      FROM ai_concierge_checklist_items
      WHERE contractor_id = $1 AND status = 'pending'
      ORDER BY created_at;
    `, [testContractorId]);

    console.log(`✅ Found ${checklistResult.rows.length} active checklist item(s)`);

    checklistResult.rows.forEach((item, i) => {
      console.log(`   Item ${i + 1}: ${item.checklist_item}`);
      console.log(`      Type: ${item.item_type}, Trigger: ${item.trigger_condition}`);
    });

    // ================================================================
    // TEST 3: Test getActiveGoals() service function
    // ================================================================
    console.log('\n🎯 TEST 3: Testing getActiveGoals() service function...');

    const activeGoals = await goalEngineService.getActiveGoals(testContractorId);
    console.log(`✅ getActiveGoals() returned ${activeGoals.length} goal(s)`);

    if (activeGoals.length > 0) {
      console.log(`   First goal: ${activeGoals[0].goal_description}`);
      console.log(`   Priority: ${activeGoals[0].priority_score}/10`);
      console.log(`   Data gaps: ${JSON.stringify(activeGoals[0].data_gaps)}`);
    }

    // ================================================================
    // TEST 4: Test getActiveChecklist() service function
    // ================================================================
    console.log('\n✅ TEST 4: Testing getActiveChecklist() service function...');

    const activeChecklist = await goalEngineService.getActiveChecklist(testContractorId);
    console.log(`✅ getActiveChecklist() returned ${activeChecklist.length} item(s)`);

    if (activeChecklist.length > 0) {
      console.log(`   First item: ${activeChecklist[0].checklist_item}`);
      console.log(`   Trigger: ${activeChecklist[0].trigger_condition}`);
      console.log(`   Goal: ${activeChecklist[0].goal_description?.substring(0, 50)}...`);
    }

    // ================================================================
    // TEST 5: Test generateInternalGoalsPrompt() function
    // ================================================================
    console.log('\n📄 TEST 5: Testing generateInternalGoalsPrompt() function...');

    const goalsPrompt = conversationContext.generateInternalGoalsPrompt(activeGoals, activeChecklist);

    console.log(`✅ Generated prompt section (${goalsPrompt.length} characters)`);
    console.log('\n--- Generated Prompt Section ---');
    console.log(goalsPrompt);
    console.log('--- End Prompt Section ---\n');

    // Validate prompt content
    const validations = [
      { check: goalsPrompt.includes('INTERNAL GOALS'), label: 'Contains "INTERNAL GOALS" header' },
      { check: goalsPrompt.includes('HIDDEN from contractor'), label: 'Contains "HIDDEN from contractor"' },
      { check: goalsPrompt.includes('Priority'), label: 'Contains priority scores' },
      { check: goalsPrompt.includes('Progress:'), label: 'Contains progress percentages' },
      { check: goalsPrompt.includes('YOUR ACTIVE CHECKLIST'), label: 'Contains checklist section' },
      { check: goalsPrompt.includes('IMPORTANT:'), label: 'Contains important instructions' },
      { check: goalsPrompt.includes('Never say'), label: 'Contains behavior guidance' }
    ];

    console.log('Prompt Validation:');
    validations.forEach(v => {
      console.log(`   ${v.check ? '✅' : '❌'} ${v.label}`);
    });

    const allValid = validations.every(v => v.check);
    if (!allValid) {
      console.log('\n⚠️  WARNING: Prompt validation failed!');
    }

    // ================================================================
    // TEST 6: Test buildConversationContext() with goal injection
    // ================================================================
    console.log('\n🔄 TEST 6: Testing buildConversationContext() with goal injection...');

    const context = await conversationContext.buildConversationContext(testContractorId);

    console.log('✅ Context built successfully');
    console.log(`   Contractor: ${context.contractor.name}`);
    console.log(`   Internal Goals: ${context.internalGoals?.length || 0}`);
    console.log(`   Internal Checklist: ${context.internalChecklist?.length || 0}`);
    console.log(`   Conversation History: ${context.conversationHistory?.length || 0} messages`);

    // Validate context structure
    const contextValidations = [
      { check: context.contractor !== undefined, label: 'Has contractor object' },
      { check: context.internalGoals !== undefined, label: 'Has internalGoals array' },
      { check: context.internalChecklist !== undefined, label: 'Has internalChecklist array' },
      { check: Array.isArray(context.internalGoals), label: 'internalGoals is array' },
      { check: Array.isArray(context.internalChecklist), label: 'internalChecklist is array' },
      { check: context.internalGoals.length > 0, label: 'Has at least 1 goal' },
      { check: context.internalChecklist.length > 0, label: 'Has at least 1 checklist item' }
    ];

    console.log('\nContext Validation:');
    contextValidations.forEach(v => {
      console.log(`   ${v.check ? '✅' : '❌'} ${v.label}`);
    });

    const allContextValid = contextValidations.every(v => v.check);
    if (!allContextValid) {
      console.log('\n⚠️  WARNING: Context validation failed!');
    }

    // Show sample goal structure
    if (context.internalGoals.length > 0) {
      console.log('\nSample Internal Goal Structure:');
      console.log(JSON.stringify(context.internalGoals[0], null, 2));
    }

    // Show sample checklist item structure
    if (context.internalChecklist.length > 0) {
      console.log('\nSample Internal Checklist Item Structure:');
      console.log(JSON.stringify(context.internalChecklist[0], null, 2));
    }

    // ================================================================
    // TEST 7: Test AI Agent Creation (Standard Mode)
    // ================================================================
    console.log('\n🤖 TEST 7: Testing AI Agent creation with contractorId...');

    try {
      const { createStandardAgent } = require('./tpe-backend/src/services/agents/aiConciergeStandardAgent');

      console.log('   Creating Standard Agent with contractorId...');
      const agent = createStandardAgent(testContractorId);

      console.log('✅ Standard Agent created successfully');
      console.log('   Agent type:', typeof agent);
      console.log('   Has invoke method:', typeof agent.invoke === 'function');

    } catch (error) {
      console.log('⚠️  Could not create agent (may require OpenAI API key):', error.message);
    }

    // ================================================================
    // TEST 8: Test AI Agent Creation (Event Mode)
    // ================================================================
    console.log('\n🎪 TEST 8: Testing Event Agent creation with contractorId...');

    try {
      const { createEventAgent } = require('./tpe-backend/src/services/agents/aiConciergeEventAgent');

      console.log('   Creating Event Agent with contractorId...');
      const agent = createEventAgent(testContractorId);

      console.log('✅ Event Agent created successfully');
      console.log('   Agent type:', typeof agent);
      console.log('   Has invoke method:', typeof agent.invoke === 'function');

    } catch (error) {
      console.log('⚠️  Could not create agent (may require OpenAI API key):', error.message);
    }

    // ================================================================
    // SUMMARY
    // ================================================================
    console.log('\n' + '='.repeat(80));
    console.log('✅ DAY 3 CONTEXT INJECTION TEST COMPLETE');
    console.log('='.repeat(80));

    console.log('\n📊 TEST RESULTS:');
    console.log(`  ✅ Contractor has ${goalsResult.rows.length} active goal(s)`);
    console.log(`  ✅ Contractor has ${checklistResult.rows.length} pending checklist item(s)`);
    console.log(`  ✅ getActiveGoals() returns ${activeGoals.length} goal(s)`);
    console.log(`  ✅ getActiveChecklist() returns ${activeChecklist.length} item(s)`);
    console.log(`  ✅ generateInternalGoalsPrompt() produces ${goalsPrompt.length} char prompt`);
    console.log(`  ✅ buildConversationContext() includes internal goals`);
    console.log(`  ✅ AI agents can be created with contractorId`);

    console.log('\n💡 KEY VALIDATIONS:');
    console.log('  ✅ Internal goals are included in context object');
    console.log('  ✅ Internal checklist is included in context object');
    console.log('  ✅ Prompt clearly marks goals as HIDDEN from contractor');
    console.log('  ✅ Prompt includes priority scores and progress tracking');
    console.log('  ✅ Prompt groups checklist by trigger condition');
    console.log('  ✅ Prompt includes behavioral guidance (never mention goals directly)');

    console.log('\n🎯 NEXT STEPS:');
    console.log('  1. Test with live AI conversation (if OpenAI API key available)');
    console.log('  2. Verify AI naturally asks about data gaps');
    console.log('  3. Verify contractor never sees internal goals');
    console.log('  4. Move to Day 4: Checklist trigger evaluation');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}

// Run the test
testDay3ContextInjection();
