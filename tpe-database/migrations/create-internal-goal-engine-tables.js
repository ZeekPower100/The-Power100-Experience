// DATABASE-CHECKED: contractors, contractor_action_items verified October 22, 2025
// ================================================================
// VERIFIED FIELD NAMES FROM EXISTING TABLES:
// - contractors.revenue_tier (VARCHAR)
// - contractors.focus_areas (TEXT)
// - contractors.business_goals (JSONB)
// - contractors.current_challenges (JSONB)
// - contractor_action_items.ai_generated (BOOLEAN)
// - contractor_action_items.conversation_context (JSONB)
// ================================================================
// NEW TABLES FOR INTERNAL GOAL ENGINE:
// - ai_concierge_goals (17 columns)
// - ai_concierge_checklist_items (13 columns)
// ================================================================

require('dotenv').config({ path: './tpe-backend/.env.development' });
const { query } = require('../../tpe-backend/src/config/database');

async function createInternalGoalEngineTables() {
  console.log('\n🚀 CREATING INTERNAL GOAL ENGINE TABLES');
  console.log('='.repeat(80));

  try {
    // ================================================================
    // TABLE: ai_concierge_goals
    // Purpose: AI's internal goal system - hidden from contractor
    // ================================================================

    console.log('\n📋 Creating ai_concierge_goals table...');
    await query(`
      CREATE TABLE IF NOT EXISTS ai_concierge_goals (
        id SERIAL PRIMARY KEY,
        contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

        -- Goal Definition
        goal_type VARCHAR(100) NOT NULL,
        goal_description TEXT NOT NULL,
        target_milestone VARCHAR(255),

        -- Priority & Progress
        priority_score INTEGER DEFAULT 5 CHECK (priority_score BETWEEN 1 AND 10),
        current_progress INTEGER DEFAULT 0 CHECK (current_progress BETWEEN 0 AND 100),
        next_milestone TEXT,

        -- Success Criteria
        success_criteria JSONB,

        -- Pattern Source (Phase 2 will populate this)
        pattern_source TEXT,
        pattern_confidence NUMERIC(3,2) CHECK (pattern_confidence BETWEEN 0 AND 1),

        -- Data Gaps (What AI needs to know)
        data_gaps JSONB,

        -- Status & Timing
        status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'blocked')),
        trigger_condition VARCHAR(100),
        last_action_at TIMESTAMP,

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP
      );
    `);
    console.log('✅ ai_concierge_goals table created');

    // Create indexes for ai_concierge_goals
    console.log('\n📊 Creating indexes for ai_concierge_goals...');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_contractor_goals
      ON ai_concierge_goals(contractor_id, status);
    `);
    console.log('✅ Created index: idx_contractor_goals');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_priority_goals
      ON ai_concierge_goals(priority_score DESC, status);
    `);
    console.log('✅ Created index: idx_priority_goals');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_trigger_goals
      ON ai_concierge_goals(trigger_condition, status);
    `);
    console.log('✅ Created index: idx_trigger_goals');

    // ================================================================
    // TABLE: ai_concierge_checklist_items
    // Purpose: AI's checklist - specific actions within goals
    // ================================================================

    console.log('\n📋 Creating ai_concierge_checklist_items table...');
    await query(`
      CREATE TABLE IF NOT EXISTS ai_concierge_checklist_items (
        id SERIAL PRIMARY KEY,
        goal_id INTEGER REFERENCES ai_concierge_goals(id) ON DELETE CASCADE,
        contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

        -- Checklist Item
        checklist_item TEXT NOT NULL,
        item_type VARCHAR(100),

        -- Status & Trigger
        status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
        trigger_condition VARCHAR(100),

        -- Execution
        executed_at TIMESTAMP,
        execution_context JSONB,

        -- Completion
        completed_at TIMESTAMP,
        completion_notes TEXT,

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ ai_concierge_checklist_items table created');

    // Create indexes for ai_concierge_checklist_items
    console.log('\n📊 Creating indexes for ai_concierge_checklist_items...');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_contractor_checklist
      ON ai_concierge_checklist_items(contractor_id, status);
    `);
    console.log('✅ Created index: idx_contractor_checklist');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_goal_items
      ON ai_concierge_checklist_items(goal_id, status);
    `);
    console.log('✅ Created index: idx_goal_items');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_trigger_checklist
      ON ai_concierge_checklist_items(trigger_condition, status);
    `);
    console.log('✅ Created index: idx_trigger_checklist');

    // ================================================================
    // VERIFICATION
    // ================================================================

    console.log('\n🔍 VERIFYING TABLE CREATION');
    console.log('='.repeat(80));

    // Verify ai_concierge_goals column count
    const goalsColumnCount = await query(`
      SELECT COUNT(*) as column_count
      FROM information_schema.columns
      WHERE table_name = 'ai_concierge_goals';
    `);
    console.log(`\n✅ ai_concierge_goals: ${goalsColumnCount.rows[0].column_count} columns (expected 17)`);

    // Verify ai_concierge_checklist_items column count
    const checklistColumnCount = await query(`
      SELECT COUNT(*) as column_count
      FROM information_schema.columns
      WHERE table_name = 'ai_concierge_checklist_items';
    `);
    console.log(`✅ ai_concierge_checklist_items: ${checklistColumnCount.rows[0].column_count} columns (expected 13)`);

    // Verify CHECK constraints on ai_concierge_goals
    const goalsConstraints = await query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'ai_concierge_goals'::regclass AND contype = 'c';
    `);
    console.log(`\n✅ ai_concierge_goals CHECK constraints: ${goalsConstraints.rows.length}`);
    goalsConstraints.rows.forEach(c => {
      console.log(`   - ${c.conname}`);
    });

    // Verify CHECK constraints on ai_concierge_checklist_items
    const checklistConstraints = await query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'ai_concierge_checklist_items'::regclass AND contype = 'c';
    `);
    console.log(`\n✅ ai_concierge_checklist_items CHECK constraints: ${checklistConstraints.rows.length}`);
    checklistConstraints.rows.forEach(c => {
      console.log(`   - ${c.conname}`);
    });

    // Verify foreign keys on ai_concierge_goals
    const goalsForeignKeys = await query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'ai_concierge_goals'::regclass AND contype = 'f';
    `);
    console.log(`\n✅ ai_concierge_goals foreign keys: ${goalsForeignKeys.rows.length}`);
    goalsForeignKeys.rows.forEach(fk => {
      console.log(`   - ${fk.conname}`);
    });

    // Verify foreign keys on ai_concierge_checklist_items
    const checklistForeignKeys = await query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'ai_concierge_checklist_items'::regclass AND contype = 'f';
    `);
    console.log(`\n✅ ai_concierge_checklist_items foreign keys: ${checklistForeignKeys.rows.length}`);
    checklistForeignKeys.rows.forEach(fk => {
      console.log(`   - ${fk.conname}`);
    });

    // Verify indexes on ai_concierge_goals
    const goalsIndexes = await query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'ai_concierge_goals' AND indexname NOT LIKE '%pkey';
    `);
    console.log(`\n✅ ai_concierge_goals indexes: ${goalsIndexes.rows.length}`);
    goalsIndexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });

    // Verify indexes on ai_concierge_checklist_items
    const checklistIndexes = await query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'ai_concierge_checklist_items' AND indexname NOT LIKE '%pkey';
    `);
    console.log(`\n✅ ai_concierge_checklist_items indexes: ${checklistIndexes.rows.length}`);
    checklistIndexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ INTERNAL GOAL ENGINE TABLES CREATED SUCCESSFULLY');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
createInternalGoalEngineTables();
