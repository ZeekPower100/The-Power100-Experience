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
    if (response.data.data) {
      console.log('Data type:', Array.isArray(response.data.data) ? 'array' : typeof response.data.data);
      if (typeof response.data.data === 'object' && !Array.isArray(response.data.data)) {
        console.log('Data keys:', Object.keys(response.data.data).slice(0, 5));
      }
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

async function testVideoAnalysisAPIs() {
  try {
    const token = await getAuthToken();
    console.log('✅ Authentication successful');

    const endpoints = [
      { name: 'Get Stats', method: 'GET', url: `${API_BASE_URL}/video-analysis/stats` },
      { name: 'Get Analysis by ID 1', method: 'GET', url: `${API_BASE_URL}/video-analysis/1` },
      { name: 'Get High Quality Demos', method: 'GET', url: `${API_BASE_URL}/video-analysis/demos/high-quality` },
      { name: 'Get Authentic Testimonials', method: 'GET', url: `${API_BASE_URL}/video-analysis/testimonials/authentic` },
      { name: 'Process Video', method: 'POST', url: `${API_BASE_URL}/video-analysis/process`,
        data: {
          video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          analysis_type: 'demo_analysis'
        }
      }
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
console.log('🚀 Testing Video Analysis API Endpoints in Production');
console.log('=====================================================');

testVideoAnalysisAPIs()
  .then(() => {
    console.log('\n✨ Test suite completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Unexpected error:', error.message);
    process.exit(1);
  });