/**
 * Deploy Phase 3 Tables to Production AWS RDS
 *
 * This script creates the 4 Phase 3 tables in the production database.
 * It uses the mcp__aws-production__exec tool pattern.
 */

const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

log('\n╔════════════════════════════════════════════════════════════════╗', 'yellow');
log('║  DEPLOYING PHASE 3 TABLES TO PRODUCTION AWS RDS               ║', 'yellow');
log('╚════════════════════════════════════════════════════════════════╝\n', 'yellow');

log('⚠️  NOTE: This script generates SQL commands for manual execution', 'yellow');
log('    Use mcp__aws-production__exec tool to execute these commands\n', 'yellow');

const SQL_COMMANDS = `
-- =====================================================================
-- TABLE 1: ai_proactive_messages
-- =====================================================================
CREATE TABLE IF NOT EXISTS ai_proactive_messages (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
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
  sent_at TIMESTAMP,
  contractor_response TEXT,
  response_received_at TIMESTAMP,
  conversation_continued BOOLEAN DEFAULT FALSE,
  outcome_rating INTEGER CHECK (outcome_rating >= 1 AND outcome_rating <= 5),
  led_to_action BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_proactive_messages_contractor ON ai_proactive_messages(contractor_id);
CREATE INDEX IF NOT EXISTS idx_ai_proactive_messages_sent_at ON ai_proactive_messages(sent_at);

-- =====================================================================
-- TABLE 2: ai_question_log
-- =====================================================================
CREATE TABLE IF NOT EXISTS ai_question_log (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
  goal_id INTEGER REFERENCES ai_concierge_goals(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_purpose TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN (
    'clarifying',
    'exploratory',
    'validating',
    'prioritizing',
    'reflecting'
  )),
  asked_at TIMESTAMP DEFAULT NOW(),
  contractor_answer TEXT,
  answer_received_at TIMESTAMP,
  answer_quality_score INTEGER CHECK (answer_quality_score >= 1 AND answer_quality_score <= 5),
  led_to_goal_refinement BOOLEAN DEFAULT FALSE,
  question_naturalness_score INTEGER NOT NULL CHECK (question_naturalness_score >= 1 AND question_naturalness_score <= 5),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_question_log_contractor ON ai_question_log(contractor_id);
CREATE INDEX IF NOT EXISTS idx_ai_question_log_goal ON ai_question_log(goal_id);

-- =====================================================================
-- TABLE 3: ai_goal_evolution_log
-- =====================================================================
CREATE TABLE IF NOT EXISTS ai_goal_evolution_log (
  id SERIAL PRIMARY KEY,
  goal_id INTEGER NOT NULL REFERENCES ai_concierge_goals(id) ON DELETE CASCADE,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
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
  reason_for_evolution TEXT NOT NULL,
  ai_confidence_in_change DECIMAL(3,2) NOT NULL CHECK (ai_confidence_in_change >= 0 AND ai_confidence_in_change <= 1),
  contractor_approved BOOLEAN DEFAULT FALSE,
  goal_relevance_score INTEGER NOT NULL CHECK (goal_relevance_score >= 1 AND goal_relevance_score <= 10),
  evolved_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_goal_evolution_contractor ON ai_goal_evolution_log(contractor_id);
CREATE INDEX IF NOT EXISTS idx_ai_goal_evolution_goal ON ai_goal_evolution_log(goal_id);

-- =====================================================================
-- TABLE 4: ai_trust_indicators
-- =====================================================================
CREATE TABLE IF NOT EXISTS ai_trust_indicators (
  id SERIAL PRIMARY KEY,
  contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
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
  confidence_impact INTEGER NOT NULL CHECK (confidence_impact >= -10 AND confidence_impact <= 10),
  cumulative_trust_score DECIMAL(5,2) NOT NULL CHECK (cumulative_trust_score >= 0 AND cumulative_trust_score <= 100),
  recorded_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_trust_indicators_contractor ON ai_trust_indicators(contractor_id);
CREATE INDEX IF NOT EXISTS idx_ai_trust_indicators_recorded_at ON ai_trust_indicators(recorded_at);

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================
-- Verify tables created
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('ai_proactive_messages', 'ai_question_log', 'ai_goal_evolution_log', 'ai_trust_indicators')
ORDER BY table_name;

-- Verify column counts
SELECT
  'ai_proactive_messages' as table_name,
  COUNT(*) as column_count
FROM information_schema.columns
WHERE table_name = 'ai_proactive_messages'
UNION ALL
SELECT
  'ai_question_log',
  COUNT(*)
FROM information_schema.columns
WHERE table_name = 'ai_question_log'
UNION ALL
SELECT
  'ai_goal_evolution_log',
  COUNT(*)
FROM information_schema.columns
WHERE table_name = 'ai_goal_evolution_log'
UNION ALL
SELECT
  'ai_trust_indicators',
  COUNT(*)
FROM information_schema.columns
WHERE table_name = 'ai_trust_indicators';

-- Verify indexes
SELECT tablename, COUNT(*) as index_count
FROM pg_indexes
WHERE tablename IN ('ai_proactive_messages', 'ai_question_log', 'ai_goal_evolution_log', 'ai_trust_indicators')
GROUP BY tablename
ORDER BY tablename;
`;

log('SQL Commands Ready:', 'green');
log('─'.repeat(65), 'blue');
console.log(SQL_COMMANDS);
log('─'.repeat(65), 'blue');

log('\n✓ Copy the SQL commands above and execute using mcp__aws-production__exec\n', 'green');

log('Production Database Details:', 'yellow');
log('  Host: tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com', 'blue');
log('  Database: tpedb', 'blue');
log('  User: tpeadmin', 'blue');
log('  Password: dBP0wer100!!\n', 'blue');
