const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: 'TPXP0stgres!!',
  database: 'tpedb',
  port: 5432
});

async function applyPodcastTriggers() {
  const client = await pool.connect();

  try {
    console.log('🎙️ Setting up podcast AI processing triggers...\n');

    // Create function to mark podcasts as pending when RSS or YouTube URL is added/updated
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION mark_podcast_pending()
      RETURNS trigger AS $$
      BEGIN
        -- When RSS feed URL OR YouTube URL is added or changed, mark for AI processing
        IF (TG_OP = 'INSERT' AND (NEW.rss_feed_url IS NOT NULL OR NEW.youtube_url IS NOT NULL)) OR
           (TG_OP = 'UPDATE' AND
            ((NEW.rss_feed_url IS DISTINCT FROM OLD.rss_feed_url AND NEW.rss_feed_url IS NOT NULL) OR
             (NEW.youtube_url IS DISTINCT FROM OLD.youtube_url AND NEW.youtube_url IS NOT NULL))) THEN

          -- Set the processing status to pending
          NEW.ai_processing_status = 'pending';
          NEW.last_ai_analysis = NULL;

        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    await client.query(createFunctionSQL);
    console.log('✅ Created mark_podcast_pending() function');

    // Drop existing trigger if it exists
    await client.query('DROP TRIGGER IF EXISTS podcast_rss_added ON podcasts');

    // Create trigger for new/updated RSS feeds
    const createTriggerSQL = `
      CREATE TRIGGER podcast_rss_added
      BEFORE INSERT OR UPDATE ON podcasts
      FOR EACH ROW
      EXECUTE FUNCTION mark_podcast_pending();
    `;

    await client.query(createTriggerSQL);
    console.log('✅ Created trigger: podcast_rss_added');

    // Create notification trigger for processing
    const createNotifyFunctionSQL = `
      CREATE OR REPLACE FUNCTION notify_podcast_pending()
      RETURNS trigger AS $$
      BEGIN
        -- Notify when a podcast is marked as pending
        IF NEW.ai_processing_status = 'pending' AND
           (OLD.ai_processing_status IS NULL OR OLD.ai_processing_status != 'pending') THEN

          PERFORM pg_notify('podcast_pending', json_build_object(
            'podcast_id', NEW.id,
            'rss_feed_url', NEW.rss_feed_url,
            'youtube_url', NEW.youtube_url,
            'title', NEW.title
          )::text);

        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;

    await client.query(createNotifyFunctionSQL);
    console.log('✅ Created notify_podcast_pending() function');

    // Drop and create notification trigger
    await client.query('DROP TRIGGER IF EXISTS podcast_pending_notify ON podcasts');

    const createNotifyTriggerSQL = `
      CREATE TRIGGER podcast_pending_notify
      AFTER INSERT OR UPDATE ON podcasts
      FOR EACH ROW
      EXECUTE FUNCTION notify_podcast_pending();
    `;

    await client.query(createNotifyTriggerSQL);
    console.log('✅ Created trigger: podcast_pending_notify');

    // List all triggers on podcasts table
    const checkTriggers = await client.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE event_object_table = 'podcasts'
    `);

    console.log('\n📋 Active triggers on podcasts table:');
    checkTriggers.rows.forEach(trigger => {
      console.log(`   - ${trigger.trigger_name} (${trigger.event_manipulation})`);
    });

    console.log('\n✨ Podcast AI processing triggers successfully applied!');
    console.log('📝 Podcasts will be marked as pending when RSS feed URL or YouTube URL is added/updated');

  } catch (error) {
    console.error('❌ Error applying triggers:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

applyPodcastTriggers();