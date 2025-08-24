const { query } = require('../config/database');
const outcomeTrackingService = require('./outcomeTrackingService');
const matchingService = require('./matchingService');

// Match contractor with podcasts based on focus areas
const matchPodcast = async (contractor) => {
  // Parse contractor focus areas safely
  let focusAreas = [];
  if (typeof contractor.focus_areas === 'string' && contractor.focus_areas !== '[object Object]' && contractor.focus_areas.trim() !== '') {
    try {
      focusAreas = JSON.parse(contractor.focus_areas);
    } catch (e) {
      console.error('Error parsing contractor focus_areas:', contractor.focus_areas);
      focusAreas = [];
    }
  } else if (Array.isArray(contractor.focus_areas)) {
    focusAreas = contractor.focus_areas;
  }
  
  if (focusAreas.length === 0) return null;
  
  const primaryFocus = focusAreas[0];
  
  // Get podcasts that match the primary focus area
  const podcastsResult = await query(
    'SELECT * FROM podcasts WHERE is_active = 1'
  );
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const podcast of podcastsResult.rows) {
    const focusAreasCovered = typeof podcast.focus_areas_covered === 'string'
      ? JSON.parse(podcast.focus_areas_covered || '[]')
      : podcast.focus_areas_covered || [];
    
    const topics = typeof podcast.topics === 'string'
      ? JSON.parse(podcast.topics || '[]')
      : podcast.topics || [];
    
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
        topics,
        matchScore: score,
        matchReasons: generatePodcastMatchReasons(contractor, podcast, focusAreasCovered)
      };
    }
  }
  
  return bestMatch;
};

// Match contractor with events based on focus areas and timeline
const matchEvent = async (contractor) => {
  // Parse contractor focus areas safely
  let focusAreas = [];
  if (typeof contractor.focus_areas === 'string' && contractor.focus_areas !== '[object Object]' && contractor.focus_areas.trim() !== '') {
    try {
      focusAreas = JSON.parse(contractor.focus_areas);
    } catch (e) {
      console.error('Error parsing contractor focus_areas:', contractor.focus_areas);
      focusAreas = [];
    }
  } else if (Array.isArray(contractor.focus_areas)) {
    focusAreas = contractor.focus_areas;
  }
  
  if (focusAreas.length === 0) return null;
  
  const primaryFocus = focusAreas[0];
  
  // Get upcoming events
  const eventsResult = await query(
    'SELECT * FROM events WHERE is_active = 1 AND registration_deadline > date("now") ORDER BY date ASC'
  );
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const event of eventsResult.rows) {
    const focusAreasCovered = typeof event.focus_areas_covered === 'string'
      ? JSON.parse(event.focus_areas_covered || '[]')
      : event.focus_areas_covered || [];
    
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
        matchReasons: generateEventMatchReasons(contractor, event, focusAreasCovered)
      };
    }
  }
  
  return bestMatch;
};

// Generate match reasons for podcasts
const generatePodcastMatchReasons = (contractor, podcast, focusAreasCovered) => {
  const reasons = [];
  let focusAreas = [];
  if (typeof contractor.focus_areas === 'string' && contractor.focus_areas !== '[object Object]' && contractor.focus_areas.trim() !== '') {
    try {
      focusAreas = JSON.parse(contractor.focus_areas);
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
      focusAreas = JSON.parse(contractor.focus_areas);
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
      focusAreas = JSON.parse(contractor.focus_areas);
    } catch (e) {
      console.error('Error parsing contractor focus_areas:', contractor.focus_areas);
      focusAreas = [];
    }
  } else if (Array.isArray(contractor.focus_areas)) {
    focusAreas = contractor.focus_areas;
  }
  
  if (focusAreas.length === 0) return null;
  
  const primaryFocus = focusAreas[0];
  
  // Get active manufacturers
  const manufacturersResult = await query(
    'SELECT * FROM manufacturers WHERE is_active = 1 ORDER BY power_confidence_score DESC'
  );
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const manufacturer of manufacturersResult.rows) {
    const focusAreasServed = typeof manufacturer.focus_areas_served === 'string'
      ? JSON.parse(manufacturer.focus_areas_served || '[]')
      : manufacturer.focus_areas_served || [];
    
    const productCategories = typeof manufacturer.product_categories === 'string'
      ? JSON.parse(manufacturer.product_categories || '[]')
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
        matchReasons: generateManufacturerMatchReasons(contractor, manufacturer, focusAreasServed)
      };
    }
  }
  
  return bestMatch;
};

// Generate match reasons for manufacturers
const generateManufacturerMatchReasons = (contractor, manufacturer, focusAreasServed) => {
  const reasons = [];
  let focusAreas = [];
  if (typeof contractor.focus_areas === 'string' && contractor.focus_areas !== '[object Object]' && contractor.focus_areas.trim() !== '') {
    try {
      focusAreas = JSON.parse(contractor.focus_areas);
    } catch (e) {
      focusAreas = [];
    }
  } else if (Array.isArray(contractor.focus_areas)) {
    focusAreas = contractor.focus_areas;
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
  // Parse focus areas and use the specified index
  let focusAreas = [];
  if (typeof contractor.focus_areas === 'string' && contractor.focus_areas !== '[object Object]' && contractor.focus_areas.trim() !== '') {
    try {
      focusAreas = JSON.parse(contractor.focus_areas);
    } catch (e) {
      focusAreas = [];
    }
  } else if (Array.isArray(contractor.focus_areas)) {
    focusAreas = contractor.focus_areas;
  }
  
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
  
  // Get manufacturer match for the specific focus area
  const manufacturerMatch = await matchManufacturer(modifiedContractor);
  
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
        manufacturerMatched: !!manufacturerMatch,
        focusAreaIndex: focusAreaIndex,
        focusAreaSelected: modifiedContractor.primary_focus_area
      }
    );
  }
  
  return {
    matches: partnerMatches.slice(0, 2), // Return top 2 partners
    podcastMatch,
    eventMatch,
    manufacturerMatch,
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