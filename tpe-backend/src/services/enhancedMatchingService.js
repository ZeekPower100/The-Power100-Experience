const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

const { query } = require('../config/database');
const outcomeTrackingService = require('./outcomeTrackingService');
const matchingService = require('./matchingService');

// Match contractor with podcasts based on focus areas
const matchPodcast = async (contractor) => {
  console.log("matchPodcast called with:", contractor.focus_areas);
  // Parse contractor focus areas safely
  let focusAreas = [];
  if (typeof contractor.focus_areas === 'string' && contractor.focus_areas !== '[object Object]' && contractor.focus_areas.trim() !== '') {
    try {
      focusAreas = safeJsonParse(contractor.focus_areas);
    } catch (e) {
      console.error('Error parsing contractor focus_areas:', contractor.focus_areas);
      focusAreas = [];
    }
  } else if (Array.isArray(contractor.focus_areas)) {
    focusAreas = contractor.focus_areas;
  }
  
  if (focusAreas.length === 0) {
    focusAreas = ["greenfield_growth"]; // Default focus area
  }
  
  const primaryFocus = focusAreas[0];
  
  // Get podcasts that match the primary focus area
  const podcastsResult = await query(
    `SELECT id, title, host, description, logo_url, website, frequency,
            to_json(topics) as topics,
            to_json(focus_areas_covered) as focus_areas_covered,
            to_json(ai_tags) as ai_tags,
            ai_summary, is_active
     FROM podcasts WHERE is_active = true`
  );
  console.log("Podcasts found:", podcastsResult.rows.length);
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const podcast of podcastsResult.rows) {
    let focusAreasCovered = [];
    try {
      if (typeof podcast.focus_areas_covered === 'string') {
        const parsed = safeJsonParse(podcast.focus_areas_covered || '[]');
        focusAreasCovered = Array.isArray(parsed) ? parsed : [];
      } else {
        focusAreasCovered = Array.isArray(podcast.focus_areas_covered) ? podcast.focus_areas_covered : [];
      }
    } catch (e) {
      console.error('Error parsing focus_areas_covered:', e);
      focusAreasCovered = [];
    }
    
    let topics = [];
    try {
      if (typeof podcast.topics === 'string' && podcast.topics.startsWith('[')) {
        topics = safeJsonParse(podcast.topics);
      } else if (typeof podcast.topics === 'string') {
        // Handle comma-separated string
        topics = podcast.topics.split(',').map(t => t.trim());
      } else {
        topics = podcast.topics || [];
      }
    } catch (e) {
      // Fall back to splitting if JSON parse fails
      topics = typeof podcast.topics === 'string' ? podcast.topics.split(',').map(t => t.trim()) : [];
    }
    
    // Calculate match score
    let score = 0;
    if (focusAreasCovered.includes(primaryFocus)) score += 50;
    focusAreas.forEach(area => {
      if (focusAreasCovered.includes(area)) score += 20;
    });
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        ...podcast,
        name: podcast.title || podcast.name,
        host: podcast.host || "The Power100 Team",
        frequency: podcast.frequency || "Weekly",
        description: podcast.description || "Top podcast for contractors",
        website: podcast.website || "#",
        topics,
        focus_areas_covered: focusAreasCovered, // Use the parsed array
        matchScore: score,
        matchReasons: generatePodcastMatchReasons(contractor, podcast, focusAreasCovered)
      };
    }
  }
  console.log("Podcast bestMatch:", bestMatch ? safeJsonStringify(bestMatch).substring(0, 100) : "NULL");
  
  return bestMatch;
};

