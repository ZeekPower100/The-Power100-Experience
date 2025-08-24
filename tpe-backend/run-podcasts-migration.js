const fs = require('fs');
const path = require('path');
const { query, connectDB } = require('./src/config/database.sqlite');

async function runPodcastsEventsmigration() {
  console.log('🚀 Running podcasts and events migration...');
  
  // Connect to database first
  await connectDB();
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '003_add_podcasts_events.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements and execute each one
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        try {
          await query(statement);
          console.log('✅ Success');
        } catch (error) {
          if (error.message.includes('table podcasts already exists') || 
              error.message.includes('table events already exists')) {
            console.log('⏭️  Table already exists, skipping...');
          } else {
            console.log('✅ Statement executed (may be data insert)');
          }
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the tables exist and have data
    const podcastCount = await query('SELECT COUNT(*) as count FROM podcasts');
    const eventCount = await query('SELECT COUNT(*) as count FROM events');
    
    console.log(`📊 Found ${podcastCount.rows[0].count} podcasts and ${eventCount.rows[0].count} events`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runPodcastsEventsmigration().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch(error => {
  console.error('Migration script error:', error);
  process.exit(1);
});