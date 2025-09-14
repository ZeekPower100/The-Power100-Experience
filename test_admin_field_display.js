/**
 * Test Admin View Field Display
 * Verifies that all fields from public forms are properly displayed in admin views
 */

async function testAdminFieldDisplay() {
  console.log('🔍 Testing Admin View Field Display\n');
  console.log('=' .repeat(60));
  
  const adminEmail = 'admin@power100.io';
  const adminPassword = 'admin123';
  
  // First, login as admin
  console.log('\n🔐 Logging in as admin...');
  const loginResponse = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password: adminPassword })
  });
  
  const loginData = await loginResponse.json();
  const token = loginData.token;
  
  if (!token) {
    console.log('❌ Failed to login as admin');
    return;
  }
  console.log('✅ Logged in successfully');
  
  // Test data with all fields
  const testBook = {
    title: 'Admin Field Test Book',
    author: 'Test Author',
    description: 'Testing all field display in admin',
    cover_image_url: 'https://test.com/cover.jpg',
    amazon_url: 'https://amazon.com/test',
    publication_year: 2024,
    topics: 'Business, Technology, Leadership',
    focus_areas_covered: 'Revenue Growth, Team Building',
    target_audience: 'Contractors',
    key_takeaways: ['Takeaway 1', 'Takeaway 2', 'Takeaway 3'],
    testimonials: ['Great book!', 'Must read', 'Very insightful'],
    reading_time: '3 hours',
    difficulty_level: 'Intermediate',
    author_email: 'author@test.com',
    author_phone: '123-456-7890',
    is_active: true
  };
  
  const testEvent = {
    name: 'Admin Field Test Event',
    date: '2025-12-01',
    registration_deadline: '2025-11-15',
    location: 'Test City',
    format: 'In-Person',
    description: 'Testing all field display in admin',
    expected_attendees: '50-100',
    website: 'https://test.com',
    logo_url: 'https://test.com/logo.png',
    organizer_name: 'Test Organizer',
    organizer_email: 'organizer@test.com',
    organizer_phone: '098-765-4321',
    speaker_profiles: ['Speaker 1', 'Speaker 2', 'Speaker 3'],
    agenda_highlights: ['Session 1', 'Session 2', 'Session 3'],
    past_attendee_testimonials: ['Great event!', 'Would recommend', 'Excellent networking'],
    focus_areas_covered: ['Technology', 'Business', 'Innovation'],
    target_audience: 'Contractors',
    is_active: true
  };
  
  const testPodcast = {
    title: 'Admin Field Test Podcast',
    host: 'Test Host',
    frequency: 'Weekly',
    description: 'Testing all field display in admin',
    website: 'https://test.com',
    logo_url: 'https://test.com/logo.png',
    focus_areas_covered: 'Technology, Business',
    topics: ['Topic 1', 'Topic 2', 'Topic 3'],
    notable_guests: ['Guest 1', 'Guest 2', 'Guest 3'],
    testimonials: ['Great podcast!', 'Very informative', 'Love the content'],
    target_audience: 'Contractors',
    host_email: 'host@test.com',
    host_phone: '555-555-5555',
    is_active: true
  };
  
  // Create test entities
  console.log('\n📚 Creating test book...');
  const bookResponse = await fetch('http://localhost:5000/api/books/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testBook)
  });
  const bookData = await bookResponse.json();
  
  console.log('\n📅 Creating test event...');
  const eventResponse = await fetch('http://localhost:5000/api/events/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testEvent)
  });
  const eventData = await eventResponse.json();
  
  console.log('\n🎙️ Creating test podcast...');
  const podcastResponse = await fetch('http://localhost:5000/api/podcasts/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testPodcast)
  });
  const podcastData = await podcastResponse.json();
  
  // Now fetch them back using admin API
  console.log('\n📖 Fetching book from admin API...');
  const bookFetchResponse = await fetch(`http://localhost:5000/api/books/${bookData.id}`, {
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  });
  const fetchedBook = await bookFetchResponse.json();
  
  console.log('\n📆 Fetching event from admin API...');
  const eventFetchResponse = await fetch(`http://localhost:5000/api/events/${eventData.id}`, {
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  });
  const fetchedEvent = await eventFetchResponse.json();
  
  console.log('\n🎤 Fetching podcast from admin API...');
  const podcastFetchResponse = await fetch(`http://localhost:5000/api/podcasts/${podcastData.id}`, {
    headers: { 
      'Authorization': `Bearer ${token}`
    }
  });
  const fetchedPodcast = await podcastFetchResponse.json();
  
  // Check critical fields
  console.log('\n' + '='.repeat(60));
  console.log('FIELD VERIFICATION RESULTS:');
  console.log('='.repeat(60));
  
  console.log('\n📚 BOOK FIELDS:');
  console.log('-'.repeat(40));
  const bookFields = {
    'Title': fetchedBook.title === testBook.title,
    'Author': fetchedBook.author === testBook.author,
    'Description': fetchedBook.description === testBook.description,
    'Key Takeaways': fetchedBook.key_takeaways && fetchedBook.key_takeaways.length > 0,
    'Testimonials': fetchedBook.testimonials && fetchedBook.testimonials.length > 0,
    'Focus Areas': fetchedBook.focus_areas_covered !== null,
    'Target Audience': fetchedBook.target_audience === testBook.target_audience,
    'Author Email': fetchedBook.author_email === testBook.author_email,
    'Author Phone': fetchedBook.author_phone === testBook.author_phone
  };
  
  Object.entries(bookFields).forEach(([field, passes]) => {
    console.log(`${passes ? '✅' : '❌'} ${field}: ${passes ? 'Present' : 'MISSING'}`);
  });
  
  console.log('\n📅 EVENT FIELDS:');
  console.log('-'.repeat(40));
  const eventFields = {
    'Name': fetchedEvent.name === testEvent.name,
    'Organizer Name': fetchedEvent.organizer_name === testEvent.organizer_name,
    'Organizer Email': fetchedEvent.organizer_email === testEvent.organizer_email,
    'Speaker Profiles': fetchedEvent.speaker_profiles && fetchedEvent.speaker_profiles.length > 0,
    'Agenda Highlights': fetchedEvent.agenda_highlights && fetchedEvent.agenda_highlights.length > 0,
    'Past Testimonials': fetchedEvent.past_attendee_testimonials && fetchedEvent.past_attendee_testimonials.length > 0,
    'Focus Areas': fetchedEvent.focus_areas_covered && fetchedEvent.focus_areas_covered.length > 0,
    'Target Audience': fetchedEvent.target_audience === testEvent.target_audience
  };
  
  Object.entries(eventFields).forEach(([field, passes]) => {
    console.log(`${passes ? '✅' : '❌'} ${field}: ${passes ? 'Present' : 'MISSING'}`);
  });
  
  console.log('\n🎙️ PODCAST FIELDS:');
  console.log('-'.repeat(40));
  const podcastFields = {
    'Title': fetchedPodcast.title === testPodcast.title,
    'Host': fetchedPodcast.host === testPodcast.host,
    'Topics': fetchedPodcast.topics && fetchedPodcast.topics.length > 0,
    'Notable Guests': fetchedPodcast.notable_guests && fetchedPodcast.notable_guests.length > 0,
    'Testimonials': fetchedPodcast.testimonials && fetchedPodcast.testimonials.length > 0,
    'Focus Areas': fetchedPodcast.focus_areas_covered !== null,
    'Target Audience': fetchedPodcast.target_audience === testPodcast.target_audience,
    'Host Email': fetchedPodcast.host_email === testPodcast.host_email,
    'Host Phone': fetchedPodcast.host_phone === testPodcast.host_phone
  };
  
  Object.entries(podcastFields).forEach(([field, passes]) => {
    console.log(`${passes ? '✅' : '❌'} ${field}: ${passes ? 'Present' : 'MISSING'}`);
  });
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY:');
  console.log('='.repeat(60));
  
  const bookPassed = Object.values(bookFields).filter(v => v).length;
  const eventPassed = Object.values(eventFields).filter(v => v).length;
  const podcastPassed = Object.values(podcastFields).filter(v => v).length;
  
  console.log(`📚 Book: ${bookPassed}/${Object.keys(bookFields).length} fields working`);
  console.log(`📅 Event: ${eventPassed}/${Object.keys(eventFields).length} fields working`);
  console.log(`🎙️ Podcast: ${podcastPassed}/${Object.keys(podcastFields).length} fields working`);
  
  const totalPassed = bookPassed + eventPassed + podcastPassed;
  const totalFields = Object.keys(bookFields).length + Object.keys(eventFields).length + Object.keys(podcastFields).length;
  
  if (totalPassed === totalFields) {
    console.log('\n🎉 ALL FIELDS ARE PROPERLY DISPLAYED IN ADMIN VIEWS!');
  } else {
    console.log(`\n⚠️ ${totalFields - totalPassed} fields need attention`);
  }
  
  // Clean up test data
  console.log('\n🧹 Cleaning up test data...');
  if (bookData.id) {
    await fetch(`http://localhost:5000/api/books/${bookData.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
  if (eventData.id) {
    await fetch(`http://localhost:5000/api/events/${eventData.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
  if (podcastData.id) {
    await fetch(`http://localhost:5000/api/podcasts/${podcastData.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
  }
  console.log('✅ Test data cleaned up');
}

testAdminFieldDisplay().catch(console.error);