// Match contractor with events based on focus areas and timeline
const matchEvent = async (contractor) => {
  // Parse contractor focus areas safely
  let focusAreas = [];
  if (typeof contractor.focus_areas === 'string' && contractor.focus_areas !== '[object Object]' && contractor.focus_areas.trim() !== '') {
    try {
      focusAreas = safeJsonParse(contractor.focus_areas);
    } catch (e) {
      console.error('Error parsing contractor focus_areas:', contractor.focus_areas);
      focusAreas = [];
    }
  } else if (Array.isArray(contractor.focus_areas)) {
    focusAreas = contractor.focus_areas;
  }
  
  if (focusAreas.length === 0) {
    focusAreas = ["greenfield_growth"]; // Default focus area
  }
  
  const primaryFocus = focusAreas[0];
  
  // Get upcoming events
  const eventsResult = await query(
    `SELECT id, name, date, end_date, location, description, website, logo_url,
            expected_attendance, format, status, registration_deadline,
            to_json(focus_areas_covered) as focus_areas_covered,
            to_json(topics) as topics,
            to_json(ai_tags) as ai_tags,
            ai_summary, target_audience, event_type, price_range
     FROM events WHERE is_active = true AND registration_deadline > CURRENT_DATE ORDER BY date ASC`
  );
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const event of eventsResult.rows) {
    let focusAreasCovered = [];
    try {
      if (typeof event.focus_areas_covered === 'string') {
        // Check if it's JSON array format
        if (event.focus_areas_covered.startsWith('[')) {
          focusAreasCovered = safeJsonParse(event.focus_areas_covered);
        } else {
          // Handle comma-separated string
          focusAreasCovered = event.focus_areas_covered.split(',').map(t => t.trim());
        }
      } else {
        focusAreasCovered = event.focus_areas_covered || [];
      }
    } catch (e) {
      console.error('Error parsing event focus_areas_covered:', e);
      // Try splitting as fallback
      if (typeof event.focus_areas_covered === 'string') {
        focusAreasCovered = event.focus_areas_covered.split(',').map(t => t.trim());
      } else {
        focusAreasCovered = [];
      }
    }
    
    // Calculate match score
    let score = 0;
    if (focusAreasCovered.includes(primaryFocus)) score += 50;
    focusAreas.forEach(area => {
      if (focusAreasCovered.includes(area)) score += 20;
    });
    
    // Prefer events happening sooner
    const daysUntilEvent = Math.floor((new Date(event.date) - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilEvent < 60) score += 10; // Bonus for events within 2 months
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        ...event,
        matchScore: score,
        name: event.name || event.title,
        date: event.date ? new Date(event.date).toLocaleDateString() : "TBD",
        location: event.location || "Virtual",
        format: event.format || "Hybrid",
        description: event.description || "Premier contractor event",
        attendees: event.expected_attendees || "500+ contractors",
        website: event.website || "#",
        matchReasons: generateEventMatchReasons(contractor, event, focusAreasCovered)
      };
    }
  }
  console.log("Event bestMatch:", bestMatch ? safeJsonStringify(bestMatch).substring(0, 100) : "NULL");
  
  return bestMatch;
};

// Generate match reasons for podcasts
const generatePodcastMatchReasons = (contractor, podcast, focusAreasCovered) => {
  const reasons = [];
  let focusAreas = [];
  if (typeof contractor.focus_areas === 'string' && contractor.focus_areas !== '[object Object]' && contractor.focus_areas.trim() !== '') {
    try {
      focusAreas = safeJsonParse(contractor.focus_areas);
    } catch (e) {
      focusAreas = [];
    }
  } else if (Array.isArray(contractor.focus_areas)) {
    focusAreas = contractor.focus_areas;
  }
  
  if (focusAreasCovered.includes(focusAreas[0])) {
    reasons.push(`Directly addresses your primary focus area of ${formatFocusArea(focusAreas[0])}`);
  }
  
  if (podcast.frequency === 'Weekly') {
    reasons.push('New episodes every week to keep you motivated and informed');
  }
  
  if (contractor.annual_revenue && contractor.annual_revenue.includes('5m')) {
    reasons.push('Features successful contractors at your revenue level');
  }
  
  reasons.push('Practical tips you can implement immediately in your business');
  
  return reasons.slice(0, 3); // Return top 3 reasons
};

// Generate match reasons for events
const generateEventMatchReasons = (contractor, event, focusAreasCovered) => {
  const reasons = [];
  let focusAreas = [];
  if (typeof contractor.focus_areas === 'string' && contractor.focus_areas !== '[object Object]' && contractor.focus_areas.trim() !== '') {
    try {
      focusAreas = safeJsonParse(contractor.focus_areas);
    } catch (e) {
      focusAreas = [];
    }
  } else if (Array.isArray(contractor.focus_areas)) {
    focusAreas = contractor.focus_areas;
  }
  
  if (focusAreasCovered.includes(focusAreas[0])) {
    reasons.push(`Focused sessions on ${formatFocusArea(focusAreas[0])}`);
  }
  
  if (event.format === 'In-Person') {
    reasons.push('Network face-to-face with industry leaders and peers');
  } else if (event.format === 'Virtual') {
    reasons.push('Attend from anywhere without travel costs');
  }
  
  if (contractor.team_size && contractor.team_size > 10) {
    reasons.push('Bring your leadership team for aligned growth strategies');
  }
  
  reasons.push('Connect with solution providers tailored to your needs');
  
  return reasons.slice(0, 3); // Return top 3 reasons
};

