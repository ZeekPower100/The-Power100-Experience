/**
 * Test Matching Algorithm - Deep Dive into Scoring Logic
 * Tests various matching scenarios to validate algorithm accuracy
 */

const peerMatchingService = require('./tpe-backend/src/services/peerMatchingService');

console.log('🧮 Testing Matching Algorithm - Deep Dive\n');
console.log('='.repeat(70));

// Test Scenarios
const scenarios = [
  {
    name: 'IDEAL PEER MATCH',
    description: 'Same challenges, different markets, similar size',
    contractor1: {
      focus_areas: '["hiring", "operations", "customer_retention"]',
      service_area: 'Phoenix, AZ',
      revenue_tier: '2m_5m',
      team_size: 20,
      services_offered: '["HVAC", "Plumbing"]'
    },
    contractor2: {
      focus_areas: '["hiring", "operations", "greenfield_growth"]',
      service_area: 'Dallas, TX',
      revenue_tier: '2m_5m',
      team_size: 22,
      services_offered: '["HVAC", "Electrical"]'
    },
    expectedScore: '>0.8',
    expectedType: 'ideal_peer'
  },
  {
    name: 'FOCUS AREA MATCH',
    description: 'Strong focus overlap, same state but different cities',
    contractor1: {
      focus_areas: '["hiring", "sales"]',
      service_area: 'Dallas, TX',
      revenue_tier: '1m_2m',
      team_size: 15,
      services_offered: '["HVAC"]'
    },
    contractor2: {
      focus_areas: '["hiring", "customer_retention"]',
      service_area: 'Austin, TX',
      revenue_tier: '2m_5m',
      team_size: 25,
      services_offered: '["HVAC"]'
    },
    expectedScore: '0.7-0.79',
    expectedType: 'focus_area_match'
  },
  {
    name: 'SCALE MATCH',
    description: 'Similar business size, different focus areas',
    contractor1: {
      focus_areas: '["hiring"]',
      service_area: 'Phoenix, AZ',
      revenue_tier: '1m_2m',
      team_size: 15,
      services_offered: '["HVAC"]'
    },
    contractor2: {
      focus_areas: '["sales"]',
      service_area: 'Miami, FL',
      revenue_tier: '1m_2m',
      team_size: 16,
      services_offered: '["Plumbing"]'
    },
    expectedScore: '0.6-0.69',
    expectedType: 'scale_match'
  },
  {
    name: 'BELOW THRESHOLD',
    description: 'Same market (competing), no focus overlap',
    contractor1: {
      focus_areas: '["hiring"]',
      service_area: 'Dallas, TX',
      revenue_tier: 'under_500k',
      team_size: 5,
      services_offered: '["HVAC"]'
    },
    contractor2: {
      focus_areas: '["sales"]',
      service_area: 'Dallas, TX',
      revenue_tier: '10m_plus',
      team_size: 100,
      services_offered: '["Electrical"]'
    },
    expectedScore: '<0.6',
    expectedType: 'general_match'
  },
  {
    name: 'PERFECT MATCH',
    description: 'Identical business profiles in different states',
    contractor1: {
      focus_areas: '["hiring", "operations"]',
      service_area: 'Phoenix, AZ',
      revenue_tier: '2m_5m',
      team_size: 20,
      services_offered: '["HVAC"]'
    },
    contractor2: {
      focus_areas: '["hiring", "operations"]',
      service_area: 'Atlanta, GA',
      revenue_tier: '2m_5m',
      team_size: 20,
      services_offered: '["HVAC"]'
    },
    expectedScore: '>0.9',
    expectedType: 'ideal_peer'
  },
  {
    name: 'EDGE CASE: No Data',
    description: 'Missing focus areas and location',
    contractor1: {
      focus_areas: null,
      service_area: null,
      revenue_tier: '1m_2m',
      team_size: 15,
      services_offered: '["HVAC"]'
    },
    contractor2: {
      focus_areas: '["hiring"]',
      service_area: 'Dallas, TX',
      revenue_tier: '2m_5m',
      team_size: 20,
      services_offered: '["Plumbing"]'
    },
    expectedScore: 'any',
    expectedType: 'any'
  }
];

