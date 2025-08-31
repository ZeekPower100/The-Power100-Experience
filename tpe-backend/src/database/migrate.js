const fs = require('fs');
const path = require('path');
const { query, connectDB } = require('../config/database');

// Migration runner for Partner Portal database schema
async function runMigrations() {
  console.log('🚀 Starting Partner Portal database migrations...');
  
  try {
    // Connect to database first
    await connectDB();
    // Create migrations tracking table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        migration_name VARCHAR(255) NOT NULL UNIQUE,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get list of already executed migrations
    const executedMigrations = await query('SELECT migration_name FROM schema_migrations');
    const executedNames = executedMigrations.rows.map(row => row.migration_name);

    // Find migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Execute in order

    console.log(`📁 Found ${migrationFiles.length} migration files`);

    // Execute each migration
    for (const migrationFile of migrationFiles) {
      const migrationName = path.basename(migrationFile, '.sql');
      
      if (executedNames.includes(migrationName)) {
        console.log(`⏭️  Skipping already executed migration: ${migrationName}`);
        continue;
      }

      console.log(`📝 Executing migration: ${migrationName}`);
      
      const migrationPath = path.join(migrationsDir, migrationFile);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      
      // Handle complex SQL with triggers that contain semicolons
      // Split on semicolons but be careful with triggers
      const statements = [];
      let currentStatement = '';
      let inTrigger = false;
      
      const lines = migrationSQL.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip comments and empty lines
        if (trimmedLine.startsWith('--') || trimmedLine === '') {
          continue;
        }
        
        currentStatement += line + '\n';
        
        // Detect trigger start/end
        if (trimmedLine.toUpperCase().includes('CREATE TRIGGER')) {
          inTrigger = true;
        }
        
        if (inTrigger && trimmedLine.toUpperCase().includes('END')) {
          inTrigger = false;
          statements.push(currentStatement.trim());
          currentStatement = '';
        } else if (!inTrigger && trimmedLine.endsWith(';')) {
          statements.push(currentStatement.trim().replace(/;$/, ''));
          currentStatement = '';
        }
      }
      
      // Add any remaining statement
      if (currentStatement.trim()) {
        statements.push(currentStatement.trim());
      }

      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`  Executing: ${statement.substring(0, 50)}...`);
          await query(statement);
        }
      }

      // Mark migration as executed
      await query(
        'INSERT INTO schema_migrations (migration_name) VALUES ($1)',
        [migrationName]
      );

      console.log(`✅ Completed migration: ${migrationName}`);
    }

    console.log('🎉 All migrations completed successfully!');
    
    // Verify critical tables exist
    const tables = await query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('partner_users', 'partner_leads', 'partner_documents')
    `);
    
    console.log(`📊 Verified ${tables.rows.length} partner portal tables created`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migration process completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration process failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigrations };