const { safeJsonParse, safeJsonStringify } = require('../utils/jsonHelpers');

const { query, transaction } = require('../config/database');
const outcomeTrackingService = require('./outcomeTrackingService');

// Focus area weights for matching algorithm
const FOCUS_AREA_WEIGHTS = {
  primary: 3.0,
  secondary: 2.0,
  tertiary: 1.0
};

// Revenue range compatibility matrix (updated to match partner form)
const REVENUE_COMPATIBILITY = {
  '0_5_million': ['0_5_million', '5_10_million'],
  '5_10_million': ['0_5_million', '5_10_million', '11_20_million'],
  '11_20_million': ['5_10_million', '11_20_million', '21_30_million'],
  '21_30_million': ['11_20_million', '21_30_million', '31_50_million'],
  '31_50_million': ['21_30_million', '31_50_million', '51_75_million'],
  '51_75_million': ['31_50_million', '51_75_million', '76_150_million'],
  '76_150_million': ['51_75_million', '76_150_million', '151_300_million'],
  '151_300_million': ['76_150_million', '151_300_million', '300_plus_million'],
  '300_plus_million': ['151_300_million', '300_plus_million'],
  // Legacy support for old values
  'under_500k': ['0_5_million'],
  '500k_1m': ['0_5_million'],
  '1m_5m': ['0_5_million', '5_10_million'],
  '5m_10m': ['5_10_million', '11_20_million'],
  'over_10m': ['11_20_million', '21_30_million', '31_50_million']
};

const matchContractorWithPartners = async (contractor) => {
  // Parse contractor JSON fields first
  const parsedContractor = {
    ...contractor,
    focus_areas: typeof contractor.focus_areas === 'string' && contractor.focus_areas !== '[object Object]'
      ? safeJsonParse(contractor.focus_areas || '[]')
      : Array.isArray(contractor.focus_areas) ? contractor.focus_areas : [],
    services_offered: typeof contractor.services_offered === 'string' && contractor.services_offered !== '[object Object]'
      ? safeJsonParse(contractor.services_offered || '[]')
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
      ? safeJsonParse(partner.focus_areas_served || '[]')
      : Array.isArray(partner.focus_areas_served) ? partner.focus_areas_served : [],
    target_revenue_range: typeof partner.target_revenue_range === 'string' && partner.target_revenue_range !== '[object Object]'
      ? safeJsonParse(partner.target_revenue_range || '[]')
      : Array.isArray(partner.target_revenue_range) ? partner.target_revenue_range : [],
    geographic_regions: typeof partner.geographic_regions === 'string' && partner.geographic_regions !== '[object Object]'
      ? safeJsonParse(partner.geographic_regions || '[]')
      : Array.isArray(partner.geographic_regions) ? partner.geographic_regions : [],
    key_differentiators: partner.key_differentiators || ''
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
      'DELETE FROM contractor_partner_matches WHERE contractor_id = $1',
      [parsedContractor.id]
    );

    // Insert new matches and track outcomes
    for (let i = 0; i < topMatches.length; i++) {
      const match = topMatches[i];
      await client.query(`
        INSERT INTO contractor_partner_matches 
        (contractor_id, partner_id, match_score, match_reasons, is_primary_match)
        VALUES ($1, $2, $3, $4, $5)
      `, [
        parsedContractor.id,
        match.partner.id,
        match.matchScore,
        safeJsonStringify(match.matchReasons), // Convert array to JSON string
        i === 0 ? true : false // First match is primary
      ]);
      
      // Track the match outcome
      await outcomeTrackingService.trackPartnerMatch(
        parsedContractor.id,
        match.partner.id,
        {
          score: match.matchScore,
          reasons: match.matchReasons,
          isPrimary: i === 0,
          contractorStage: parsedContractor.pipeline_stage || 'matching',
          focusAreas: parsedContractor.focus_areas,
          revenueTier: parsedContractor.revenue_range
        }
      );
    }
  });

  return topMatches;
};

