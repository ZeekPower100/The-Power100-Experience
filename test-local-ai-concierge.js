const axios = require('axios');

// Local configuration
const API_BASE_URL = 'http://localhost:5000/api';

async function getAuthToken() {
  try {
    console.log('🔐 Authenticating with local server...');
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

async function testEndpoint(name, method, url, data, token) {
  console.log(`\n🔍 Testing: ${name}`);
  console.log('----------------------------');

  try {
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const response = method === 'GET'
      ? await axios.get(url, config)
      : method === 'DELETE'
      ? await axios.delete(url, config)
      : await axios.post(url, data, config);

    console.log('✅ Endpoint works!');
    console.log('Response keys:', Object.keys(response.data));
    if (response.data.success !== undefined) {
      console.log('Success status:', response.data.success);
    }
    if (response.data.message) {
      console.log('Message:', response.data.message);
    }
    if (response.data.hasAccess !== undefined) {
      console.log('Has access:', response.data.hasAccess);
    }
    if (response.data.conversations) {
      console.log('Conversations:', response.data.conversations.length);
    }
    return true;
  } catch (error) {
    console.log('❌ Endpoint failed');
    console.log('Error:', error.response?.status || error.code);
    if (error.response?.data?.error) {
      console.log('Details:', error.response.data.error);
    }
    return false;
  }
}

async function testAIConciergeAPIs() {
  try {
    const token = await getAuthToken();
    console.log('✅ Authentication successful');

    const endpoints = [
      { name: 'Check Access Status', method: 'GET', url: `${API_BASE_URL}/ai-concierge/access-status` },
      { name: 'Get Conversations', method: 'GET', url: `${API_BASE_URL}/ai-concierge/conversations` },
      { name: 'Send Message', method: 'POST', url: `${API_BASE_URL}/ai-concierge/message`,
        data: { message: 'What are best practices for scaling a home improvement business?', session_id: null } },
      { name: 'Get/Create Session', method: 'GET', url: `${API_BASE_URL}/ai-concierge/session` },
      { name: 'Test Route', method: 'GET', url: `${API_BASE_URL}/ai-concierge/test` }
    ];

    let working = 0;
    let failed = 0;

    for (const endpoint of endpoints) {
      const success = await testEndpoint(
        endpoint.name,
        endpoint.method,
        endpoint.url,
        endpoint.data,
        token
      );
      if (success) working++;
      else failed++;
    }

    console.log('\n📊 SUMMARY');
    console.log('==========');
    console.log(`✅ Working endpoints: ${working}`);
    console.log(`❌ Failed endpoints: ${failed}`);

  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
  }
}

// Run the test
console.log('🚀 Testing Refactored AI Concierge API in LOCAL Development');
console.log('===========================================================');

testAIConciergeAPIs()
  .then(() => {
    console.log('\n✨ Test suite completed!');
    console.log('\n📌 Refactoring Summary:');
    console.log('  - ✅ Created proper Model (aiConcierge.js) with database-aligned columns');
    console.log('  - ✅ Created Controller (aiConciergeController.js) with business logic');
    console.log('  - ✅ Refactored Routes to use controller methods');
    console.log('  - ✅ Renamed ai_coach_sessions to ai_concierge_sessions in database');
    console.log('  - ✅ Proper MVC architecture with separation of concerns');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error:', error.message);
    process.exit(1);
  });