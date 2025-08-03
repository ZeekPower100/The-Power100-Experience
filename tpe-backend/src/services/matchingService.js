const { query, transaction } = require('../config/database');

// Focus area weights for matching algorithm
const FOCUS_AREA_WEIGHTS = {
  primary: 3.0,
  secondary: 2.0,
  tertiary: 1.0
};

// Revenue range compatibility matrix
const REVENUE_COMPATIBILITY = {
  'under_500k': ['under_500k', '500k_1m'],
  '500k_1m': ['under_500k', '500k_1m', '1m_5m'],
  '1m_5m': ['500k_1m', '1m_5m', '5m_10m'],
  '5m_10m': ['1m_5m', '5m_10m', 'over_10m'],
  'over_10m': ['5m_10m', 'over_10m']
};

const matchContractorWithPartners = async (contractor) => {
  // Parse contractor JSON fields first
  const parsedContractor = {
    ...contractor,
    focus_areas: typeof contractor.focus_areas === 'string' && contractor.focus_areas !== '[object Object]'
      ? JSON.parse(contractor.focus_areas || '[]')
      : Array.isArray(contractor.focus_areas) ? contractor.focus_areas : [],
    services_offered: typeof contractor.services_offered === 'string' && contractor.services_offered !== '[object Object]'
      ? JSON.parse(contractor.services_offered || '[]')
      : Array.isArray(contractor.services_offered) ? contractor.services_offered : []
  };

  // Get all active partners
  const partnersResult = await query(
    'SELECT * FROM strategic_partners WHERE is_active = true'
  );
  
  // Parse JSON fields for each partner
  const partners = partnersResult.rows.map(partner => ({
    ...partner,
    focus_areas_served: typeof partner.focus_areas_served === 'string' && partner.focus_areas_served !== '[object Object]'
      ? JSON.parse(partner.focus_areas_served || '[]')
      : Array.isArray(partner.focus_areas_served) ? partner.focus_areas_served : [],
    target_revenue_range: typeof partner.target_revenue_range === 'string' && partner.target_revenue_range !== '[object Object]'
      ? JSON.parse(partner.target_revenue_range || '[]')
      : Array.isArray(partner.target_revenue_range) ? partner.target_revenue_range : [],
    geographic_regions: typeof partner.geographic_regions === 'string' && partner.geographic_regions !== '[object Object]'
      ? JSON.parse(partner.geographic_regions || '[]')
      : Array.isArray(partner.geographic_regions) ? partner.geographic_regions : [],
    key_differentiators: typeof partner.key_differentiators === 'string' && partner.key_differentiators !== '[object Object]'
      ? JSON.parse(partner.key_differentiators || '[]')
      : Array.isArray(partner.key_differentiators) ? partner.key_differentiators : []
  }));

  // Calculate match scores
  const matchedPartners = partners.map(partner => {
    const matchScore = calculateMatchScore(parsedContractor, partner);
    const matchReasons = generateMatchReasons(parsedContractor, partner, matchScore);
    
    return {
      partner,
      matchScore: Math.round(matchScore),
      matchReasons
    };
  });

  // Sort by match score
  matchedPartners.sort((a, b) => b.matchScore - a.matchScore);

  // Get top 3 matches
  const topMatches = matchedPartners.slice(0, 3);

  // Save matches to database
  await transaction(async (client) => {
    // Clear existing matches
    await client.query(
      'DELETE FROM contractor_partner_matches WHERE contractor_id = ?',
      [parsedContractor.id]
    );

    // Insert new matches
    for (let i = 0; i < topMatches.length; i++) {
      const match = topMatches[i];
      await client.query(`
        INSERT INTO contractor_partner_matches 
        (contractor_id, partner_id, match_score, match_reasons, is_primary_match)
        VALUES (?, ?, ?, ?, ?)
      `, [
        parsedContractor.id,
        match.partner.id,
        match.matchScore,
        JSON.stringify(match.matchReasons), // Convert array to JSON string for SQLite
        i === 0 ? 1 : 0 // SQLite uses 1/0 for boolean
      ]);
    }
  });

  return topMatches;
};

