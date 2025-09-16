/**
 * Get a fresh admin token for testing
 */

const axios = require('axios');

async function getAdminToken() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@power100.io',
      password: 'admin123'
    });

    if (response.data.success && response.data.token) {
      console.log('✅ Successfully obtained admin token!\n');
      console.log('Token:', response.data.token);
      console.log('\nYou can use this token for testing.');
      return response.data.token;
    } else {
      console.error('❌ Login failed:', response.data);
    }
  } catch (error) {
    console.error('❌ Error getting token:', error.response?.data || error.message);
  }
}

getAdminToken();