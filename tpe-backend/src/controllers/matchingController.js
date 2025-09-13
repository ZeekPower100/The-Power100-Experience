const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

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

    // Helper function to calculate match score with robust JSON parsing
    const calculateMatchScore = (entityFocusAreas) => {
      if (!entityFocusAreas) return 0;
      
      let parsedAreas = [];
      
      // Robust JSON parsing
      try {
        if (Array.isArray(entityFocusAreas)) {
          parsedAreas = entityFocusAreas;
        } else if (typeof entityFocusAreas === 'string') {
          // Try to parse as JSON array first
          if (entityFocusAreas.startsWith('[') || entityFocusAreas.startsWith('{')) {
            try {
              const parsed = safeJsonParse(entityFocusAreas);
              parsedAreas = Array.isArray(parsed) ? parsed : [parsed];
            } catch (e) {
              // If JSON parse fails, try comma-separated
              parsedAreas = entityFocusAreas.split(',').map(item => item.trim()).filter(Boolean);
            }
          } else {
            // Treat as comma-separated string
            parsedAreas = entityFocusAreas.split(',').map(item => item.trim()).filter(Boolean);
          }
        }
      } catch (e) {
        console.error('Error parsing focus areas:', e);
        // Fallback: try to use as comma-separated string
        if (typeof entityFocusAreas === 'string') {
          parsedAreas = entityFocusAreas.split(',').map(item => item.trim()).filter(Boolean);
        }
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
    const books = booksResult.rows.map(book => {
      // Robust parsing for book JSON fields
      let topics = book.topics;
      let keyTakeaways = book.key_takeaways;
      
      // Parse topics
      try {
        if (typeof topics === 'string' && (topics.startsWith('[') || topics.startsWith('{'))) {
          topics = safeJsonParse(topics);
        } else if (typeof topics === 'string') {
          topics = topics.split(',').map(t => t.trim()).filter(Boolean);
        }
      } catch (e) {
        topics = typeof topics === 'string' ? topics.split(',').map(t => t.trim()).filter(Boolean) : [];
      }
      
      // Parse key takeaways
      try {
        if (typeof keyTakeaways === 'string' && (keyTakeaways.startsWith('[') || keyTakeaways.startsWith('{'))) {
          keyTakeaways = safeJsonParse(keyTakeaways);
        } else if (typeof keyTakeaways === 'string') {
          keyTakeaways = keyTakeaways.split(',').map(t => t.trim()).filter(Boolean);
        }
      } catch (e) {
        keyTakeaways = typeof keyTakeaways === 'string' ? keyTakeaways.split(',').map(t => t.trim()).filter(Boolean) : [];
      }
      
      return {
        ...book,
        topics,
        key_takeaways: keyTakeaways,
        type: 'book',
        matchScore: calculateMatchScore(book.focus_areas_covered)
      };
    }).filter(book => book.matchScore > 0)
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
    const podcasts = podcastsResult.rows.map(podcast => {
      // Robust parsing for podcast JSON fields
      let topics = podcast.topics;
      
      // Parse topics
      try {
        if (typeof topics === 'string' && (topics.startsWith('[') || topics.startsWith('{'))) {
          topics = safeJsonParse(topics);
        } else if (typeof topics === 'string') {
          topics = topics.split(',').map(t => t.trim()).filter(Boolean);
        }
      } catch (e) {
        topics = typeof topics === 'string' ? topics.split(',').map(t => t.trim()).filter(Boolean) : [];
      }
      
      return {
        ...podcast,
        topics,
        type: 'podcast',
        matchScore: calculateMatchScore(podcast.focus_areas_covered)
      };
    }).filter(podcast => podcast.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 1); // Get top podcast

    // Get matched events
    const eventsQuery = `
      SELECT id, name, description, 
             COALESCE(logo_url, '') as logo_url,
             COALESCE(website, '') as website,
             date, location, format, 
             COALESCE(expected_attendance, '') as attendees, 
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
    const partners = partnersResult.rows.map(partner => {
      // Robust parsing for partner JSON fields
      let keyDifferentiators = partner.key_differentiators;
      let testimonials = partner.testimonials;
      let successStories = partner.success_stories;
      
      // Parse key differentiators
      try {
        if (typeof keyDifferentiators === 'string' && (keyDifferentiators.startsWith('[') || keyDifferentiators.startsWith('{'))) {
          keyDifferentiators = safeJsonParse(keyDifferentiators);
        } else if (typeof keyDifferentiators === 'string') {
          keyDifferentiators = keyDifferentiators.split(',').map(t => t.trim()).filter(Boolean);
        }
      } catch (e) {
        keyDifferentiators = typeof keyDifferentiators === 'string' ? keyDifferentiators.split(',').map(t => t.trim()).filter(Boolean) : [];
      }
      
      // Parse testimonials
      try {
        if (typeof testimonials === 'string' && (testimonials.startsWith('[') || testimonials.startsWith('{'))) {
          testimonials = safeJsonParse(testimonials);
        } else if (typeof testimonials === 'string') {
          testimonials = testimonials.split(',').map(t => t.trim()).filter(Boolean);
        }
      } catch (e) {
        testimonials = typeof testimonials === 'string' ? testimonials.split(',').map(t => t.trim()).filter(Boolean) : [];
      }
      
      // Parse success stories
      try {
        if (typeof successStories === 'string' && (successStories.startsWith('[') || successStories.startsWith('{'))) {
          successStories = safeJsonParse(successStories);
        } else if (typeof successStories === 'string') {
          successStories = successStories.split(',').map(t => t.trim()).filter(Boolean);
        }
      } catch (e) {
        successStories = typeof successStories === 'string' ? successStories.split(',').map(t => t.trim()).filter(Boolean) : [];
      }
      
      return {
        ...partner,
        key_differentiators: keyDifferentiators,
        testimonials,
        success_stories: successStories,
        type: 'partner',
        matchScore: calculateMatchScore(partner.focus_areas_served) + (partner.powerconfidence_score / 20)
      };
    }).filter(partner => partner.matchScore > 0)
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