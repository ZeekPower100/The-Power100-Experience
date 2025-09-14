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

async function testProfile() {
  const token = await getToken();
  if (!token) {
    console.error('No token');
    return;
  }
  
  console.log('Testing AI profile endpoint...');
  
  try {
    const response = await axios.get(
      `${API_BASE}/ai-tracking/contractors/1/ai-profile`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('Profile success!');
    console.log('Engagement score:', response.data.profile.engagement_score);
    console.log('Lifecycle stage:', response.data.profile.lifecycle_stage);
    console.log('Total goals:', response.data.profile.total_goals);
    console.log('Open challenges:', response.data.profile.open_challenges);
    console.log('Recent events:', response.data.profile.recent_events.length);
    
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.error('Server error - checking details...');
    }
  }
}

testProfile();