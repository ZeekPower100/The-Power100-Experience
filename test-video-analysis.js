require('dotenv').config({ path: './tpe-backend/.env' });
const axios = require('axios');

// Test configuration
const API_BASE_URL = 'http://localhost:5000';
const TEST_VIDEO_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'; // Example video

async function getAuthToken() {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/auth/login`, {
      email: 'admin@power100.io',
      password: 'admin123'
    });
    return response.data.token;
  } catch (error) {
    console.error('Failed to get auth token:', error.message);
    throw error;
  }
}

async function testVideoAnalysis() {
  try {
    console.log('🔐 Getting authentication token...');
    const token = await getAuthToken();
    console.log('✅ Authentication successful');

    console.log('\n📹 Testing video analysis pipeline...');
    console.log('Video URL:', TEST_VIDEO_URL);

    const analysisResponse = await axios.post(
      `${API_BASE_URL}/api/video-analysis/process`,
      {
        video_url: TEST_VIDEO_URL,
        analysis_type: 'demo_analysis'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n✅ Video analysis completed successfully!');
    console.log('\n📊 Analysis Results:');
    console.log('-------------------');
    console.log('Success:', analysisResponse.data.success);
    console.log('Message:', analysisResponse.data.message);

    if (analysisResponse.data.data) {
      const { analysis_id, quality_score, insights } = analysisResponse.data.data;
      console.log('Analysis ID:', analysis_id);
      console.log('Quality Score:', quality_score);

      if (insights) {
        console.log('\n🔍 Key Insights:');

        // Check content relevance
        if (insights.content_relevant === false) {
          console.log('\n⚠️ CONTENT RELEVANCE ISSUE DETECTED:');
          console.log('  - Issue:', insights.relevance_issue || 'Not business content');
          console.log('  - Reasoning:', insights.scoring_reasoning);
          console.log('\n📝 Recommendations:');
          if (insights.recommendations) {
            insights.recommendations.forEach(rec => console.log(`  • ${rec}`));
          }
        } else {
          console.log('  - Content Relevant: Yes');
          console.log('  - Key Features:', insights.key_features?.slice(0, 3).join(', ') || 'None');
          console.log('  - Strengths:', insights.strengths?.slice(0, 2).join(', ') || 'None');
          console.log('  - Focus Areas:', insights.focus_areas?.slice(0, 3).join(', ') || 'None');
        }

        if (insights.scoring_reasoning) {
          console.log('\n💭 Scoring Reasoning:');
          console.log('  ', insights.scoring_reasoning);
        }
      }
    }

    // Test fetching the analysis
    if (analysisResponse.data.data?.analysis_id) {
      console.log('\n📖 Fetching stored analysis...');
      const getAnalysisResponse = await axios.get(
        `${API_BASE_URL}/api/video-analysis/${analysisResponse.data.data.analysis_id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      console.log('✅ Analysis retrieved successfully');
      console.log('Analysis Type:', getAnalysisResponse.data.data?.analysis_type);
      console.log('Frames Analyzed:', getAnalysisResponse.data.data?.frames_analyzed);
    }

    // Test getting analysis stats
    console.log('\n📈 Getting analysis statistics...');
    const statsResponse = await axios.get(
      `${API_BASE_URL}/api/video-analysis/stats`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    console.log('✅ Statistics retrieved:');
    console.log('  - Total Analyses:', statsResponse.data.data?.total_analyses || 0);
    console.log('  - Demo Analyses:', statsResponse.data.data?.demo_analyses || 0);
    console.log('  - Avg Demo Score:', statsResponse.data.data?.avg_demo_score?.toFixed(2) || 'N/A');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data?.error) {
      console.error('Error details:', error.response.data.error);
    }
  }
}

// Run the test
console.log('🚀 Starting Video Analysis Pipeline Test');
console.log('========================================\n');

testVideoAnalysis()
  .then(() => {
    console.log('\n✨ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Test failed with error:', error.message);
    process.exit(1);
  });