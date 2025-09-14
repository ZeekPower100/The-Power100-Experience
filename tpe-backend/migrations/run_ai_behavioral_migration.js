/**
 * AI Behavioral Tracking Migration Runner
 * 
 * This script applies the AI behavioral tracking database changes
 * for the AI-First Strategy Phase 2 implementation.
 * 
 * Usage: node migrations/run_ai_behavioral_migration.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tpedb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function runMigration() {
  console.log(`${colors.cyan}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║          AI BEHAVIORAL TRACKING MIGRATION                  ║
║          AI-First Strategy Phase 2                         ║
╚════════════════════════════════════════════════════════════╝
${colors.reset}`);

  let client;
  
  try {
    // Connect to database
    console.log(`${colors.yellow}📡 Connecting to database...${colors.reset}`);
    client = await pool.connect();
    console.log(`${colors.green}✅ Connected to ${process.env.DB_NAME || 'tpedb'}${colors.reset}\n`);

    // Check current schema
    console.log(`${colors.yellow}🔍 Checking current schema...${colors.reset}`);
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contractors' 
      AND column_name IN ('communication_preferences', 'learning_preferences', 'engagement_score')
    `);
    
    if (checkResult.rows.length > 0) {
      console.log(`${colors.yellow}⚠️  Some AI fields already exist. Proceeding with caution...${colors.reset}\n`);
    }

    // Read migration SQL
    const migrationPath = path.join(__dirname, 'add_ai_behavioral_tracking.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    // Split migration into sections for better error handling
    const sections = [
      { name: 'AI Fields on Contractors', pattern: /-- 1\. ADD AI FIELDS[\s\S]*?(?=-- 2\.|$)/ },
      { name: 'Business Goals Table', pattern: /-- 2\. CREATE BUSINESS GOALS[\s\S]*?(?=-- 3\.|$)/ },
      { name: 'Challenges Table', pattern: /-- 3\. CREATE CHALLENGES[\s\S]*?(?=-- 4\.|$)/ },
      { name: 'AI Interactions Table', pattern: /-- 4\. CREATE AI INTERACTIONS[\s\S]*?(?=-- 5\.|$)/ },
      { name: 'Recommendations Table', pattern: /-- 5\. CREATE RECOMMENDATIONS[\s\S]*?(?=-- 6\.|$)/ },
      { name: 'Engagement Events Table', pattern: /-- 6\. CREATE ENGAGEMENT EVENTS[\s\S]*?(?=-- 7\.|$)/ },
      { name: 'Communication Log Table', pattern: /-- 7\. CREATE COMMUNICATION LOG[\s\S]*?(?=-- 8\.|$)/ },
      { name: 'Content Engagement Table', pattern: /-- 8\. CREATE LEARNING CONTENT[\s\S]*?(?=-- 9\.|$)/ },
      { name: 'Metrics History Table', pattern: /-- 9\. CREATE PREDICTIVE METRICS[\s\S]*?(?=-- 10\.|$)/ },
      { name: 'Performance Indexes', pattern: /-- 10\. CREATE INDEXES[\s\S]*?(?=-- 11\.|$)/ },
      { name: 'Views', pattern: /-- 11\. CREATE VIEWS[\s\S]*?(?=-- 12\.|$)/ },
      { name: 'Triggers', pattern: /-- 12\. ADD TRIGGERS[\s\S]*?(?=-- 13\.|$)/ }
    ];

    // Begin transaction
    await client.query('BEGIN');
    console.log(`${colors.cyan}🚀 Starting migration...${colors.reset}\n`);

    let successCount = 0;
    let skipCount = 0;

    // Execute each section
    for (const section of sections) {
      try {
        console.log(`${colors.yellow}📦 Applying: ${section.name}${colors.reset}`);
        
        const sectionSQL = migrationSQL.match(section.pattern);
        if (!sectionSQL) {
          console.log(`${colors.yellow}   ⏭️  Section not found, skipping...${colors.reset}`);
          skipCount++;
          continue;
        }

        // Clean up SQL (remove comments and empty lines for execution)
        const cleanSQL = sectionSQL[0]
          .split('\n')
          .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
          .join('\n');

        // Execute statements one by one for PostgreSQL
        const statements = cleanSQL.split(';').filter(s => s.trim().length > 0);
        
        for (const statement of statements) {
          if (statement.trim()) {
            await client.query(statement + ';');
          }
        }
        
        console.log(`${colors.green}   ✅ ${section.name} applied successfully${colors.reset}`);
        successCount++;
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`${colors.yellow}   ⏭️  ${section.name} already exists, skipping...${colors.reset}`);
          skipCount++;
        } else {
          throw error;
        }
      }
    }

    // Commit transaction
    await client.query('COMMIT');
    
    // Print summary
    console.log(`\n${colors.green}${colors.bright}
╔════════════════════════════════════════════════════════════╗
║                  MIGRATION COMPLETED                       ║
╚════════════════════════════════════════════════════════════╝${colors.reset}

${colors.cyan}📊 Summary:${colors.reset}
   ${colors.green}✅ Successfully applied: ${successCount} sections${colors.reset}
   ${colors.yellow}⏭️  Skipped (already exists): ${skipCount} sections${colors.reset}
   
${colors.cyan}📋 New Capabilities Added:${colors.reset}
   • AI behavioral tracking fields on contractors
   • Business goals and challenges tracking
   • AI interaction history logging
   • Recommendation tracking system
   • Engagement event monitoring
   • Communication logging
   • Content engagement tracking
   • Predictive metrics with auto-scoring
   • Analytics views for easy querying
   
${colors.green}✨ Your database is now ready for AI-powered contractor insights!${colors.reset}
`);

    // Show sample queries
    console.log(`${colors.cyan}🔍 Sample Queries to Test:${colors.reset}

1. View contractor AI profiles:
   ${colors.yellow}SELECT * FROM contractor_ai_profiles LIMIT 5;${colors.reset}

2. Check engagement analytics:
   ${colors.yellow}SELECT * FROM contractor_engagement_analytics 
   WHERE date > CURRENT_DATE - INTERVAL '7 days';${colors.reset}

3. View high-risk contractors:
   ${colors.yellow}SELECT name, company_name, churn_risk, lifecycle_stage 
   FROM contractors 
   WHERE churn_risk > 70;${colors.reset}
`);

  } catch (error) {
    console.error(`\n${colors.red}❌ Migration failed:${colors.reset}`, error.message);
    
    if (client) {
      console.log(`${colors.yellow}🔄 Rolling back changes...${colors.reset}`);
      await client.query('ROLLBACK');
      console.log(`${colors.green}✅ Rollback complete${colors.reset}`);
    }
    
    console.log(`\n${colors.yellow}💡 Troubleshooting tips:${colors.reset}
   1. Check your database connection settings in .env
   2. Ensure PostgreSQL is running
   3. Verify you have CREATE TABLE permissions
   4. Check if some tables already exist
   5. Review the error message above for specifics
`);
    
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the migration
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = { runMigration };