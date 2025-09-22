const axios = require('axios');

// Configuration
const N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/trigger-video-analysis-dev';

// Test data - you can modify this with real video URLs
const testData = {
  video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Example YouTube URL
  partner_id: 1, // Optional - remove if not testing with a partner
  analysis_type: 'demo_analysis' // Optional - defaults to 'demo_analysis'
};

async function testVideoAnalysisWebhook() {
  console.log('🎥 Testing Video AI Analysis Webhook\n');
  console.log('=' .repeat(60));
  console.log('Webhook URL:', N8N_WEBHOOK_URL);
  console.log('Test Data:', testData);
  console.log('=' .repeat(60) + '\n');

  try {
    console.log('📡 Sending request to n8n webhook...');
    const response = await axios.post(N8N_WEBHOOK_URL, testData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 70000 // 70 seconds timeout (longer than n8n's 60 second timeout)
    });

    console.log('\n✅ Success! Response received:\n');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));

    if (response.data.quality_score !== undefined) {
      console.log('\n📊 Analysis Results:');
      console.log(`  - Quality Score: ${response.data.quality_score}/100`);
      console.log(`  - Analysis ID: ${response.data.analysis_id}`);

      if (response.data.insights) {
        console.log('\n💡 Key Insights:');
        if (response.data.insights.strengths) {
          console.log('  Strengths:', response.data.insights.strengths);
        }
        if (response.data.insights.improvements) {
          console.log('  Improvements:', response.data.insights.improvements);
        }
      }
    }

  } catch (error) {
    console.error('\n❌ Error testing webhook:');

    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received. Is n8n running and the workflow active?');
      console.error('Check that:');
      console.error('  1. n8n is running (http://localhost:5678)');
      console.error('  2. The workflow is imported and ACTIVE');
      console.error('  3. The webhook path matches: trigger-video-analysis-dev');
    } else {
      // Something happened in setting up the request
      console.error('Error:', error.message);
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log('Test completed');
}

// Test with different scenarios
async function runTests() {
  console.log('🧪 Running Video Analysis Webhook Tests\n');

  // Test 1: With partner video
  console.log('Test 1: Partner Demo Video');
  await testVideoAnalysisWebhook();

  // Optional: Test 2: Without partner_id
  // console.log('\nTest 2: Generic Video (no partner)');
  // testData.partner_id = null;
  // await testVideoAnalysisWebhook();
}

// Check command line arguments
if (process.argv.length > 2) {
  // Allow passing custom video URL via command line
  testData.video_url = process.argv[2];
  if (process.argv[3]) {
    testData.partner_id = parseInt(process.argv[3]);
  }
}

// Run the test
testVideoAnalysisWebhook()
  .then(() => {
    console.log('\n✨ All tests completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n💥 Test failed:', err.message);
    process.exit(1);
  });

/*
 * USAGE:
 *
 * 1. Basic test with default video:
 *    node test-video-analysis-webhook.js
 *
 * 2. Test with custom video URL:
 *    node test-video-analysis-webhook.js "https://www.youtube.com/watch?v=VIDEO_ID"
 *
 * 3. Test with custom video and partner ID:
 *    node test-video-analysis-webhook.js "https://www.youtube.com/watch?v=VIDEO_ID" 5
 *
 * SETUP:
 * 1. Import the workflow JSON into n8n
 * 2. Activate the workflow in n8n
 * 3. Run this test script
 */