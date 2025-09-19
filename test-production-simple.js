const https = require('https');

// Helper to make API requests
function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'tpx.power100.io',
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      console.log('Status Code:', res.statusCode);
      console.log('Headers:', res.headers);

      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log('Response body:', body);
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (e) {
          resolve({ error: 'Failed to parse response', body });
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Check basic API connectivity
async function checkAPI() {
  console.log('🔍 Checking Production AI Concierge API');
  console.log('Time:', new Date().toISOString());
  console.log('========================================\n');

  // Test 1: Check if AI Concierge routes exist
  console.log('Test 1: Checking AI Concierge endpoint...');
  try {
    const response = await makeRequest('/api/ai-concierge/message', 'POST', {
      message: 'Hello',
      contractorId: 1
    });
    console.log('\nParsed response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n========================================');
  console.log('Test 2: Checking backend health...');

  try {
    const response = await makeRequest('/api/health', 'GET');
    console.log('\nHealth check response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }

  console.log('\n========================================');
  console.log('Test 3: Checking if backend is running...');

  try {
    const response = await makeRequest('/api/contractors/test', 'GET');
    console.log('\nBackend test response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

checkAPI().catch(console.error);