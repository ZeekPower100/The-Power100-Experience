const { query } = require('../src/config/database');

async function addMissingColumns() {
  console.log('🔧 Adding missing columns to strategic_partners table...');

  try {
    // Add missing columns that are being used in the application
    const alterTableQueries = [
      // Client testimonials - for actual client testimonials (future use)
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS client_testimonials JSONB DEFAULT '[]'`,
      
      // Client demos - for demonstration videos/materials
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS client_demos JSONB DEFAULT '[]'`,
      
      // Client references - for PowerConfidence rating contacts
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS client_references JSONB DEFAULT '[]'`,
      
      // Last quarterly report - for tracking PowerConfidence review dates
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS last_quarterly_report DATE`,
      
      // Landing page videos - for partner landing pages
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS landing_page_videos JSONB DEFAULT '[]'`,
      
      // Additional contact fields (if not already present)
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255)`,
      
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50)`,
      
      // Logo URL for partner branding
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS logo_url TEXT`,
      
      // Website URL
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS website TEXT`,
      
      // Description/Value proposition
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS description TEXT`,
      
      // Power100 subdomain
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS power100_subdomain VARCHAR(100)`,
      
      // Focus areas served as JSON
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS focus_areas_served JSONB DEFAULT '[]'`,
      
      // Target revenue range as JSON
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS target_revenue_range JSONB DEFAULT '[]'`,
      
      // Geographic regions as JSON
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS geographic_regions JSONB DEFAULT '[]'`,
      
      // Key differentiators as JSON
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS key_differentiators JSONB DEFAULT '[]'`,
      
      // Sponsored events as JSON
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS sponsored_events JSONB DEFAULT '[]'`,
      
      // Podcast appearances as JSON
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS podcast_appearances JSONB DEFAULT '[]'`,
      
      // Books read/recommended
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS books_read_recommended TEXT`,
      
      // Best working partnerships
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS best_working_partnerships TEXT`,
      
      // PowerConfidence score (ensure it exists)
      `ALTER TABLE strategic_partners 
       ADD COLUMN IF NOT EXISTS power_confidence_score INTEGER DEFAULT 0`
    ];

    // Execute each query
    for (const sqlQuery of alterTableQueries) {
      try {
        await query(sqlQuery);
        console.log('✅ Added column:', sqlQuery.match(/ADD COLUMN IF NOT EXISTS (\w+)/)[1]);
      } catch (error) {
        // Ignore errors for columns that already exist
        if (!error.message.includes('already exists')) {
          console.error('❌ Error adding column:', error.message);
        }
      }
    }

    console.log('✅ All missing columns have been added successfully!');
    console.log('📝 Note: The database is now compatible with all partner form fields.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  addMissingColumns().then(() => {
    console.log('✅ Migration completed!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Migration error:', error);
    process.exit(1);
  });
}

module.exports = { addMissingColumns };