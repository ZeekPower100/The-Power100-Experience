const axios = require('axios');

// Test the video analysis API directly (bypassing n8n)
async function testVideoAnalysisAPI() {
  console.log('🎥 Testing Video Analysis API Directly\n');
  console.log('=' .repeat(60));

  const testData = {
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // Example YouTube URL
    partner_id: 1,
    analysis_type: 'demo_analysis'
  };

  console.log('API Endpoint: http://localhost:5000/api/video-analysis/process');
  console.log('Test Data:', testData);
  console.log('=' .repeat(60) + '\n');

  try {
    console.log('📡 Calling video analysis API...');
    console.log('This may take 30-60 seconds for AI analysis...\n');

    const response = await axios.post(
      'http://localhost:5000/api/video-analysis/process',
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzU4MjUwNzcwLCJleHAiOjE3NjA4NDI3NzB9.PtmoaJoMjR-Kwm8RGeQLagfUFOszyRrY22yRirQ7wuQ'
        },
        timeout: 70000 // 70 seconds timeout
      }
    );

    console.log('✅ Success! Analysis completed\n');
    console.log('Response:', JSON.stringify(response.data, null, 2));

    if (response.data.data) {
      const { quality_score, insights, analysis_id } = response.data.data;

      console.log('\n📊 Analysis Summary:');
      console.log(`  - Analysis ID: ${analysis_id}`);
      console.log(`  - Quality Score: ${quality_score}/100`);

      if (insights) {
        console.log('\n📈 Insights:');

        if (insights.content_relevant === false) {
          console.log('  ⚠️ Content Not Relevant:', insights.relevance_issue);
        } else {
          if (insights.strengths && insights.strengths.length > 0) {
            console.log('  ✅ Strengths:');
            insights.strengths.forEach(s => console.log(`    - ${s}`));
          }

          if (insights.improvements && insights.improvements.length > 0) {
            console.log('  📝 Improvements:');
            insights.improvements.forEach(i => console.log(`    - ${i}`));
          }

          if (insights.focus_areas && insights.focus_areas.length > 0) {
            console.log('  🎯 Focus Areas:', insights.focus_areas.join(', '));
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error calling API:');

    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', error.response.data);

      if (error.response.status === 401) {
        console.error('\n⚠️ Authentication failed. Token may be expired.');
        console.error('Generate a new token with: node generate-jwt-token.js');
      }
    } else if (error.request) {
      console.error('No response received. Is the backend running?');
      console.error('Start backend with: npm run safe');
    } else {
      console.error('Error:', error.message);
    }
  }

  console.log('\n' + '=' .repeat(60));
}

// Allow custom video URL from command line
if (process.argv[2]) {
  console.log(`Using custom video URL: ${process.argv[2]}\n`);
}

// Run the test
testVideoAnalysisAPI()
  .then(() => {
    console.log('Test completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
  });