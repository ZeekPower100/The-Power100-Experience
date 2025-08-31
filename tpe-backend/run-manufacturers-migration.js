const fs = require('fs');
const path = require('path');
const { query, connectDB } = require('./src/config/database');

async function runManufacturersMigration() {
  console.log('🚀 Running manufacturers migration...');
  
  // Connect to database first
  await connectDB();
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '004_add_manufacturers.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // First, try to create the table
    const createTableMatch = migrationSQL.match(/CREATE TABLE[^;]+manufacturers[^;]+;/s);
    if (createTableMatch) {
      console.log('Creating manufacturers table...');
      try {
        await query(createTableMatch[0]);
        console.log('✅ Table created successfully');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log('⏭️  Table already exists');
        } else {
          throw error;
        }
      }
    }
    
    // Then execute INSERT statements
    const insertStatements = migrationSQL.match(/INSERT INTO manufacturers[^;]+;/gs);
    if (insertStatements) {
      for (const statement of insertStatements) {
        console.log('Inserting sample data...');
        try {
          await query(statement);
          console.log('✅ Data inserted');
        } catch (error) {
          console.log('⚠️  Insert error (may be duplicate):', error.message.substring(0, 50));
        }
      }
    }
    
    // Create indexes
    const indexStatements = migrationSQL.match(/CREATE INDEX[^;]+;/gs);
    if (indexStatements) {
      for (const statement of indexStatements) {
        console.log('Creating index...');
        try {
          await query(statement);
          console.log('✅ Index created');
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log('⏭️  Index already exists');
          }
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the table exists and has data
    const manufacturerCount = await query('SELECT COUNT(*) as count FROM manufacturers');
    console.log(`📊 Found ${manufacturerCount.rows[0].count} manufacturers`);
    
    // Show sample data
    const samples = await query('SELECT company_name, price_range, power_confidence_score FROM manufacturers LIMIT 3');
    console.log('\n📦 Sample manufacturers:');
    samples.rows.forEach(m => {
      console.log(`  - ${m.company_name} (${m.price_range}) - Score: ${m.power_confidence_score}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runManufacturersMigration().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch(error => {
  console.error('Migration script error:', error);
  process.exit(1);
});