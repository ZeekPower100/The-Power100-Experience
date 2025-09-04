#!/usr/bin/env node
/**
 * DATABASE MIGRATION CHECKER
 * Detects pending migrations and schema differences between dev and production
 */

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');
const chalk = require('chalk');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, 'tpe-backend', '.env.development') });

// Database configurations
const devConfig = {
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tpedb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
  port: process.env.DB_PORT || 5432
};

const prodConfig = {
  host: 'tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com',
  database: 'tpedb',
  user: 'tpeadmin',
  password: 'dBP0wer100!!',
  port: 5432,
  ssl: { rejectUnauthorized: false }
};

class MigrationChecker {
  constructor() {
    this.devClient = new Client(devConfig);
    this.prodClient = new Client(prodConfig);
    this.issues = [];
    this.warnings = [];
    this.migrations = [];
  }

  async connect() {
    try {
      await this.devClient.connect();
      console.log(chalk.green('✓') + ' Connected to development database');
    } catch (error) {
      console.error(chalk.red('✗') + ' Failed to connect to development database:', error.message);
      process.exit(1);
    }

    try {
      await this.prodClient.connect();
      console.log(chalk.green('✓') + ' Connected to production database');
    } catch (error) {
      console.error(chalk.yellow('⚠') + ' Could not connect to production database');
      console.log(chalk.gray('  Skipping production comparison'));
      this.prodClient = null;
    }
  }

  async getTableColumns(client, tableName) {
    const query = `
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `;
    
    try {
      const result = await client.query(query, [tableName]);
      return result.rows;
    } catch (error) {
      return [];
    }
  }

  async checkTableSchema(tableName) {
    console.log(chalk.cyan(`\n  Checking table: ${tableName}`));
    
    const devColumns = await this.getTableColumns(this.devClient, tableName);
    
    if (!this.prodClient) {
      console.log(chalk.gray('    Production comparison skipped'));
      return;
    }

    const prodColumns = await this.getTableColumns(this.prodClient, tableName);
    
    // Check for missing columns in production
    const prodColumnNames = new Set(prodColumns.map(col => col.column_name));
    const devColumnNames = new Set(devColumns.map(col => col.column_name));
    
    const missingInProd = devColumns.filter(col => !prodColumnNames.has(col.column_name));
    const missingInDev = prodColumns.filter(col => !devColumnNames.has(col.column_name));
    
    if (missingInProd.length > 0) {
      console.log(chalk.red(`    ✗ Production missing ${missingInProd.length} columns:`));
      missingInProd.forEach(col => {
        console.log(chalk.red(`      - ${col.column_name} (${col.data_type})`));
        this.issues.push(`Table '${tableName}' missing column '${col.column_name}' in production`);
      });
    }
    
    if (missingInDev.length > 0) {
      console.log(chalk.yellow(`    ⚠ Development missing ${missingInDev.length} columns:`));
      missingInDev.forEach(col => {
        console.log(chalk.yellow(`      - ${col.column_name}`));
        this.warnings.push(`Table '${tableName}' has extra column '${col.column_name}' in production`);
      });
    }
    
    if (missingInProd.length === 0 && missingInDev.length === 0) {
      console.log(chalk.green('    ✓ Schema is synchronized'));
    }
  }

  async checkPendingMigrations() {
    console.log(chalk.cyan.bold('\n🔍 Checking for Pending Migrations\n'));
    
    const migrationsDir = path.join(__dirname, 'tpe-backend', 'migrations');
    
    try {
      const files = await fs.readdir(migrationsDir);
      const migrationFiles = files.filter(f => f.endsWith('.js') && f !== 'README.md');
      
      if (migrationFiles.length > 0) {
        console.log(chalk.yellow('  ⚠ Found migration files:'));
        
        for (const file of migrationFiles) {
          const filePath = path.join(migrationsDir, file);
          const stats = await fs.stat(filePath);
          const ageInDays = Math.floor((Date.now() - stats.mtime) / (1000 * 60 * 60 * 24));
          
          console.log(chalk.yellow(`    - ${file} (${ageInDays} days old)`));
          
          // Try to read the migration file to understand what it does
          try {
            const content = await fs.readFile(filePath, 'utf8');
            const alterMatches = content.match(/ALTER TABLE (\w+) ADD COLUMN(?: IF NOT EXISTS)? (\w+)/gi);
            if (alterMatches) {
              console.log(chalk.gray('      Adds columns:'));
              alterMatches.forEach(match => {
                const parts = match.match(/ALTER TABLE (\w+) ADD COLUMN(?: IF NOT EXISTS)? (\w+)/i);
                if (parts) {
                  console.log(chalk.gray(`        • ${parts[2]} to ${parts[1]}`));
                }
              });
            }
          } catch (err) {
            // Ignore read errors
          }
          
          this.migrations.push(file);
        }
      } else {
        console.log(chalk.green('  ✓ No pending migration files found'));
      }
    } catch (error) {
      console.log(chalk.gray('  Could not check migrations directory'));
    }
  }

  async checkCodeUsage() {
    console.log(chalk.cyan.bold('\n🔍 Checking Code References to Database Fields\n'));
    
    // Check if code is using fields that might not exist in production
    const fieldsToCheck = [
      'client_demos',
      'client_references',
      'last_quarterly_report',
      'client_testimonials',
      'landing_page_videos'
    ];
    
    for (const field of fieldsToCheck) {
      // Check if field exists in production
      if (this.prodClient) {
        const query = `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'strategic_partners' 
          AND column_name = $1
        `;
        
        const result = await this.prodClient.query(query, [field]);
        
        if (result.rows.length === 0) {
          console.log(chalk.red(`  ✗ Code uses field '${field}' but it doesn't exist in production!`));
          this.issues.push(`Field '${field}' used in code but missing in production database`);
        } else {
          console.log(chalk.green(`  ✓ Field '${field}' exists in production`));
        }
      }
    }
  }

