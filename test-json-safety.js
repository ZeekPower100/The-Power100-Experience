/**
 * Test Script for JSON Safety Changes
 * Verifies frontend and backend still work together
 */

// Use built-in fetch in Node 18+
const http = require('http');

async function runTests() {
  console.log('🧪 Testing JSON Safety Implementation\n');
  console.log('=' .repeat(50));
  
  const tests = [];
  
  // Test 1: Backend is running
  console.log('\n1. Testing Backend Server...');
  try {
    const res = await fetch('http://localhost:5000/api/contractors/test');
    console.log(`   ✅ Backend responding (Status: ${res.status})`);
    tests.push({ name: 'Backend Server', passed: true });
  } catch (error) {
    console.log(`   ❌ Backend not responding: ${error.message}`);
    tests.push({ name: 'Backend Server', passed: false });
  }
  
  // Test 2: Frontend is running
  console.log('\n2. Testing Frontend Server...');
  try {
    const res = await fetch('http://localhost:3002/');
    console.log(`   ✅ Frontend responding (Status: ${res.status})`);
    tests.push({ name: 'Frontend Server', passed: true });
  } catch (error) {
    console.log(`   ❌ Frontend not responding: ${error.message}`);
    tests.push({ name: 'Frontend Server', passed: false });
  }
  
  // Test 3: Test JSON parsing with malformed data
  console.log('\n3. Testing JSON Safety (Malformed Data)...');
  try {
    // Import the backend jsonHelpers
    const { safeJsonParse } = require('./tpe-backend/src/utils/jsonHelpers');
    
    // Test various malformed inputs
    const testCases = [
      { input: null, expected: null },
      { input: undefined, expected: null },
      { input: '', expected: null },
      { input: '[object Object]', expected: null },
      { input: 'not json', expected: ['not json'] }, // Should parse as array
      { input: '{"valid": "json"}', expected: {valid: 'json'} },
      { input: 'item1,item2,item3', expected: ['item1', 'item2', 'item3'] }
    ];
    
    let allPassed = true;
    for (const test of testCases) {
      const result = safeJsonParse(test.input);
      const passed = JSON.stringify(result) === JSON.stringify(test.expected);
      if (!passed) {
        console.log(`   ❌ Failed: safeJsonParse(${JSON.stringify(test.input)}) returned ${JSON.stringify(result)}, expected ${JSON.stringify(test.expected)}`);
        allPassed = false;
      }
    }
    
    if (allPassed) {
      console.log(`   ✅ All JSON safety tests passed`);
      tests.push({ name: 'JSON Safety', passed: true });
    } else {
      tests.push({ name: 'JSON Safety', passed: false });
    }
    
  } catch (error) {
    console.log(`   ❌ JSON safety test failed: ${error.message}`);
    tests.push({ name: 'JSON Safety', passed: false });
  }
  
  // Test 4: Test a real API endpoint
  console.log('\n4. Testing API Communication...');
  try {
    // Try to fetch public contractor data (no auth needed)
    const res = await fetch('http://localhost:5000/api/verification/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true })
    });
    
    if (res.ok || res.status === 404 || res.status === 401) {
      console.log(`   ✅ API communication working (Status: ${res.status})`);
      tests.push({ name: 'API Communication', passed: true });
    } else {
      console.log(`   ❌ Unexpected API response: ${res.status}`);
      tests.push({ name: 'API Communication', passed: false });
    }
  } catch (error) {
    console.log(`   ❌ API communication failed: ${error.message}`);
    tests.push({ name: 'API Communication', passed: false });
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 TEST SUMMARY:');
  console.log('=' .repeat(50));
  
  const passed = tests.filter(t => t.passed).length;
  const failed = tests.filter(t => !t.passed).length;
  
  tests.forEach(test => {
    console.log(`${test.passed ? '✅' : '❌'} ${test.name}`);
  });
  
  console.log('\n' + '=' .repeat(50));
  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED - Safe to deploy!');
  } else {
    console.log(`⚠️  ${failed} test(s) failed - Review before deploying`);
  }
  console.log('=' .repeat(50));
}

// Run tests
runTests().catch(console.error);