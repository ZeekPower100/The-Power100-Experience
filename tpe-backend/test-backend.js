/**
 * Quick test script to verify backend is working
 * Run with: node test-backend.js
 */

const axios = require('axios');
const BASE_URL = 'http://localhost:5000';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function testBackend() {
  console.log(`\n${colors.blue}🧪 Testing Power100 Backend API${colors.reset}\n`);

  try {
    // Test 1: Health check
    console.log('1️⃣  Testing health endpoint...');
    const health = await axios.get(`${BASE_URL}/health`);
    console.log(`${colors.green}✅ Server is healthy: ${health.data.status}${colors.reset}`);

    // Test 2: Start contractor verification
    console.log('\n2️⃣  Testing contractor verification start...');
    const contractor = {
      name: 'John Smith',
      email: 'john@example.com',
      phone: '555-123-4567',
      company_name: 'ABC Roofing',
      company_website: 'https://abcroofing.com'
    };
    
    const verifyResponse = await axios.post(`${BASE_URL}/api/contractors/verify-start`, contractor);
    console.log(`${colors.green}✅ Verification started for ${verifyResponse.data.contractor.name}${colors.reset}`);
    console.log(`   Contractor ID: ${verifyResponse.data.contractor.id}`);

    // Test 3: Get active partners
    console.log('\n3️⃣  Testing get active partners...');
    const partners = await axios.get(`${BASE_URL}/api/partners/active`);
    console.log(`${colors.green}✅ Found ${partners.data.count} active partners:${colors.reset}`);
    partners.data.partners.forEach(p => {
      console.log(`   - ${p.company_name} (Score: ${p.power_confidence_score})`);
    });

    // Test 4: Admin login
    console.log('\n4️⃣  Testing admin login...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: 'admin@power100.io',
      password: 'admin123'
    });
    console.log(`${colors.green}✅ Admin login successful${colors.reset}`);
    const token = loginResponse.data.token;

    // Test 5: Get dashboard stats (requires auth)
    console.log('\n5️⃣  Testing admin dashboard stats...');
    const stats = await axios.get(`${BASE_URL}/api/admin/dashboard`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`${colors.green}✅ Dashboard stats retrieved:${colors.reset}`);
    console.log(`   - Total Contractors: ${stats.data.stats.contractors.total}`);
    console.log(`   - Active Partners: ${stats.data.stats.partners.active}`);
    console.log(`   - Total Bookings: ${stats.data.stats.bookings.total}`);

    console.log(`\n${colors.green}🎉 All tests passed! Backend is working correctly.${colors.reset}\n`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Test failed:${colors.reset}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Message: ${error.response.data.error || error.response.data.message}`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error(`   Could not connect to server at ${BASE_URL}`);
      console.error(`   Make sure the backend is running with: npm run dev:sqlite`);
    } else {
      console.error(`   ${error.message}`);
    }
    console.log(`\n${colors.yellow}💡 Troubleshooting tips:${colors.reset}`);
    console.log('   1. Make sure you have installed dependencies: cd tpe-backend && npm install');
    console.log('   2. Start the backend server: npm run dev:sqlite');
    console.log('   3. The server should be running on port 5000\n');
  }
}

// Run tests
testBackend();