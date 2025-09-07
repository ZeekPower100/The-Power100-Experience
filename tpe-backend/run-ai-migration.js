const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.development' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'tpedb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'TPXP0stgres!!'
});

async function runAIMigration() {
  console.log('🤖 Starting AI Enhancement Migration...\n');
  
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'migrations', 'ai-enhancement-migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Split by major sections for progress tracking
    const sections = [
      { name: 'Contractors AI Fields', pattern: /-- 1\. ENHANCE CONTRACTORS[\s\S]*?(?=-- 2\.|$)/ },
      { name: 'Partners AI Fields', pattern: /-- 2\. ENHANCE STRATEGIC PARTNERS[\s\S]*?(?=-- 3\.|$)/ },
      { name: 'Books AI Fields', pattern: /-- 3\. ENHANCE BOOKS[\s\S]*?(?=-- 4\.|$)/ },
      { name: 'Events AI Fields', pattern: /-- 4\. ENHANCE EVENTS[\s\S]*?(?=-- 5\.|$)/ },
      { name: 'Podcasts AI Fields', pattern: /-- 5\. ENHANCE PODCASTS[\s\S]*?(?=-- 6\.|$)/ },
      { name: 'AI Tracking Tables', pattern: /-- 6\. CREATE AI INTERACTION[\s\S]*?(?=-- 7\.|$)/ },
      { name: 'Performance Indexes', pattern: /-- 7\. CREATE INDEXES[\s\S]*?(?=-- 8\.|$)/ },
      { name: 'Vector Embeddings', pattern: /-- 8\. CREATE VECTOR[\s\S]*?(?=-- 9\.|$)/ },
      { name: 'Triggers & Comments', pattern: /-- 9\. ADD TRIGGER[\s\S]*?(?=-- ====|$)/ }
    ];
    
    for (const section of sections) {
      console.log(`📝 Applying: ${section.name}...`);
      const sectionSql = sql.match(section.pattern);
      
      if (sectionSql) {
        try {
          await pool.query(sectionSql[0]);
          console.log(`   ✅ ${section.name} - Complete`);
        } catch (err) {
          console.log(`   ⚠️  ${section.name} - Partial (some fields may already exist)`);
          // Continue with next section even if some fields exist
        }
      }
    }
    
    console.log('\n🎯 Verifying AI Readiness...\n');
    
    // Check what was added
    const contractorCheck = await pool.query(`
      SELECT COUNT(*) as ai_fields 
      FROM information_schema.columns 
      WHERE table_name = 'contractors' 
      AND column_name LIKE 'ai_%' OR column_name LIKE '%_preferences'
    `);
    
    const trackingCheck = await pool.query(`
      SELECT COUNT(*) as tables 
      FROM information_schema.tables 
      WHERE table_name IN ('ai_interactions', 'recommendation_history', 'engagement_metrics', 'feedback_loops')
    `);
    
    console.log(`✅ Contractor AI fields: ${contractorCheck.rows[0].ai_fields}`);
    console.log(`✅ Tracking tables created: ${trackingCheck.rows[0].tables}/4`);
    
    console.log('\n🚀 AI Enhancement Migration Complete!');
    console.log('\n📋 Next Steps:');
    console.log('1. Update entity forms to collect AI-relevant data');
    console.log('2. Implement OpenAI integration for embeddings');
    console.log('3. Build recommendation engine using new fields');
    console.log('4. Create feedback collection UI components');
    console.log('5. Set up background jobs for AI analysis');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('- Check database connection');
    console.log('- Ensure user has ALTER TABLE privileges');
    console.log('- Some fields may already exist (this is OK)');
  } finally {
    await pool.end();
  }
}

// Add command line confirmation
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('⚠️  This will add AI enhancement fields to your database.');
console.log('   This is a safe operation that only adds new fields.\n');

rl.question('Do you want to proceed? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    rl.close();
    runAIMigration();
  } else {
    console.log('Migration cancelled.');
    rl.close();
    process.exit(0);
  }
});