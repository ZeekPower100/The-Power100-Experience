const axios = require('axios');

// Test video analysis with a business video that has transcripts
async function testVideoWithTranscript() {
  console.log('🎥 Testing Video Analysis with Transcription\n');
  console.log('=' .repeat(60));

  // Using a TED talk as example (usually has good transcripts)
  const testData = {
    video_url: 'https://www.youtube.com/watch?v=Ge7c7otG2mk', // Simon Sinek - Start with Why
    partner_id: 1,
    analysis_type: 'demo_analysis'
  };

  console.log('Test Video: Simon Sinek - Start with Why (Business Leadership)');
  console.log('URL:', testData.video_url);
  console.log('This video should have transcript available\n');

  try {
    console.log('📡 Calling video analysis API...');
    console.log('This will take 30-60 seconds...\n');

    const response = await axios.post(
      'http://localhost:5000/api/video-analysis/process',
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzU4MjUwNzcwLCJleHAiOjE3NjA4NDI3NzB9.PtmoaJoMjR-Kwm8RGeQLagfUFOszyRrY22yRirQ7wuQ'
        },
        timeout: 90000 // 90 seconds
      }
    );

    console.log('✅ Analysis completed!\n');

    if (response.data.success) {
      const { data } = response.data;

      console.log('📊 Results:');
      console.log(`  - Quality Score: ${data.quality_score}/100`);
      console.log(`  - Analysis ID: ${data.analysis_id}`);

      if (data.insights) {
        console.log('\n📝 Content Analysis:');

        if (data.insights.content_relevant === false) {
          console.log('  ❌ Not business content:', data.insights.relevance_issue);
        } else {
          console.log('  ✅ Business content detected');

          if (data.insights.key_features && data.insights.key_features.length > 0) {
            console.log('\n  Key Topics Identified:');
            data.insights.key_features.forEach((feature, i) => {
              if (i < 3) console.log(`    ${i + 1}. ${feature}`);
            });
          }

          if (data.insights.strengths && data.insights.strengths.length > 0) {
            console.log('\n  Strengths:');
            data.insights.strengths.forEach((strength, i) => {
              if (i < 3) console.log(`    • ${strength}`);
            });
          }

          if (data.insights.focus_areas && data.insights.focus_areas.length > 0) {
            console.log('\n  Relevant Focus Areas:');
            data.insights.focus_areas.forEach(area => {
              console.log(`    • ${area}`);
            });
          }
        }

        // Check if transcript was used
        if (data.analysis && data.analysis.transcript) {
          console.log('\n📜 Transcript: Available and processed');
          const words = data.analysis.transcript.split(' ').length;
          console.log(`  - Word count: ${words}`);
        } else {
          console.log('\n📜 Transcript: Not available or not processed');
        }
      }
    } else {
      console.error('❌ Analysis failed:', response.data.error);
    }

  } catch (error) {
    console.error('❌ Error:', error.response ? error.response.data : error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️ Backend is not running. Start it with: npm run safe');
    }
  }

  console.log('\n' + '=' .repeat(60));
}

// Run the test
testVideoWithTranscript()
  .then(() => {
    console.log('Test completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
  });