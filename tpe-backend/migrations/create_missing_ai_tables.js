/**
 * Create Missing AI Behavioral Tables
 * This creates the tables that failed in the original migration
 */

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tpedb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    console.log('Creating missing AI behavioral tables...\n');

    // 1. contractor_business_goals
    await client.query(`
      CREATE TABLE IF NOT EXISTS contractor_business_goals (
        id SERIAL PRIMARY KEY,
        contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
        goal TEXT NOT NULL,
        timeline DATE,
        priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
        current_progress INTEGER DEFAULT 0 CHECK (current_progress >= 0 AND current_progress <= 100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `);
    console.log('✅ contractor_business_goals');

    // 2. contractor_challenges
    await client.query(`
      CREATE TABLE IF NOT EXISTS contractor_challenges (
        id SERIAL PRIMARY KEY,
        contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
        challenge TEXT NOT NULL,
        severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
        attempted_solutions TEXT[],
        open_to_solutions BOOLEAN DEFAULT true,
        resolved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP
      )
    `);
    console.log('✅ contractor_challenges');

    // 3. ai_interactions (already exists, skip)

    // 4. contractor_recommendations
    await client.query(`
      CREATE TABLE IF NOT EXISTS contractor_recommendations (
        id SERIAL PRIMARY KEY,
        contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
        entity_type VARCHAR(50) NOT NULL,
        entity_id VARCHAR(100),
        entity_name TEXT,
        reason TEXT NOT NULL,
        confidence_score INTEGER DEFAULT 50 CHECK (confidence_score >= 0 AND confidence_score <= 100),
        engagement VARCHAR(20) DEFAULT 'pending' CHECK (engagement IN ('pending', 'ignored', 'viewed', 'clicked', 'completed')),
        feedback TEXT,
        outcome TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        engaged_at TIMESTAMP
      )
    `);
    console.log('✅ contractor_recommendations');

    // 5. contractor_engagement_events
    await client.query(`
      CREATE TABLE IF NOT EXISTS contractor_engagement_events (
        id SERIAL PRIMARY KEY,
        contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB DEFAULT '{}',
        channel VARCHAR(20),
        session_id VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ contractor_engagement_events');

    // 6. contractor_communications
    await client.query(`
      CREATE TABLE IF NOT EXISTS contractor_communications (
        id SERIAL PRIMARY KEY,
        contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
        channel VARCHAR(20) NOT NULL CHECK (channel IN ('email', 'sms', 'phone', 'in_app')),
        direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
        subject TEXT,
        content TEXT,
        status VARCHAR(20) DEFAULT 'sent',
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        delivered_at TIMESTAMP,
        opened_at TIMESTAMP,
        clicked_at TIMESTAMP,
        replied_at TIMESTAMP
      )
    `);
    console.log('✅ contractor_communications');

    // 7. contractor_content_engagement
    await client.query(`
      CREATE TABLE IF NOT EXISTS contractor_content_engagement (
        id SERIAL PRIMARY KEY,
        contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
        content_type VARCHAR(50) NOT NULL,
        content_id VARCHAR(100) NOT NULL,
        content_title TEXT,
        engagement_type VARCHAR(20),
        progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
        time_spent INTEGER,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ contractor_content_engagement');

    // 8. contractor_metrics_history
    await client.query(`
      CREATE TABLE IF NOT EXISTS contractor_metrics_history (
        id SERIAL PRIMARY KEY,
        contractor_id INTEGER NOT NULL REFERENCES contractors(id) ON DELETE CASCADE,
        engagement_score INTEGER CHECK (engagement_score >= 0 AND engagement_score <= 100),
        churn_risk INTEGER CHECK (churn_risk >= 0 AND churn_risk <= 100),
        growth_potential INTEGER CHECK (growth_potential >= 0 AND growth_potential <= 100),
        lifecycle_stage VARCHAR(20),
        calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        factors JSONB DEFAULT '{}'
      )
    `);
    console.log('✅ contractor_metrics_history');

    // Add missing columns to contractors if needed
    await client.query(`
      ALTER TABLE contractors 
      ADD COLUMN IF NOT EXISTS growth_potential INTEGER DEFAULT 50 CHECK (growth_potential >= 0 AND growth_potential <= 100)
    `);
    
    await client.query(`
      ALTER TABLE contractors 
      ADD COLUMN IF NOT EXISTS next_best_action TEXT
    `);
    
    await client.query(`
      ALTER TABLE contractors 
      ADD COLUMN IF NOT EXISTS last_ai_analysis TIMESTAMP
    `);
    
    await client.query(`
      ALTER TABLE contractors 
      ADD COLUMN IF NOT EXISTS ai_insights JSONB DEFAULT '{}'
    `);

    await client.query('COMMIT');
    console.log('\n✨ All tables created successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  createTables();
}