// ================================================================
// Partner Match Tool - Test Script
// ================================================================
// Purpose: Test the partner match tool with real database queries
// Run: node tpe-backend/src/services/agents/tools/test-partnerMatchTool.js
// ================================================================

require('dotenv').config({ path: require('path').resolve(__dirname, '../../../../.env') });
const partnerMatchTool = require('./partnerMatchTool');
const { query } = require('../../../config/database');

async function testPartnerMatchTool() {
  console.log('========================================');
  console.log('Partner Match Tool - Test Suite');
  console.log('========================================\n');

  try {
    // Step 1: Find a test contractor
    console.log('Step 1: Finding a test contractor...');
    const contractorQuery = `
      SELECT id, first_name, last_name, email, focus_areas, revenue_tier, team_size
      FROM contractors
      WHERE focus_areas IS NOT NULL
      LIMIT 1
    `;

    const contractorResult = await query(contractorQuery);

    if (contractorResult.rows.length === 0) {
      console.log('❌ No contractors found in database. Please add test data first.');
      process.exit(1);
    }

    const testContractor = contractorResult.rows[0];
    console.log(`✅ Found test contractor: ${testContractor.first_name} ${testContractor.last_name}`);
    console.log(`   Contractor ID: ${testContractor.id}`);
    console.log(`   Email: ${testContractor.email}`);
    console.log(`   Focus areas: ${testContractor.focus_areas}`);
    console.log(`   Revenue tier: ${testContractor.revenue_tier}`);
    console.log(`   Team size: ${testContractor.team_size}\n`);

    // Step 2: Check if we have active partners
    console.log('Step 2: Checking for active partners...');
    const partnerCountQuery = `
      SELECT COUNT(*) as count
      FROM strategic_partners
      WHERE is_active = true
    `;

    const partnerCountResult = await query(partnerCountQuery);
    const partnerCount = parseInt(partnerCountResult.rows[0].count);

    console.log(`✅ Found ${partnerCount} active partners in database\n`);

    if (partnerCount === 0) {
      console.log('❌ No active partners found. Please add test partners first.');
      process.exit(1);
    }

    // Step 3: Test the tool with contractor's focus areas
    console.log('Step 3: Testing Partner Match Tool...');
    console.log('Calling tool with contractor data...\n');

    const toolInput = {
      contractorId: testContractor.id,
      limit: 3
    };

    console.log('Tool input:', JSON.stringify(toolInput, null, 2));
    console.log('\n--- Tool Execution ---\n');

    const result = await partnerMatchTool.invoke(toolInput);

    console.log('\n--- Tool Result ---\n');
    console.log(result);

    // Parse and display results
    const parsedResult = JSON.parse(result);

    if (parsedResult.success) {
      console.log('\n========================================');
      console.log('✅ Partner Match Tool Test: SUCCESS');
      console.log('========================================\n');

      console.log(`Found ${parsedResult.matches.length} partner matches:`);

      parsedResult.matches.forEach((match, index) => {
        console.log(`\n${index + 1}. ${match.companyName}`);
        console.log(`   Match Score: ${match.matchScore}/100`);
        console.log(`   PowerConfidence: ${match.powerConfidenceScore || 'N/A'}`);
        console.log(`   Match Reasons:`);
        match.matchReasons.forEach(reason => {
          console.log(`     - ${reason}`);
        });
        console.log(`   Focus Areas: ${match.focusAreas.join(', ')}`);
        console.log(`   Website: ${match.website || 'N/A'}`);
      });

      console.log(`\n✅ Learning event logged to ai_learning_events table`);

    } else {
      console.log('\n========================================');
      console.log('❌ Partner Match Tool Test: FAILED');
      console.log('========================================\n');
      console.log('Error:', parsedResult.error);
    }

    // Step 4: Verify learning event was logged
    console.log('\n\nStep 4: Verifying learning event was logged...');
    const learningEventQuery = `
      SELECT
        id,
        event_type,
        contractor_id,
        partner_id,
        recommendation,
        outcome,
        success_score,
        confidence_level,
        created_at
      FROM ai_learning_events
      WHERE contractor_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const learningEventResult = await query(learningEventQuery, [testContractor.id]);

    if (learningEventResult.rows.length > 0) {
      const learningEvent = learningEventResult.rows[0];
      console.log('✅ Learning event found:');
      console.log(`   Event ID: ${learningEvent.id}`);
      console.log(`   Event Type: ${learningEvent.event_type}`);
      console.log(`   Contractor ID: ${learningEvent.contractor_id}`);
      console.log(`   Partner ID: ${learningEvent.partner_id}`);
      console.log(`   Recommendation: ${learningEvent.recommendation}`);
      console.log(`   Outcome: ${learningEvent.outcome}`);
      console.log(`   Success Score: ${learningEvent.success_score}`);
      console.log(`   Confidence Level: ${learningEvent.confidence_level}`);
      console.log(`   Created At: ${learningEvent.created_at}`);
    } else {
      console.log('⚠️  No learning event found (may have failed to log)');
    }

    console.log('\n========================================');
    console.log('Test Suite Complete');
    console.log('========================================\n');

    process.exit(0);

  } catch (error) {
    console.error('\n========================================');
    console.error('❌ Test Suite Error');
    console.error('========================================\n');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the test
testPartnerMatchTool();
