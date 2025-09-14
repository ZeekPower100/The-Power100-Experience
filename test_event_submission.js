async function testEventSubmission() {
  const eventData = {
    name: 'Test Conference 2025',
    date: '2025-12-15',
    registration_deadline: '2025-12-01',
    location: 'New York, NY',
    format: 'In-Person',
    description: 'A comprehensive test event with all array fields',
    expected_attendees: '100-500',
    website: 'https://testconference.com',
    logo_url: 'https://example.com/logo.png',
    organizer_name: 'John Organizer',
    organizer_email: 'john@testconference.com',
    speaker_profiles: [
      'Sarah Johnson - CEO of Tech Corp',
      'Mike Williams - Author of Business Growth',
      'Lisa Chen - Industry Expert'
    ],
    agenda_highlights: [
      'Keynote: Future of Construction',
      'Panel: Technology Innovation',
      'Workshop: Business Growth Strategies'
    ],
    past_attendee_testimonials: [
      'Best conference I\'ve attended - Jane Doe',
      'Incredible networking opportunities - Bob Smith',
      'Actionable insights that transformed my business - Mary Johnson'
    ],
    focus_areas_covered: ['Business Development', 'Technology'],
    is_active: true
  };

  try {
    console.log('Submitting event with array fields...\n');
    console.log('Speaker Profiles:', eventData.speaker_profiles);
    console.log('Agenda Highlights:', eventData.agenda_highlights);
    console.log('Past Attendee Testimonials:', eventData.past_attendee_testimonials);
    console.log('\nSending to backend...');
    
    const response = await fetch('http://localhost:5000/api/events/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData)
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('\n✅ Event created successfully!');
      console.log('Event ID:', result.id);
      console.log('\n📋 Response from backend:');
      console.log(JSON.stringify(result, null, 2));
      
      // Check the database directly to see what was saved
      console.log('\n💡 To verify the data was saved with array fields:');
      console.log('1. Go to http://localhost:3002/admindashboard');
      console.log('2. Login with admin@power100.io / admin123');
      console.log('3. Click on Events tab');
      console.log(`4. Find "${eventData.name}" and click Edit`);
      console.log('5. Check if speakers, agenda highlights, and testimonials are displayed');
      
    } else {
      console.log('❌ Error creating event:', result);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testEventSubmission();