const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { connectDB, query } = require('../src/config/database');

async function applyAICoachSchema() {
  try {
    console.log('🔧 Connecting to database...');
    await connectDB();
    console.log('✅ Connected to database');

    console.log('🔧 Reading AI Coach schema...');
    const schemaPath = path.join(__dirname, '../src/database/migrations/ai_coach_schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('🔧 Applying AI Coach schema...');
    
    // Split SQL statements by semicolon and execute each one
    const statements = schemaSql.split(';').filter(stmt => stmt.trim().length > 0);
    
    for (const statement of statements) {
      try {
        await query(statement);
        console.log('✅ Executed SQL statement');
      } catch (error) {
        // Ignore column already exists errors
        if (error.message.includes('duplicate column name')) {
          console.log('⚠️  Column already exists, skipping...');
        } else {
          throw error;
        }
      }
    }

    console.log('🎉 AI Coach schema applied successfully!');
    console.log('📋 Created tables:');
    console.log('   - ai_coach_conversations');
    console.log('   - ai_coach_sessions');  
    console.log('   - ai_coach_knowledge_base');
    console.log('📋 Added column to contractors:');
    console.log('   - feedback_completion_status');
    console.log('📋 Added sample knowledge base data');
    
  } catch (error) {
    console.error('❌ Error applying AI Coach schema:', error);
    process.exit(1);
  }
}

// Run the script
applyAICoachSchema()
  .then(() => {
    console.log('✅ Schema application complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Schema application failed:', error);
    process.exit(1);
  });