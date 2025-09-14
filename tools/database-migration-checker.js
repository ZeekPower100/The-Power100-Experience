#!/usr/bin/env node

/**
 * Database Migration Checker - Compares Dev vs Production Schemas
 * 
 * This tool identifies differences between development and production databases
 * and generates the exact migrations needed to align them.
 * 
 * Usage:
 * - Compare all tables: node tools/database-migration-checker.js
 * - Compare specific table: node tools/database-migration-checker.js --table events
 * - Generate migration SQL: node tools/database-migration-checker.js --generate
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class DatabaseMigrationChecker {
  constructor() {
    this.projectRoot = path.join(__dirname, '..');
    
    // Database configurations
    this.databases = {
      development: {
        name: 'Development (Local)',
        host: 'localhost',
        database: 'tpedb',
        user: 'postgres',
        password: 'TPXP0stgres!!',
        port: 5432
      },
      production: {
        name: 'Production (AWS RDS)',
        host: 'tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com',
        database: 'tpedb',
        user: 'tpeadmin',
        password: 'dBP0wer100!!',
        port: 5432
      }
    };
    
    this.differences = [];
    this.migrations = [];
  }

  /**
   * Get schema for a specific database
   */
  getDatabaseSchema(environment, tableName = null) {
    const db = this.databases[environment];
    
    try {
      // Create temp batch file for connection
      const query = tableName 
        ? `SELECT column_name, data_type, character_maximum_length, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${tableName}' ORDER BY ordinal_position`
        : `SELECT table_name, column_name, data_type, character_maximum_length, is_nullable, column_default FROM information_schema.columns WHERE table_schema = 'public' ORDER BY table_name, ordinal_position`;
      
      const batchContent = `@echo off
set PGPASSWORD=${db.password}
"C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe" -h ${db.host} -U ${db.user} -d ${db.database} -p ${db.port} -t -c "${query}"`;
      
      const tempBatch = path.join(this.projectRoot, `temp_${environment}_schema.bat`);
      fs.writeFileSync(tempBatch, batchContent);
      
      const output = execSync(tempBatch, { 
        encoding: 'utf-8',
        cwd: this.projectRoot,
        stdio: ['pipe', 'pipe', 'ignore']
      });
      
      // Clean up
      fs.unlinkSync(tempBatch);
      
      // Parse output into structured data
      const rows = output
        .split('\n')
        .filter(line => line.trim() && !line.includes('---'))
        .map(line => {
          const parts = line.split('|').map(p => p.trim());
          if (tableName) {
            return {
              column_name: parts[0],
              data_type: parts[1],
              max_length: parts[2],
              is_nullable: parts[3],
              default: parts[4]
            };
          } else {
            return {
              table_name: parts[0],
              column_name: parts[1],
              data_type: parts[2],
              max_length: parts[3],
              is_nullable: parts[4],
              default: parts[5]
            };
          }
        })
        .filter(row => row.column_name && row.column_name !== 'column_name');
      
      return rows;
    } catch (error) {
      console.error(`Failed to get schema for ${db.name}:`, error.message);
      if (environment === 'production') {
        console.log('⚠️  Production database connection failed. Make sure you have network access to AWS RDS.');
      }
      return [];
    }
  }

  /**
   * Compare schemas between development and production
   */
  compareSchemas(tableName = null) {
    console.log('🔍 Database Migration Checker\n');
    console.log('Comparing Development vs Production schemas...\n');
    
    // Get schemas
    console.log('📊 Fetching Development schema...');
    const devSchema = this.getDatabaseSchema('development', tableName);
    
    console.log('📊 Fetching Production schema...');
    const prodSchema = this.getDatabaseSchema('production', tableName);
    
    if (devSchema.length === 0 || prodSchema.length === 0) {
      console.error('❌ Failed to fetch schemas. Check database connections.');
      return false;
    }
    
    // Group by table
    const devTables = {};
    const prodTables = {};
    
    devSchema.forEach(row => {
      const table = tableName || row.table_name;
      if (!devTables[table]) devTables[table] = {};
      devTables[table][row.column_name] = row;
    });
    
    prodSchema.forEach(row => {
      const table = tableName || row.table_name;
      if (!prodTables[table]) prodTables[table] = {};
      prodTables[table][row.column_name] = row;
    });
    
    // Find differences
    Object.keys(devTables).forEach(table => {
      const devColumns = devTables[table];
      const prodColumns = prodTables[table] || {};
      
      // Check for missing columns in production
      Object.keys(devColumns).forEach(column => {
        if (!prodColumns[column]) {
          this.differences.push({
            type: 'missing_column',
            table,
            column,
            details: devColumns[column],
            environment: 'production'
          });
        } else {
          // Check for type differences
          const dev = devColumns[column];
          const prod = prodColumns[column];
          
          if (dev.data_type !== prod.data_type) {
            this.differences.push({
              type: 'type_mismatch',
              table,
              column,
              dev_type: dev.data_type,
              prod_type: prod.data_type
            });
          }
        }
      });
      
      // Check for extra columns in production (not in dev)
      Object.keys(prodColumns).forEach(column => {
        if (!devColumns[column]) {
          this.differences.push({
            type: 'extra_column',
            table,
            column,
            details: prodColumns[column],
            environment: 'production'
          });
        }
      });
    });
    
    // Check for missing tables
    Object.keys(prodTables).forEach(table => {
      if (!devTables[table]) {
        this.differences.push({
          type: 'extra_table',
          table,
          environment: 'production'
        });
      }
    });
    
    return true;
  }

  /**
   * Generate migration SQL
   */
  generateMigrations() {
    this.migrations = [];
    
    // Group differences by table
    const tableChanges = {};
    this.differences.forEach(diff => {
      if (!tableChanges[diff.table]) {
        tableChanges[diff.table] = [];
      }
      tableChanges[diff.table].push(diff);
    });
    
    // Generate SQL for each table
    Object.keys(tableChanges).forEach(table => {
      const changes = tableChanges[table];
      const alterStatements = [];
      
      changes.forEach(change => {
        if (change.type === 'missing_column') {
          // Production is missing this column
          const dataType = this.mapDataType(change.details.data_type, change.details.max_length);
          const nullable = change.details.is_nullable === 'YES' ? '' : ' NOT NULL';
          const defaultVal = change.details.default ? ` DEFAULT ${change.details.default}` : '';
          
          alterStatements.push(
            `ADD COLUMN IF NOT EXISTS ${change.column} ${dataType}${nullable}${defaultVal}`
          );
        } else if (change.type === 'type_mismatch') {
          // Type doesn't match
          alterStatements.push(
            `-- WARNING: Type mismatch for ${change.column} (dev: ${change.dev_type}, prod: ${change.prod_type})`
          );
          alterStatements.push(
            `-- ALTER COLUMN ${change.column} TYPE ${change.dev_type} USING ${change.column}::${change.dev_type}`
          );
        }
      });
      
      if (alterStatements.length > 0) {
        this.migrations.push({
          table,
          sql: `ALTER TABLE ${table}\n  ${alterStatements.join(',\n  ')};`
        });
      }
    });
  }

  /**
   * Map data types correctly
   */
  mapDataType(dataType, maxLength) {
    if (dataType === 'character varying' && maxLength) {
      return `VARCHAR(${maxLength})`;
    }
    if (dataType === 'character varying') {
      return 'VARCHAR(255)';
    }
    if (dataType === 'timestamp without time zone') {
      return 'TIMESTAMP';
    }
    return dataType.toUpperCase();
  }

  /**
   * Report differences
   */
  reportDifferences() {
    if (this.differences.length === 0) {
      console.log('\n✅ Development and Production schemas are aligned!');
      return;
    }
    
    console.log(`\n⚠️  Found ${this.differences.length} schema differences:\n`);
    
    // Group by type
    const missing = this.differences.filter(d => d.type === 'missing_column');
    const mismatches = this.differences.filter(d => d.type === 'type_mismatch');
    const extra = this.differences.filter(d => d.type === 'extra_column');
    
    if (missing.length > 0) {
      console.log('🔴 CRITICAL - Missing columns in Production:');
      console.log('These will cause failures when code expects these fields!\n');
      missing.forEach(diff => {
        console.log(`   ❌ ${diff.table}.${diff.column} (${diff.details.data_type})`);
      });
      console.log('');
    }
    
    if (mismatches.length > 0) {
      console.log('⚠️  Type mismatches between environments:');
      mismatches.forEach(diff => {
        console.log(`   ⚠️  ${diff.table}.${diff.column}: dev=${diff.dev_type}, prod=${diff.prod_type}`);
      });
      console.log('');
    }
    
    if (extra.length > 0) {
      console.log('ℹ️  Extra columns in Production (not in Dev):');
      extra.forEach(diff => {
        console.log(`   ➕ ${diff.table}.${diff.column}`);
      });
      console.log('');
    }
  }

  /**
   * Save migration SQL to file
   */
  saveMigrations() {
    if (this.migrations.length === 0) {
      console.log('No migrations needed.');
      return;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `migration_${timestamp}.sql`;
    const filepath = path.join(this.projectRoot, 'tpe-database', 'migrations', filename);
    
    let content = `-- Database Migration: Development to Production
-- Generated: ${new Date().toISOString()}
-- 
-- IMPORTANT: Review these changes before applying to production!
-- Test in a staging environment first if possible.

`;
    
    // Add migration for critical missing columns (from our current issue)
    const criticalTables = ['events', 'books', 'podcasts'];
    const criticalMigrations = this.migrations.filter(m => criticalTables.includes(m.table));
    
    if (criticalMigrations.length > 0) {
      content += '-- CRITICAL: Missing columns for forms already deployed to production\n';
      content += '-- These must be applied immediately!\n\n';
      
      criticalMigrations.forEach(migration => {
        content += `-- Table: ${migration.table}\n`;
        content += migration.sql + '\n\n';
      });
    }
    
    // Add other migrations
    const otherMigrations = this.migrations.filter(m => !criticalTables.includes(m.table));
    if (otherMigrations.length > 0) {
      content += '-- Other schema differences\n\n';
      
      otherMigrations.forEach(migration => {
        content += `-- Table: ${migration.table}\n`;
        content += migration.sql + '\n\n';
      });
    }
    
    // Ensure migrations directory exists
    const migrationsDir = path.dirname(filepath);
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, content);
    console.log(`\n📝 Migration SQL saved to: ${filename}`);
    console.log('\n⚠️  IMPORTANT: Review the migration carefully before applying to production!');
    
    // Also create a batch file to apply the migration
    const applyBatchContent = `@echo off
echo.
echo ========================================
echo APPLYING PRODUCTION MIGRATION
echo ========================================
echo.
echo THIS WILL MODIFY THE PRODUCTION DATABASE!
echo.
set /p confirm="Are you SURE you want to apply this migration to PRODUCTION? (type YES): "
if not "%confirm%"=="YES" (
    echo Migration cancelled.
    exit /b 1
)

set PGPASSWORD=dBP0wer100!!
"C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe" -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -p 5432 -f "${filename}"

echo.
echo Migration complete. Check for any errors above.
pause`;
    
    const applyBatchPath = path.join(migrationsDir, `apply_${timestamp}.bat`);
    fs.writeFileSync(applyBatchPath, applyBatchContent);
    console.log(`\n🔧 To apply this migration to production, run: ./tpe-database/migrations/apply_${timestamp}.bat`);
  }

  /**
   * Run full comparison
   */
  run(options = {}) {
    const success = this.compareSchemas(options.table);
    if (!success) return;
    
    this.reportDifferences();
    
    if (options.generate && this.differences.length > 0) {
      this.generateMigrations();
      this.saveMigrations();
    } else if (this.differences.length > 0) {
      console.log('💡 Run with --generate flag to create migration SQL file');
    }
  }
}

// CLI handling
const checker = new DatabaseMigrationChecker();
const args = process.argv.slice(2);

const options = {
  table: null,
  generate: false
};

// Parse arguments
args.forEach((arg, index) => {
  if (arg === '--table' && args[index + 1]) {
    options.table = args[index + 1];
  }
  if (arg === '--generate') {
    options.generate = true;
  }
});

// Show help if needed
if (args.includes('--help')) {
  console.log(`
Database Migration Checker - Compare Dev vs Production Schemas

Usage:
  node tools/database-migration-checker.js [options]

Options:
  --table <name>  Compare specific table only
  --generate      Generate migration SQL file
  --help          Show this help message

Examples:
  node tools/database-migration-checker.js
  node tools/database-migration-checker.js --table events
  node tools/database-migration-checker.js --generate
`);
  process.exit(0);
}

// Run the checker
checker.run(options);