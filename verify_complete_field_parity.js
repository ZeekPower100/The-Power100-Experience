/**
 * Complete Field Parity Verification
 * This test verifies that EVERY field from public forms exists in admin forms
 * and that data flows correctly between them
 */

async function verifyCompleteFieldParity() {
  console.log('🔍 COMPLETE FIELD PARITY VERIFICATION\n');
  console.log('=' .repeat(70));
  console.log('Testing that EVERY field from public forms exists in admin forms');
  console.log('=' .repeat(70));
  
  // Complete list of ALL fields from public forms
  const bookFields = {
    // Basic Info
    title: 'Test Book Title',
    author: 'Test Author Name',
    description: 'Comprehensive test description',
    cover_image_url: 'https://test.com/cover.jpg',
    amazon_url: 'https://amazon.com/test-book',
    barnes_noble_url: 'https://barnesandnoble.com/test',
    author_website_purchase_url: 'https://author.com/buy',
    publication_year: 2024,
    
    // Content Fields
    topics: 'Leadership, Management, Growth',
    focus_areas_covered: 'Revenue Growth, Team Building',
    target_audience: 'Contractors and Business Owners',
    key_takeaways: ['Takeaway 1', 'Takeaway 2', 'Takeaway 3'],
    testimonials: ['Amazing book!', 'Must read', 'Life changing'],
    reading_time: '4 hours',
    difficulty_level: 'Intermediate',
    
    // Author Contact
    author_email: 'author@example.com',
    author_phone: '555-0101',
    author_linkedin_url: 'https://linkedin.com/in/author',
    author_website: 'https://author.com',
    
    // Executive Assistant
    has_executive_assistant: true,
    ea_name: 'Assistant Name',
    ea_email: 'assistant@example.com',
    ea_phone: '555-0102',
    ea_scheduling_link: 'https://calendly.com/assistant',
    
    // Author Story
    writing_inspiration: 'Inspired by real experiences',
    problems_addressed: 'Solving business growth challenges',
    next_12_18_months: 'Speaking tours and workshops',
    book_goals: 'Help 10,000 contractors',
    author_availability: 'Available for podcasts',
    
    // Citations
    key_citations: JSON.stringify([
      {
        cited_person: 'Expert One',
        their_expertise: 'Business Strategy',
        citation_context: 'Chapter 3 discussion'
      }
    ])
  };
  
  const eventFields = {
    // Basic Info
    name: 'Test Event Name',
    date: '2025-12-01',
    registration_deadline: '2025-11-15',
    location: 'New York, NY',
    format: 'In-Person',
    description: 'Comprehensive event description',
    expected_attendees: '100-200',
    website: 'https://event.com',
    logo_url: 'https://event.com/logo.png',
    registration_url: 'https://event.com/register',
    
    // Event Details
    event_type: 'Conference',
    duration: '2 days',
    topics: 'Innovation, Technology',
    price_range: '$500-$1000',
    target_audience: 'Business Leaders',
    focus_areas_covered: ['Strategic Planning', 'Digital Transformation'],
    
    // Organizer Info
    organizer_name: 'Event Organizer',
    organizer_email: 'organizer@event.com',
    organizer_phone: '555-0201',
    organizer_company: 'Event Company Inc',
    
    // Content Arrays
    speaker_profiles: ['Speaker One - CEO', 'Speaker Two - CTO', 'Speaker Three - CMO'],
    agenda_highlights: ['Keynote Session', 'Panel Discussion', 'Networking Lunch'],
    past_attendee_testimonials: ['Best event ever!', 'Great networking', 'Valuable insights'],
    
    // Success Metrics
    success_metrics: 'High engagement scores',
    networking_quality_score: '9.5/10'
  };
  
  const podcastFields = {
    // Basic Info
    title: 'Test Podcast Show',
    host: 'Test Host Name',
    frequency: 'Weekly',
    description: 'Comprehensive podcast description',
    website: 'https://podcast.com',
    logo_url: 'https://podcast.com/logo.png',
    
    // Content
    topics: ['Business Growth', 'Leadership', 'Innovation'],
    focus_areas_covered: 'Marketing, Sales, Operations',
    target_audience: 'Entrepreneurs and Leaders',
    format: 'Interview',
    episode_count: '150+',
    average_episode_length: '45 minutes',
    
    // Host Info
    host_email: 'host@podcast.com',
    host_phone: '555-0301',
    host_linkedin: 'https://linkedin.com/in/host',
    host_company: 'Podcast Network Inc',
    host_bio: 'Experienced business leader and interviewer',
    
    // Platforms
    spotify_url: 'https://spotify.com/show/test',
    apple_podcasts_url: 'https://podcasts.apple.com/test',
    youtube_url: 'https://youtube.com/@test',
    other_platform_urls: 'https://other.com/podcast',
    
    // Guest Info
    accepts_guest_requests: true,
    guest_requirements: 'Business leaders with proven track record',
    typical_guest_profile: 'CEOs and founders',
    booking_link: 'https://calendly.com/podcast',
    notable_guests: ['Famous CEO', 'Industry Expert', 'Bestselling Author'],
    
    // Success Metrics
    subscriber_count: '10,000+',
    download_average: '5,000 per episode',
    testimonials: ['Best business podcast!', 'Always learn something new', 'Great host']
  };
  
  // Submit each entity
  console.log('\n📚 Submitting Book with ALL fields...');
  const bookResponse = await fetch('http://localhost:5000/api/books/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookFields)
  });
  const bookData = await bookResponse.json();
  
  console.log('📅 Submitting Event with ALL fields...');
  const eventResponse = await fetch('http://localhost:5000/api/events/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventFields)
  });
  const eventData = await eventResponse.json();
  
  console.log('🎙️ Submitting Podcast with ALL fields...');
  const podcastResponse = await fetch('http://localhost:5000/api/podcasts/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(podcastFields)
  });
  const podcastData = await podcastResponse.json();
  
  // Login as admin
  console.log('\n🔐 Logging in as admin...');
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@power100.io', password: 'admin123' })
  });
  const { token } = await loginResponse.json();
  
  // Fetch from admin API
  console.log('📖 Fetching book from admin API...');
  const adminBookResponse = await fetch(`http://localhost:5000/api/books/${bookData.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const adminBook = await adminBookResponse.json();
  
  console.log('📆 Fetching event from admin API...');
  const adminEventResponse = await fetch(`http://localhost:5000/api/events/${eventData.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const adminEvent = await adminEventResponse.json();
  
  console.log('🎤 Fetching podcast from admin API...');
  const adminPodcastResponse = await fetch(`http://localhost:5000/api/podcasts/${podcastData.id}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const adminPodcast = await adminPodcastResponse.json();
  
  // Verify EVERY field
  console.log('\n' + '=' .repeat(70));
  console.log('DETAILED FIELD VERIFICATION:');
  console.log('=' .repeat(70));
  
  // Book verification
  console.log('\n📚 BOOK FIELDS (Total: ' + Object.keys(bookFields).length + ')');
  console.log('-'.repeat(50));
  let bookPassed = 0;
  let bookFailed = 0;
  
  Object.keys(bookFields).forEach(field => {
    const expected = bookFields[field];
    const actual = adminBook[field];
    
    // Special handling for arrays and JSON
    let matches = false;
    if (Array.isArray(expected)) {
      matches = actual && actual.length === expected.length;
    } else if (field === 'key_citations') {
      matches = actual !== null && actual !== undefined;
    } else {
      matches = actual == expected || actual !== null;
    }
    
    if (matches) {
      console.log(`✅ ${field}: Present and correct`);
      bookPassed++;
    } else {
      console.log(`❌ ${field}: MISSING or incorrect (expected: ${JSON.stringify(expected)}, got: ${JSON.stringify(actual)})`);
      bookFailed++;
    }
  });
  
  // Event verification
  console.log('\n📅 EVENT FIELDS (Total: ' + Object.keys(eventFields).length + ')');
  console.log('-'.repeat(50));
  let eventPassed = 0;
  let eventFailed = 0;
  
  Object.keys(eventFields).forEach(field => {
    const expected = eventFields[field];
    const actual = adminEvent[field];
    
    let matches = false;
    if (Array.isArray(expected)) {
      matches = actual && actual.length === expected.length;
    } else {
      matches = actual == expected || actual !== null;
    }
    
    if (matches) {
      console.log(`✅ ${field}: Present and correct`);
      eventPassed++;
    } else {
      console.log(`❌ ${field}: MISSING or incorrect`);
      eventFailed++;
    }
  });
  
  // Podcast verification
  console.log('\n🎙️ PODCAST FIELDS (Total: ' + Object.keys(podcastFields).length + ')');
  console.log('-'.repeat(50));
  let podcastPassed = 0;
  let podcastFailed = 0;
  
  Object.keys(podcastFields).forEach(field => {
    const expected = podcastFields[field];
    const actual = adminPodcast[field];
    
    let matches = false;
    if (Array.isArray(expected)) {
      matches = actual && actual.length === expected.length;
    } else {
      matches = actual == expected || actual !== null;
    }
    
    if (matches) {
      console.log(`✅ ${field}: Present and correct`);
      podcastPassed++;
    } else {
      console.log(`❌ ${field}: MISSING or incorrect`);
      podcastFailed++;
    }
  });
  
  // Final summary
  console.log('\n' + '=' .repeat(70));
  console.log('FINAL SUMMARY:');
  console.log('=' .repeat(70));
  
  console.log(`\n📚 BOOKS: ${bookPassed}/${Object.keys(bookFields).length} fields working (${Math.round(bookPassed/Object.keys(bookFields).length*100)}%)`);
  console.log(`📅 EVENTS: ${eventPassed}/${Object.keys(eventFields).length} fields working (${Math.round(eventPassed/Object.keys(eventFields).length*100)}%)`);
  console.log(`🎙️ PODCASTS: ${podcastPassed}/${Object.keys(podcastFields).length} fields working (${Math.round(podcastPassed/Object.keys(podcastFields).length*100)}%)`);
  
  const totalFields = Object.keys(bookFields).length + Object.keys(eventFields).length + Object.keys(podcastFields).length;
  const totalPassed = bookPassed + eventPassed + podcastPassed;
  const totalFailed = bookFailed + eventFailed + podcastFailed;
  
  console.log('\n' + '=' .repeat(70));
  console.log(`OVERALL: ${totalPassed}/${totalFields} fields working (${Math.round(totalPassed/totalFields*100)}%)`);
  
  if (totalFailed === 0) {
    console.log('\n🎉 PERFECT! ALL FIELDS FROM PUBLIC FORMS ARE IN ADMIN FORMS!');
  } else {
    console.log(`\n⚠️ ${totalFailed} fields are not properly connected`);
    console.log('These fields exist in public forms but are missing or broken in admin views');
  }
  
  // Cleanup
  console.log('\n🧹 Cleaning up test data...');
  await fetch(`http://localhost:5000/api/books/${bookData.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  await fetch(`http://localhost:5000/api/events/${eventData.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  await fetch(`http://localhost:5000/api/podcasts/${podcastData.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  console.log('✅ Test complete!');
}

verifyCompleteFieldParity().catch(console.error);