// Match contractor with manufacturers based on focus areas and business profile
const matchManufacturer = async (contractor) => {
  // Parse contractor focus areas safely
  let focusAreas = [];
  if (typeof contractor.focus_areas === 'string' && contractor.focus_areas !== '[object Object]' && contractor.focus_areas.trim() !== '') {
    try {
      focusAreas = safeJsonParse(contractor.focus_areas);
    } catch (e) {
      console.error('Error parsing contractor focus_areas:', contractor.focus_areas);
      focusAreas = [];
    }
  } else if (Array.isArray(contractor.focus_areas)) {
    focusAreas = contractor.focus_areas;
  }
  
  if (focusAreas.length === 0) {
    focusAreas = ["greenfield_growth"]; // Default focus area
  }
  
  const primaryFocus = focusAreas[0];
  
  // Get active manufacturers
  const manufacturersResult = await query(
    'SELECT * FROM manufacturers WHERE is_active = true ORDER BY power_confidence_score DESC'
  );
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const manufacturer of manufacturersResult.rows) {
    const focusAreasServed = typeof manufacturer.focus_areas_served === 'string'
      ? safeJsonParse(manufacturer.focus_areas_served || '[]')
      : manufacturer.focus_areas_served || [];
    
    const productCategories = typeof manufacturer.product_categories === 'string'
      ? safeJsonParse(manufacturer.product_categories || '[]')
      : manufacturer.product_categories || [];
    
    // Calculate match score
    let score = 0;
    
    // Primary focus area match (highest weight)
    if (focusAreasServed.includes(primaryFocus)) score += 60;
    
    // Secondary focus area matches
    focusAreas.forEach(area => {
      if (focusAreasServed.includes(area)) score += 20;
    });
    
    // Revenue compatibility bonus
    if (contractor.annual_revenue && manufacturer.price_range) {
      const revenueNum = parseInt(contractor.annual_revenue.replace(/[^\d]/g, ''));
      if ((revenueNum >= 1000000 && manufacturer.price_range.includes('Premium')) ||
          (revenueNum >= 500000 && manufacturer.price_range.includes('Mid-Range')) ||
          (revenueNum < 500000 && manufacturer.price_range.includes('Budget'))) {
        score += 15;
      }
    }
    
    // High PowerConfidence score bonus
    if (manufacturer.power_confidence_score >= 90) score += 10;
    
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        ...manufacturer,
        product_categories: productCategories,
        matchScore: score,
        company_name: manufacturer.name || manufacturer.company_name,
        powerconfidence_score: manufacturer.power_confidence_score || 85,
        description: manufacturer.description || "Leading building materials supplier",
        price_range: manufacturer.price_range || "Competitive pricing",
        lead_time: manufacturer.lead_time || "2-4 weeks",
        brands_carried: manufacturer.brands_carried || [],
        website: manufacturer.website || "#",
        matchReasons: generateManufacturerMatchReasons(contractor, manufacturer, focusAreasServed)
      };
    }
  }
  console.log("Manufacturer bestMatch:", bestMatch ? safeJsonStringify(bestMatch).substring(0, 100) : "NULL");
  
  return bestMatch;
};

// Generate match reasons for manufacturers
const generateManufacturerMatchReasons = (contractor, manufacturer, focusAreasServed) => {
  const reasons = [];
  let focusAreas = [];
  
  // Use the same robust parsing logic
  if (Array.isArray(contractor.focus_areas)) {
    focusAreas = contractor.focus_areas;
  } else if (typeof contractor.focus_areas === 'string') {
    const trimmed = contractor.focus_areas.trim();
    if (trimmed && trimmed !== '[object Object]') {
      try {
        const parsed = safeJsonParse(trimmed);
        if (Array.isArray(parsed)) {
          focusAreas = parsed;
        } else if (typeof parsed === 'string') {
          focusAreas = [parsed];
        }
      } catch (e) {
        if (trimmed.includes(',')) {
          focusAreas = trimmed.split(',').map(area => area.trim());
        } else {
          focusAreas = [trimmed];
        }
      }
    }
  } else if (contractor.focus_areas) {
    focusAreas = [String(contractor.focus_areas)];
  }
  
  if (focusAreasServed.includes(focusAreas[0])) {
    reasons.push(`Specializes in products for ${formatFocusArea(focusAreas[0])}`);
  }
  
  if (manufacturer.power_confidence_score >= 90) {
    reasons.push(`${manufacturer.power_confidence_score}% PowerConfidence score`);
  }
  
  if (manufacturer.contractor_rating >= 4.5) {
    reasons.push(`${manufacturer.contractor_rating}/5 contractor satisfaction rating`);
  } else if (manufacturer.contractor_rating >= 4.0) {
    reasons.push('High contractor satisfaction ratings');
  }
  
  if (manufacturer.price_range) {
    reasons.push(`${manufacturer.price_range} pricing matches your business tier`);
  }
  
  if (manufacturer.training_provided) {
    reasons.push('Provides comprehensive training and support');
  }
  
  return reasons.slice(0, 3); // Return top 3 reasons
};

