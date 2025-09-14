const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

async function getToken() {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@power100.io',
      password: 'admin123'
    });
    return response.data.token;
  } catch (error) {
    console.error('Failed to get token:', error.message);
    return null;
  }
}

async function testSingleEvent() {
  const token = await getToken();
  if (!token) {
    console.error('No token');
    return;
  }
  
  console.log('Testing single event endpoint...');
  
  try {
    const response = await axios.post(
      `${API_BASE}/ai-tracking/contractors/1/events`,
      {
        event_type: 'test_single',
        event_data: { test: true },
        channel: 'web'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Single event success:', response.data);
    
    // Now test bulk
    console.log('\nTesting bulk with same format...');
    const bulkResponse = await axios.post(
      `${API_BASE}/ai-tracking/contractors/1/events/bulk`,
      {
        events: [
          { event_type: 'bulk_test_1' },
          { event_type: 'bulk_test_2' }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Bulk success:', bulkResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testSingleEvent();