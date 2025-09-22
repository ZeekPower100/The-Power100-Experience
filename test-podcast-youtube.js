const axios = require('axios');

// Test podcast with YouTube video
async function testYouTubePodcast() {
  console.log('🎥 Testing YouTube Video Podcast Analysis\n');
  console.log('=' .repeat(60));

  const videoPodcast = {
    title: 'How I Built This - Brian Chesky',
    host: 'Guy Raz',
    description: 'Brian Chesky on building Airbnb',
    youtube_url: 'https://www.youtube.com/watch?v=W608u6sBFpo',  // Real NPR podcast on YouTube
    frequency: 'Weekly',
    focus_areas_covered: 'Entrepreneurship, Startups, Business',
    topics: 'Founders, Innovation, Business Stories',
    is_active: true
  };

  try {
    console.log('📡 Creating video podcast with YouTube URL...');
    console.log(`Title: ${videoPodcast.title}`);
    console.log(`YouTube: ${videoPodcast.youtube_url}\n`);

    const response = await axios.post(
      'http://localhost:5000/api/podcasts/submit',
      videoPodcast,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    console.log(`✅ Video podcast created: ID ${response.data.id}`);
    console.log(`📊 Processing Status: ${response.data.ai_processing_status}`);

    // Wait for processing to trigger
    console.log('\n⏳ Waiting 5 seconds for processing...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Manually trigger processing if needed
    console.log('📡 Triggering processing...');
    const processResponse = await axios.post(
      'http://localhost:5000/api/podcasts/process-pending',
      { podcast_id: response.data.id },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 60000  // 60 seconds for processing
      }
    );

    console.log('\n📊 Processing Results:');
    console.log(`  - Success: ${processResponse.data.success}`);
    console.log(`  - Message: ${processResponse.data.message}`);
    console.log(`  - Processed: ${processResponse.data.processed}`);
    console.log(`  - Successful: ${processResponse.data.successful}`);

    if (processResponse.data.results && processResponse.data.results.length > 0) {
      const result = processResponse.data.results[0];
      console.log(`\n📝 Podcast ${result.podcast_id}:`);
      console.log(`  - Title: ${result.title}`);
      console.log(`  - Status: ${result.status}`);
    }

    // Check the final state
    console.log('\n📡 Checking final podcast state...');
    const finalCheck = await axios.get(
      `http://localhost:5000/api/podcasts/${response.data.id}`,
      {
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzU4MjUwNzcwLCJleHAiOjE3NjA4NDI3NzB9.PtmoaJoMjR-Kwm8RGeQLagfUFOszyRrY22yRirQ7wuQ'
        }
      }
    );

    const podcast = finalCheck.data;
    console.log('\n✅ Final Results:');
    console.log(`  - Processing Status: ${podcast.ai_processing_status}`);
    console.log(`  - Has AI Summary: ${podcast.ai_summary ? 'Yes' : 'No'}`);
    console.log(`  - Has AI Tags: ${podcast.ai_tags ? 'Yes' : 'No'}`);

    if (podcast.ai_summary && podcast.ai_summary !== 'Podcast analyzed successfully') {
      console.log('\n📝 AI Summary Preview:');
      console.log(`  ${podcast.ai_summary.substring(0, 200)}...`);
    }

    if (podcast.ai_tags && podcast.ai_tags.length > 0) {
      console.log('\n🏷️ AI Tags:', JSON.stringify(podcast.ai_tags));
    }

  } catch (error) {
    console.error('❌ Error:', error.response ? error.response.data : error.message);
  }

  console.log('\n' + '=' .repeat(60));
}

// Run test
testYouTubePodcast()
  .then(() => {
    console.log('\n✨ Test completed!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
  });