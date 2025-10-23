/**
 * Create Business Growth Expo Test Event with FULL Details
 * - Accelerated timeline: starts in 8 minutes, ends in 40 minutes
 * - 4 speakers with complete bios and session details
 * - 4 sponsors with booth locations and special offers
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tpedb',
  user: 'postgres',
  password: 'TPXP0stgres!!'
});

async function createTestEvent() {
  const client = await pool.connect();

  try {
    console.log('\n🎯 Creating Business Growth Expo Test Event with FULL details...\n');

    // Calculate accelerated timeline
    const now = new Date();
    const eventStart = new Date(now.getTime() + 8 * 60 * 1000); // NOW + 8 minutes
    const eventEnd = new Date(now.getTime() + 40 * 60 * 1000); // NOW + 40 minutes
    const registrationDeadline = new Date(now.getTime() + 5 * 60 * 1000); // NOW + 5 minutes

    console.log('⏰ Event Timeline (Accelerated):');
    console.log(`   Registration opens: NOW (${now.toLocaleTimeString()})`);
    console.log(`   Registration deadline: ${registrationDeadline.toLocaleTimeString()}`);
    console.log(`   Event starts: ${eventStart.toLocaleTimeString()} (in 8 minutes)`);
    console.log(`   Event ends: ${eventEnd.toLocaleTimeString()} (in 40 minutes)\n`);

    // 1. Create the main event
    const eventResult = await client.query(`
      INSERT INTO events (
        name, date, end_date, registration_deadline, location, description,
        focus_areas_covered, organizer_name, organizer_email, organizer_phone,
        speaker_profiles, agenda_highlights, duration, event_type, status,
        is_active, registration_url, sms_event_code, timezone, format,
        target_audience, topics, expected_attendance
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      ) RETURNING id
    `, [
      'Business Growth Expo: ACCELERATED TEST',
      eventStart.toISOString().split('T')[0],
      eventEnd.toISOString().split('T')[0],
      registrationDeadline.toISOString().split('T')[0],
      'Crowne Plaza Lombard Downers Grove',
      'Join Richards Building Supply for an exclusive business growth expo featuring industry-leading speakers. Lunch provided. THIS IS AN ACCELERATED TEST EVENT.',
      'Sales Growth, CRM Strategy, Insurance Forecasting, Retail Marketing, Commercial Expansion',
      'Richards Building Supply',
      'events@richards-supply.com',
      '630-620-5200',
      '4 industry expert speakers with 75+ years combined experience',
      '4 expert sessions + Sponsor expo hall + Networking lunch',
      '5 hours (accelerated to 32 minutes for testing)',
      'expo',
      'active',
      true,
      'https://tinyurl.com/47usm3a6',
      'BGE-TEST',
      'America/Chicago',
      'In-Person',
      'Building supply contractors, residential contractors looking to expand',
      'CRM Strategy, Sales Growth, Insurance Forecasting, Retail Marketing, Commercial Opportunities',
      '75-100 contractors'
    ]);

    const eventId = eventResult.rows[0].id;
    console.log(`✅ Event created successfully! Event ID: ${eventId}\n`);

    // 2. Create speakers with session times spread across the event
    const sessionStart1 = new Date(eventStart.getTime() + 5 * 60 * 1000); // +5 min from start
    const sessionStart2 = new Date(eventStart.getTime() + 12 * 60 * 1000); // +12 min from start
    const sessionStart3 = new Date(eventStart.getTime() + 19 * 60 * 1000); // +19 min from start
    const sessionStart4 = new Date(eventStart.getTime() + 26 * 60 * 1000); // +26 min from start

    const speakers = [
      {
        name: 'Paul B',
        title: 'Business Development Manager',
        company: 'Westlake Royal Building Products',
        bio: 'Paul brings over 20 years of experience in building products sales and business development. He has helped hundreds of contractors scale their businesses through strategic partnerships and operational excellence.',
        session_title: 'The Grit to Gold Success Process',
        session_description: 'Transform your business challenges into golden opportunities with proven strategies. Learn Paul\'s battle-tested framework for turning adversity into advantage, featuring real contractor success stories.',
        session_time: sessionStart1,
        duration: 7 // accelerated from 45 minutes
      },
      {
        name: 'Sydney Rosenthal',
        title: 'CARE Storm Restoration Instructor',
        company: 'GAF',
        bio: 'CARE Storm Restoration instructor with 18 years of roofing and insurance expertise. Sydney is recognized nationally as a leading voice in insurance claims strategy and storm restoration best practices.',
        session_title: 'GAF\'s Insurance Forecast: Risks and Opportunities 2025-2026',
        session_description: 'Get ahead of the insurance curve with expert forecast and strategies. Understand upcoming policy changes, coverage trends, and how to position your business for maximum profitability in storm work.',
        session_time: sessionStart2,
        duration: 7
      },
      {
        name: 'Andy K',
        title: 'Retail Growth Specialist',
        company: 'James Hardie',
        bio: 'Industry favorite with 20 years in Construction Management and Finance, specializing in retail growth. Andy has generated over $50M in new retail business for contractor partners through innovative marketing strategies.',
        session_title: 'Retail Growth Playbook: Sales and Marketing That Work',
        session_description: 'Stop wasting money on marketing. Learn proven tactics that generate real ROI. Andy reveals the exact playbook he uses to help contractors dominate their retail markets without burning cash.',
        session_time: sessionStart3,
        duration: 7
      },
      {
        name: 'Anthony Marino',
        title: 'Commercial Solutions Architect',
        company: 'CertainTeed',
        bio: 'Architect specializing in commercial opportunities for residential contractors with a decade of experience. Anthony has helped over 200 residential contractors successfully transition into lucrative commercial work.',
        session_title: 'Explore New Income Opportunities with CertainTeed Commercial Products',
        session_description: 'Unlock new revenue streams. Learn how residential contractors expand into commercial markets. Anthony shares the complete roadmap including certifications, bidding, and relationship-building strategies.',
        session_time: sessionStart4,
        duration: 7
      }
    ];

    console.log('👥 Creating speakers...');
    for (const speaker of speakers) {
      const sessionEnd = new Date(speaker.session_time.getTime() + speaker.duration * 60 * 1000);

      await client.query(`
        INSERT INTO event_speakers (
          event_id, name, title, company, bio,
          session_title, session_description, session_time, session_end,
          session_duration_minutes, focus_areas, target_audience
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        eventId,
        speaker.name,
        speaker.title,
        speaker.company,
        speaker.bio,
        speaker.session_title,
        speaker.session_description,
        speaker.session_time,
        sessionEnd,
        speaker.duration,
        JSON.stringify(['business_development', 'sales_growth', 'operational_efficiency']),
        JSON.stringify(['residential_contractors', 'building_supply_contractors'])
      ]);

      console.log(`   ✓ ${speaker.name} - ${speaker.session_title}`);
      console.log(`     Session: ${speaker.session_time.toLocaleTimeString()}`);
    }

    // 3. Create sponsors with full booth details
    const sponsors = [
      {
        sponsor_name: 'CertainTeed',
        sponsor_tier: 'platinum',
        booth_number: 'B-101',
        booth_location: 'Main Expo Hall - East Wing',
        talking_points: 'Commercial product expansion opportunities, Residential to commercial transition strategies, New income streams for contractors',
        special_offers: 'Free commercial product samples, 15% discount on first commercial order, Free consultation on commercial opportunities',
        activation_type: 'booth + presentation'
      },
      {
        sponsor_name: 'Westlake Royal Building Products',
        sponsor_tier: 'platinum',
        booth_number: 'B-102',
        booth_location: 'Main Expo Hall - East Wing',
        talking_points: 'Exterior building products, Siding and trim solutions, Business growth methodology, Grit to Gold success framework',
        special_offers: 'Product sample kits, Free business assessment, Exclusive dealer pricing for attendees, Free Grit to Gold workbook',
        activation_type: 'booth + presentation'
      },
      {
        sponsor_name: 'James Hardie',
        sponsor_tier: 'platinum',
        booth_number: 'B-103',
        booth_location: 'Main Expo Hall - Center',
        talking_points: 'Fiber cement siding solutions, Retail growth strategies, Marketing that delivers ROI, Co-op advertising programs',
        special_offers: 'Free contractor marketing toolkit, Product display samples, Co-op advertising opportunities, Retail growth playbook download',
        activation_type: 'booth + presentation'
      },
      {
        sponsor_name: 'GAF',
        sponsor_tier: 'platinum',
        booth_number: 'B-104',
        booth_location: 'Main Expo Hall - West Wing',
        talking_points: 'Roofing systems, Insurance forecast insights, Storm restoration strategies, CARE certification benefits',
        special_offers: 'Free insurance guide 2025-2026, GAF certification discounts, Contractor resource pack, Storm restoration checklist',
        activation_type: 'booth + presentation'
      }
    ];

    console.log('\n🏢 Creating sponsors...');
    for (const sponsor of sponsors) {
      await client.query(`
        INSERT INTO event_sponsors (
          event_id, sponsor_name, sponsor_tier, booth_number, booth_location,
          talking_points, special_offers, activation_type, focus_areas_served,
          target_contractor_profile
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        eventId,
        sponsor.sponsor_name,
        sponsor.sponsor_tier,
        sponsor.booth_number,
        sponsor.booth_location,
        sponsor.talking_points,
        sponsor.special_offers,
        sponsor.activation_type,
        JSON.stringify(['business_development', 'sales_growth', 'operational_efficiency']),
        JSON.stringify({ revenue: ['$1M-$5M', '$5M-$10M', '$10M+'], team_size: ['5-20', '20-50', '50+'] })
      ]);

      console.log(`   ✓ ${sponsor.sponsor_name} - ${sponsor.booth_number}`);
      console.log(`     ${sponsor.booth_location}`);
    }

    console.log('\n✨ Test event created successfully!\n');
    console.log('📋 Summary:');
    console.log(`   Event ID: ${eventId}`);
    console.log(`   Event Name: Business Growth Expo: ACCELERATED TEST`);
    console.log(`   Speakers: 4 with full bios and session details`);
    console.log(`   Sponsors: 4 with booth locations and special offers`);
    console.log(`   Timeline: Accelerated (32 minutes total)`);
    console.log(`   SMS Code: BGE-TEST`);
    console.log(`\n🎯 Ready for contractor registration and full orchestration testing!\n`);

    return eventId;

  } catch (error) {
    console.error('❌ Error creating test event:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createTestEvent()
  .then(eventId => {
    console.log(`✅ Complete! Event ID: ${eventId}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
