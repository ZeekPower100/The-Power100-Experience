/**
 * Test AI Message Generator
 *
 * Tests the new AI-powered message generation to see how messages come out
 * with different contexts (check-in status, timing, visited booths, etc.)
 */

// Load environment variables
require('dotenv').config({ path: './tpe-backend/.env' });

const { generateContextualMessage } = require('./tpe-backend/src/services/aiMessageGenerator');

async function testMessages() {
  console.log('🧪 Testing AI-Generated Messages\n');
  console.log('='.repeat(80));

  // Test 1: Check-In Reminder - Not Checked In, Night Before
  console.log('\n📧 TEST 1: Check-In Reminder - Night Before (NOT checked in)');
  console.log('-'.repeat(80));
  const checkIn1 = await generateContextualMessage(
    'check_in_reminder',
    {
      timing_label: 'is tomorrow',
      reminder_type: 'check_in_reminder_night_before'
    },
    {
      contractor: {
        first_name: 'Mike',
        company_name: 'Elite Roofing Co',
        focus_areas: ['lead generation', 'digital marketing']
      },
      event: {
        name: 'Build & Grow Experience'
      },
      timing: {
        hours_until_event: 14,
        time_context: 'night_before',
        day_number: 1
      },
      already_checked_in: false
    }
  );
  console.log(`📱 Message: "${checkIn1}"`);
  console.log(`📊 Length: ${checkIn1.length} chars`);

  // Test 2: Check-In Reminder - Already Checked In, Day 2
  console.log('\n📧 TEST 2: Check-In Reminder - Day 2 (ALREADY checked in)');
  console.log('-'.repeat(80));
  const checkIn2 = await generateContextualMessage(
    'check_in_reminder',
    {
      timing_label: 'is today',
      reminder_type: 'check_in_reminder_night_before'
    },
    {
      contractor: {
        first_name: 'Mike',
        company_name: 'Elite Roofing Co',
        focus_areas: ['lead generation', 'digital marketing']
      },
      event: {
        name: 'Build & Grow Experience'
      },
      timing: {
        hours_until_event: 8,
        time_context: 'night_before',
        day_number: 2
      },
      already_checked_in: true
    }
  );
  console.log(`📱 Message: "${checkIn2}"`);
  console.log(`📊 Length: ${checkIn2.length} chars`);

  // Test 3: Speaker Alert
  console.log('\n🎤 TEST 3: Speaker Alert - Relevant Session');
  console.log('-'.repeat(80));
  const speakerAlert = await generateContextualMessage(
    'speaker_alert',
    {
      minutes_until: 15
    },
    {
      contractor: {
        first_name: 'Mike'
      },
      entity: {
        speaker_name: 'Sarah Johnson',
        session_title: 'Scaling Your Revenue with Smart Marketing',
        why: 'Covers your focus on lead generation and digital marketing',
        location: 'Main Stage'
      }
    }
  );
  console.log(`📱 Message: "${speakerAlert}"`);
  console.log(`📊 Length: ${speakerAlert.length} chars`);

  // Test 4: Sponsor Recommendation - First Break
  console.log('\n🤝 TEST 4: Sponsor Recommendation - First Break (No Booths Visited)');
  console.log('-'.repeat(80));
  const sponsor1 = await generateContextualMessage(
    'sponsor_recommendation',
    {},
    {
      contractor: {
        first_name: 'Mike'
      },
      entity: {
        sponsor_name: 'LeadFlow Pro',
        booth_number: '5',
        why: 'Automated lead generation tools for contractors',
        talking_points: ['Ask about their event-only 30% discount']
      },
      history: {
        visited_booths: []
      },
      timing: {
        time_context: 'break'
      }
    }
  );
  console.log(`📱 Message: "${sponsor1}"`);
  console.log(`📊 Length: ${sponsor1.length} chars`);

  // Test 5: Sponsor Recommendation - After Visiting 2 Booths
  console.log('\n🤝 TEST 5: Sponsor Recommendation - Second Break (After Visiting Booths 3 & 7)');
  console.log('-'.repeat(80));
  const sponsor2 = await generateContextualMessage(
    'sponsor_recommendation',
    {},
    {
      contractor: {
        first_name: 'Mike'
      },
      entity: {
        sponsor_name: 'LeadFlow Pro',
        booth_number: '5',
        why: 'Automated lead generation tools for contractors',
        talking_points: ['Complements your CRM strategy']
      },
      history: {
        visited_booths: ['3', '7']
      },
      timing: {
        time_context: 'lunch'
      }
    }
  );
  console.log(`📱 Message: "${sponsor2}"`);
  console.log(`📊 Length: ${sponsor2.length} chars`);

  // Test 6: Peer Introduction
  console.log('\n👥 TEST 6: Peer Introduction - Lunch Time');
  console.log('-'.repeat(80));
  const peerIntro = await generateContextualMessage(
    'peer_introduction',
    {},
    {
      contractor: {
        first_name: 'Mike'
      },
      entity: {
        peer_name: 'John Davis',
        company_name: 'Precision HVAC',
        why: 'Complementary business (HVAC), non-competing territory',
        common_ground: ['both focus on digital marketing', 'both have 5-10 person teams']
      }
    }
  );
  console.log(`📱 Message: "${peerIntro}"`);
  console.log(`📊 Length: ${peerIntro.length} chars`);

  // Test 7: Attendance Check (PCR)
  console.log('\n📊 TEST 7: Attendance Check - Quick PCR');
  console.log('-'.repeat(80));
  const attendanceCheck = await generateContextualMessage(
    'attendance_check',
    {},
    {
      contractor: {
        first_name: 'Mike'
      },
      entity: {
        session_title: 'Scaling Your Revenue with Smart Marketing',
        speaker_name: 'Sarah Johnson'
      }
    }
  );
  console.log(`📱 Message: "${attendanceCheck}"`);
  console.log(`📊 Length: ${attendanceCheck.length} chars`);

  // Test 8: Sponsor Batch Check
  console.log('\n🤝 TEST 8: Sponsor Batch Check - End of Day');
  console.log('-'.repeat(80));
  const sponsorBatch = await generateContextualMessage(
    'sponsor_batch_check',
    {
      recommended_sponsors: 3
    },
    {
      contractor: {
        first_name: 'Mike'
      }
    }
  );
  console.log(`📱 Message: "${sponsorBatch}"`);
  console.log(`📊 Length: ${sponsorBatch.length} chars`);

  // Test 9: Post-Event Wrap-Up
  console.log('\n🎯 TEST 9: Post-Event Wrap-Up - Overall Event PCR');
  console.log('-'.repeat(80));
  const wrapUp = await generateContextualMessage(
    'post_event_wrap_up',
    {},
    {
      contractor: {
        first_name: 'Mike'
      }
    }
  );
  console.log(`📱 Message: "${wrapUp}"`);
  console.log(`📊 Length: ${wrapUp.length} chars`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ All tests complete!');
  console.log('\n💡 Review the messages above to see if they have the right:');
  console.log('   - Tone: Casual, knowledgeable buddy (not corporate)');
  console.log('   - Length: Under 160 characters for SMS');
  console.log('   - Context: Aware of check-in status, visited booths, timing');
  console.log('   - Personality: Touch of wit/humor but action-oriented');
}

// Run tests
testMessages()
  .then(() => {
    console.log('\n✅ Test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  });
