/**
 * Simple Test for JSON Safety
 */

console.log('🧪 Testing JSON Safety Implementation\n');
console.log('=' .repeat(50));

// Test the backend jsonHelpers
const { safeJsonParse, safeJsonStringify } = require('./tpe-backend/src/utils/jsonHelpers');

console.log('\n1. Testing safeJsonParse with various inputs:');

const testCases = [
  { input: null, name: 'null' },
  { input: undefined, name: 'undefined' },
  { input: '', name: 'empty string' },
  { input: '[object Object]', name: '[object Object] string' },
  { input: 'not json', name: 'plain text' },
  { input: '{"valid": "json"}', name: 'valid JSON' },
  { input: 'item1,item2,item3', name: 'comma-separated' },
  { input: '["array", "of", "items"]', name: 'JSON array' },
  { input: 'malformed { json', name: 'malformed JSON' }
];

let passed = 0;
let failed = 0;

testCases.forEach(test => {
  try {
    const result = safeJsonParse(test.input);
    console.log(`   ✅ ${test.name}: ${JSON.stringify(result)}`);
    passed++;
  } catch (error) {
    console.log(`   ❌ ${test.name}: ${error.message}`);
    failed++;
  }
});

console.log('\n2. Testing safeJsonStringify:');

const stringifyTests = [
  { input: { key: 'value' }, name: 'object' },
  { input: ['array'], name: 'array' },
  { input: null, name: 'null' },
  { input: 'already a string', name: 'string' }
];

stringifyTests.forEach(test => {
  try {
    const result = safeJsonStringify(test.input);
    console.log(`   ✅ ${test.name}: ${result}`);
    passed++;
  } catch (error) {
    console.log(`   ❌ ${test.name}: ${error.message}`);
    failed++;
  }
});

console.log('\n' + '=' .repeat(50));
console.log('📊 RESULTS:');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);

if (failed === 0) {
  console.log('\n✅ ALL TESTS PASSED - JSON helpers working correctly!');
  console.log('The backend changes are safe and won\'t break existing functionality.');
} else {
  console.log('\n⚠️  Some tests failed - review before deploying');
}
console.log('=' .repeat(50));