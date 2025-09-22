const { Client } = require('pg');

// Database configuration (local development)
const dbConfig = {
  host: 'localhost',
  database: 'tpedb',
  user: 'postgres',
  password: 'TPXP0stgres!!',
  port: 5432
};

async function applyVideoPendingTrigger() {
  console.log('🎥 APPLYING VIDEO PENDING STATUS TRIGGER\n');
  console.log('=' .repeat(60));

  const client = new Client(dbConfig);

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Create trigger function that marks videos as pending
    console.log('Step 1: Creating mark_video_pending function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION mark_video_pending()
      RETURNS trigger AS $$
      BEGIN
        -- For partners table: when demo_video_url is added/changed
        IF TG_TABLE_NAME = 'partners' OR TG_TABLE_NAME = 'strategic_partners' THEN
          IF (TG_OP = 'INSERT' AND NEW.demo_video_url IS NOT NULL AND NEW.demo_video_url != '') OR
             (TG_OP = 'UPDATE' AND NEW.demo_video_url IS DISTINCT FROM OLD.demo_video_url AND NEW.demo_video_url IS NOT NULL AND NEW.demo_video_url != '') THEN

            -- Check if video already exists in video_content
            IF NOT EXISTS (
              SELECT 1 FROM video_content
              WHERE file_url = NEW.demo_video_url
              AND entity_type = 'partner'
              AND entity_id = NEW.id
            ) THEN
              -- Insert new video_content record with pending status
              INSERT INTO video_content (
                entity_type, entity_id, video_type, title,
                file_url, ai_processing_status, created_at, updated_at
              ) VALUES (
                'partner', NEW.id, 'demo',
                'Partner Demo - ' || COALESCE(NEW.company_name, 'Unknown'),
                NEW.demo_video_url, 'pending', NOW(), NOW()
              );

              RAISE NOTICE 'VIDEO MARKED PENDING: Partner % - URL %', NEW.id, NEW.demo_video_url;
            ELSE
              -- Update existing record to pending if not already processed
              UPDATE video_content
              SET ai_processing_status = 'pending', updated_at = NOW()
              WHERE file_url = NEW.demo_video_url
              AND entity_type = 'partner'
              AND entity_id = NEW.id
              AND (ai_processing_status IS NULL OR ai_processing_status = 'failed');

              RAISE NOTICE 'VIDEO RE-MARKED PENDING: Partner % - URL %', NEW.id, NEW.demo_video_url;
            END IF;
          END IF;
        END IF;

        -- For video_content table: new videos start as pending
        IF TG_TABLE_NAME = 'video_content' THEN
          IF NEW.ai_processing_status IS NULL THEN
            NEW.ai_processing_status := 'pending';
            RAISE NOTICE 'NEW VIDEO MARKED PENDING: ID % - URL %', NEW.id, NEW.file_url;
          END IF;
        END IF;

        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('✅ mark_video_pending function created\n');

    // Step 2: Apply trigger to partners table
    console.log('Step 2: Applying trigger to partners table...');

    // Check which table exists
    const tableCheck = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('partners', 'strategic_partners')
    `);

    const partnerTable = tableCheck.rows[0]?.table_name || 'partners';
    console.log(`   Using table: ${partnerTable}`);

    // Drop old triggers
    await client.query(`
      DROP TRIGGER IF EXISTS auto_video_analysis_on_partner ON ${partnerTable} CASCADE;
      DROP TRIGGER IF EXISTS mark_video_pending_on_partner ON ${partnerTable} CASCADE;
    `);

    // Create new trigger
    await client.query(`
      CREATE TRIGGER mark_video_pending_on_partner
      AFTER INSERT OR UPDATE OF demo_video_url
      ON ${partnerTable}
      FOR EACH ROW
      EXECUTE FUNCTION mark_video_pending()
    `);
    console.log(`✅ Trigger applied to ${partnerTable} table\n`);

    // Step 3: Apply trigger to video_content table
    console.log('Step 3: Applying trigger to video_content table...');

    // Drop old triggers
    await client.query(`
      DROP TRIGGER IF EXISTS auto_video_analysis_on_content ON video_content CASCADE;
      DROP TRIGGER IF EXISTS mark_video_pending_on_content ON video_content CASCADE;
    `);

    // Create new trigger
    await client.query(`
      CREATE TRIGGER mark_video_pending_on_content
      BEFORE INSERT
      ON video_content
      FOR EACH ROW
      EXECUTE FUNCTION mark_video_pending()
    `);
    console.log('✅ Trigger applied to video_content table\n');

    // Step 4: Check for any existing videos that need processing
    console.log('Step 4: Checking for existing unprocessed videos...');
    const pendingCheck = await client.query(`
      SELECT COUNT(*) as pending_count
      FROM video_content
      WHERE ai_processing_status = 'pending'
      OR ai_processing_status IS NULL
    `);
    console.log(`   Found ${pendingCheck.rows[0].pending_count} videos needing processing\n`);

    console.log('=' .repeat(60));
    console.log('🎉 VIDEO PENDING TRIGGERS ACTIVE!');
    console.log('\n✨ What happens now:');
    console.log('   1. Partner adds demo_video_url → Creates pending video_content');
    console.log('   2. Form submit triggers processPendingVideos');
    console.log('   3. Videos are analyzed automatically');
    console.log('\n📝 Next: Update partner controller to process on save');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyVideoPendingTrigger();