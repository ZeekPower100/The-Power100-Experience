// Test the query function directly
const { query } = require('./src/config/database');

async function testQuery() {
  try {
    console.log('Testing simple SELECT query...');
    const result = await query('SELECT COUNT(*) as count FROM contractors');
    console.log('Result:', result);
    
    console.log('\nTesting SELECT with LIMIT...');
    const result2 = await query('SELECT * FROM contractors LIMIT 5');
    console.log('Result2:', result2);
    
    console.log('\nTesting SELECT with parameters...');
    const result3 = await query('SELECT * FROM contractors LIMIT ? OFFSET ?', [5, 0]);
    console.log('Result3:', result3);
    
  } catch (error) {
    console.error('Error:', error);
  }
  process.exit(0);
}

testQuery();