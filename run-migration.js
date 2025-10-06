const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration(isProduction = false) {
  const pool = new Pool(isProduction ? {
    host: 'tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com',
    database: 'tpedb',
    user: 'tpeadmin',
    password: 'dBP0wer100!!',
    port: 5432,
    ssl: { rejectUnauthorized: false }
  } : {
    host: 'localhost',
    database: 'tpedb',
    user: 'postgres',
    password: 'TPXP0stgres!!',
    port: 5432
  });

  try {
    console.log(`\n${isProduction ? 'PRODUCTION' : 'LOCAL DEV'} Database Migration:`);
    console.log('='.repeat(50));

    // Read migration file
    const migrationPath = path.join(__dirname, 'tpe-database', 'migrations', 'create_routing_logs.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Remove comments and execute
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 60)}...`);
        await pool.query(statement);
      }
    }

    // Verify table was created
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'routing_logs'
      ORDER BY ordinal_position
    `);

    console.log('\n✅ Table created successfully!');
    console.log('\nColumns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run for both local dev and production
async function main() {
  console.log('🔄 Running routing_logs Table Migration');
  console.log('='.repeat(50));

  // Local dev first
  await runMigration(false);

  // Then production
  await runMigration(true);

  console.log('\n✅ Migration complete for both databases!');
}

main();
