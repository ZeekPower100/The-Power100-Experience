const https = require('https');

// Production API endpoint
const API_BASE = 'https://tpx.power100.io';

// Test contractor data
const testContractor = {
  id: 1,
  name: 'Test Contractor',
  email: 'test@example.com',
  company_name: 'Test HVAC Company',
  focus_areas: ['customer_retention', 'operational_efficiency', 'greenfield_growth'],
  revenue_tier: '$1M-$5M',
  team_size: '10-25'
};

// Helper to make API requests
function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'tpx.power100.io',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // Will work in dev mode
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (e) {
          resolve({ error: 'Failed to parse response', body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Test functions
async function testBasicConnectivity() {
  console.log('\n=== TEST 1: Basic Connectivity ===');
  const response = await makeRequest('/api/ai-concierge/test', 'GET');
  console.log('Response:', JSON.stringify(response, null, 2));
  return response.success === true;
}

async function testPartnerRecommendations() {
  console.log('\n=== TEST 2: Partner Recommendations ===');
  const response = await makeRequest('/api/ai-concierge/message', 'POST', {
    message: 'What partners can help me with customer retention?',
    contractorId: 1
  });

  console.log('Success:', response.success);
  if (response.aiResponse?.content) {
    const content = response.aiResponse.content;
    console.log('\nChecking for specific partner features:');
    console.log('- Contains "Destination Motivation":', content.includes('Destination Motivation'));
    console.log('- Contains "PowerConfidence":', content.includes('PowerConfidence'));
    console.log('- Contains specific scores:', /\d{2,3}/.test(content));
    console.log('\nFirst 500 chars of response:', content.substring(0, 500));
  }
  return response.success === true;
}

async function testBookRecommendations() {
  console.log('\n=== TEST 3: Book Recommendations ===');
  const response = await makeRequest('/api/ai-concierge/message', 'POST', {
    message: 'What books should I read to improve my business operations?',
    contractorId: 1
  });

  console.log('Success:', response.success);
  if (response.aiResponse?.content) {
    const content = response.aiResponse.content;
    console.log('\nChecking for TPX books:');
    console.log('- Contains "Traction":', content.includes('Traction'));
    console.log('- Contains "E-Myth Contractor":', content.includes('E-Myth Contractor'));
    console.log('- Contains "Profit First":', content.includes('Profit First'));
    console.log('- Contains Amazon links:', content.includes('amazon.com'));
    console.log('\nFirst 500 chars of response:', content.substring(0, 500));
  }
  return response.success === true;
}

async function testPodcastRecognition() {
  console.log('\n=== TEST 4: Podcast Recognition ===');
  const response = await makeRequest('/api/ai-concierge/message', 'POST', {
    message: 'Tell me about the HVAC Excellence Show and The Wealthy Contractor podcasts',
    contractorId: 1
  });

  console.log('Success:', response.success);
  if (response.aiResponse?.content) {
    const content = response.aiResponse.content;
    console.log('\nChecking for specific podcasts:');
    console.log('- Recognizes "HVAC Excellence Show":', content.includes('HVAC Excellence Show'));
    console.log('- Recognizes "The Wealthy Contractor":', content.includes('Wealthy Contractor'));
    console.log('- Mentions hosts:', content.includes('Industry Leaders') || content.includes('Brian Kaskavalciyan'));
    console.log('- Says NOT in network:', content.includes('not') && content.includes('network'));
    console.log('\nFirst 500 chars of response:', content.substring(0, 500));
  }
  return response.success === true;
}

async function testComprehensiveResources() {
  console.log('\n=== TEST 5: Comprehensive Resource Recommendations ===');
  const response = await makeRequest('/api/ai-concierge/message', 'POST', {
    message: 'What resources do you have for me - books, podcasts, partners, events?',
    contractorId: 1
  });

  console.log('Success:', response.success);
  if (response.aiResponse?.content) {
    const content = response.aiResponse.content;
    console.log('\nChecking for all resource types:');
    console.log('- Recommends partners:', content.includes('Destination Motivation') || content.includes('MarketPro'));
    console.log('- Recommends books:', content.includes('Traction') || content.includes('E-Myth'));
    console.log('- Recommends podcasts:', content.includes('Contractor Success Forum') || content.includes('Wealthy Contractor'));
    console.log('- Mentions events:', content.toLowerCase().includes('event'));
    console.log('- Includes PowerConfidence scores:', /Score:\s*\d+/.test(content));
    console.log('\nFirst 800 chars of response:', content.substring(0, 800));
  }
  return response.success === true;
}

async function testEnhancedDataRetrieval() {
  console.log('\n=== TEST 6: Enhanced Data Retrieval ===');
  const response = await makeRequest('/api/ai-concierge/message', 'POST', {
    message: 'Tell me about Destination Motivation - their contact info, pricing, and onboarding process',
    contractorId: 1
  });

  console.log('Success:', response.success);
  if (response.aiResponse?.content) {
    const content = response.aiResponse.content;
    console.log('\nChecking for detailed partner data:');
    console.log('- Mentions PowerConfidence score:', /\d{2,3}/.test(content));
    console.log('- Includes contact/website info:', content.includes('contact') || content.includes('website'));
    console.log('- Discusses value proposition:', content.includes('value') || content.includes('specializ'));
    console.log('- Shows comprehensive knowledge:', content.length > 1000);
    console.log('\nFirst 500 chars of response:', content.substring(0, 500));
  }
  return response.success === true;
}

// Run all tests
async function runAllTests() {
  console.log('🚀 Starting Production AI Concierge Tests');
  console.log('=========================================');
  console.log('API Base:', API_BASE);
  console.log('Time:', new Date().toISOString());
  console.log('=========================================');

  const tests = [
    { name: 'Basic Connectivity', fn: testBasicConnectivity },
    { name: 'Partner Recommendations', fn: testPartnerRecommendations },
    { name: 'Book Recommendations', fn: testBookRecommendations },
    { name: 'Podcast Recognition', fn: testPodcastRecognition },
    { name: 'Comprehensive Resources', fn: testComprehensiveResources },
    { name: 'Enhanced Data Retrieval', fn: testEnhancedDataRetrieval }
  ];

  const results = [];

  for (const test of tests) {
    try {
      console.log(`\nRunning: ${test.name}`);
      const passed = await test.fn();
      results.push({ name: test.name, passed });

      // Wait between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`Error in ${test.name}:`, error.message);
      results.push({ name: test.name, passed: false, error: error.message });
    }
  }

  console.log('\n=========================================');
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=========================================');

  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.name}: ${result.passed ? 'PASSED' : 'FAILED'}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  const passRate = Math.round((passedCount / totalCount) * 100);

  console.log('\n=========================================');
  console.log(`Overall: ${passedCount}/${totalCount} tests passed (${passRate}%)`);
  console.log('=========================================');
}

// Run the tests
runAllTests().catch(console.error);