/**
 * Phase 3: Proactive Behavior & Evolution - Database Migration
 *
 * Creates 4 new tables for AI Concierge proactive behavior:
 * 1. ai_proactive_messages - AI-initiated messages and outcomes
 * 2. ai_question_log - Strategic questions and success rates
 * 3. ai_goal_evolution_log - Goal evolution tracking
 * 4. ai_trust_indicators - Trust-building moments
 *
 * CRITICAL: This script uses exact field names from Pre-Flight Checklist
 * See: docs/features/ai-concierge/internal-goal-engine/phase-3/PHASE-3-PRE-FLIGHT-CHECKLIST.md
 */

require('dotenv').config({ path: '../../tpe-backend/.env.development' });
const { query } = require('../../tpe-backend/src/config/database');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function createPhase3Tables() {
  try {
    log('\n========================================', 'bright');
    log('PHASE 3: PROACTIVE BEHAVIOR & EVOLUTION', 'bright');
    log('Creating 4 New Tables', 'bright');
    log('========================================\n', 'bright');

    // =====================================================================
    // TABLE 1: ai_proactive_messages
    // =====================================================================
    log('Creating Table 1/4: ai_proactive_messages...', 'blue');

    await query(`
      CREATE TABLE IF NOT EXISTS ai_proactive_messages (
        id SERIAL PRIMARY KEY,
        contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

        -- Message Details
        message_type TEXT NOT NULL CHECK (message_type IN (
          'check_in',
          'milestone_follow_up',
          'resource_suggestion',
          'encouragement',
          'course_correction',
          'celebration'
        )),
        message_content TEXT NOT NULL,
        ai_reasoning TEXT NOT NULL,
        context_data JSONB,

        -- Timing
        sent_at TIMESTAMP,

        -- Response
        contractor_response TEXT,
        response_received_at TIMESTAMP,
        conversation_continued BOOLEAN DEFAULT FALSE,

        -- Outcome
        outcome_rating INTEGER CHECK (outcome_rating >= 1 AND outcome_rating <= 5),
        led_to_action BOOLEAN DEFAULT FALSE,

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for ai_proactive_messages
    await query(`CREATE INDEX IF NOT EXISTS idx_ai_proactive_messages_contractor ON ai_proactive_messages(contractor_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ai_proactive_messages_sent_at ON ai_proactive_messages(sent_at);`);

    log('✓ ai_proactive_messages created with 2 indexes', 'green');

    // =====================================================================
    // TABLE 2: ai_question_log
    // =====================================================================
    log('Creating Table 2/4: ai_question_log...', 'blue');

    await query(`
      CREATE TABLE IF NOT EXISTS ai_question_log (
        id SERIAL PRIMARY KEY,
        contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
        goal_id INTEGER REFERENCES ai_concierge_goals(id) ON DELETE CASCADE,

        -- Question Details
        question_text TEXT NOT NULL,
        question_purpose TEXT NOT NULL,
        question_type TEXT NOT NULL CHECK (question_type IN (
          'clarifying',
          'exploratory',
          'validating',
          'prioritizing',
          'reflecting'
        )),

        -- Timing
        asked_at TIMESTAMP DEFAULT NOW(),

        -- Response
        contractor_answer TEXT,
        answer_received_at TIMESTAMP,
        answer_quality_score INTEGER CHECK (answer_quality_score >= 1 AND answer_quality_score <= 5),

        -- Effectiveness
        led_to_goal_refinement BOOLEAN DEFAULT FALSE,
        question_naturalness_score INTEGER NOT NULL CHECK (question_naturalness_score >= 1 AND question_naturalness_score <= 5),

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for ai_question_log
    await query(`CREATE INDEX IF NOT EXISTS idx_ai_question_log_contractor ON ai_question_log(contractor_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ai_question_log_goal ON ai_question_log(goal_id);`);

    log('✓ ai_question_log created with 2 indexes', 'green');

    // =====================================================================
    // TABLE 3: ai_goal_evolution_log
    // =====================================================================
    log('Creating Table 3/4: ai_goal_evolution_log...', 'blue');

    await query(`
      CREATE TABLE IF NOT EXISTS ai_goal_evolution_log (
        id SERIAL PRIMARY KEY,
        goal_id INTEGER NOT NULL REFERENCES ai_concierge_goals(id) ON DELETE CASCADE,
        contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

        -- Evolution Details
        evolution_type TEXT NOT NULL CHECK (evolution_type IN (
          'refinement',
          'expansion',
          'pivot',
          'milestone_adjustment',
          'priority_change',
          'goal_completion'
        )),
        original_description TEXT NOT NULL,
        evolved_description TEXT NOT NULL,
        original_milestones JSONB,
        evolved_milestones JSONB,

        -- Reason
        reason_for_evolution TEXT NOT NULL,

        -- Confidence
        ai_confidence_in_change DECIMAL(3,2) NOT NULL CHECK (ai_confidence_in_change >= 0 AND ai_confidence_in_change <= 1),

        -- Approval
        contractor_approved BOOLEAN DEFAULT FALSE,

        -- Relevance
        goal_relevance_score INTEGER NOT NULL CHECK (goal_relevance_score >= 1 AND goal_relevance_score <= 10),

        -- Timing
        evolved_at TIMESTAMP DEFAULT NOW(),

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for ai_goal_evolution_log
    await query(`CREATE INDEX IF NOT EXISTS idx_ai_goal_evolution_contractor ON ai_goal_evolution_log(contractor_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ai_goal_evolution_goal ON ai_goal_evolution_log(goal_id);`);

    log('✓ ai_goal_evolution_log created with 2 indexes', 'green');

    // =====================================================================
    // TABLE 4: ai_trust_indicators
    // =====================================================================
    log('Creating Table 4/4: ai_trust_indicators...', 'blue');

    await query(`
      CREATE TABLE IF NOT EXISTS ai_trust_indicators (
        id SERIAL PRIMARY KEY,
        contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,

        -- Trust Event
        indicator_type TEXT NOT NULL CHECK (indicator_type IN (
          'positive_feedback',
          'negative_feedback',
          'ignored_suggestion',
          'acted_on_suggestion',
          'shared_vulnerability',
          'asked_for_help',
          'milestone_achieved',
          'setback_shared'
        )),
        indicator_description TEXT NOT NULL,
        context_data JSONB,

        -- Impact
        confidence_impact INTEGER NOT NULL CHECK (confidence_impact >= -10 AND confidence_impact <= 10),
        cumulative_trust_score DECIMAL(5,2) NOT NULL CHECK (cumulative_trust_score >= 0 AND cumulative_trust_score <= 100),

        -- Timing
        recorded_at TIMESTAMP DEFAULT NOW(),

        -- Metadata
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes for ai_trust_indicators
    await query(`CREATE INDEX IF NOT EXISTS idx_ai_trust_indicators_contractor ON ai_trust_indicators(contractor_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ai_trust_indicators_recorded_at ON ai_trust_indicators(recorded_at);`);

    log('✓ ai_trust_indicators created with 2 indexes', 'green');

    // =====================================================================
    // VERIFICATION
    // =====================================================================
    log('\n========================================', 'yellow');
    log('VERIFICATION', 'yellow');
    log('========================================\n', 'yellow');

    // Verify table creation
    const tableCheck = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name IN (
        'ai_proactive_messages',
        'ai_question_log',
        'ai_goal_evolution_log',
        'ai_trust_indicators'
      )
      ORDER BY table_name;
    `);

    log(`Tables Created: ${tableCheck.rows.length}/4`, 'blue');
    tableCheck.rows.forEach(row => {
      log(`  ✓ ${row.table_name}`, 'green');
    });

    // Verify column counts
    log('\nColumn Counts:', 'blue');

    const tables = [
      { name: 'ai_proactive_messages', expected: 14 },
      { name: 'ai_question_log', expected: 14 },
      { name: 'ai_goal_evolution_log', expected: 15 },
      { name: 'ai_trust_indicators', expected: 10 }
    ];

    for (const table of tables) {
      const columnCount = await query(`
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_name = '${table.name}';
      `);
      const actual = parseInt(columnCount.rows[0].count);
      const status = actual === table.expected ? '✓' : '✗';
      const color = actual === table.expected ? 'green' : 'red';
      log(`  ${status} ${table.name}: ${actual}/${table.expected} columns`, color);
    }

    // Verify indexes
    log('\nIndexes Created:', 'blue');
    const indexCheck = await query(`
      SELECT tablename, COUNT(*) as index_count
      FROM pg_indexes
      WHERE tablename IN (
        'ai_proactive_messages',
        'ai_question_log',
        'ai_goal_evolution_log',
        'ai_trust_indicators'
      )
      GROUP BY tablename
      ORDER BY tablename;
    `);

    indexCheck.rows.forEach(row => {
      const expected = 2;
      const actual = parseInt(row.index_count);
      const status = actual >= expected ? '✓' : '✗';
      const color = actual >= expected ? 'green' : 'red';
      log(`  ${status} ${row.tablename}: ${actual} indexes`, color);
    });

    // Verify CHECK constraints
    log('\nCHECK Constraints:', 'blue');
    const constraintCheck = await query(`
      SELECT conrelid::regclass AS table_name, COUNT(*) as constraint_count
      FROM pg_constraint
      WHERE contype = 'c'
        AND conrelid::regclass::text IN (
          'ai_proactive_messages',
          'ai_question_log',
          'ai_goal_evolution_log',
          'ai_trust_indicators'
        )
      GROUP BY conrelid::regclass
      ORDER BY conrelid::regclass;
    `);

    constraintCheck.rows.forEach(row => {
      log(`  ✓ ${row.table_name}: ${row.constraint_count} constraints`, 'green');
    });

    // Verify foreign keys
    log('\nForeign Keys:', 'blue');
    const fkCheck = await query(`
      SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS references_table,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN (
          'ai_proactive_messages',
          'ai_question_log',
          'ai_goal_evolution_log',
          'ai_trust_indicators'
        )
      ORDER BY tc.table_name, kcu.column_name;
    `);

    fkCheck.rows.forEach(row => {
      const cascade = row.delete_rule === 'CASCADE' ? '✓' : '✗';
      const color = row.delete_rule === 'CASCADE' ? 'green' : 'red';
      log(`  ${cascade} ${row.table_name}.${row.column_name} → ${row.references_table} (${row.delete_rule})`, color);
    });

    log('\n========================================', 'bright');
    log('PHASE 3 TABLES CREATED SUCCESSFULLY', 'green');
    log('========================================\n', 'bright');

    log('Next Steps:', 'yellow');
    log('  1. Create proactiveMessageService.js', 'blue');
    log('  2. Create questionGenerationService.js', 'blue');
    log('  3. Create goalEvolutionService.js', 'blue');
    log('  4. Create trustTrackingService.js', 'blue');

  } catch (error) {
    log('\n========================================', 'red');
    log('ERROR DURING MIGRATION', 'red');
    log('========================================\n', 'red');
    console.error(error);
    throw error;
  }
}

// Run migration
createPhase3Tables()
  .then(() => {
    log('\n✓ Migration completed successfully\n', 'green');
    process.exit(0);
  })
  .catch((error) => {
    log('\n✗ Migration failed\n', 'red');
    console.error(error);
    process.exit(1);
  });
