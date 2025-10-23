/**
 * Create complete Business Growth Expo test with full orchestration
 *
 * This script:
 * 1. Creates Business Growth Expo event
 * 2. Adds 4 speakers with session details
 * 3. Adds 4 sponsors with booth details
 * 4. Registers zeek@power100.io contractor
 * 5. Triggers generate-agenda (accelerated) to create schedule + automation
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Admin token (get fresh one)
let ADMIN_TOKEN = '';

async function login() {
  console.log('🔐 Logging in as admin...');
  const response = await axios.post(`${API_BASE}/auth/login`, {
    email: 'admin@power100.io',
    password: 'admin123'
  });
  ADMIN_TOKEN = response.data.token;
  console.log('✅ Logged in successfully\n');
}

async function createEvent() {
  console.log('📅 Creating Business Growth Expo 2025 event...');
  const response = await axios.post(`${API_BASE}/events/submit`, {
    name: 'Business Growth Expo 2025',
    date: '2025-10-20',
    location: 'Dallas Convention Center',
    registration_deadline: '2025-10-19',
    is_active: true
  }, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
  });

  const eventId = response.data.id;
  console.log(`✅ Event created with ID: ${eventId}\n`);
  return eventId;
}

async function addSpeakers(eventId) {
  console.log('🎤 Adding 4 speakers...');

  const speakers = [
    {
      name: 'Paul B',
      title: 'Business Development Manager',
      company: 'Westlake Royal Building Products',
      bio: 'Business development expert specializing in contractor growth strategies',
      session_title: 'The Grit to Gold Success Process',
      session_description: 'Transform your business challenges into golden opportunities with proven strategies. Learn Paul\'s battle-tested framework for turning adversity into advantage, featuring real contractor success stories.',
      session_time: new Date(Date.now() + (16 * 60 * 1000)).toISOString(), // 16 min from now
      session_duration_minutes: 2,
      focus_areas: JSON.stringify(['business_development', 'sales_growth', 'operational_efficiency'])
    },
    {
      name: 'Sydney Rosenthal',
      title: 'Insurance Risk Analyst',
      company: 'GAF',
      bio: 'Insurance and risk management expert for roofing contractors',
      session_title: 'GAF\'s Insurance Forecast: Risks and Opportunities 2025-2026',
      session_description: 'Get ahead of the insurance curve with expert forecast and strategies. Understand upcoming policy changes, coverage trends, and how to position your business for maximum profitability in storm work.',
      session_time: new Date(Date.now() + (23 * 60 * 1000)).toISOString(), // 23 min from now
      session_duration_minutes: 2,
      focus_areas: JSON.stringify(['business_development', 'sales_growth', 'operational_efficiency'])
    },
    {
      name: 'Andy K',
      title: 'Retail Growth Specialist',
      company: 'James Hardie',
      bio: 'Marketing and sales growth expert for retail contractors',
      session_title: 'Retail Growth Playbook: Sales and Marketing That Work',
      session_description: 'Stop wasting money on marketing. Learn proven tactics that generate real ROI. Andy reveals the exact playbook he uses to help contractors dominate their retail markets without burning cash.',
      session_time: new Date(Date.now() + (28 * 60 * 1000)).toISOString(), // 28 min from now
      session_duration_minutes: 2,
      focus_areas: JSON.stringify(['business_development', 'sales_growth', 'operational_efficiency'])
    },
    {
      name: 'Anthony Marino',
      title: 'Commercial Solutions Architect',
      company: 'CertainTeed',
      bio: 'Expert in helping residential contractors expand into commercial markets',
      session_title: 'Explore New Income Opportunities with CertainTeed Commercial Products',
      session_description: 'Unlock new revenue streams. Learn how residential contractors expand into commercial markets. Anthony shares the complete roadmap including certifications, bidding, and relationship-building strategies.',
      session_time: new Date(Date.now() + (35 * 60 * 1000)).toISOString(), // 35 min from now
      session_duration_minutes: 2,
      focus_areas: JSON.stringify(['business_development', 'sales_growth', 'operational_efficiency'])
    }
  ];

  for (const speaker of speakers) {
    await axios.post(`${API_BASE}/event-speakers`, {
      event_id: eventId,
      ...speaker
    }, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    console.log(`  ✅ Added speaker: ${speaker.name}`);
  }
  console.log('');
}

async function addSponsors(eventId) {
  console.log('🏢 Adding 4 sponsors...');

  const sponsors = [
    {
      event_id: eventId,
      sponsor_name: 'CertainTeed',
      sponsor_tier: 'Gold',
      booth_number: 'B-101',
      booth_location: 'Main Expo Hall - East Wing',
      focus_areas_served: JSON.stringify(['business_development', 'sales_growth', 'operational_efficiency']),
      talking_points: 'Commercial product expansion opportunities, Residential to commercial transition strategies, New income streams for contractors',
      special_offers: 'Free commercial product samples, 15% discount on first commercial order, Free consultation on commercial opportunities'
    },
    {
      event_id: eventId,
      sponsor_name: 'Westlake Royal Building Products',
      sponsor_tier: 'Platinum',
      booth_number: 'B-102',
      booth_location: 'Main Expo Hall - East Wing',
      focus_areas_served: JSON.stringify(['business_development', 'sales_growth', 'operational_efficiency']),
      talking_points: 'Exterior building products, Siding and trim solutions, Business growth methodology, Grit to Gold success framework',
      special_offers: 'Product sample kits, Free business assessment, Exclusive dealer pricing for attendees, Free Grit to Gold workbook'
    },
    {
      event_id: eventId,
      sponsor_name: 'James Hardie',
      sponsor_tier: 'Platinum',
      booth_number: 'B-103',
      booth_location: 'Main Expo Hall - Center',
      focus_areas_served: JSON.stringify(['business_development', 'sales_growth', 'operational_efficiency']),
      talking_points: 'Fiber cement siding solutions, Retail growth strategies, Marketing that delivers ROI, Co-op advertising programs',
      special_offers: 'Free contractor marketing toolkit, Product display samples, Co-op advertising opportunities, Retail growth playbook download'
    },
    {
      event_id: eventId,
      sponsor_name: 'GAF',
      sponsor_tier: 'Gold',
      booth_number: 'B-104',
      booth_location: 'Main Expo Hall - West Wing',
      focus_areas_served: JSON.stringify(['business_development', 'sales_growth', 'operational_efficiency']),
      talking_points: 'Roofing systems, Insurance forecast insights, Storm restoration strategies, CARE certification benefits',
      special_offers: 'Free insurance guide 2025-2026, GAF certification discounts, Contractor resource pack, Storm restoration checklist'
    }
  ];

  for (const sponsor of sponsors) {
    await axios.post(`${API_BASE}/event-sponsors`, sponsor, {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    console.log(`  ✅ Added sponsor: ${sponsor.sponsor_name}`);
  }
  console.log('');
}

async function registerContractor(eventId) {
  console.log('👤 Registering zeek@power100.io for event...');

  const response = await axios.post(`${API_BASE}/event-messaging/event/${eventId}/register`, {
    contractor_id: 56,
    sms_opt_in: true,
    email_opt_in: true
  }, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
  });

  console.log('✅ Contractor registered successfully\n');
  return response.data;
}

async function generateAgenda(eventId) {
  console.log('🤖 Generating event agenda (ACCELERATED MODE)...');
  console.log('   This will:');
  console.log('   - Create complete event schedule in event_agenda_items');
  console.log('   - Schedule ALL orchestration messages:');
  console.log('     ✓ Check-in reminders (2 min, 1 min before, at start)');
  console.log('     ✓ Speaker alerts (15 min before each session)');
  console.log('     ✓ Sponsor recommendations (2 min after breaks)');
  console.log('     ✓ PCR requests (7 min after sessions)');
  console.log('     ✓ Peer matching (15 min before lunch)');
  console.log('     ✓ End-of-day sponsor check');
  console.log('     ✓ Overall event PCR\n');

  const response = await axios.post(`${API_BASE}/events/${eventId}/generate-agenda`, {
    accelerated: true
  }, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
  });

  console.log('✅ Agenda generation complete!\n');
  console.log('📊 Results:');
  console.log(`   - Agenda items created: ${response.data.agenda_items?.length || 0}`);
  console.log(`   - Check-in reminders: ${response.data.check_in_reminders_count || 0} messages for ${response.data.check_in_reminders_attendees || 0} attendees`);
  console.log(`   - Speaker alerts: ${response.data.speaker_alerts_count || 0} messages`);
  console.log(`   - Sponsor recommendations: ${response.data.sponsor_recs_count || 0} messages`);
  console.log(`   - PCR requests: ${response.data.pcr_requests_count || 0} messages`);
  console.log(`   - Sponsor batch check: ${response.data.sponsor_batch_check_count || 0} at ${response.data.sponsor_batch_check_time}`);
  console.log(`   - Overall event PCR: ${response.data.overall_event_pcr_count || 0} at ${response.data.overall_event_pcr_time}\n`);

  return response.data;
}

async function main() {
  try {
    console.log('🚀 Starting Full Business Growth Expo Test\n');
    console.log('=' .repeat(60));
    console.log('');

    await login();
    const eventId = await createEvent();
    await addSpeakers(eventId);
    await addSponsors(eventId);
    await registerContractor(eventId);
    const agendaResult = await generateAgenda(eventId);

    console.log('=' .repeat(60));
    console.log('\n✅ FULL TEST SETUP COMPLETE!');
    console.log(`\n📱 Event ID: ${eventId}`);
    console.log(`👤 Test Contractor: zeek@power100.io (ID: 56)`);
    console.log(`📞 Phone: Check database for registered phone number`);
    console.log(`\n⏰ Event starts in ~10 minutes`);
    console.log(`\n🎯 Watch for orchestration messages:`);
    console.log(`   1. Check-in reminders (should arrive in ~2 minutes)`);
    console.log(`   2. Speaker alerts (15 min before each session)`);
    console.log(`   3. Sponsor recommendations (during breaks)`);
    console.log(`   4. PCR requests (7 min after sessions)`);
    console.log(`\n📊 Monitor progress at:`);
    console.log(`   - http://localhost:3002/events/${eventId}/dashboard?contractor=56`);
    console.log(`   - http://localhost:3002/events/${eventId}/agenda?contractor=56`);

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.stack) {
      console.error('\nStack:', error.response.data.stack);
    }
    process.exit(1);
  }
}

main();
