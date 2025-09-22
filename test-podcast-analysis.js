const axios = require('axios');

// Test podcast analysis automation
async function testPodcastAnalysis() {
  console.log('🎙️ Testing Podcast AI Analysis Automation\n');
  console.log('=' .repeat(60));

  // Test data for a podcast
  const testPodcast = {
    title: 'The Tim Ferriss Show',
    host: 'Tim Ferriss',
    description: 'Tim Ferriss deconstructs world-class performers to extract tactics and tools',
    rss_feed_url: 'https://feeds.megaphone.fm/TIM42375355435',  // Real RSS feed
    youtube_url: 'https://www.youtube.com/watch?v=example',     // Example YouTube URL
    frequency: 'Weekly',
    focus_areas_covered: 'Business, Productivity, Health',
    topics: 'Entrepreneurship, Self-improvement',
    is_active: true
  };

  try {
    console.log('📡 Creating test podcast with RSS feed...');
    console.log(`Title: ${testPodcast.title}`);
    console.log(`RSS Feed: ${testPodcast.rss_feed_url}\n`);

    // Create podcast (this should trigger the automation)
    const createResponse = await axios.post(
      'http://localhost:5000/api/podcasts/submit',
      testPodcast,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (createResponse.data) {
      const podcastId = createResponse.data.id;
      console.log(`✅ Podcast created with ID: ${podcastId}`);
      console.log(`📊 AI Processing Status: ${createResponse.data.ai_processing_status || 'Unknown'}`);

      // Wait a moment for the trigger to fire
      console.log('\n⏳ Waiting 3 seconds for automation to trigger...\n');
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check the status
      console.log('📡 Checking podcast status...');
      const statusResponse = await axios.get(
        `http://localhost:5000/api/podcasts/${podcastId}`,
        {
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwiaWF0IjoxNzU4MjUwNzcwLCJleHAiOjE3NjA4NDI3NzB9.PtmoaJoMjR-Kwm8RGeQLagfUFOszyRrY22yRirQ7wuQ'
          }
        }
      );

      const podcast = statusResponse.data;
      console.log('\n📊 Results:');
      console.log(`  - Processing Status: ${podcast.ai_processing_status}`);
      console.log(`  - Has AI Summary: ${podcast.ai_summary ? 'Yes' : 'No'}`);
      console.log(`  - Has AI Tags: ${podcast.ai_tags ? 'Yes' : 'No'}`);

      if (podcast.ai_summary) {
        console.log('\n📝 AI Summary Preview:');
        console.log(`  ${podcast.ai_summary.substring(0, 200)}...`);
      }

      if (podcast.ai_tags) {
        console.log('\n🏷️ AI Tags:', JSON.stringify(podcast.ai_tags));
      }

    }
  } catch (error) {
    console.error('❌ Error:', error.response ? error.response.data : error.message);

    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️ Backend is not running. Start it with: npm run safe');
    }
  }

  console.log('\n' + '=' .repeat(60));
}

// Alternative: Test with YouTube video podcast
async function testVideoPodcast() {
  console.log('\n🎥 Testing Video Podcast (YouTube) Analysis\n');
  console.log('=' .repeat(60));

  const videoPodcast = {
    title: 'The Joe Rogan Experience',
    host: 'Joe Rogan',
    description: 'Long form conversations with interesting people',
    youtube_url: 'https://www.youtube.com/watch?v=Ge7c7otG2mk',  // Example with transcript
    frequency: 'Multiple per week',
    focus_areas_covered: 'Comedy, MMA, Science, Politics',
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
        }
      }
    );

    console.log(`✅ Video podcast created: ID ${response.data.id}`);
    console.log(`📊 Processing Status: ${response.data.ai_processing_status}`);

  } catch (error) {
    console.error('❌ Error:', error.response ? error.response.data : error.message);
  }

  console.log('\n' + '=' .repeat(60));
}

// Run tests
async function runTests() {
  // Test RSS feed podcast
  await testPodcastAnalysis();

  // Optional: Test video podcast
  // await testVideoPodcast();

  console.log('\n✨ Test completed!');
}

runTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Test failed:', err.message);
    process.exit(1);
  });