const calculateMatchScore = (contractor, partner) => {
  let score = 0;
  let maxScore = 0;

  // Focus area matching (50% weight) - reduced from 60%
  const focusScore = calculateFocusAreaScore(contractor, partner);
  score += focusScore * 0.5;
  maxScore += 100 * 0.5;

  // Revenue range compatibility (15% weight) - reduced from 20%
  const revenueScore = calculateRevenueScore(contractor, partner);
  score += revenueScore * 0.15;
  maxScore += 100 * 0.15;

  // Tech stack compatibility (15% weight) - NEW
  const techStackScore = calculateTechStackCompatibility(contractor, partner);
  score += techStackScore * 0.15;
  maxScore += 100 * 0.15;

  // Power confidence score (10% weight)
  score += (partner.powerconfidence_score || 0) * 0.1;
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
    // Format the revenue range for display
    const formatRevenue = (range) => {
      const revenueMap = {
        '0_5_million': '$0-5M',
        '5_10_million': '$5-10M',
        '11_20_million': '$11-20M',
        '21_30_million': '$21-30M',
        '31_50_million': '$31-50M',
        '51_75_million': '$51-75M',
        '76_150_million': '$76-150M',
        '151_300_million': '$151-300M',
        '300_plus_million': '$300M+',
        // Legacy formats
        'under_500k': 'under $500K',
        '500k_1m': '$500K-1M',
        '1m_5m': '$1-5M',
        '5m_10m': '$5-10M',
        'over_10m': 'over $10M'
      };
      return revenueMap[range] || range.replace(/_/g, ' ');
    };
    reasons.push(`Perfect fit for ${formatRevenue(contractor.annual_revenue)} revenue businesses`);
  }

  // High confidence score
  if (partner.powerconfidence_score >= 90) {
    reasons.push(`${partner.powerconfidence_score}% customer satisfaction rating`);
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

// Calculate tech stack compatibility score
const calculateTechStackCompatibility = (contractor, partner) => {
  // If contractor hasn't provided tech stack info, return neutral score
  if (!contractor || !hasAnyTechStack(contractor)) {
    return 50; // Neutral score when no tech stack data available
  }

  let compatibilityScore = 0;
  let totalCategories = 0;
  
  // Tech stack categories to check
  const techStackCategories = [
    'tech_stack_sales',
    'tech_stack_operations', 
    'tech_stack_marketing',
    'tech_stack_customer_experience',
    'tech_stack_project_management',
    'tech_stack_accounting_finance'
  ];

  // Check each tech stack category
  for (const category of techStackCategories) {
    const contractorStack = parseTechStack(contractor[category]);
    
    if (contractorStack.length > 0) {
      totalCategories++;
      
      // Calculate category compatibility
      const categoryScore = calculateCategoryCompatibility(
        contractorStack, 
        partner, 
        category
      );
      compatibilityScore += categoryScore;
    }
  }

  // If no tech stack categories found, return neutral
  if (totalCategories === 0) {
    return 50;
  }

  // Return average compatibility score
  return compatibilityScore / totalCategories;
};

// Check if contractor has any tech stack information
const hasAnyTechStack = (contractor) => {
  const categories = [
    'tech_stack_sales',
    'tech_stack_operations',
    'tech_stack_marketing', 
    'tech_stack_customer_experience',
    'tech_stack_project_management',
    'tech_stack_accounting_finance'
  ];
  
  return categories.some(category => {
    const stack = parseTechStack(contractor[category]);
    return stack.length > 0;
  });
};

// Parse tech stack field (handle both string and array)
const parseTechStack = (techStackField) => {
  if (!techStackField) return [];
  
  if (Array.isArray(techStackField)) {
    return techStackField;
  }
  
  if (typeof techStackField === 'string') {
    try {
      const parsed = safeJsonParse(techStackField);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  
  return [];
};

// Calculate compatibility for a specific tech stack category
const calculateCategoryCompatibility = (contractorStack, partner, category) => {
  // For now, we'll use a simple heuristic since partners don't have detailed tech stack data yet
  // This can be enhanced when partners provide their tech stack requirements/compatibilities
  
  let score = 75; // Base compatibility score
  
  // Bonus for having modern, popular tools
  const modernTools = [
    'HubSpot', 'Salesforce', 'JobNimbus', 'JobProgress', 'Buildertrend',
    'Google Ads', 'Facebook Ads', 'Podium', 'ServiceTitan', 'QuickBooks'
  ];
  
  const hasModernTool = contractorStack.some(tool => 
    modernTools.includes(tool)
  );
  
  if (hasModernTool) {
    score += 15; // Bonus for modern tools
  }
  
  // Slight penalty for too many tools in one category (potential complexity)
  if (contractorStack.length > 3) {
    score -= 5;
  }
  
  // Bonus for having tools at all (shows they're tech-savvy)
  if (contractorStack.length > 0) {
    score += 10;
  }
  
  return Math.min(100, Math.max(0, score));
};

module.exports = {
  matchContractorWithPartners,
  calculateMatchScore,
  generateMatchReasons,
  calculateTechStackCompatibility
};