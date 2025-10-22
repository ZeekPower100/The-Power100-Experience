# Phase 3: Database Migration Pattern

**IMPORTANT**: Use Node.js migration scripts for all database changes

## ✅ Proven Working Pattern (from Phase 1)

### File Structure:
```
tpe-database/migrations/migration-name.js
```

### Template:
```javascript
require('dotenv').config({ path: './tpe-backend/.env.development' });
const { query } = require('../../tpe-backend/src/config/database');

async function migrationName() {
  console.log('\n🚀 MIGRATION DESCRIPTION');
  console.log('='.repeat(80));

  try {
    // Create tables
    console.log('\n📋 Creating table_name...');
    await query(`
      CREATE TABLE IF NOT EXISTS table_name (
        -- columns here
      );
    `);
    console.log('✅ table_name created');

    // Create indexes
    console.log('\n📊 Creating indexes...');
    await query(`CREATE INDEX IF NOT EXISTS idx_name ON table_name(column);`);
    console.log('✅ Created index: idx_name');

    // Verification
    console.log('\n🔍 VERIFYING MIGRATION');
    const columnCount = await query(`
      SELECT COUNT(*) as column_count
      FROM information_schema.columns
      WHERE table_name = 'table_name';
    `);
    console.log(`✅ table_name: ${columnCount.rows[0].column_count} columns`);

    console.log('\n✅ MIGRATION SUCCESSFUL');
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }

  process.exit(0);
}

migrationName();
```

### Execution:
```bash
node tpe-database/migrations/migration-name.js
```

### Why This Works:
- ✅ Uses existing database connection configuration
- ✅ Provides detailed verification output
- ✅ Auto-checks column counts, constraints, foreign keys, indexes
- ✅ Fails fast with clear error messages
- ✅ Works consistently on Windows with PostgreSQL

### DO NOT Use:
- ❌ Raw SQL files with psql commands
- ❌ quick-db.bat with SQL files (doesn't support file input)
- ❌ Direct psql execution (requires environment variable handling)

**Reference**: See Phase 1 implementation for working example:
`tpe-database/migrations/create-internal-goal-engine-tables.js`
