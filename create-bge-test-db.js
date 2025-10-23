/**
 * Create Business Growth Expo test event using direct database insertion
 * Uses quick-db.bat for all database operations
 */

const { execSync } = require('child_process');
const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';
let ADMIN_TOKEN = '';

function runQuery(sql) {
  console.log(`   Executing: ${sql.substring(0, 60)}...`);
  try {
    const result = execSync(`".\\quick-db.bat" "${sql}"`, {
      encoding: 'utf8',
      shell: 'cmd.exe'
    });
    return result;
  } catch (error) {
    console.error('Query error:', error.stderr || error.message);
    throw error;
  }
}

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

  const sql = "INSERT INTO events (name, date, location, registration_deadline, is_active, agenda_status) VALUES ('Business Growth Expo 2025', '2025-10-20', 'Dallas Convention Center', '2025-10-19', true, 'pending') RETURNING id;";

  const result = runQuery(sql);

  // Parse the event ID from the result
  const match = result.match(/\d+/);
  const eventId = match ? parseInt(match[0]) : null;

  if (!eventId) {
    throw new Error('Failed to get event ID from database');
  }

  console.log(`✅ Event created with ID: ${eventId}\n`);
  return eventId;
}

async function addEventDayTiming(eventId) {
  console.log('⏰ Adding event day timing (accelerated: starts in 10 minutes)...');

  // Calculate event start time (10 minutes from now, matching agenda generation)
  const eventStartTime = new Date(Date.now() + (10 * 60 * 1000));
  const eventEndTime = new Date(eventStartTime.getTime() + (18 * 60 * 1000)); // 18 minutes later (accelerated for fast testing)

  // Format date and time for PostgreSQL
  const eventDate = eventStartTime.toISOString().split('T')[0]; // YYYY-MM-DD
  const startTimeStr = eventStartTime.toTimeString().split(' ')[0]; // HH:MM:SS
  const endTimeStr = eventEndTime.toTimeString().split(' ')[0]; // HH:MM:SS

  const sql = `INSERT INTO event_days (event_id, day_date, start_time, end_time, notes) VALUES (${eventId}, '${eventDate}', '${startTimeStr}', '${endTimeStr}', 'Accelerated test event - single day');`;

  runQuery(sql);

  console.log(`  ✅ Event timing set:`);
  console.log(`     Date: ${eventDate}`);
  console.log(`     Start: ${startTimeStr}`);
  console.log(`     End: ${endTimeStr}`);
  console.log(`     Duration: 18 minutes (accelerated for fast testing)`);
  console.log(`     (Event starts in ~10 minutes)\n`);
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
      offset_minutes: 16,
      focus_areas: '[\"business_development\", \"sales_growth\", \"operational_efficiency\"]'
    },
    {
      name: 'Sydney Rosenthal',
      title: 'Insurance Risk Analyst',
      company: 'GAF',
      bio: 'Insurance and risk management expert for roofing contractors',
      session_title: 'GAF\'s Insurance Forecast: Risks and Opportunities 2025-2026',
      session_description: 'Get ahead of the insurance curve with expert forecast and strategies. Understand upcoming policy changes, coverage trends, and how to position your business for maximum profitability in storm work.',
      offset_minutes: 23,
      focus_areas: '[\"business_development\", \"sales_growth\", \"operational_efficiency\"]'
    },
    {
      name: 'Andy K',
      title: 'Retail Growth Specialist',
      company: 'James Hardie',
      bio: 'Marketing and sales growth expert for retail contractors',
      session_title: 'Retail Growth Playbook: Sales and Marketing That Work',
      session_description: 'Stop wasting money on marketing. Learn proven tactics that generate real ROI. Andy reveals the exact playbook he uses to help contractors dominate their retail markets without burning cash.',
      offset_minutes: 28,
      focus_areas: '[\"business_development\", \"sales_growth\", \"operational_efficiency\"]'
    },
    {
      name: 'Anthony Marino',
      title: 'Commercial Solutions Architect',
      company: 'CertainTeed',
      bio: 'Expert in helping residential contractors expand into commercial markets',
      session_title: 'Explore New Income Opportunities with CertainTeed Commercial Products',
      session_description: 'Unlock new revenue streams. Learn how residential contractors expand into commercial markets. Anthony shares the complete roadmap including certifications, bidding, and relationship-building strategies.',
      offset_minutes: 35,
      focus_areas: '[\"business_development\", \"sales_growth\", \"operational_efficiency\"]'
    }
  ];

  for (const speaker of speakers) {
    // Temporarily use NULL for JSON fields to avoid quoting issues - can update later
    const sql = `INSERT INTO event_speakers (event_id, name, title, company, bio, session_title, session_description, session_time, session_duration_minutes) VALUES (${eventId}, '${speaker.name.replace(/'/g, "''")}', '${speaker.title.replace(/'/g, "''")}', '${speaker.company.replace(/'/g, "''")}', '${speaker.bio.replace(/'/g, "''")}', '${speaker.session_title.replace(/'/g, "''")}', '${speaker.session_description.replace(/'/g, "''")}', NOW() + INTERVAL '${speaker.offset_minutes} minutes', 2);`;

    runQuery(sql);
    console.log(`  ✅ Added speaker: ${speaker.name}`);
  }
  console.log('');
}

