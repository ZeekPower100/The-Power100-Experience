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
  // Get all active partners
  const partnersResult = await query(
    'SELECT * FROM strategic_partners WHERE is_active = true'
  );
  const partners = partnersResult.rows;

  // Calculate match scores
  const matchedPartners = partners.map(partner => {
    const matchScore = calculateMatchScore(contractor, partner);
    const matchReasons = generateMatchReasons(contractor, partner, matchScore);
    
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
      'DELETE FROM contractor_partner_matches WHERE contractor_id = $1',
      [contractor.id]
    );

    // Insert new matches
    for (let i = 0; i < topMatches.length; i++) {
      const match = topMatches[i];
      await client.query(`
        INSERT INTO contractor_partner_matches 
        (contractor_id, partner_id, match_score, match_reasons, is_primary_match)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        contractor.id,
        match.partner.id,
        match.matchScore,
        match.matchReasons,
        i === 0 // First match is primary
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

  let score = 0;
  const weights = [FOCUS_AREA_WEIGHTS.primary, FOCUS_AREA_WEIGHTS.secondary, FOCUS_AREA_WEIGHTS.tertiary];

  contractor.focus_areas.forEach((area, index) => {
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

  // Check if partner serves contractor's revenue range
  if (partner.target_revenue_range.includes(contractor.annual_revenue)) {
    return 100;
  }

  // Check if ranges are compatible
  const compatibleRanges = REVENUE_COMPATIBILITY[contractor.annual_revenue] || [];
  const hasCompatibleRange = partner.target_revenue_range.some(range => 
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
  if (contractor.team_size > 10 && partner.key_differentiators) {
    const enterpriseFeatures = partner.key_differentiators.filter(diff => 
      diff.toLowerCase().includes('enterprise') || 
      diff.toLowerCase().includes('scale') ||
      diff.toLowerCase().includes('team')
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