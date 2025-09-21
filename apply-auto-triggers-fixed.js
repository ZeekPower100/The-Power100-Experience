const { query } = require('./tpe-backend/src/config/database');

async function applyTriggers() {
  console.log('🚀 Applying Database Event Triggers for Automatic Entity Detection...\n');

  try {
    // Step 1: Create the main DDL event function
    console.log('Step 1: Creating handle_ddl_event function...');
    await query(`
      CREATE OR REPLACE FUNCTION handle_ddl_event()
      RETURNS event_trigger AS $$
      DECLARE
          obj record;
          table_name text;
          should_register boolean := false;
          api_name text;
      BEGIN
          FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
          LOOP
              IF obj.object_type = 'table' AND obj.schema_name = 'public' THEN
                  table_name := obj.object_identity;
                  table_name := regexp_replace(table_name, '^[^.]+\\.', '');

                  -- Check patterns
                  IF table_name ~ '(_content|_studies|_resources|_library|_materials|_sessions|_analysis)' THEN
                      should_register := true;
                  END IF;

                  -- Check for AI columns
                  IF NOT should_register THEN
                      SELECT EXISTS (
                          SELECT 1 FROM information_schema.columns c
                          WHERE c.table_name = table_name
                          AND c.table_schema = 'public'
                          AND (c.column_name LIKE 'ai_%' OR c.column_name = 'key_differentiators')
                      ) INTO should_register;
                  END IF;

                  -- Check for entity foreign keys
                  IF NOT should_register THEN
                      SELECT EXISTS (
                          SELECT 1 FROM information_schema.columns c
                          WHERE c.table_name = table_name
                          AND c.table_schema = 'public'
                          AND c.column_name IN (
                              'contractor_id', 'partner_id', 'strategic_partner_id',
                              'book_id', 'podcast_id', 'event_id', 'video_id'
                          )
                      ) INTO should_register;
                  END IF;

                  IF should_register THEN
                      -- Convert snake_case to camelCase
                      api_name := regexp_replace(
                          initcap(replace(table_name, '_', ' ')),
                          '\\s', '', 'g'
                      );
                      api_name := lower(substring(api_name, 1, 1)) || substring(api_name, 2);

                      INSERT INTO ai_metadata (
                          table_name,
                          is_entity_table,
                          api_property_name,
                          description,
                          include_in_knowledge_base,
                          is_ai_relevant
                      ) VALUES (
                          table_name,
                          true,
                          api_name,
                          'Auto-registered via DDL trigger',
                          true,
                          true
                      ) ON CONFLICT (table_name) DO UPDATE SET
                          is_entity_table = true,
                          updated_at = NOW();

                      RAISE NOTICE 'AUTO-REGISTERED: Table % as entity (API: %)', table_name, api_name;

                      PERFORM pg_notify('entity_registered', json_build_object(
                          'table', table_name,
                          'api_name', api_name,
                          'action', 'table_created'
                      )::text);
                  END IF;
              END IF;
          END LOOP;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('✅ handle_ddl_event function created\n');

    // Step 2: Create ALTER TABLE handler
    console.log('Step 2: Creating handle_alter_table function...');
    await query(`
      CREATE OR REPLACE FUNCTION handle_alter_table()
      RETURNS event_trigger AS $$
      DECLARE
          obj record;
          table_name text;
          has_ai_columns boolean;
      BEGIN
          FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands()
          WHERE object_type = 'table'
          LOOP
              table_name := regexp_replace(obj.object_identity, '^[^.]+\\.', '');

              SELECT EXISTS (
                  SELECT 1 FROM information_schema.columns
                  WHERE table_name = table_name
                  AND table_schema = 'public'
                  AND (column_name LIKE 'ai_%' OR column_name = 'key_differentiators')
              ) INTO has_ai_columns;

              IF has_ai_columns THEN
                  PERFORM pg_notify('ai_columns_added', json_build_object(
                      'table', table_name,
                      'action', 'columns_added'
                  )::text);

                  RAISE NOTICE 'AI columns detected in table %', table_name;
              END IF;
          END LOOP;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('✅ handle_alter_table function created\n');

    // Step 3: Drop existing triggers if they exist
    console.log('Step 3: Dropping existing triggers if any...');
    await query(`DROP EVENT TRIGGER IF EXISTS auto_detect_new_tables CASCADE`);
    await query(`DROP EVENT TRIGGER IF EXISTS auto_detect_new_columns CASCADE`);
    console.log('✅ Old triggers removed\n');

    // Step 4: Create new event triggers
    console.log('Step 4: Creating event triggers...');
    await query(`
      CREATE EVENT TRIGGER auto_detect_new_tables
      ON ddl_command_end
      WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS')
      EXECUTE FUNCTION handle_ddl_event()
    `);
    console.log('✅ auto_detect_new_tables trigger created');

    await query(`
      CREATE EVENT TRIGGER auto_detect_new_columns
      ON ddl_command_end
      WHEN TAG IN ('ALTER TABLE')
      EXECUTE FUNCTION handle_alter_table()
    `);
    console.log('✅ auto_detect_new_columns trigger created\n');

    // Step 5: Create status check function
    console.log('Step 5: Creating status check function...');
    await query(`
      CREATE OR REPLACE FUNCTION check_auto_detection_status()
      RETURNS TABLE(
          trigger_name text,
          enabled text,
          event text,
          function_used text
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT
              evtname::text as trigger_name,
              CASE WHEN evtenabled = 'O' THEN 'ENABLED' ELSE 'DISABLED' END as enabled,
              array_to_string(evttags, ', ')::text as event,
              evtfoid::regproc::text as function_used
          FROM pg_event_trigger
          WHERE evtname IN ('auto_detect_new_tables', 'auto_detect_new_columns')
          ORDER BY evtname;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('✅ Status check function created\n');

    // Step 6: Check trigger status
    console.log('Step 6: Verifying triggers...');
    const result = await query('SELECT * FROM check_auto_detection_status()');

    console.log('\n🎯 Active Triggers:');
    result.rows.forEach(trigger => {
      console.log(`   - ${trigger.trigger_name}: ${trigger.enabled}`);
      console.log(`     Events: ${trigger.event}`);
      console.log(`     Function: ${trigger.function_used}\n`);
    });

    console.log('🎉 SUCCESS! Database now has automatic entity detection!');
    console.log('\n📋 What happens now:');
    console.log('   1. CREATE TABLE with entity patterns → Auto-registers in ai_metadata');
    console.log('   2. ALTER TABLE adding AI columns → Sends notification to refresh');
    console.log('   3. No manual API calls needed - it\'s fully automatic!\n');
    console.log('🔥 The automation gap is CLOSED!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Details:', error);
    process.exit(1);
  }

  process.exit(0);
}

applyTriggers();