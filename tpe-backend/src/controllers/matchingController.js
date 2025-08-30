const db = require('../config/database');

// Get matched content for a contractor based on their focus areas
exports.getMatchedContent = async (req, res) => {
  try {
    const { contractorId } = req.params;

    // Get contractor's focus areas
    const contractorQuery = `
      SELECT focus_areas, primary_focus_area 
      FROM contractors 
      WHERE id = $1
    `;
    const contractorResult = await db.query(contractorQuery, [contractorId]);

    if (contractorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Contractor not found' });
    }

    const contractor = contractorResult.rows[0];
    const focusAreas = contractor.focus_areas || [];
    const primaryFocus = contractor.primary_focus_area;

    // Helper function to calculate match score
    const calculateMatchScore = (entityFocusAreas) => {
      if (!entityFocusAreas) return 0;
      
      let parsedAreas = [];
      try {
        parsedAreas = typeof entityFocusAreas === 'string' 
          ? JSON.parse(entityFocusAreas) 
          : entityFocusAreas;
      } catch (e) {
        return 0;
      }

      let score = 0;
      parsedAreas.forEach(area => {
        if (area === primaryFocus) score += 3; // Primary focus gets highest weight
        else if (focusAreas.includes(area)) score += 1;
      });
      return score;
    };

    // Get matched books
    const booksQuery = `
      SELECT id, title, author, description, cover_image_url, amazon_url,
             topics, focus_areas_covered, key_takeaways, reading_time
      FROM books 
      WHERE is_active = true
      ORDER BY id
    `;
    const booksResult = await db.query(booksQuery);
    const books = booksResult.rows.map(book => ({
      ...book,
      type: 'book',
      matchScore: calculateMatchScore(book.focus_areas_covered)
    })).filter(book => book.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 1); // Get top book

    // Get matched podcasts
    const podcastsQuery = `
      SELECT id, 
             title as name,
             COALESCE(host, '') as host,
             description, 
             COALESCE(logo_url, '') as logo_url,
             COALESCE(website, '') as website,
             COALESCE(frequency, '') as frequency,
             topics, focus_areas_covered,
             '' as target_audience
      FROM podcasts 
      WHERE is_active = true
      ORDER BY id
    `;
    const podcastsResult = await db.query(podcastsQuery);
    const podcasts = podcastsResult.rows.map(podcast => ({
      ...podcast,
      type: 'podcast',
      matchScore: calculateMatchScore(podcast.focus_areas_covered)
    })).filter(podcast => podcast.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 1); // Get top podcast

    // Get matched events
    const eventsQuery = `
      SELECT id, name, description, 
             COALESCE(logo_url, '') as logo_url,
             COALESCE(website, '') as website,
             date, location, format, 
             COALESCE(expected_attendees, '') as attendees, 
             focus_areas_covered, 
             '' as target_audience,
             registration_deadline
      FROM events 
      WHERE is_active = true
      AND (registration_deadline IS NULL OR registration_deadline > CURRENT_DATE)
      ORDER BY registration_deadline
    `;
    const eventsResult = await db.query(eventsQuery);
    const events = eventsResult.rows.map(event => ({
      ...event,
      type: 'event',
      matchScore: calculateMatchScore(event.focus_areas_covered)
    })).filter(event => event.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 1); // Get top event

    // Get matched partners (existing logic)
    const partnersQuery = `
      SELECT id, company_name, 
             COALESCE(description, unique_value, '') as description,
             COALESCE(logo_url, '') as logo_url,
             COALESCE(website, '') as website,
             '' as service_categories,
             powerconfidence_score,
             COALESCE(key_differentiators, '[]') as key_differentiators,
             testimonials, success_stories,
             COALESCE(focus_areas_served, focus_areas, '[]') as focus_areas_served
      FROM strategic_partners 
      WHERE is_active = true
      ORDER BY powerconfidence_score DESC
    `;
    const partnersResult = await db.query(partnersQuery);
    const partners = partnersResult.rows.map(partner => ({
      ...partner,
      type: 'partner',
      matchScore: calculateMatchScore(partner.focus_areas_served) + (partner.powerconfidence_score / 20)
    })).filter(partner => partner.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 2); // Get top 2 partners

    // Combine all matches
    const matches = {
      book: books[0] || null,
      podcast: podcasts[0] || null,
      event: events[0] || null,
      partners: partners,
      focusAreas: focusAreas,
      primaryFocus: primaryFocus
    };

    res.json(matches);
  } catch (error) {
    console.error('Error fetching matched content:', error);
    res.status(500).json({ 
      error: 'Failed to fetch matched content',
      details: error.message 
    });
  }
};

// Get all books
exports.getBooks = async (req, res) => {
  try {
    const query = `
      SELECT * FROM books 
      WHERE is_active = true
      ORDER BY title
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Failed to fetch books' });
  }
};

// Get all podcasts
exports.getPodcasts = async (req, res) => {
  try {
    const query = `
      SELECT id, 
             COALESCE(name, title) as name,
             COALESCE(host, '') as host,
             description, logo_url, website,
             frequency, topics, focus_areas_covered, target_audience
      FROM podcasts 
      WHERE is_active = true
      ORDER BY name
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching podcasts:', error);
    res.status(500).json({ error: 'Failed to fetch podcasts' });
  }
};

// Get all events
exports.getEvents = async (req, res) => {
  try {
    const query = `
      SELECT * FROM events 
      WHERE is_active = true
      AND (registration_deadline IS NULL OR registration_deadline > CURRENT_DATE)
      ORDER BY registration_deadline
    `;
    const result = await db.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
};