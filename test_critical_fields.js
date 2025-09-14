/**
 * Test Critical Array Fields for Books, Events, and Podcasts
 * This verifies that the array fields we fixed are working properly
 */

async function testCriticalFields() {
  console.log('🔍 Testing Critical Array Fields\n');
  console.log('=' .repeat(60));
  
  const results = {
    events: { passed: 0, failed: 0 },
    books: { passed: 0, failed: 0 },
    podcasts: { passed: 0, failed: 0 }
  };
  
  // Test Event Fields
  console.log('\n📅 TESTING EVENT FIELDS:');
  console.log('-'.repeat(40));
  
  const eventData = {
    name: 'Field Test Event',
    date: '2025-12-01',
    registration_deadline: '2025-11-15',
    location: 'Test City',
    format: 'In-Person',
    description: 'Testing array fields',
    expected_attendees: '50-100',
    website: 'https://test.com',
    logo_url: 'https://test.com/logo.png',
    organizer_name: 'Test Organizer',
    organizer_email: 'test@test.com',
    speaker_profiles: ['Speaker 1', 'Speaker 2'],
    agenda_highlights: ['Session 1', 'Session 2'],
    past_attendee_testimonials: ['Great event', 'Would recommend'],
    focus_areas_covered: ['Technology', 'Business'],
    is_active: true
  };
  
  try {
    const response = await fetch('http://localhost:5000/api/events/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData)
    });
    
    const result = await response.json();
    
    // Check critical fields
    if (result.speaker_profiles) {
      console.log('✅ speaker_profiles saved');
      results.events.passed++;
    } else {
      console.log('❌ speaker_profiles NOT saved');
      results.events.failed++;
    }
    
    if (result.agenda_highlights) {
      console.log('✅ agenda_highlights saved');
      results.events.passed++;
    } else {
      console.log('❌ agenda_highlights NOT saved');
      results.events.failed++;
    }
    
    if (result.past_attendee_testimonials) {
      console.log('✅ past_attendee_testimonials saved');
      results.events.passed++;
    } else {
      console.log('❌ past_attendee_testimonials NOT saved');
      results.events.failed++;
    }
    
  } catch (error) {
    console.log('❌ Event test failed:', error.message);
    results.events.failed = 3;
  }
  
  // Test Book Fields
  console.log('\n📚 TESTING BOOK FIELDS:');
  console.log('-'.repeat(40));
  
  const bookData = {
    title: 'Field Test Book',
    author: 'Test Author',
    description: 'Testing array fields',
    cover_image_url: 'https://test.com/cover.jpg',
    amazon_url: 'https://amazon.com/test',
    publication_year: 2024,
    topics: 'Business, Technology',
    focus_areas_covered: 'Leadership, Growth',
    target_audience: 'Contractors',
    key_takeaways: ['Takeaway 1', 'Takeaway 2'],
    testimonials: ['Great book', 'Must read'],
    reading_time: '3 hours',
    difficulty_level: 'Intermediate',
    is_active: true
  };
  
  try {
    const response = await fetch('http://localhost:5000/api/books/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookData)
    });
    
    const result = await response.json();
    
    if (result.key_takeaways) {
      console.log('✅ key_takeaways saved');
      results.books.passed++;
    } else {
      console.log('❌ key_takeaways NOT saved');
      results.books.failed++;
    }
    
    if (result.testimonials) {
      console.log('✅ testimonials saved');
      results.books.passed++;
    } else {
      console.log('❌ testimonials NOT saved');
      results.books.failed++;
    }
    
  } catch (error) {
    console.log('❌ Book test failed:', error.message);
    results.books.failed = 2;
  }
  
  // Test Podcast Fields
  console.log('\n🎙️ TESTING PODCAST FIELDS:');
  console.log('-'.repeat(40));
  
  const podcastData = {
    title: 'Field Test Podcast',
    host: 'Test Host',
    frequency: 'Weekly',
    description: 'Testing array fields',
    website: 'https://test.com',
    logo_url: 'https://test.com/logo.png',
    focus_areas_covered: 'Technology, Business',
    topics: ['Topic 1', 'Topic 2'],
    notable_guests: ['Guest 1', 'Guest 2'],
    testimonials: ['Great podcast', 'Very informative'],
    target_audience: 'Contractors',
    is_active: true
  };
  
  try {
    const response = await fetch('http://localhost:5000/api/podcasts/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(podcastData)
    });
    
    const result = await response.json();
    
    if (result.topics) {
      console.log('✅ topics saved');
      results.podcasts.passed++;
    } else {
      console.log('❌ topics NOT saved');
      results.podcasts.failed++;
    }
    
    if (result.notable_guests) {
      console.log('✅ notable_guests saved');
      results.podcasts.passed++;
    } else {
      console.log('❌ notable_guests NOT saved');
      results.podcasts.failed++;
    }
    
    if (result.testimonials) {
      console.log('✅ testimonials saved');
      results.podcasts.passed++;
    } else {
      console.log('❌ testimonials NOT saved');
      results.podcasts.failed++;
    }
    
  } catch (error) {
    console.log('❌ Podcast test failed:', error.message);
    results.podcasts.failed = 3;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY:');
  console.log('='.repeat(60));
  
  Object.keys(results).forEach(entity => {
    const r = results[entity];
    const total = r.passed + r.failed;
    const status = r.failed === 0 ? '✅' : '❌';
    console.log(`${status} ${entity.toUpperCase()}: ${r.passed}/${total} fields working`);
  });
  
  const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
  const totalTests = Object.values(results).reduce((sum, r) => sum + r.passed + r.failed, 0);
  
  console.log('\n' + '='.repeat(60));
  if (totalPassed === totalTests) {
    console.log('🎉 ALL CRITICAL ARRAY FIELDS ARE WORKING!');
  } else {
    console.log(`⚠️  ${totalTests - totalPassed} critical fields still have issues`);
  }
}

testCriticalFields();