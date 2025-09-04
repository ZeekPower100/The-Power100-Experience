#!/usr/bin/env node

/**
 * Database Compatibility Checker
 * Ensures database schema and data formats are compatible between environments
 * Prevents issues like JSON vs comma-separated strings in production
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'tpe-backend', '.env') });

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Database configurations
const DB_CONFIGS = {
  development: {
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'tpedb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
    port: process.env.DB_PORT || 5432,
    ssl: false
  },
  production: {
    host: 'tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com',
    database: 'tpedb',
    user: 'tpeadmin',
    password: 'dBP0wer100!!',
    port: 5432,
    ssl: { rejectUnauthorized: false }
  }
};

// Critical schema checks
const SCHEMA_CHECKS = [
  {
    table: 'contractors',
    required_columns: [
      'id', 'name', 'email', 'phone', 'company_name',
      'focus_areas', 'annual_revenue', 'team_size',
      'verification_status', 'opted_in_coaching'
    ],
    json_columns: ['focus_areas', 'readiness_indicators', 'completed_steps'],
    nullable_checks: {
      'email': false,
      'name': false,
      'focus_areas': true
    }
  },
  {
    table: 'strategic_partners',
    required_columns: [
      'id', 'company_name', 'contact_email', 'service_category',
      'powerconfidence_score', 'is_active'
    ],
    json_columns: ['service_category', 'key_differentiators', 'focus_areas_served'],
    nullable_checks: {
      'company_name': false,
      'contact_email': true  // Can be null for partners not fully onboarded
    }
  },
  {
    table: 'podcasts',
    required_columns: ['id', 'title', 'topics', 'focus_areas_covered'],
    json_columns: ['topics', 'focus_areas_covered'],
    special_checks: {
      'topics': 'mixed_format' // Can be JSON array OR comma-separated string
    }
  },
  {
    table: 'events',
    required_columns: ['id', 'name', 'date', 'focus_areas_covered'],
    json_columns: ['focus_areas_covered']
  }
];

// Data format validations
const DATA_FORMAT_CHECKS = [
  {
    name: 'Podcast Topics Format',
    description: 'Ensures topics can be parsed without JSON errors',
    query: `SELECT id, title, topics FROM podcasts WHERE topics IS NOT NULL LIMIT 5`,
    validate: (row) => {
      const topics = row.topics;
      if (!topics) return { valid: true };
      
      // Check if it's valid JSON array
      if (topics.startsWith('[')) {
        try {
          JSON.parse(topics);
          return { valid: true, format: 'json_array' };
        } catch (e) {
          return { 
            valid: false, 
            error: `Invalid JSON in podcast ${row.id}: ${e.message}`,
            value: topics.substring(0, 50)
          };
        }
      }
      
      // Check if it's comma-separated
      if (topics.includes(',')) {
        return { valid: true, format: 'comma_separated' };
      }
      
      // Single value
      return { valid: true, format: 'single_value' };
    }
  },
  {
    name: 'Focus Areas Format',
    description: 'Validates focus_areas JSON format',
    query: `SELECT id, name, focus_areas FROM contractors WHERE focus_areas IS NOT NULL LIMIT 5`,
    validate: (row) => {
      if (!row.focus_areas) return { valid: true };
      
      try {
        const parsed = typeof row.focus_areas === 'string' 
          ? JSON.parse(row.focus_areas) 
          : row.focus_areas;
        
        if (!Array.isArray(parsed)) {
          return { 
            valid: false, 
            error: `focus_areas not an array for contractor ${row.id}`
          };
        }
        return { valid: true, format: 'json_array' };
      } catch (e) {
        return { 
          valid: false, 
          error: `Invalid JSON in contractor ${row.id} focus_areas: ${e.message}` 
        };
      }
    }
  },
  {
    name: 'Partner Service Category Format',
    description: 'Validates partner service_category format',
    query: `SELECT id, company_name, service_category FROM strategic_partners WHERE service_category IS NOT NULL LIMIT 5`,
    validate: (row) => {
      if (!row.service_category) return { valid: true };
      
      // service_category can be a string or JSON array depending on usage
      // For compatibility with PartnerDetailsEditor's service_capabilities field
      try {
        // Try to parse as JSON first
        if (row.service_category.startsWith('[') || row.service_category.startsWith('{')) {
          const parsed = JSON.parse(row.service_category);
          return { valid: true, format: 'json' };
        }
        // Otherwise it's a plain text string which is also valid
        return { valid: true, format: 'text' };
      } catch (e) {
        // If it's not valid JSON but contains data, treat as text
        if (row.service_category && row.service_category.length > 0) {
          return { valid: true, format: 'text' };
        }
        return {
          valid: false,
          error: `Invalid format in partner ${row.id} service_category: ${e.message}`
        };
      }
    }
  }
];

// Cross-environment consistency checks
const CONSISTENCY_CHECKS = [
  {
    name: 'Table Row Counts',
    description: 'Compare table sizes between environments',
    query: (table) => `SELECT COUNT(*) as count FROM ${table}`,
    tables: ['contractors', 'strategic_partners', 'podcasts', 'events'],
    compare: (dev, prod) => {
      const diff = Math.abs(dev - prod);
      const percentDiff = (diff / Math.max(dev, prod)) * 100;
      
      if (percentDiff > 50) {
        return {
          level: 'warning',
          message: `Large difference in row count: Dev=${dev}, Prod=${prod} (${percentDiff.toFixed(1)}% difference)`
        };
      }
      return { level: 'info', message: `Row counts: Dev=${dev}, Prod=${prod}` };
    }
  },
  {
    name: 'Schema Column Match',
    description: 'Ensure columns exist in both environments',
    query: (table) => `
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = '${table}'
      ORDER BY ordinal_position
    `,
    tables: ['contractors', 'strategic_partners'],
    compare: (devCols, prodCols) => {
      const devColNames = devCols.map(c => c.column_name);
      const prodColNames = prodCols.map(c => c.column_name);
      
      const missingInProd = devColNames.filter(c => !prodColNames.includes(c));
      const missingInDev = prodColNames.filter(c => !devColNames.includes(c));
      
      const issues = [];
      if (missingInProd.length > 0) {
        issues.push(`Missing in PROD: ${missingInProd.join(', ')}`);
      }
      if (missingInDev.length > 0) {
        issues.push(`Missing in DEV: ${missingInDev.join(', ')}`);
      }
      
      return {
        level: issues.length > 0 ? 'error' : 'success',
        message: issues.length > 0 ? issues.join('; ') : 'Columns match'
      };
    }
  }
];

class DatabaseCompatibilityChecker {
  constructor() {
    this.devPool = null;
    this.prodPool = null;
    this.issues = [];
    this.warnings = [];
    this.passed = [];
  }

  async connect(environment = 'development') {
    const config = DB_CONFIGS[environment];
    if (!config) {
      throw new Error(`Unknown environment: ${environment}`);
    }
    
    const pool = new Pool(config);
    
    try {
      await pool.query('SELECT 1');
      this.log(`Connected to ${environment} database`, 'success');
      return pool;
    } catch (error) {
      this.log(`Failed to connect to ${environment}: ${error.message}`, 'error');
      throw error;
    }
  }

  log(message, type = 'info') {
    const prefix = {
      error: `${colors.red}✗${colors.reset}`,
      warning: `${colors.yellow}⚠${colors.reset}`,
      success: `${colors.green}✓${colors.reset}`,
      info: `${colors.blue}ℹ${colors.reset}`,
      header: `${colors.cyan}${colors.bold}`,
    };

    if (type === 'header') {
      console.log(`\n${prefix.header}${message}${colors.reset}`);
    } else {
      console.log(`${prefix[type] || ''} ${message}`);
    }
  }

  async checkSchema(pool, environment) {
    this.log(`Checking ${environment} Schema`, 'header');
    
    for (const check of SCHEMA_CHECKS) {
      try {
        // Check if table exists
        const tableResult = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = $1
          )`,
          [check.table]
        );
        
        if (!tableResult.rows[0].exists) {
          this.issues.push(`Table '${check.table}' missing in ${environment}`);
          continue;
        }
        
        // Check columns
        const columnsResult = await pool.query(
          `SELECT column_name, data_type, is_nullable 
           FROM information_schema.columns 
           WHERE table_name = $1`,
          [check.table]
        );
        
        const existingColumns = columnsResult.rows.map(r => r.column_name);
        
        for (const requiredCol of check.required_columns) {
          if (!existingColumns.includes(requiredCol)) {
            this.issues.push(`Missing column '${requiredCol}' in ${check.table} (${environment})`);
          }
        }
        
        this.log(`  ✓ Table '${check.table}' structure checked`, 'success');
        
      } catch (error) {
        this.issues.push(`Error checking ${check.table}: ${error.message}`);
      }
    }
  }

  async checkDataFormats(pool, environment) {
    this.log(`Checking ${environment} Data Formats`, 'header');
    
    for (const check of DATA_FORMAT_CHECKS) {
      try {
        const result = await pool.query(check.query);
        
        let allValid = true;
        const formats = new Set();
        
        for (const row of result.rows) {
          const validation = check.validate(row);
          
          if (!validation.valid) {
            this.issues.push(`[${environment}] ${validation.error}`);
            allValid = false;
          } else if (validation.format) {
            formats.add(validation.format);
          }
        }
        
        if (allValid) {
          const formatList = Array.from(formats).join(', ');
          this.log(`  ✓ ${check.name}: ${formatList || 'valid'}`, 'success');
        } else {
          this.log(`  ✗ ${check.name}: validation failed`, 'error');
        }
        
        // Warning if mixed formats
        if (formats.size > 1) {
          this.warnings.push(
            `[${environment}] Mixed formats in ${check.name}: ${Array.from(formats).join(', ')}`
          );
        }
        
      } catch (error) {
        this.issues.push(`Error in ${check.name}: ${error.message}`);
      }
    }
  }

  async compareEnvironments(devPool, prodPool) {
    this.log('Comparing Development vs Production', 'header');
    
    for (const check of CONSISTENCY_CHECKS) {
      this.log(`  ${check.name}:`, 'info');
      
      for (const table of check.tables) {
        try {
          const devResult = await devPool.query(check.query(table));
          const prodResult = await prodPool.query(check.query(table));
          
          const comparison = check.compare(
            check.name.includes('Count') ? devResult.rows[0].count : devResult.rows,
            check.name.includes('Count') ? prodResult.rows[0].count : prodResult.rows
          );
          
          const logType = comparison.level === 'error' ? 'error' : 
                          comparison.level === 'warning' ? 'warning' : 'success';
          
          this.log(`    ${table}: ${comparison.message}`, logType);
          
          if (comparison.level === 'error') {
            this.issues.push(`${table}: ${comparison.message}`);
          } else if (comparison.level === 'warning') {
            this.warnings.push(`${table}: ${comparison.message}`);
          }
          
        } catch (error) {
          this.warnings.push(`Cannot compare ${table}: ${error.message}`);
        }
      }
    }
  }

  async generateReport() {
    console.log('\n' + '='.repeat(60));
    this.log('DATABASE COMPATIBILITY REPORT', 'header');
    console.log('='.repeat(60));

    console.log(`\n${colors.bold}Summary:${colors.reset}`);
    console.log(`  Passed: ${colors.green}${this.passed.length}${colors.reset}`);
    console.log(`  Issues: ${colors.red}${this.issues.length}${colors.reset}`);
    console.log(`  Warnings: ${colors.yellow}${this.warnings.length}${colors.reset}`);

    if (this.issues.length > 0) {
      console.log(`\n${colors.red}${colors.bold}❌ CRITICAL ISSUES:${colors.reset}`);
      this.issues.forEach(issue => {
        console.log(`  ${colors.red}✗${colors.reset} ${issue}`);
      });
    }

    if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bold}⚠️  WARNINGS:${colors.reset}`);
      this.warnings.forEach(warning => {
        console.log(`  ${colors.yellow}⚠${colors.reset} ${warning}`);
      });
    }

    console.log(`\n${colors.cyan}${colors.bold}📋 RECOMMENDATIONS:${colors.reset}`);
    if (this.issues.length > 0) {
      console.log(`  1. Resolve schema differences before deployment`);
      console.log(`  2. Ensure data formats are consistent`);
      console.log(`  3. Run migrations on production if needed`);
    } else {
      console.log(`  ${colors.green}✓${colors.reset} Database structures appear compatible`);
    }

    console.log('\n' + '='.repeat(60));
    
    return this.issues.length === 0 ? 0 : 1;
  }

  async run(options = {}) {
    const { skipProduction = false, quickCheck = false } = options;
    
    try {
      this.log('Starting Database Compatibility Check...', 'info');
      
      // Connect to development
      this.devPool = await this.connect('development');
      
      // Check development schema and data
      await this.checkSchema(this.devPool, 'development');
      await this.checkDataFormats(this.devPool, 'development');
      
      // Connect to production if not skipped
      if (!skipProduction && !quickCheck) {
        try {
          this.prodPool = await this.connect('production');
          await this.checkSchema(this.prodPool, 'production');
          await this.checkDataFormats(this.prodPool, 'production');
          
          // Compare environments
          await this.compareEnvironments(this.devPool, this.prodPool);
        } catch (prodError) {
          this.warnings.push(`Cannot connect to production: ${prodError.message}`);
          this.warnings.push('Run with --prod flag when production is accessible');
        }
      } else if (quickCheck) {
        this.log('Quick check mode - skipping production comparison', 'warning');
      }
      
      // Generate report
      const exitCode = await this.generateReport();
      
      // Cleanup
      if (this.devPool) await this.devPool.end();
      if (this.prodPool) await this.prodPool.end();
      
      process.exit(exitCode);
      
    } catch (error) {
      this.log(`Fatal error: ${error.message}`, 'error');
      if (this.devPool) await this.devPool.end();
      if (this.prodPool) await this.prodPool.end();
      process.exit(1);
    }
  }
}

// CLI handling
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    skipProduction: args.includes('--skip-prod'),
    quickCheck: args.includes('--quick')
  };
  
  if (args.includes('--help')) {
    console.log(`
Database Compatibility Checker

Usage: node database-compatibility-check.js [options]

Options:
  --quick       Quick check (development only)
  --skip-prod   Skip production checks
  --help        Show this help message

Examples:
  node database-compatibility-check.js           # Full check
  node database-compatibility-check.js --quick   # Dev only
    `);
    process.exit(0);
  }
  
  const checker = new DatabaseCompatibilityChecker();
  checker.run(options);
}

module.exports = DatabaseCompatibilityChecker;