async function addSponsors(eventId) {
  console.log('🏢 Adding 4 sponsors...');

  const sponsors = [
    {
      sponsor_name: 'CertainTeed',
      sponsor_tier: 'Gold',
      booth_number: 'B-101',
      booth_location: 'Main Expo Hall - East Wing',
      focus_areas_served: '[\"business_development\", \"sales_growth\", \"operational_efficiency\"]',
      talking_points: 'Commercial product expansion opportunities, Residential to commercial transition strategies, New income streams for contractors',
      special_offers: 'Free commercial product samples, 15% discount on first commercial order, Free consultation on commercial opportunities'
    },
    {
      sponsor_name: 'Westlake Royal Building Products',
      sponsor_tier: 'Platinum',
      booth_number: 'B-102',
      booth_location: 'Main Expo Hall - East Wing',
      focus_areas_served: '[\"business_development\", \"sales_growth\", \"operational_efficiency\"]',
      talking_points: 'Exterior building products, Siding and trim solutions, Business growth methodology, Grit to Gold success framework',
      special_offers: 'Product sample kits, Free business assessment, Exclusive dealer pricing for attendees, Free Grit to Gold workbook'
    },
    {
      sponsor_name: 'James Hardie',
      sponsor_tier: 'Platinum',
      booth_number: 'B-103',
      booth_location: 'Main Expo Hall - Center',
      focus_areas_served: '[\"business_development\", \"sales_growth\", \"operational_efficiency\"]',
      talking_points: 'Fiber cement siding solutions, Retail growth strategies, Marketing that delivers ROI, Co-op advertising programs',
      special_offers: 'Free contractor marketing toolkit, Product display samples, Co-op advertising opportunities, Retail growth playbook download'
    },
    {
      sponsor_name: 'GAF',
      sponsor_tier: 'Gold',
      booth_number: 'B-104',
      booth_location: 'Main Expo Hall - West Wing',
      focus_areas_served: '[\"business_development\", \"sales_growth\", \"operational_efficiency\"]',
      talking_points: 'Roofing systems, Insurance forecast insights, Storm restoration strategies, CARE certification benefits',
      special_offers: 'Free insurance guide 2025-2026, GAF certification discounts, Contractor resource pack, Storm restoration checklist'
    }
  ];

  for (const sponsor of sponsors) {
    // Temporarily skip JSON fields to avoid quoting issues - can update later
    const sql = `INSERT INTO event_sponsors (event_id, sponsor_name, sponsor_tier, booth_number, booth_location, talking_points, special_offers) VALUES (${eventId}, '${sponsor.sponsor_name.replace(/'/g, "''")}', '${sponsor.sponsor_tier}', '${sponsor.booth_number}', '${sponsor.booth_location.replace(/'/g, "''")}', '${sponsor.talking_points.replace(/'/g, "''")}', '${sponsor.special_offers.replace(/'/g, "''")}');`;

    runQuery(sql);
    console.log(`  ✅ Added sponsor: ${sponsor.sponsor_name}`);
  }
  console.log('');
}

async function registerContractor(eventId) {
  console.log('👤 Registering zeek@power100.io for event...');

  const response = await axios.post(`${API_BASE}/event-messaging/event/${eventId}/register`, {
    email: 'zeek@power100.io',
    phone: '+12814607827',
    first_name: 'Zeek',
    last_name: 'Test',
    sms_opt_in: true,
    email_opt_in: true
  }, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
  });

  console.log('✅ Contractor registered successfully');
  console.log(`   Response: ${response.data.success?.length || 0} successful, ${response.data.failed?.length || 0} failed\n`);
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
  console.log(`   - Sponsor batch check: ${response.data.sponsor_batch_check_count || 0} messages`);
  console.log(`   - Overall event PCR: ${response.data.overall_event_pcr_count || 0} messages\n`);

  return response.data;
}

async function main() {
  try {
    console.log('🚀 Starting Full Business Growth Expo Test\n');
    console.log('=' .repeat(60));
    console.log('');

    await login();
    const eventId = await createEvent();
    await addEventDayTiming(eventId);  // Add precise event timing (NEW!)
    await addSpeakers(eventId);
    await addSponsors(eventId);
    const agendaResult = await generateAgenda(eventId);
    await registerContractor(eventId);  // Register AFTER agenda generation

    console.log('=' .repeat(60));
    console.log('\n✅ FULL TEST SETUP COMPLETE!');
    console.log(`\n📱 Event ID: ${eventId}`);
    console.log(`👤 Test Contractor: zeek@power100.io (ID: 56)`);
    console.log(`\n⏰ Event Timeline:`);
    console.log(`   - Event starts: ~10 minutes from now`);
    console.log(`   - Event duration: 18 minutes (accelerated)`);
    console.log(`   - Total test time: ~28 minutes from now`);
    console.log(`\n🤖 AUTOMATIC ORCHESTRATION (no manual triggering needed):`);
    console.log(`   1. Check-in reminders (2 min from now - uses event_days timing!)`);
    console.log(`   2. Speaker alerts (1 min before each session - 4 speakers)`);
    console.log(`   3. Sponsor recommendations (2 min after breaks - 3 recommendations)`);
    console.log(`   4. PCR requests (7 min after sessions - 4 sessions)`);
    console.log(`   5. Sponsor batch check (end of day)`);
    console.log(`   6. Overall event PCR (1 hour after event ends)`);
    console.log(`\n📊 Monitor progress at:`);
    console.log(`   - Dashboard: http://localhost:3002/events/${eventId}/dashboard?contractor=56`);
    console.log(`   - Agenda: http://localhost:3002/events/${eventId}/agenda?contractor=56`);
    console.log(`\n💬 Watch for SMS messages on zeek@power100.io's phone number`);

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.stack) {
      console.error('\nStack:', error.response.data.stack);
    }
    process.exit(1);
  }
}

main();
