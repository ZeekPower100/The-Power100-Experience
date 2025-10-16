// DATABASE-CHECKED: No direct database access - API endpoint testing only
const axios = require('axios');

async function testProductionStateMachine() {
  const baseUrl = 'https://tpx.power100.io';
  let passedTests = 0;
  let failedTests = 0;

  console.log('🧪 Testing Production State Machine Implementation\n');
  console.log('═══════════════════════════════════════════════════\n');

  try {
    // Test 1: Verify state machine diagram endpoint
    console.log('Test 1: State Machine Diagram Endpoint');
    console.log('────────────────────────────────────────');
    try {
      const diagramResponse = await axios.get(`${baseUrl}/api/state-machine/diagram`, {
        timeout: 10000
      });

      if (diagramResponse.data.success && diagramResponse.data.diagram) {
        console.log('✅ Diagram endpoint working');
        console.log(`   - Response status: ${diagramResponse.status}`);
        console.log(`   - Has diagram data: ${diagramResponse.data.diagram.length > 0}`);
        console.log(`   - Diagram format: Mermaid state diagram`);
        passedTests++;
      } else {
        throw new Error('Invalid diagram response structure');
      }
    } catch (error) {
      console.error('❌ Diagram endpoint failed:', error.message);
      failedTests++;
    }

    console.log('');

    // Test 2: Verify state machine metadata endpoint
    console.log('Test 2: State Machine Metadata Endpoint');
    console.log('────────────────────────────────────────');
    try {
      const metadataResponse = await axios.get(`${baseUrl}/api/state-machine/metadata`, {
        timeout: 10000
      });

      if (metadataResponse.data.success && metadataResponse.data.metadata) {
        console.log('✅ Metadata endpoint working');
        console.log(`   - Response status: ${metadataResponse.status}`);
        console.log(`   - States defined: ${metadataResponse.data.metadata.states?.length || 0}`);
        console.log(`   - Events defined: ${metadataResponse.data.metadata.events?.length || 0}`);
        console.log(`   - Guards defined: ${metadataResponse.data.metadata.guards?.length || 0}`);
        passedTests++;
      } else {
        throw new Error('Invalid metadata response structure');
      }
    } catch (error) {
      console.error('❌ Metadata endpoint failed:', error.message);
      failedTests++;
    }

    console.log('');

    // Test 3: Verify admin state diagram page loads
    console.log('Test 3: Admin State Diagram Page');
    console.log('────────────────────────────────────────');
    try {
      const pageResponse = await axios.get(`${baseUrl}/admindashboard/state-diagram`, {
        timeout: 10000,
        validateStatus: function (status) {
          return status === 200 || status === 401; // Accept both 200 and 401 (auth required)
        }
      });

      if (pageResponse.status === 200 || pageResponse.status === 401) {
        console.log('✅ State diagram page accessible');
        console.log(`   - Response status: ${pageResponse.status}`);
        console.log(`   - Page requires authentication: ${pageResponse.status === 401 ? 'Yes' : 'No'}`);
        passedTests++;
      } else {
        throw new Error(`Unexpected status code: ${pageResponse.status}`);
      }
    } catch (error) {
      console.error('❌ State diagram page failed:', error.message);
      failedTests++;
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(`   Total: ${passedTests + failedTests}`);

    if (failedTests === 0) {
      console.log('\n✅ All production state machine tests passed!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Review errors above.');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Critical error during testing:', error.message);
    process.exit(1);
  }
}

// Test 4: AI Concierge Routing (Placeholder for future implementation)
// This test requires:
// - Authentication setup
// - Real contractor data
// - AI Concierge session initiation
// - State machine routing validation
console.log('Note: AI Concierge routing tests require authentication and will be added in future phases.\n');

testProductionStateMachine().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
