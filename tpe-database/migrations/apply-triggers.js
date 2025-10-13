const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tpedb',
  user: 'postgres',
  password: 'TPXP0stgres!!'
});

async function applyTriggers() {
  const client = await pool.connect();

  try {
    console.log('Creating notify_event_refresh function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION notify_event_refresh()
      RETURNS TRIGGER AS $$
      BEGIN
        PERFORM pg_notify('event_refresh', COALESCE(NEW.event_id::text, OLD.event_id::text));
        RETURN COALESCE(NEW, OLD);
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Function created');

    console.log('Creating trigger on event_speakers...');
    await client.query('DROP TRIGGER IF EXISTS trigger_event_speakers_refresh ON event_speakers');
    await client.query(`
      CREATE TRIGGER trigger_event_speakers_refresh
      AFTER INSERT OR UPDATE OR DELETE ON event_speakers
      FOR EACH ROW
      EXECUTE FUNCTION notify_event_refresh();
    `);
    console.log('✅ Trigger on event_speakers created');

    console.log('Creating trigger on event_attendees...');
    await client.query('DROP TRIGGER IF EXISTS trigger_event_attendees_refresh ON event_attendees');
    await client.query(`
      CREATE TRIGGER trigger_event_attendees_refresh
      AFTER INSERT OR UPDATE OR DELETE ON event_attendees
      FOR EACH ROW
      EXECUTE FUNCTION notify_event_refresh();
    `);
    console.log('✅ Trigger on event_attendees created');

    console.log('\n✅ All triggers created successfully!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

applyTriggers();