const calculateMatchScore = (contractor, partner) => {
  let score = 0;
  let maxScore = 0;

  // Focus area matching (60% weight)
  const focusScore = calculateFocusAreaScore(contractor, partner);
  score += focusScore * 0.6;
  maxScore += 100 * 0.6;

  // Revenue range compatibility (20% weight)
  const revenueScore = calculateRevenueScore(contractor, partner);
  score += revenueScore * 0.2;
  maxScore += 100 * 0.2;

  // Power confidence score (10% weight)
  score += (partner.power_confidence_score || 0) * 0.1;
  maxScore += 100 * 0.1;

  // Readiness indicators bonus (10% weight)
  const readinessScore = calculateReadinessScore(contractor);
  score += readinessScore * 0.1;
  maxScore += 100 * 0.1;

  // Normalize to 0-100 scale
  return (score / maxScore) * 100;
};

const calculateFocusAreaScore = (contractor, partner) => {
  if (!contractor.focus_areas || !partner.focus_areas_served) {
    return 0;
  }

  // Ensure focus_areas is an array
  const focusAreas = Array.isArray(contractor.focus_areas) ? contractor.focus_areas : [];
  if (focusAreas.length === 0) {
    return 0;
  }

  let score = 0;
  const weights = [FOCUS_AREA_WEIGHTS.primary, FOCUS_AREA_WEIGHTS.secondary, FOCUS_AREA_WEIGHTS.tertiary];

  focusAreas.forEach((area, index) => {
    if (partner.focus_areas_served.includes(area)) {
      score += weights[index] || 1.0;
    }
  });

  // Primary focus area gets extra weight
  if (contractor.primary_focus_area && partner.focus_areas_served.includes(contractor.primary_focus_area)) {
    score += 2.0;
  }

  // Normalize based on maximum possible score
  const maxScore = weights.reduce((sum, w) => sum + w, 0) + 2.0;
  return (score / maxScore) * 100;
};

const calculateRevenueScore = (contractor, partner) => {
  if (!contractor.annual_revenue || !partner.target_revenue_range) {
    return 50; // Default middle score if data missing
  }

  // Ensure target_revenue_range is an array
  const revenueRanges = Array.isArray(partner.target_revenue_range) ? partner.target_revenue_range : [];
  if (revenueRanges.length === 0) {
    return 50; // Default score if no revenue ranges
  }

  // Check if partner serves contractor's revenue range
  if (revenueRanges.includes(contractor.annual_revenue)) {
    return 100;
  }

  // Check if ranges are compatible
  const compatibleRanges = REVENUE_COMPATIBILITY[contractor.annual_revenue] || [];
  const hasCompatibleRange = revenueRanges.some(range => 
    compatibleRanges.includes(range)
  );

  return hasCompatibleRange ? 75 : 25;
};

const calculateReadinessScore = (contractor) => {
  let score = 0;
  
  if (contractor.increased_tools) score += 33.33;
  if (contractor.increased_people) score += 33.33;
  if (contractor.increased_activity) score += 33.34;
  
  return score;
};

const generateMatchReasons = (contractor, partner, matchScore) => {
  const reasons = [];

  // Focus area alignment
  if (contractor.focus_areas && partner.focus_areas_served) {
    const matchedAreas = contractor.focus_areas.filter(area => 
      partner.focus_areas_served.includes(area)
    );
    
    if (matchedAreas.length > 0) {
      reasons.push(`Specializes in your focus areas: ${matchedAreas.join(', ').replace(/_/g, ' ')}`);
    }
  }

  // Revenue range fit
  if (partner.target_revenue_range && partner.target_revenue_range.includes(contractor.annual_revenue)) {
    reasons.push(`Perfect fit for ${contractor.annual_revenue.replace(/_/g, ' ')} revenue businesses`);
  }

  // High confidence score
  if (partner.power_confidence_score >= 90) {
    reasons.push(`${partner.power_confidence_score}% customer satisfaction rating`);
  }

  // Growth readiness
  const readinessCount = [
    contractor.increased_tools,
    contractor.increased_people,
    contractor.increased_activity
  ].filter(Boolean).length;

  if (readinessCount >= 2) {
    reasons.push('Ideal timing based on your growth indicators');
  }

  // Team size consideration
  if (contractor.team_size > 10 && Array.isArray(partner.key_differentiators)) {
    const enterpriseFeatures = partner.key_differentiators.filter(diff => 
      typeof diff === 'string' && (
        diff.toLowerCase().includes('enterprise') || 
        diff.toLowerCase().includes('scale') ||
        diff.toLowerCase().includes('team')
      )
    );
    
    if (enterpriseFeatures.length > 0) {
      reasons.push('Built for teams of your size');
    }
  }

  return reasons;
};

module.exports = {
  matchContractorWithPartners,
  calculateMatchScore,
  generateMatchReasons
};