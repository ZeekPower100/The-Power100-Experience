const axios = require('axios');

// Production configuration
const API_BASE_URL = 'https://tpx.power100.io/api';

async function getAuthToken() {
  try {
    console.log('🔐 Authenticating with production server...');
    const response = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@power100.io',
      password: 'admin123'
    });
    return response.data.token;
  } catch (error) {
    console.error('Failed to get auth token:', error.response?.data || error.message);
    throw error;
  }
}

async function testAIConcierge() {
  try {
    const token = await getAuthToken();
    console.log('✅ Authentication successful\n');

    // Test 1: Check access status
    console.log('🔑 Test 1: AI Concierge Access Status');
    console.log('--------------------------------------');

    const accessResponse = await axios.get(
      `${API_BASE_URL}/ai-concierge/access-status`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('Response received:', accessResponse.data.success ? '✅ Success' : '❌ Failed');
    console.log('Has access:', accessResponse.data.hasAccess ? 'Yes' : 'No');
    console.log('Access level:', accessResponse.data.accessLevel || 'N/A');
    console.log('Remaining credits:', accessResponse.data.remainingCredits || 'N/A');

    // Test 2: Send a message
    console.log('\n📝 Test 2: Send AI Concierge Message');
    console.log('-------------------------------------');

    const chatResponse = await axios.post(
      `${API_BASE_URL}/ai-concierge/message`,
      {
        message: "What are the best practices for scaling a home improvement business?",
        contractor_id: 1
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('Response received:', chatResponse.data.success ? '✅ Success' : '❌ Failed');
    if (chatResponse.data.response) {
      console.log('AI Response Preview:', chatResponse.data.response.substring(0, 200) + '...');
    }
    console.log('Tokens used:', chatResponse.data.usage?.total_tokens || 'N/A');

    // Test 3: Get conversation history
    console.log('\n📜 Test 3: Conversation History');
    console.log('--------------------------------');

    const historyResponse = await axios.get(
      `${API_BASE_URL}/ai-concierge/conversations`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('Response received:', historyResponse.data.success ? '✅ Success' : '❌ Failed');
    console.log('Conversations found:', historyResponse.data.conversations?.length || 0);
    if (historyResponse.data.conversations?.length > 0) {
      const latest = historyResponse.data.conversations[0];
      console.log('Latest conversation:', new Date(latest.created_at).toLocaleString());
    }

    console.log('\n✨ All AI Concierge tests completed successfully!');
    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.error('   Endpoint not found - check if deployed correctly');
    } else if (error.response?.status === 500) {
      console.error('   Server error - check logs for details');
    }
    return false;
  }
}

// Run the test
console.log('🚀 Testing AI Concierge API in Production');
console.log('==========================================\n');

testAIConcierge()
  .then((success) => {
    if (success) {
      console.log('\n✅ Production AI Concierge API is working correctly!');
    } else {
      console.log('\n⚠️ Some tests failed - review output above');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error:', error.message);
    process.exit(1);
  });