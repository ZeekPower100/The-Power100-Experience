const fetch = require('node-fetch');

async function testBookSubmission() {
  const bookData = {
    title: 'Test Book - Focus Areas JSON',
    author: 'Test Author',
    isbn: '978-1234567890',
    description: 'A test book to verify focus areas are stored as JSON arrays',
    publisher: 'Test Publisher',
    publication_year: 2024,
    page_count: 250,
    amazon_url: 'https://amazon.com/test-book',

    // The critical field - sending as JSON string array
    focus_areas_covered: '["greenfield_growth", "team_building", "operational_efficiency"]',

    // Other array fields as JSON strings
    key_takeaways: '["Takeaway 1", "Takeaway 2", "Takeaway 3"]',
    testimonials: '["Great book!", "Very insightful"]',
    key_citations: '[{"cited_person": "John Doe", "their_expertise": "Business Strategy", "citation_context": "Chapter 3"}]',

    // Regular fields
    target_audience: 'Business owners and entrepreneurs',
    topics: '["Leadership", "Growth", "Strategy"]',
    target_revenue: '$1M-$5M',
    submitter_name: 'API Test',
    submitter_email: 'test@example.com',
    submitter_phone: '555-0123',
    is_author: true,
    status: 'pending_review'
  };

  try {
    console.log('Submitting book with focus_areas_covered as JSON array...');
    console.log('Focus areas being sent:', bookData.focus_areas_covered);

    const response = await fetch('http://localhost:5000/api/books', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bookData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const result = await response.json();
    console.log('\n✅ Book created successfully!');
    console.log('Book ID:', result.id);
    console.log('Title:', result.title);
    console.log('Focus areas stored:', result.focus_areas_covered);

    // Now verify it was stored correctly by fetching it back
    console.log('\nVerifying stored data...');
    const getResponse = await fetch(`http://localhost:5000/api/books/${result.id}`);
    const retrievedBook = await getResponse.json();

    console.log('Retrieved focus_areas_covered:', retrievedBook.focus_areas_covered);

    // Check if it's stored as JSON
    if (retrievedBook.focus_areas_covered && retrievedBook.focus_areas_covered.startsWith('[')) {
      console.log('✅ Focus areas stored as JSON array!');

      // Try to parse it
      try {
        const parsed = JSON.parse(retrievedBook.focus_areas_covered);
        console.log('✅ Successfully parsed:', parsed);
      } catch (e) {
        console.log('❌ Failed to parse as JSON:', e.message);
      }
    } else {
      console.log('⚠️ Focus areas not stored as JSON array:', retrievedBook.focus_areas_covered);
    }

    return result;
  } catch (error) {
    console.error('❌ Error submitting book:', error);
    throw error;
  }
}

// Run the test
testBookSubmission()
  .then(() => {
    console.log('\n✅ Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });