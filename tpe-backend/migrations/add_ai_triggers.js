/**
 * Add AI Behavioral Tracking Triggers
 * 
 * This script adds the database triggers that auto-update contractor metrics
 * based on their engagement activity.
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

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function addTriggers() {
  console.log(`${colors.cyan}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║          ADDING AI BEHAVIORAL TRIGGERS                     ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    
    // 1. Create function to update contractor metrics
    console.log(`${colors.yellow}📦 Creating update_contractor_metrics function...${colors.reset}`);
    
    await client.query(`
      CREATE OR REPLACE FUNCTION update_contractor_metrics()
      RETURNS TRIGGER AS $$
      DECLARE
        recent_engagement_count INTEGER;
        days_since_last_activity INTEGER;
        new_engagement_score INTEGER;
        new_churn_risk INTEGER;
      BEGIN
        -- Calculate engagement metrics
        SELECT COUNT(*) INTO recent_engagement_count
        FROM contractor_engagement_events
        WHERE contractor_id = NEW.contractor_id
        AND created_at > CURRENT_TIMESTAMP - INTERVAL '7 days';
        
        SELECT COALESCE(EXTRACT(DAY FROM (CURRENT_TIMESTAMP - MAX(created_at)))::INTEGER, 0)
        INTO days_since_last_activity
        FROM contractor_engagement_events
        WHERE contractor_id = NEW.contractor_id;
        
        -- Simple scoring algorithm (can be enhanced)
        new_engagement_score := LEAST(100, GREATEST(0, 50 + (recent_engagement_count * 5) - (days_since_last_activity * 2)));
        new_churn_risk := LEAST(100, GREATEST(0, days_since_last_activity * 10));
        
        -- Update contractor metrics
        UPDATE contractors
        SET 
          engagement_score = new_engagement_score,
          churn_risk = new_churn_risk,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.contractor_id;
        
        -- Log metrics history
        INSERT INTO contractor_metrics_history (
          contractor_id, 
          engagement_score, 
          churn_risk, 
          growth_potential,
          lifecycle_stage
        )
        SELECT 
          id, 
          engagement_score, 
          churn_risk, 
          growth_potential,
          lifecycle_stage
        FROM contractors
        WHERE id = NEW.contractor_id;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log(`${colors.green}   ✅ Function created successfully${colors.reset}`);

    // 2. Create trigger for engagement events
    console.log(`${colors.yellow}📦 Creating engagement event trigger...${colors.reset}`);
    
    // Drop existing trigger if it exists
    await client.query(`
      DROP TRIGGER IF EXISTS update_metrics_on_engagement ON contractor_engagement_events;
    `);
    
    await client.query(`
      CREATE TRIGGER update_metrics_on_engagement
      AFTER INSERT ON contractor_engagement_events
      FOR EACH ROW
      EXECUTE FUNCTION update_contractor_metrics();
    `);
    
    console.log(`${colors.green}   ✅ Engagement trigger created successfully${colors.reset}`);

    // 3. Create function to auto-update lifecycle stage
    console.log(`${colors.yellow}📦 Creating lifecycle stage function...${colors.reset}`);
    
    await client.query(`
      CREATE OR REPLACE FUNCTION update_lifecycle_stage()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Update lifecycle based on engagement score and activity
        IF NEW.engagement_score >= 80 THEN
          NEW.lifecycle_stage := 'power_user';
        ELSIF NEW.engagement_score >= 50 THEN
          NEW.lifecycle_stage := 'active';
        ELSIF NEW.churn_risk >= 70 THEN
          NEW.lifecycle_stage := 'at_risk';
        ELSIF NEW.current_stage = 'completed' AND NEW.engagement_score < 30 THEN
          NEW.lifecycle_stage := 'churned';
        ELSIF NEW.lifecycle_stage IS NULL THEN
          NEW.lifecycle_stage := 'onboarding';
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log(`${colors.green}   ✅ Lifecycle function created successfully${colors.reset}`);

    // 4. Create trigger for lifecycle updates
    console.log(`${colors.yellow}📦 Creating lifecycle update trigger...${colors.reset}`);
    
    // Drop existing trigger if it exists
    await client.query(`
      DROP TRIGGER IF EXISTS auto_update_lifecycle ON contractors;
    `);
    
    await client.query(`
      CREATE TRIGGER auto_update_lifecycle
      BEFORE UPDATE OF engagement_score, churn_risk ON contractors
      FOR EACH ROW
      EXECUTE FUNCTION update_lifecycle_stage();
    `);
    
    console.log(`${colors.green}   ✅ Lifecycle trigger created successfully${colors.reset}`);

    // 5. Create function to update next_best_action
    console.log(`${colors.yellow}📦 Creating next_best_action function...${colors.reset}`);
    
    await client.query(`
      CREATE OR REPLACE FUNCTION suggest_next_action()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Suggest next action based on lifecycle and metrics
        IF NEW.lifecycle_stage = 'at_risk' THEN
          NEW.next_best_action := 'Schedule check-in call with contractor';
        ELSIF NEW.lifecycle_stage = 'onboarding' AND NEW.current_stage = 'verification' THEN
          NEW.next_best_action := 'Send reminder to complete verification';
        ELSIF NEW.lifecycle_stage = 'active' AND NEW.engagement_score < 60 THEN
          NEW.next_best_action := 'Share relevant content to boost engagement';
        ELSIF NEW.lifecycle_stage = 'power_user' THEN
          NEW.next_best_action := 'Invite to provide testimonial or case study';
        ELSE
          NEW.next_best_action := 'Monitor engagement patterns';
        END IF;
        
        NEW.last_ai_analysis := CURRENT_TIMESTAMP;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    console.log(`${colors.green}   ✅ Next action function created successfully${colors.reset}`);

    // 6. Create trigger for next action suggestions
    console.log(`${colors.yellow}📦 Creating next action trigger...${colors.reset}`);
    
    await client.query(`
      DROP TRIGGER IF EXISTS suggest_action_on_update ON contractors;
    `);
    
    await client.query(`
      CREATE TRIGGER suggest_action_on_update
      BEFORE UPDATE OF lifecycle_stage ON contractors
      FOR EACH ROW
      EXECUTE FUNCTION suggest_next_action();
    `);
    
    console.log(`${colors.green}   ✅ Next action trigger created successfully${colors.reset}`);

    // Commit all changes
    await client.query('COMMIT');

    console.log(`
${colors.green}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║              TRIGGERS ADDED SUCCESSFULLY!                  ║
╚════════════════════════════════════════════════════════════╝${colors.reset}

${colors.cyan}✨ What's Now Automated:${colors.reset}
   • Engagement scores update when contractors interact
   • Churn risk calculated based on activity patterns
   • Lifecycle stages auto-adjust based on scores
   • Next best actions suggested automatically
   • All changes logged to metrics history

${colors.cyan}🧪 Test the Triggers:${colors.reset}

1. Insert a test engagement event:
   ${colors.yellow}INSERT INTO contractor_engagement_events 
   (contractor_id, event_type, channel) 
   VALUES (1, 'login', 'web');${colors.reset}

2. Check if metrics updated:
   ${colors.yellow}SELECT name, engagement_score, churn_risk, 
   lifecycle_stage, next_best_action 
   FROM contractors WHERE id = 1;${colors.reset}

3. View metrics history:
   ${colors.yellow}SELECT * FROM contractor_metrics_history 
   WHERE contractor_id = 1 
   ORDER BY calculated_at DESC;${colors.reset}
`);

  } catch (error) {
    console.error(`${colors.red}❌ Error adding triggers:${colors.reset}`, error.message);
    await client.query('ROLLBACK');
    console.log(`${colors.yellow}Rolled back changes${colors.reset}`);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  addTriggers().catch(console.error);
}

module.exports = { addTriggers };