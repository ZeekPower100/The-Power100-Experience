/**
 * Migration: Add PCR Question Library
 *
 * Creates tables for managing PowerCard survey questions:
 * - pcr_metric_categories: Categories like "closing_rate", "customer_experience"
 * - pcr_question_library: Pre-vetted questions per category
 *
 * AI selects best question from library by default, admin can override or add new.
 */

const { query } = require('../../tpe-backend/src/config/database');

async function up() {
  console.log('[Migration] Creating PCR question library tables...');

  // 1. Create metric categories table
  await query(`
    CREATE TABLE IF NOT EXISTS pcr_metric_categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      display_name VARCHAR(100) NOT NULL,
      description TEXT,
      icon VARCHAR(50),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('  ✅ Created pcr_metric_categories table');

  // 2. Create question library table
  await query(`
    CREATE TABLE IF NOT EXISTS pcr_question_library (
      id SERIAL PRIMARY KEY,
      metric_category_id INT REFERENCES pcr_metric_categories(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      question_type VARCHAR(30) DEFAULT 'impact',
      scale_low_label VARCHAR(50) DEFAULT 'Poor',
      scale_high_label VARCHAR(50) DEFAULT 'Excellent',
      context_keywords TEXT[],
      is_default BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      usage_count INT DEFAULT 0,
      avg_response_rate DECIMAL(5,2),
      created_by VARCHAR(50) DEFAULT 'system',
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      CONSTRAINT valid_question_type CHECK (question_type IN ('impact', 'confidence', 'satisfaction', 'likelihood', 'effectiveness'))
    )
  `);
  console.log('  ✅ Created pcr_question_library table');

  // 3. Create index for faster lookups
  await query(`
    CREATE INDEX IF NOT EXISTS idx_question_library_category
    ON pcr_question_library(metric_category_id, is_active)
  `);
  console.log('  ✅ Created indexes');

  // 4. Add question_library_id to power_card_templates for tracking which question was used
  await query(`
    ALTER TABLE power_card_templates
    ADD COLUMN IF NOT EXISTS metric_1_question_id INT REFERENCES pcr_question_library(id),
    ADD COLUMN IF NOT EXISTS metric_2_question_id INT REFERENCES pcr_question_library(id),
    ADD COLUMN IF NOT EXISTS metric_3_question_id INT REFERENCES pcr_question_library(id),
    ADD COLUMN IF NOT EXISTS ai_selected_questions BOOLEAN DEFAULT false
  `);
  console.log('  ✅ Updated power_card_templates with question_id references');

  console.log('[Migration] ✅ PCR question library tables created successfully');
}

async function down() {
  console.log('[Migration] Rolling back PCR question library tables...');

  // Remove columns from power_card_templates first
  await query(`
    ALTER TABLE power_card_templates
    DROP COLUMN IF EXISTS metric_1_question_id,
    DROP COLUMN IF EXISTS metric_2_question_id,
    DROP COLUMN IF EXISTS metric_3_question_id,
    DROP COLUMN IF EXISTS ai_selected_questions
  `);

  // Drop tables in reverse order
  await query('DROP TABLE IF EXISTS pcr_question_library CASCADE');
  await query('DROP TABLE IF EXISTS pcr_metric_categories CASCADE');

  console.log('[Migration] ✅ Rollback complete');
}

// Run migration
if (require.main === module) {
  const direction = process.argv[2] || 'up';

  (async () => {
    try {
      if (direction === 'down') {
        await down();
      } else {
        await up();
      }
      process.exit(0);
    } catch (error) {
      console.error('[Migration] ❌ Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = { up, down };
