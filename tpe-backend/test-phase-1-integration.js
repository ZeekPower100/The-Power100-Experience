/**
 * Test Script for Phase 1 Integration
 *
 * Tests the AI Concierge Controller with Context Assembler integration
 */

const aiConciergeController = require('./src/controllers/aiConciergeController');

async function testIntegration() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST: AI Concierge Controller Phase 1 Integration');
  console.log('='.repeat(60));

  try {
    // Test contractor data
    const testContractor = {
      name: 'Test User',
      company_name: 'Test Home Improvement Co',
      focus_areas: JSON.stringify(['customer_retention', 'operational_efficiency']),
      revenue_tier: '$1M-$5M',
      team_size: '10-25'
    };

    const contractorId = 1;

    console.log('\n📝 Generating AI response with event context from materialized views...\n');

    // Generate AI response (this will now include event context from materialized views)
    const response = await aiConciergeController.generateAIResponse(
      'What sessions are happening right now at the event?',
      testContractor,
      contractorId
    );

    console.log('\n✅ AI Response generated successfully!');
    console.log('\n📄 Response preview (first 500 characters):');
    console.log('-'.repeat(60));
    console.log(typeof response === 'string'
      ? response.substring(0, 500) + (response.length > 500 ? '...' : '')
      : JSON.stringify(response, null, 2).substring(0, 500)
    );
    console.log('-'.repeat(60));

    console.log('\n🎉 Integration test passed!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run test
testIntegration();
