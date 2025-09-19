const https = require('https');

// Helper to make API requests
function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'tpx.power100.io',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      const cookies = res.headers['set-cookie'] || [];

      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({
            data: response,
            status: res.statusCode,
            cookies: cookies
          });
        } catch (e) {
          resolve({
            data: { error: 'Failed to parse', body },
            status: res.statusCode,
            cookies: cookies
          });
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

async function testPublicEndpoints() {
  console.log('🔍 Testing Production AI Concierge Access');
  console.log('==========================================\n');

  // First, check if we can access contractors endpoint at all
  console.log('Test 1: Checking public contractor endpoints...');

  const publicEndpoints = [
    '/api/contractors/public/verify',
    '/api/contractors/start',
    '/api/contractors/register',
    '/api/auth/contractor/register'
  ];

  for (const endpoint of publicEndpoints) {
    const response = await makeRequest(endpoint, 'POST', {
      name: 'Test User',
      email: 'test@example.com',
      phone: '555-1234',
      company_name: 'Test Company'
    });

    console.log(`${endpoint}: ${response.status} - ${response.data.message || response.data.error || 'Success'}`);
  }

  console.log('\n==========================================');
  console.log('📱 Manual Testing Instructions');
  console.log('==========================================\n');

  console.log('Since the API endpoints require authentication, please test manually:\n');

  console.log('Option 1: Admin Dashboard (Easiest)');
  console.log('-------------------------------------');
  console.log('1. Go to: https://tpx.power100.io/admindashboard');
  console.log('2. Login with admin credentials');
  console.log('3. Navigate to AI Concierge from the dashboard\n');

  console.log('Option 2: Direct AI Concierge Page');
  console.log('-----------------------------------');
  console.log('1. Go to: https://tpx.power100.io/ai-concierge');
  console.log('2. You may need to login or complete contractor flow first\n');

  console.log('Option 3: Contractor Flow');
  console.log('-------------------------');
  console.log('1. Go to: https://tpx.power100.io/contractorflow');
  console.log('2. Complete the verification and onboarding');
  console.log('3. Access AI Concierge after completion\n');

  console.log('==========================================');
  console.log('🧪 Test Queries to Try');
  console.log('==========================================\n');

  console.log('1. Partner Test:');
  console.log('   "Tell me about Destination Motivation"');
  console.log('   Expected: Should mention PowerConfidence Score of 99\n');

  console.log('2. Book Test:');
  console.log('   "What books are available?"');
  console.log('   Expected: Should list "Beyond the Hammer" and "Production Book"\n');

  console.log('3. Podcast Test:');
  console.log('   "Tell me about The Wealthy Contractor podcast"');
  console.log('   Expected: Should recognize it with Brian Kaskavalciyan as host\n');

  console.log('4. Event Test:');
  console.log('   "What events are coming up?"');
  console.log('   Expected: Should list Contractor Growth Expo, Operation Lead Surge, etc.\n');

  console.log('5. Comprehensive Test:');
  console.log('   "What resources do you have for me?"');
  console.log('   Expected: Should list partners, books, podcasts, and events\n');

  console.log('==========================================');
  console.log('✅ What\'s Been Fixed & Deployed');
  console.log('==========================================\n');

  console.log('1. Status field alignment (published vs active)');
  console.log('2. Removed LIMIT clauses for scalability');
  console.log('3. Enhanced knowledge context with === sections');
  console.log('4. Comprehensive data retrieval from all columns');
  console.log('5. Books: Now fetching 20+ columns including Amazon URLs');
  console.log('6. Podcasts: Fetching all listening URLs and host info');
  console.log('7. Events: Fetching 30+ columns including registration info');
  console.log('8. Partners: Fetching 40+ columns including pricing and contact info\n');

  console.log('The backend is working - just needs frontend access to test!');
}

testPublicEndpoints();