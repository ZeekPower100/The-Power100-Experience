/**
 * Test Peer Matching Service - Unit Tests
 * Tests the matching algorithm logic without SMS integration
 */

const peerMatchingService = require('./tpe-backend/src/services/peerMatchingService');

async function runTests() {
  console.log('🧪 Testing Peer Matching Service\n');
  console.log('='.repeat(60));

  try {
    // Test 1: Find peer matches for a contractor
    console.log('\n📋 TEST 1: Find Peer Matches');
    console.log('-'.repeat(60));

    const eventId = 33;
    const contractorId = 12;

    console.log(`Finding matches for contractor ${contractorId} at event ${eventId}...`);

    const matches = await peerMatchingService.findPeerMatches(contractorId, eventId, {
      maxMatches: 3,
      minScore: 0.5,
      excludeMatched: false
    });

    console.log(`✅ Found ${matches.length} matches`);

    if (matches.length > 0) {
      console.log('\nTop Match:');
      const topMatch = matches[0];
      console.log(`  Name: ${topMatch.first_name} ${topMatch.last_name}`);
      console.log(`  Company: ${topMatch.company_name}`);
      console.log(`  Location: ${topMatch.service_area}`);
      console.log(`  Match Score: ${topMatch.matchScore}`);
      console.log(`  Match Type: ${topMatch.matchType}`);
      console.log(`  Reason: ${topMatch.matchReason}`);
      console.log('\nScore Breakdown:');
      console.log(`  Focus Areas: ${topMatch.matchCriteria.focusAreas}`);
      console.log(`  Geographic: ${topMatch.matchCriteria.geographic}`);
      console.log(`  Business Scale: ${topMatch.matchCriteria.businessScale}`);
      console.log(`  Industry: ${topMatch.matchCriteria.industry}`);
    } else {
      console.log('⚠️  No matches found (may need more test data)');
    }

    // Test 2: Calculate match score between two contractors
    console.log('\n\n📋 TEST 2: Calculate Match Score');
    console.log('-'.repeat(60));

    const contractor1 = {
      focus_areas: '["customer_retention", "greenfield_growth"]',
      service_area: 'Dallas, TX',
      revenue_tier: '1m_2m',
      team_size: 15,
      services_offered: '["HVAC", "Plumbing"]'
    };

    const contractor2 = {
      focus_areas: '["customer_retention", "closing_higher_percentage"]',
      service_area: 'Phoenix, AZ',
      revenue_tier: '2m_5m',
      team_size: 18,
      services_offered: '["HVAC", "Electrical"]'
    };

    const score = peerMatchingService.calculateMatchScore(contractor1, contractor2);

    console.log('Test Contractors:');
    console.log('  Contractor 1: Dallas HVAC, $1-2M, 15 employees');
    console.log('  Contractor 2: Phoenix HVAC, $2-5M, 18 employees');
    console.log('\nMatch Score Results:');
    console.log(`  Overall Score: ${score.total}`);
    console.log(`  Focus Areas: ${score.breakdown.focusAreas}`);
    console.log(`  Geographic: ${score.breakdown.geographic}`);
    console.log(`  Business Scale: ${score.breakdown.businessScale}`);
    console.log(`  Industry: ${score.breakdown.industry}`);

    if (score.total >= 0.8) {
      console.log('  ✅ Result: IDEAL PEER');
    } else if (score.total >= 0.7) {
      console.log('  ✅ Result: FOCUS AREA MATCH');
    } else if (score.total >= 0.6) {
      console.log('  ✅ Result: SCALE MATCH');
    } else {
      console.log('  ⚠️  Result: BELOW THRESHOLD');
    }

    // Test 3: Generate SMS messages
    console.log('\n\n📋 TEST 3: Generate SMS Messages');
    console.log('-'.repeat(60));

    const testContractor = {
      first_name: 'John',
      focus_areas: '["hiring", "operations"]',
      service_area: 'Phoenix, AZ'
    };

    const testPeer = {
      first_name: 'Sarah',
      last_name: 'Johnson',
      company_name: 'ABC Contractors',
      service_area: 'Dallas, TX',
      focus_areas: '["hiring", "customer_retention"]',
      phone: '555-123-4567',
      email: 'sarah@abccontractors.com'
    };

    const testMatch = {
      matchScore: 0.85,
      breakdown: {
        focusAreas: 0.9,
        geographic: 1.0,
        businessScale: 0.8,
        industry: 0.75
      }
    };

    console.log('\n1️⃣ Peer Introduction SMS:');
    const introSMS = peerMatchingService.generatePeerIntroductionSMS(
      testContractor,
      testPeer,
      testMatch
    );
    console.log(introSMS);

    console.log('\n2️⃣ Break-Time Coordination SMS:');
    const breakSMS = peerMatchingService.generateBreakTimePrompt(
      testContractor,
      testPeer,
      '10:30 AM',
      'the networking area'
    );
    console.log(breakSMS);

    console.log('\n3️⃣ Contact Exchange SMS:');
    const contactSMS = peerMatchingService.generateContactExchangeSMS(
      testContractor,
      testPeer
    );
    console.log(contactSMS);

    console.log('\n4️⃣ Post-Connection Follow-up SMS:');
    const followUpSMS = peerMatchingService.generatePostConnectionFollowUp(
      testContractor,
      testPeer
    );
    console.log(followUpSMS);

    // Test 4: Scoring functions
    console.log('\n\n📋 TEST 4: Individual Scoring Functions');
    console.log('-'.repeat(60));

    console.log('\n🎯 Focus Area Scoring:');
    const focusScore1 = peerMatchingService.scoreFocusAreaMatch(
      '["hiring", "operations"]',
      '["hiring", "customer_retention"]'
    );
    console.log(`  Same: hiring, operations vs hiring, customer_retention = ${focusScore1.toFixed(2)}`);

    const focusScore2 = peerMatchingService.scoreFocusAreaMatch(
      '["hiring"]',
      '["hiring"]'
    );
    console.log(`  Perfect: hiring vs hiring = ${focusScore2.toFixed(2)}`);

    const focusScore3 = peerMatchingService.scoreFocusAreaMatch(
      '["hiring"]',
      '["sales"]'
    );
    console.log(`  None: hiring vs sales = ${focusScore3.toFixed(2)}`);

    console.log('\n🌎 Geographic Scoring:');
    const geoScore1 = peerMatchingService.scoreGeographicSeparation(
      'Dallas, TX',
      'Phoenix, AZ'
    );
    console.log(`  Different states: Dallas, TX vs Phoenix, AZ = ${geoScore1.toFixed(2)}`);

    const geoScore2 = peerMatchingService.scoreGeographicSeparation(
      'Dallas, TX',
      'Austin, TX'
    );
    console.log(`  Same state: Dallas, TX vs Austin, TX = ${geoScore2.toFixed(2)}`);

    const geoScore3 = peerMatchingService.scoreGeographicSeparation(
      'Dallas, TX',
      'Dallas, TX'
    );
    console.log(`  Same city: Dallas, TX vs Dallas, TX = ${geoScore3.toFixed(2)}`);

    console.log('\n💼 Business Scale Scoring:');
    const scaleScore1 = peerMatchingService.scoreBusinessScale(
      { revenue: '1m_2m', teamSize: 15 },
      { revenue: '1m_2m', teamSize: 16 }
    );
    console.log(`  Same tier, similar team: $1-2M/15 vs $1-2M/16 = ${scaleScore1.toFixed(2)}`);

    const scaleScore2 = peerMatchingService.scoreBusinessScale(
      { revenue: '1m_2m', teamSize: 15 },
      { revenue: '5m_10m', teamSize: 50 }
    );
    console.log(`  Different tier: $1-2M/15 vs $5-10M/50 = ${scaleScore2.toFixed(2)}`);

    console.log('\n🏭 Industry Scoring:');
    const industryScore1 = peerMatchingService.scoreIndustryAlignment(
      '["HVAC", "Plumbing"]',
      '["HVAC", "Electrical"]'
    );
    console.log(`  Overlap: HVAC+Plumbing vs HVAC+Electrical = ${industryScore1.toFixed(2)}`);

    const industryScore2 = peerMatchingService.scoreIndustryAlignment(
      '["HVAC"]',
      '["HVAC"]'
    );
    console.log(`  Perfect: HVAC vs HVAC = ${industryScore2.toFixed(2)}`);

    // Test 5: Smart timing suggestions
    console.log('\n\n📋 TEST 5: Smart Timing Suggestions');
    console.log('-'.repeat(60));

    const eventSchedule = {
      startTime: new Date('2025-09-26T09:00:00Z'),
      breaks: [
        { start: new Date('2025-09-26T10:30:00Z'), location: 'Networking Area' },
        { start: new Date('2025-09-26T14:30:00Z'), location: 'Lobby' }
      ],
      lunch: { start: new Date('2025-09-26T12:00:00Z'), location: 'Cafeteria' },
      endTime: new Date('2025-09-26T17:00:00Z')
    };

    const promptTimes = peerMatchingService.getSuggestedPromptTimes(eventSchedule);

    console.log(`\n✅ Found ${promptTimes.length} optimal prompt times:`);
    promptTimes.forEach((slot, index) => {
      console.log(`\n${index + 1}. ${slot.context.toUpperCase()}`);
      console.log(`   Time: ${slot.time.toLocaleTimeString()}`);
      if (slot.location) console.log(`   Location: ${slot.location}`);
      console.log(`   Message: ${slot.message}`);
    });

    console.log('\n\n' + '='.repeat(60));
    console.log('✅ ALL TESTS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\n❌ TEST FAILED:');
    console.error(error);
    process.exit(1);
  }

  process.exit(0);
}

// Run tests
runTests();