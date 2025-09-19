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
      : await axios.post(url, data, config);

    console.log('✅ Endpoint works!');
    console.log('Response keys:', Object.keys(response.data));
    if (response.data.success !== undefined) {
      console.log('Success status:', response.data.success);
    }
    if (response.data.message) {
      console.log('Message:', response.data.message);
    }
    if (response.data.episodes) {
      console.log('Episodes returned:', response.data.episodes.length);
    }
    if (response.data.data) {
      console.log('Data returned:', Array.isArray(response.data.data) ? response.data.data.length + ' items' : 'object');
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

async function testPodcastAPIs() {
  try {
    const token = await getAuthToken();
    console.log('✅ Authentication successful');

    const endpoints = [
      { name: 'Get Recent Episodes', method: 'GET', url: `${API_BASE_URL}/podcast-episodes/recent` },
      { name: 'Get High Relevance', method: 'GET', url: `${API_BASE_URL}/podcast-episodes/high-relevance` },
      { name: 'Search Transcripts', method: 'GET', url: `${API_BASE_URL}/podcast-episodes/search/transcripts?q=business` },
      { name: 'Get by Status', method: 'GET', url: `${API_BASE_URL}/podcast-episodes/transcript-status/pending` },
      { name: 'Get Episode 1 Transcript', method: 'GET', url: `${API_BASE_URL}/podcast-episodes/1/transcript` },
      { name: 'Process Episode', method: 'POST', url: `${API_BASE_URL}/podcast-episodes/process`,
        data: { show_id: 1, audio_url: 'https://example.com/test.mp3' } }
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
console.log('🚀 Testing Podcast API Endpoints in LOCAL Development');
console.log('=====================================================');

testPodcastAPIs()
  .then(() => {
    console.log('\n✨ Test suite completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error:', error.message);
    process.exit(1);
  });