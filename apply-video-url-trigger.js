const { Client } = require('pg');
const axios = require('axios');

// Database configuration (local development)
const dbConfig = {
  host: 'localhost',
  database: 'tpedb',
  user: 'postgres',
  password: 'TPXP0stgres!!',
  port: 5432
};

async function applyVideoUrlTrigger() {
  console.log('🎥 APPLYING VIDEO URL AUTO-ANALYSIS TRIGGER\n');
  console.log('=' .repeat(60));

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Create the trigger function that calls n8n webhook
    console.log('Step 1: Creating video analysis trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION auto_analyze_video_url()
      RETURNS trigger AS $$
      DECLARE
        should_analyze boolean := false;
      BEGIN
        -- Check if demo_video_url was added or changed
        IF TG_TABLE_NAME = 'partners' OR TG_TABLE_NAME = 'strategic_partners' THEN
          IF (TG_OP = 'INSERT' AND NEW.demo_video_url IS NOT NULL AND NEW.demo_video_url != '') OR
             (TG_OP = 'UPDATE' AND NEW.demo_video_url IS DISTINCT FROM OLD.demo_video_url AND NEW.demo_video_url IS NOT NULL AND NEW.demo_video_url != '') THEN
            should_analyze := true;

            -- Send notification with video URL and partner ID
            PERFORM pg_notify('video_analysis_needed', json_build_object(
              'video_url', NEW.demo_video_url,
              'partner_id', NEW.id,
              'table', TG_TABLE_NAME,
              'operation', TG_OP,
              'triggered_at', NOW()
            )::text);

            RAISE NOTICE 'VIDEO ANALYSIS TRIGGERED: Partner % - URL %', NEW.id, NEW.demo_video_url;
          END IF;
        END IF;

        -- For video_content table
        IF TG_TABLE_NAME = 'video_content' THEN
          IF TG_OP = 'INSERT' AND NEW.file_url IS NOT NULL AND NEW.file_url != '' AND
             (NEW.ai_processing_status IS NULL OR NEW.ai_processing_status = 'pending') THEN

            PERFORM pg_notify('video_analysis_needed', json_build_object(
              'video_url', NEW.file_url,
              'video_id', NEW.id,
              'entity_type', NEW.entity_type,
              'entity_id', NEW.entity_id,
              'table', 'video_content',
              'operation', TG_OP,
              'triggered_at', NOW()
            )::text);

            RAISE NOTICE 'VIDEO ANALYSIS TRIGGERED: Video ID % - URL %', NEW.id, NEW.file_url;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('✅ Video analysis trigger function created\n');

    // Step 2: Apply trigger to partners/strategic_partners table
    console.log('Step 2: Applying trigger to partners table...');

    // Check which table exists
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('partners', 'strategic_partners')
    `);

    const partnerTable = tableCheck.rows[0]?.table_name || 'partners';
    console.log(`   Using table: ${partnerTable}`);

    await client.query(`
      DROP TRIGGER IF EXISTS auto_video_analysis_on_partner ON ${partnerTable} CASCADE;
      CREATE TRIGGER auto_video_analysis_on_partner
      AFTER INSERT OR UPDATE OF demo_video_url
      ON ${partnerTable}
      FOR EACH ROW
      EXECUTE FUNCTION auto_analyze_video_url()
    `);
    console.log(`✅ Trigger applied to ${partnerTable} table\n`);

    // Step 3: Apply trigger to video_content table
    console.log('Step 3: Applying trigger to video_content table...');
    await client.query(`
      DROP TRIGGER IF EXISTS auto_video_analysis_on_content ON video_content CASCADE;
      CREATE TRIGGER auto_video_analysis_on_content
      AFTER INSERT
      ON video_content
      FOR EACH ROW
      EXECUTE FUNCTION auto_analyze_video_url()
    `);
    console.log('✅ Trigger applied to video_content table\n');

    // Step 4: Create a notification listener service
    console.log('Step 4: Creating notification listener (for testing)...');

    // Listen for notifications
    client.on('notification', async (msg) => {
      if (msg.channel === 'video_analysis_needed') {
        const data = JSON.parse(msg.payload);
        console.log('\n🔔 VIDEO ANALYSIS NOTIFICATION RECEIVED:');
        console.log('   Video URL:', data.video_url);
        console.log('   Partner ID:', data.partner_id || data.entity_id);
        console.log('   Triggered from:', data.table);

        // Call n8n webhook
        try {
          console.log('   📡 Calling n8n webhook...');
          const response = await axios.post(
            'http://localhost:5678/webhook/trigger-video-analysis-dev',
            {
              video_url: data.video_url,
              partner_id: data.partner_id || data.entity_id,
              analysis_type: 'demo_analysis'
            },
            { timeout: 60000 }
          );
          console.log('   ✅ n8n webhook called successfully');
        } catch (error) {
          console.error('   ❌ Failed to call n8n webhook:', error.message);
        }
      }
    });

    await client.query('LISTEN video_analysis_needed');
    console.log('✅ Listening for video analysis notifications\n');

    // Step 5: Test the trigger
    console.log('Step 5: Testing trigger with sample update...');

    // Test with a dummy URL update (will rollback)
    await client.query('BEGIN');
    await client.query(`
      UPDATE ${partnerTable}
      SET demo_video_url = 'https://www.youtube.com/watch?v=test_' || id::text
      WHERE id = (SELECT id FROM ${partnerTable} LIMIT 1)
    `);
    await client.query('ROLLBACK');
    console.log('✅ Test completed (rolled back)\n');

    console.log('=' .repeat(60));
    console.log('🎉 VIDEO URL AUTO-ANALYSIS TRIGGERS ACTIVE!');
    console.log('\n✨ What happens now:');
    console.log('   • Partner adds demo_video_url → Auto triggers analysis');
    console.log('   • Video added to video_content → Auto triggers analysis');
    console.log('   • No manual webhook calls needed!');
    console.log('\n📝 Note: For production, create a persistent listener service');
    console.log('=' .repeat(60));

    // Keep listening for 5 seconds to show it works
    setTimeout(() => {
      client.end();
      process.exit(0);
    }, 5000);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

applyVideoUrlTrigger();