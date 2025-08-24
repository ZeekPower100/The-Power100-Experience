const fs = require('fs');
const path = require('path');
const { query, connectDB } = require('./src/config/database.sqlite');

async function runTechStackMigration() {
  console.log('🚀 Running tech stack migration...');
  
  // Connect to database first
  await connectDB();
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '005_add_contractor_tech_stack.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      console.log('Executing:', statement.substring(0, 50) + '...');
      try {
        await query(statement);
        console.log('✅ Statement executed successfully');
      } catch (error) {
        if (error.message.includes('duplicate column name')) {
          console.log('⏭️  Column already exists');
        } else if (error.message.includes('already exists')) {
          console.log('⏭️  Already exists');
        } else {
          throw error;
        }
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the new columns exist
    const tableInfo = await query('PRAGMA table_info(contractors)');
    const techStackColumns = tableInfo.rows.filter(col => col.name.includes('tech_stack'));
    console.log(`\n📊 Found ${techStackColumns.length} tech stack columns:`);
    techStackColumns.forEach(col => {
      console.log(`  - ${col.name} (${col.type})`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runTechStackMigration().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch(error => {
  console.error('Migration script error:', error);
  process.exit(1);
});