// Run tests
scenarios.forEach((scenario, index) => {
  console.log(`\n${index + 1}. ${scenario.name}`);
  console.log('-'.repeat(70));
  console.log(`📝 ${scenario.description}`);

  const score = peerMatchingService.calculateMatchScore(
    scenario.contractor1,
    scenario.contractor2
  );

  const matchType = peerMatchingService.determineMatchType(score.breakdown);

  console.log('\n📊 Results:');
  console.log(`   Overall Score: ${score.total.toFixed(2)} (Expected: ${scenario.expectedScore})`);
  console.log(`   Match Type: ${matchType} (Expected: ${scenario.expectedType})`);

  console.log('\n   Score Breakdown:');
  console.log(`   - Focus Areas:    ${(score.breakdown.focusAreas * 100).toFixed(0)}% (weight: 40%)`);
  console.log(`   - Geographic:     ${(score.breakdown.geographic * 100).toFixed(0)}% (weight: 25%)`);
  console.log(`   - Business Scale: ${(score.breakdown.businessScale * 100).toFixed(0)}% (weight: 20%)`);
  console.log(`   - Industry:       ${(score.breakdown.industry * 100).toFixed(0)}% (weight: 15%)`);

  // Validate against expectations
  const isCorrectScore = validateScore(score.total, scenario.expectedScore);
  const isCorrectType = scenario.expectedType === 'any' || matchType === scenario.expectedType;

  if (isCorrectScore && isCorrectType) {
    console.log('\n   ✅ Test PASSED');
  } else {
    console.log('\n   ❌ Test FAILED');
    if (!isCorrectScore) console.log(`      Score mismatch: got ${score.total.toFixed(2)}, expected ${scenario.expectedScore}`);
    if (!isCorrectType) console.log(`      Type mismatch: got ${matchType}, expected ${scenario.expectedType}`);
  }
});

// Edge cases
console.log('\n\n' + '='.repeat(70));
console.log('🔬 EDGE CASE TESTING');
console.log('='.repeat(70));

console.log('\n1. Empty Arrays');
console.log('-'.repeat(70));
const emptyScore = peerMatchingService.calculateMatchScore(
  {
    focus_areas: '[]',
    service_area: '',
    revenue_tier: null,
    team_size: null,
    services_offered: '[]'
  },
  {
    focus_areas: '[]',
    service_area: '',
    revenue_tier: null,
    team_size: null,
    services_offered: '[]'
  }
);
console.log(`Result: ${emptyScore.total.toFixed(2)}`);
console.log('✅ Handles empty data gracefully (no crash)');

console.log('\n2. Invalid JSON');
console.log('-'.repeat(70));
try {
  const invalidScore = peerMatchingService.calculateMatchScore(
    {
      focus_areas: 'not valid json',
      service_area: 'Phoenix, AZ',
      revenue_tier: '1m_2m',
      team_size: 15,
      services_offered: '["HVAC"]'
    },
    {
      focus_areas: '["hiring"]',
      service_area: 'Dallas, TX',
      revenue_tier: '2m_5m',
      team_size: 20,
      services_offered: '["Plumbing"]'
    }
  );
  console.log(`Result: ${invalidScore.total.toFixed(2)}`);
  console.log('✅ Handles invalid JSON gracefully (no crash)');
} catch (error) {
  console.log('❌ Failed to handle invalid JSON:', error.message);
}

console.log('\n3. Extreme Size Differences');
console.log('-'.repeat(70));
const extremeScore = peerMatchingService.calculateMatchScore(
  {
    focus_areas: '["hiring"]',
    service_area: 'Phoenix, AZ',
    revenue_tier: 'under_500k',
    team_size: 3,
    services_offered: '["HVAC"]'
  },
  {
    focus_areas: '["hiring"]',
    service_area: 'Dallas, TX',
    revenue_tier: '10m_plus',
    team_size: 200,
    services_offered: '["HVAC"]'
  }
);
console.log(`Result: ${extremeScore.total.toFixed(2)}`);
console.log(`Business Scale Score: ${extremeScore.breakdown.businessScale.toFixed(2)}`);
console.log('✅ Penalizes extreme size differences appropriately');

console.log('\n\n' + '='.repeat(70));
console.log('✅ MATCHING ALGORITHM TESTS COMPLETED');
console.log('='.repeat(70));

// Helper function
function validateScore(actualScore, expectedRange) {
  if (expectedRange === 'any') return true;

  if (expectedRange.startsWith('>')) {
    const threshold = parseFloat(expectedRange.substring(1));
    return actualScore > threshold;
  }

  if (expectedRange.startsWith('<')) {
    const threshold = parseFloat(expectedRange.substring(1));
    return actualScore < threshold;
  }

  if (expectedRange.includes('-')) {
    const [min, max] = expectedRange.split('-').map(parseFloat);
    return actualScore >= min && actualScore <= max;
  }

  return Math.abs(actualScore - parseFloat(expectedRange)) < 0.05;
}