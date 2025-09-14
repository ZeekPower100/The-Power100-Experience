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

async function testBulkEndpoint() {
  const token = await getToken();
  if (!token) {
    console.error('No token');
    return;
  }
  
  console.log('Testing bulk endpoint with minimal data...');
  
  try {
    // Test with minimal data
    const response = await axios.post(
      `${API_BASE}/ai-tracking/contractors/1/events/bulk`,
      {
        events: [
          { event_type: 'test1', event_data: {} },
          { event_type: 'test2', event_data: {} }
        ]
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Success:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.data?.stack) {
      console.error('Stack:', error.response.data.stack);
    }
  }
}

testBulkEndpoint();