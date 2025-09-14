/**
 * Test AI Tracking APIs
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let TEST_TOKEN = 'test-admin-token'; // Will be set after login
const CONTRACTOR_ID = 1; // Using the test contractor

// Helper function for API calls
async function apiCall(method, endpoint, data = null) {
  try {
    const config = {
      method,
      url: `${API_BASE}${endpoint}`,
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`
      }
    };
    
    // Only add Content-Type and data for non-GET requests
    if (method !== 'GET' && data) {
      config.headers['Content-Type'] = 'application/json';
      config.data = data;
    }
    
    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`Error calling ${endpoint}:`, error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🧪 Testing AI Tracking APIs\n');

  // Test 1: Track events
  console.log('1️⃣ Testing event tracking...');
  const eventResult = await apiCall('POST', `/ai-tracking/contractors/${CONTRACTOR_ID}/events`, {
    event_type: 'api_test',
    event_data: { test: true, timestamp: new Date() },
    channel: 'web'
  });
  console.log('Event tracked:', eventResult?.success ? '✅' : '❌');
  if (eventResult?.updated_metrics) {
    console.log('Updated metrics:', eventResult.updated_metrics);
  }

  // Test 2: Track bulk events
  console.log('\n2️⃣ Testing bulk event tracking...');
  const bulkResult = await apiCall('POST', `/ai-tracking/contractors/${CONTRACTOR_ID}/events/bulk`, {
    events: [
      { event_type: 'page_view', event_data: { page: '/test1' }},
      { event_type: 'click', event_data: { button: 'test' }},
      { event_type: 'form_submit', event_data: { form: 'test_form' }}
    ]
  });
  console.log('Bulk events tracked:', bulkResult?.success ? `✅ (${bulkResult?.events_tracked} events)` : '❌');

  // Test 3: Add business goals
  console.log('\n3️⃣ Testing business goals...');
  const goalsResult = await apiCall('POST', `/ai-tracking/contractors/${CONTRACTOR_ID}/goals`, {
    goals: [
      {
        goal: 'Increase revenue by 30%',
        priority: 5,
        timeline: '2024-12-31',
        current_progress: 25
      }
    ]
  });
  console.log('Goals added:', goalsResult?.success ? '✅' : '❌');

  // Test 4: Track challenges
  console.log('\n4️⃣ Testing challenges tracking...');
  const challengesResult = await apiCall('POST', `/ai-tracking/contractors/${CONTRACTOR_ID}/challenges`, {
    challenges: [
      {
        challenge: 'Finding skilled workers',
        severity: 'high',
        open_to_solutions: true
      }
    ]
  });
  console.log('Challenges tracked:', challengesResult?.success ? '✅' : '❌');

  // Test 5: Track recommendation
  console.log('\n5️⃣ Testing recommendations...');
  const recResult = await apiCall('POST', `/ai-tracking/contractors/${CONTRACTOR_ID}/recommendations`, {
    entity_type: 'partner',
    entity_id: '1',
    entity_name: 'Test Partner',
    reason: 'High match score based on focus areas',
    confidence_score: 85
  });
  console.log('Recommendation tracked:', recResult?.success ? '✅' : '❌');

  // Test 6: Get AI Profile
  console.log('\n6️⃣ Testing AI profile retrieval...');
  const profileResult = await apiCall('GET', `/ai-tracking/contractors/${CONTRACTOR_ID}/ai-profile`);
  console.log('AI Profile retrieved:', profileResult?.success ? '✅' : '❌');
  if (profileResult?.profile) {
    console.log('Profile summary:');
    console.log('  - Engagement Score:', profileResult.profile.engagement_score);
    console.log('  - Lifecycle Stage:', profileResult.profile.lifecycle_stage);
    console.log('  - Total Goals:', profileResult.profile.total_goals);
    console.log('  - Open Challenges:', profileResult.profile.open_challenges);
  }

  // Test 7: Get engagement analytics
  console.log('\n7️⃣ Testing engagement analytics...');
  const analyticsResult = await apiCall('GET', `/ai-tracking/contractors/${CONTRACTOR_ID}/analytics?days=7`);
  console.log('Analytics retrieved:', analyticsResult?.success ? '✅' : '❌');
  if (analyticsResult?.analytics) {
    console.log('  - Daily engagement data points:', analyticsResult.analytics.daily_engagement?.length || 0);
    console.log('  - Metrics history entries:', analyticsResult.analytics.metrics_history?.length || 0);
  }

  // Test 8: Get at-risk contractors
  console.log('\n8️⃣ Testing at-risk contractors...');
  const atRiskResult = await apiCall('GET', '/ai-tracking/analytics/at-risk');
  console.log('At-risk contractors retrieved:', atRiskResult?.success ? '✅' : '❌');
  if (atRiskResult?.at_risk_contractors) {
    console.log('  - Found:', atRiskResult.at_risk_contractors.length, 'at-risk contractors');
  }

  // Test 9: Update preferences
  console.log('\n9️⃣ Testing preference updates...');
  const prefResult = await apiCall('PATCH', `/ai-tracking/contractors/${CONTRACTOR_ID}/preferences`, {
    communication_preferences: {
      channels: ['email', 'sms'],
      frequency: 'weekly',
      best_times: ['morning', 'evening'],
      timezone: 'America/New_York'
    },
    learning_preferences: {
      content_types: ['video', 'article'],
      session_length: 'short',
      depth: 'summary'
    }
  });
  console.log('Preferences updated:', prefResult?.success ? '✅' : '❌');

  console.log('\n✨ Testing complete!');
}

// Get auth token first
async function getAuthToken() {
  try {
    console.log('🔐 Getting auth token...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@power100.io',
      password: 'admin123'
    });
    return response.data.token;
  } catch (error) {
    console.error('Failed to get auth token:', error.response?.data || error.message);
    return null;
  }
}

// Main execution
(async () => {
  const token = await getAuthToken();
  if (!token) {
    console.error('❌ Could not get auth token. Make sure the server is running.');
    process.exit(1);
  }
  
  // Set token
  TEST_TOKEN = token;
  console.log('✅ Got auth token\n');
  
  // Run tests
  await runTests();
})();