const { Pool } = require('pg');

const pool = new Pool({
  host: 'tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com',
  port: 5432,
  database: 'tpedb',
  user: 'tpeadmin',
  password: 'dBP0wer100!!',
  ssl: { rejectUnauthorized: false }
});

async function applyPhase1ToProduction() {
  const client = await pool.connect();

  try {
    console.log('🚀 Applying Phase 1 Migration to PRODUCTION Database');
    console.log('================================================\n');

    // Step 1: Create mv_sessions_now
    console.log('1. Creating mv_sessions_now materialized view...');
    await client.query(`
      DROP MATERIALIZED VIEW IF EXISTS mv_sessions_now;
      CREATE MATERIALIZED VIEW mv_sessions_now AS
      SELECT
        s.id AS session_id,
        s.event_id,
        s.name AS speaker_name,
        s.session_title,
        s.session_time,
        s.session_end,
        s.focus_areas,
        s.session_location,
        s.session_description,
        a.contractor_id,
        e.name AS event_name,
        e.timezone AS event_timezone,
        CASE
          WHEN s.focus_areas::jsonb ?| (
            SELECT array_agg(fa::text)
            FROM jsonb_array_elements_text(c.focus_areas::jsonb) fa
          )
          THEN 100
          ELSE 50
        END AS relevance_score,
        (
          SELECT COUNT(*)
          FROM jsonb_array_elements_text(s.focus_areas::jsonb) AS session_fa
          WHERE session_fa::text = ANY(
            SELECT jsonb_array_elements_text(c.focus_areas::jsonb)::text
          )
        ) AS focus_area_match_count
      FROM event_speakers s
      JOIN event_attendees a ON a.event_id = s.event_id
      JOIN events e ON e.id = s.event_id
      JOIN contractors c ON c.id = a.contractor_id
      WHERE
        (NOW() AT TIME ZONE e.timezone) BETWEEN s.session_time AND s.session_end
        AND s.session_time IS NOT NULL
        AND s.session_end IS NOT NULL;
    `);
    console.log('   ✅ mv_sessions_now created\n');

    // Step 2: Create indexes for mv_sessions_now
    console.log('2. Creating indexes for mv_sessions_now...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_mv_sessions_now_contractor ON mv_sessions_now (contractor_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_mv_sessions_now_event ON mv_sessions_now (event_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_mv_sessions_now_relevance ON mv_sessions_now (contractor_id, relevance_score DESC);');
    console.log('   ✅ Indexes created\n');

    // Step 3: Create mv_sessions_next_60
    console.log('3. Creating mv_sessions_next_60 materialized view...');
    await client.query(`
      DROP MATERIALIZED VIEW IF EXISTS mv_sessions_next_60;
      CREATE MATERIALIZED VIEW mv_sessions_next_60 AS
      SELECT
        s.id AS session_id,
        s.event_id,
        s.name AS speaker_name,
        s.session_title,
        s.session_time,
        s.session_end,
        s.focus_areas,
        s.session_location,
        s.session_description,
        a.contractor_id,
        e.name AS event_name,
        e.timezone AS event_timezone,
        EXTRACT(EPOCH FROM (s.session_time - (NOW() AT TIME ZONE e.timezone))) / 60 AS minutes_until_start,
        (
          SELECT COUNT(*)
          FROM jsonb_array_elements_text(s.focus_areas::jsonb) AS session_fa
          WHERE session_fa::text = ANY(
            SELECT jsonb_array_elements_text(c.focus_areas::jsonb)::text
          )
        ) AS match_count,
        CASE
          WHEN EXTRACT(EPOCH FROM (s.session_time - (NOW() AT TIME ZONE e.timezone))) / 60 < 15 THEN 100
          WHEN EXTRACT(EPOCH FROM (s.session_time - (NOW() AT TIME ZONE e.timezone))) / 60 < 30 THEN 75
          ELSE 50
        END +
        (
          SELECT COUNT(*) * 10
          FROM jsonb_array_elements_text(s.focus_areas::jsonb) AS session_fa
          WHERE session_fa::text = ANY(
            SELECT jsonb_array_elements_text(c.focus_areas::jsonb)::text
          )
        ) AS priority_score
      FROM event_speakers s
      JOIN event_attendees a ON a.event_id = s.event_id
      JOIN events e ON e.id = s.event_id
      JOIN contractors c ON c.id = a.contractor_id
      WHERE
        s.session_time BETWEEN
          (NOW() AT TIME ZONE e.timezone) AND
          (NOW() AT TIME ZONE e.timezone) + INTERVAL '60 minutes'
        AND s.session_time IS NOT NULL
        AND s.session_end IS NOT NULL;
    `);
    console.log('   ✅ mv_sessions_next_60 created\n');

    // Step 4: Create indexes for mv_sessions_next_60
    console.log('4. Creating indexes for mv_sessions_next_60...');
    await client.query('CREATE INDEX IF NOT EXISTS idx_mv_sessions_next_60_contractor ON mv_sessions_next_60 (contractor_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_mv_sessions_next_60_event ON mv_sessions_next_60 (event_id);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_mv_sessions_next_60_priority ON mv_sessions_next_60 (contractor_id, priority_score DESC);');
    await client.query('CREATE INDEX IF NOT EXISTS idx_mv_sessions_next_60_timing ON mv_sessions_next_60 (contractor_id, minutes_until_start);');
    console.log('   ✅ Indexes created\n');

    // Step 5: Create LISTEN/NOTIFY trigger function
    console.log('5. Creating LISTEN/NOTIFY trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION notify_event_refresh()
      RETURNS TRIGGER AS $$
      BEGIN
        PERFORM pg_notify('event_refresh', COALESCE(NEW.event_id::text, OLD.event_id::text));
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('   ✅ Function created\n');

    // Step 6: Create triggers on event_speakers
    console.log('6. Creating trigger on event_speakers...');
    await client.query('DROP TRIGGER IF EXISTS trigger_event_speakers_refresh ON event_speakers;');
    await client.query(`
      CREATE TRIGGER trigger_event_speakers_refresh
      AFTER INSERT OR UPDATE OR DELETE ON event_speakers
      FOR EACH ROW
      EXECUTE FUNCTION notify_event_refresh();
    `);
    console.log('   ✅ Trigger created\n');

    // Step 7: Create triggers on event_attendees
    console.log('7. Creating trigger on event_attendees...');
    await client.query('DROP TRIGGER IF EXISTS trigger_event_attendees_refresh ON event_attendees;');
    await client.query(`
      CREATE TRIGGER trigger_event_attendees_refresh
      AFTER INSERT OR UPDATE OR DELETE ON event_attendees
      FOR EACH ROW
      EXECUTE FUNCTION notify_event_refresh();
    `);
    console.log('   ✅ Trigger created\n');

    // Step 8: Verify views
    console.log('8. Verifying materialized views...');
    const result = await client.query(`
      SELECT 'mv_sessions_now' AS view_name, COUNT(*) AS row_count
      FROM mv_sessions_now
      UNION ALL
      SELECT 'mv_sessions_next_60' AS view_name, COUNT(*) AS row_count
      FROM mv_sessions_next_60;
    `);

    console.log('   View Statistics:');
    result.rows.forEach(row => {
      console.log(`   - ${row.view_name}: ${row.row_count} rows`);
    });

    console.log('\n================================================');
    console.log('✅ Phase 1 Migration Applied Successfully to PRODUCTION!');
    console.log('================================================\n');

  } catch (error) {
    console.error('❌ Error applying Phase 1 migration:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyPhase1ToProduction();