  async generateMigrationScript() {
    if (this.issues.length === 0) return;
    
    console.log(chalk.cyan.bold('\n📝 Generating Migration Script\n'));
    
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `auto_migration_${timestamp}.sql`;
    
    let script = `-- Auto-generated migration script
-- Created: ${new Date().toISOString()}
-- Issues found: ${this.issues.length}

BEGIN;

`;

    // Add ALTER TABLE statements for missing columns
    const columnIssues = this.issues.filter(issue => issue.includes('missing column'));
    const tableColumns = {};
    
    for (const issue of columnIssues) {
      const match = issue.match(/Table '(\w+)' missing column '(\w+)'/);
      if (match) {
        const [, table, column] = match;
        if (!tableColumns[table]) tableColumns[table] = [];
        tableColumns[table].push(column);
      }
    }
    
    for (const [table, columns] of Object.entries(tableColumns)) {
      script += `-- Adding missing columns to ${table}\n`;
      for (const column of columns) {
        // Get column definition from dev database
        const devCol = await this.getTableColumns(this.devClient, table);
        const colDef = devCol.find(c => c.column_name === column);
        
        if (colDef) {
          const dataType = colDef.data_type === 'USER-DEFINED' ? 'JSONB' : colDef.data_type;
          const nullable = colDef.is_nullable === 'YES' ? '' : ' NOT NULL';
          const defaultVal = colDef.column_default ? ` DEFAULT ${colDef.column_default}` : '';
          
          script += `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${dataType}${nullable}${defaultVal};\n`;
        }
      }
      script += '\n';
    }
    
    script += `COMMIT;

-- Run this script on production with:
-- psql -h tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com -U tpeadmin -d tpedb -f ${filename}
`;

    const scriptPath = path.join(__dirname, 'tpe-backend', 'migrations', filename);
    await fs.writeFile(scriptPath, script);
    
    console.log(chalk.green(`  ✓ Migration script generated: ${filename}`));
    console.log(chalk.gray(`    Location: tpe-backend/migrations/${filename}`));
  }

  async run() {
    console.log(chalk.bold('\n=========================================='));
    console.log(chalk.bold('🗄️  DATABASE MIGRATION CHECKER'));
    console.log(chalk.bold('==========================================\n'));
    
    await this.connect();
    
    // Check for pending migrations
    await this.checkPendingMigrations();
    
    // Check critical tables
    console.log(chalk.cyan.bold('\n🔍 Checking Database Schema\n'));
    
    const tables = ['contractors', 'strategic_partners', 'demo_bookings'];
    for (const table of tables) {
      await this.checkTableSchema(table);
    }
    
    // Check code usage
    await this.checkCodeUsage();
    
    // Generate migration script if needed
    if (this.issues.length > 0) {
      await this.generateMigrationScript();
    }
    
    // Summary report
    console.log(chalk.bold('\n=========================================='));
    console.log(chalk.bold('DATABASE MIGRATION REPORT'));
    console.log(chalk.bold('==========================================\n'));
    
    console.log(chalk.bold('Summary:'));
    console.log(`  Critical Issues: ${chalk.red(this.issues.length)}`);
    console.log(`  Warnings: ${chalk.yellow(this.warnings.length)}`);
    console.log(`  Pending Migrations: ${chalk.cyan(this.migrations.length)}`);
    
    if (this.issues.length > 0) {
      console.log(chalk.red.bold('\n❌ CRITICAL ISSUES THAT WILL BREAK PRODUCTION:'));
      this.issues.forEach(issue => {
        console.log(chalk.red(`  • ${issue}`));
      });
    }
    
    if (this.migrations.length > 0) {
      console.log(chalk.yellow.bold('\n⚠️  MIGRATIONS TO RUN IN PRODUCTION:'));
      this.migrations.forEach(migration => {
        console.log(chalk.yellow(`  • node tpe-backend/migrations/${migration}`));
      });
    }
    
    if (this.warnings.length > 0) {
      console.log(chalk.yellow.bold('\n⚠️  WARNINGS:'));
      this.warnings.forEach(warning => {
        console.log(chalk.yellow(`  • ${warning}`));
      });
    }
    
    if (this.issues.length === 0 && this.migrations.length === 0) {
      console.log(chalk.green.bold('\n✅ Database schemas are synchronized!'));
      console.log(chalk.green('No migrations needed.'));
    } else {
      console.log(chalk.red.bold('\n🚨 ACTION REQUIRED:'));
      console.log(chalk.red('1. Run the migrations listed above on production'));
      console.log(chalk.red('2. Or use the auto-generated migration script'));
      console.log(chalk.red('3. Re-run this checker after migrating'));
    }
    
    console.log(chalk.bold('\n==========================================\n'));
    
    // Cleanup
    await this.devClient.end();
    if (this.prodClient) await this.prodClient.end();
    
    // Exit with error if issues found
    if (this.issues.length > 0) {
      process.exit(1);
    }
  }
}

// Run the checker
if (require.main === module) {
  const checker = new MigrationChecker();
  checker.run().catch(error => {
    console.error(chalk.red('Error:'), error);
    process.exit(1);
  });
}

module.exports = MigrationChecker;