// Format focus area for display
const formatFocusArea = (area) => {
  return area.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

// Enhanced matching that includes partners, podcasts, and events
const getEnhancedMatches = async (contractor, focusAreaIndex = 0) => {
  console.log("=== CONTRACTOR DATA RECEIVED ===");
  console.log("contractor.focus_areas:", contractor.focus_areas);
  console.log("Type:", typeof contractor.focus_areas);
  console.log("Raw value:", safeJsonStringify(contractor.focus_areas));
  
  // Parse focus areas with more robust handling for production edge cases
  let focusAreas = [];
  
  if (Array.isArray(contractor.focus_areas)) {
    // Already an array - use it directly
    focusAreas = contractor.focus_areas;
    console.log("Focus areas is already an array:", focusAreas);
  } else if (typeof contractor.focus_areas === 'string') {
    const trimmed = contractor.focus_areas.trim();
    
    // Skip empty strings and '[object Object]' strings
    if (trimmed && trimmed !== '[object Object]') {
      try {
        // Try to parse as JSON
        const parsed = safeJsonParse(trimmed);
        // Ensure we got an array after parsing
        if (Array.isArray(parsed)) {
          focusAreas = parsed;
          console.log("Successfully parsed focus areas from JSON string:", focusAreas);
        } else {
          console.log("Parsed value is not an array:", parsed);
          // If it's a single string value, wrap it in an array
          if (typeof parsed === 'string') {
            focusAreas = [parsed];
            console.log("Wrapped single string value in array:", focusAreas);
          }
        }
      } catch (e) {
        console.log("Failed to parse focus_areas as JSON:", e.message);
        // If parsing fails, check if it's a comma-separated string
        if (trimmed.includes(',')) {
          focusAreas = trimmed.split(',').map(area => area.trim());
          console.log("Split comma-separated string into array:", focusAreas);
        } else {
          // Single focus area as string
          focusAreas = [trimmed];
          console.log("Used single string value as array:", focusAreas);
        }
      }
    } else {
      console.log("Focus areas is empty or '[object Object]'");
    }
  } else if (contractor.focus_areas) {
    // Handle other unexpected types
    console.log("Focus areas has unexpected type, converting to string:", contractor.focus_areas);
    focusAreas = [String(contractor.focus_areas)];
  }
  
  console.log("Final parsed focusAreas:", focusAreas);
  console.log("Focus areas count:", focusAreas.length);
  
  // Create a modified contractor object with the selected focus area as primary
  const modifiedContractor = {
    ...contractor,
    focus_areas: focusAreas,
    primary_focus_area: focusAreas[focusAreaIndex] || focusAreas[0]
  };
  
  // If a specific focus area is selected, reorder the array to make it primary
  if (focusAreaIndex > 0 && focusAreaIndex < focusAreas.length) {
    const reorderedFocusAreas = [
      focusAreas[focusAreaIndex],
      ...focusAreas.filter((_, index) => index !== focusAreaIndex)
    ];
    modifiedContractor.focus_areas = reorderedFocusAreas;
  }
  
  // Get partner matches (returns top 2) for the specific focus area
  const partnerMatches = await matchingService.matchContractorWithPartners(modifiedContractor);
  
  // Get podcast match for the specific focus area
  const podcastMatch = await matchPodcast(modifiedContractor);
  
  // Get event match for the specific focus area
  const eventMatch = await matchEvent(modifiedContractor);
  
  // MANUFACTURERS DISABLED - Return null instead
  const manufacturerMatch = null; // await matchManufacturer(modifiedContractor);
  
  // Track the matching outcome with focus area context
  if (partnerMatches && partnerMatches.length > 0) {
    await outcomeTrackingService.trackPartnerMatch(
      contractor.id,
      partnerMatches[0].partner.id,
      {
        score: partnerMatches[0].matchScore,
        reasons: partnerMatches[0].matchReasons,
        podcastMatched: !!podcastMatch,
        eventMatched: !!eventMatch,
        manufacturerMatched: false, // Always false since disabled
        focusAreaIndex: focusAreaIndex,
        focusAreaSelected: modifiedContractor.primary_focus_area
      }
    );
  }
  
  console.log("=== ENHANCED MATCHING RESULTS ===");
  console.log("Podcast Match:", podcastMatch ? "FOUND" : "NOT FOUND");
  console.log("Event Match:", eventMatch ? "FOUND" : "NOT FOUND");
  console.log("Manufacturer Match: DISABLED");
  console.log("All Focus Areas:", focusAreas);
  console.log("================================");
  return {
    matches: partnerMatches.slice(0, 2), // Return top 2 partners
    podcastMatch,
    eventMatch,
    manufacturerMatch: null, // Always null since disabled
    currentFocusArea: modifiedContractor.primary_focus_area,
    allFocusAreas: focusAreas
  };
};

module.exports = {
  getEnhancedMatches,
  matchPodcast,
  matchEvent,
  matchManufacturer
};