/**
 * Run A/B Experiment Tables Migration
 */
require('dotenv').config({ path: '.env.development' });
const { query } = require('./src/config/database');

async function runMigration() {
  console.log('🚀 Creating A/B Experiment tables...');

  try {
    // Create ab_experiments table
    await query(`
      CREATE TABLE IF NOT EXISTS ab_experiments (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        status VARCHAR(20) DEFAULT 'draft',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        target_sample_size INTEGER DEFAULT 100,
        variants JSONB NOT NULL DEFAULT '[]',
        success_metric VARCHAR(50) DEFAULT 'conversion',
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ ab_experiments table created');

    // Create ab_experiment_assignments table
    await query(`
      CREATE TABLE IF NOT EXISTS ab_experiment_assignments (
        id SERIAL PRIMARY KEY,
        experiment_id INTEGER REFERENCES ab_experiments(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL,
        user_type VARCHAR(20) DEFAULT 'contractor',
        variant VARCHAR(50) NOT NULL,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        converted BOOLEAN DEFAULT FALSE,
        converted_at TIMESTAMP,
        engagement_score DECIMAL(5,2),
        time_to_action INTEGER,
        metadata JSONB DEFAULT '{}'
      )
    `);
    console.log('✅ ab_experiment_assignments table created');

    // Create indexes
    await query(`CREATE INDEX IF NOT EXISTS idx_ab_assignments_experiment ON ab_experiment_assignments(experiment_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ab_assignments_user ON ab_experiment_assignments(user_id, user_type)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON ab_experiments(status)`);
    console.log('✅ Indexes created');

    console.log('\\n🎉 Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }

  process.exit(0);
}

runMigration();
