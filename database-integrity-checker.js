#!/usr/bin/env node

/**
 * Database Integrity Checker
 *
 * Scans all database tables for data integrity issues:
 * - Malformed JSON in JSONB/TEXT fields
 * - PostgreSQL array syntax {val1,val2} instead of JSON ["val1","val2"]
 * - NULL values in required fields
 * - Data type mismatches
 *
 * Usage:
 *   node database-integrity-checker.js          # Check only
 *   node database-integrity-checker.js --fix    # Check and auto-fix
 *   node database-integrity-checker.js --table=podcasts  # Check specific table
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// Parse command line arguments
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');
const specificTable = args.find(arg => arg.startsWith('--table='))?.split('=')[1];

// Database configuration
const dbConfig = {
  host: 'localhost',
  port: 5432,
  database: 'tpedb',
  user: 'postgres',
  password: 'TPXP0stgres!!'
};

const pool = new Pool(dbConfig);

// Define expected JSON fields per table
const JSON_FIELD_DEFINITIONS = {
  podcasts: {
    focus_areas_covered: { type: 'array', required: false },
    topics: { type: 'array', required: false },
    key_takeaways: { type: 'array', required: false }
  },
  books: {
    focus_areas_covered: { type: 'array', required: false },
    topics: { type: 'array', required: false },
    key_takeaways: { type: 'array', required: false }
  },
  events: {
    focus_areas: { type: 'array', required: false },
    speaker_topics: { type: 'array', required: false }
  },
  partners: {
    focus_areas_served: { type: 'array', required: false },
    target_revenue_range: { type: 'array', required: false },
    key_differentiators: { type: 'array', required: false },
    client_testimonials: { type: 'array', required: false },
    geographic_regions: { type: 'array', required: false },
    industries_served: { type: 'array', required: false }
  },
  contractors: {
    focus_areas: { type: 'array', required: false },
    services_offered: { type: 'array', required: false }
  },
  podcast_episodes: {
    focus_areas_covered: { type: 'array', required: false },
    topics: { type: 'array', required: false },
    key_takeaways: { type: 'array', required: false }
  },
  video_content: {
    topics: { type: 'array', required: false },
    key_takeaways: { type: 'array', required: false }
  }
};

// Statistics tracker
const stats = {
  tablesChecked: 0,
  recordsChecked: 0,
  issuesFound: 0,
  issuesFixed: 0,
  errors: []
};

/**
 * Detect if string is PostgreSQL array syntax
 */
function isPostgresArraySyntax(str) {
  if (typeof str !== 'string') return false;
  return str.startsWith('{') && str.endsWith('}') && !str.startsWith('{[');
}

/**
 * Convert PostgreSQL array syntax to JSON array
 */
function convertPostgresArrayToJson(str) {
  try {
    // Remove outer braces
    let content = str.slice(1, -1);

    // Split by comma but respect quoted strings
    const items = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        items.push(current.trim().replace(/^"(.*)"$/, '$1'));
        current = '';
      } else {
        current += char;
      }
    }
    if (current) {
      items.push(current.trim().replace(/^"(.*)"$/, '$1'));
    }

    return JSON.stringify(items);
  } catch (e) {
    console.error(`${colors.red}Failed to convert Postgres array: ${str}${colors.reset}`);
    return null;
  }
}

/**
 * Convert comma-separated string to JSON array
 */
function convertCommaSeparatedToJson(str) {
  try {
    // Split by comma and trim whitespace
    const items = str.split(',').map(item => item.trim()).filter(item => item.length > 0);
    return JSON.stringify(items);
  } catch (e) {
    console.error(`${colors.red}Failed to convert comma-separated string: ${str}${colors.reset}`);
    return null;
  }
}

/**
 * Validate JSON field value
 */
function validateJsonField(value, fieldName, definition) {
  const issues = [];

  if (value === null || value === undefined) {
    if (definition.required) {
      issues.push({ type: 'null_required', field: fieldName, value: null });
    }
    return issues;
  }

  // Check if it's PostgreSQL array syntax
  if (isPostgresArraySyntax(value)) {
    issues.push({
      type: 'postgres_array_syntax',
      field: fieldName,
      value: value,
      fixedValue: convertPostgresArrayToJson(value)
    });
    return issues;
  }

  // Try to parse as JSON
  let parsed;
  try {
    parsed = typeof value === 'string' ? JSON.parse(value) : value;
  } catch (e) {
    // Check if it's an array with unquoted values like [val1,val2]
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']') && !value.includes('"')) {
      const content = value.slice(1, -1);
      const items = content.split(',').map(item => item.trim()).filter(item => item.length > 0);
      issues.push({
        type: 'unquoted_array_values',
        field: fieldName,
        value: value,
        fixedValue: JSON.stringify(items)
      });
      return issues;
    }

    // Check if it's a comma-separated string that can be converted
    if (typeof value === 'string' && value.includes(',') && !value.startsWith('[') && !value.startsWith('{')) {
      issues.push({
        type: 'comma_separated_string',
        field: fieldName,
        value: value,
        fixedValue: convertCommaSeparatedToJson(value)
      });
      return issues;
    }

    issues.push({
      type: 'invalid_json',
      field: fieldName,
      value: value,
      error: e.message
    });
    return issues;
  }

  // Validate expected type
  if (definition.type === 'array' && !Array.isArray(parsed)) {
    issues.push({
      type: 'type_mismatch',
      field: fieldName,
      expected: 'array',
      actual: typeof parsed,
      value: value
    });
  }

  return issues;
}

/**
 * Check a single table for integrity issues
 */
async function checkTable(tableName) {
  const fieldDefinitions = JSON_FIELD_DEFINITIONS[tableName];
  if (!fieldDefinitions) {
    console.log(`${colors.yellow}⚠️  No JSON field definitions for table: ${tableName}${colors.reset}`);
    return;
  }

  console.log(`\n${colors.cyan}${colors.bold}Checking table: ${tableName}${colors.reset}`);
  stats.tablesChecked++;

  // Get all records
  const result = await pool.query(`SELECT * FROM ${tableName}`);
  const records = result.rows;

  console.log(`${colors.blue}Found ${records.length} records${colors.reset}`);

  const tableIssues = [];

  for (const record of records) {
    stats.recordsChecked++;

    for (const [fieldName, definition] of Object.entries(fieldDefinitions)) {
      const value = record[fieldName];
      const issues = validateJsonField(value, fieldName, definition);

      if (issues.length > 0) {
        tableIssues.push({
          id: record.id,
          issues: issues
        });
        stats.issuesFound += issues.length;
      }
    }
  }

  // Report issues
  if (tableIssues.length > 0) {
    console.log(`${colors.red}${colors.bold}❌ Found ${tableIssues.length} records with issues:${colors.reset}`);

    for (const record of tableIssues) {
      console.log(`\n  ${colors.yellow}Record ID: ${record.id}${colors.reset}`);

      for (const issue of record.issues) {
        console.log(`    ${colors.red}• ${issue.type}${colors.reset}: ${issue.field}`);

        if (issue.value) {
          console.log(`      Current: ${colors.magenta}${JSON.stringify(issue.value).substring(0, 100)}${colors.reset}`);
        }

        if (issue.fixedValue) {
          console.log(`      Fixed:   ${colors.green}${issue.fixedValue.substring(0, 100)}${colors.reset}`);

          // Apply fix if --fix flag is set
          if (shouldFix) {
            try {
              await pool.query(
                `UPDATE ${tableName} SET ${issue.field} = $1 WHERE id = $2`,
                [issue.fixedValue, record.id]
              );
              stats.issuesFixed++;
              console.log(`      ${colors.green}✓ Fixed${colors.reset}`);
            } catch (e) {
              console.log(`      ${colors.red}✗ Fix failed: ${e.message}${colors.reset}`);
              stats.errors.push({ table: tableName, id: record.id, error: e.message });
            }
          }
        }
      }
    }
  } else {
    console.log(`${colors.green}✓ No issues found${colors.reset}`);
  }
}

/**
 * Get all tables with JSON field definitions
 */
function getTablesToCheck() {
  if (specificTable) {
    return [specificTable];
  }
  return Object.keys(JSON_FIELD_DEFINITIONS);
}

/**
 * Generate report
 */
function generateReport() {
  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}                   INTEGRITY CHECK REPORT                    ${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  console.log(`${colors.bold}Statistics:${colors.reset}`);
  console.log(`  Tables checked:    ${colors.cyan}${stats.tablesChecked}${colors.reset}`);
  console.log(`  Records checked:   ${colors.cyan}${stats.recordsChecked}${colors.reset}`);
  console.log(`  Issues found:      ${stats.issuesFound > 0 ? colors.red : colors.green}${stats.issuesFound}${colors.reset}`);

  if (shouldFix) {
    console.log(`  Issues fixed:      ${colors.green}${stats.issuesFixed}${colors.reset}`);
    console.log(`  Fix failures:      ${stats.errors.length > 0 ? colors.red : colors.green}${stats.errors.length}${colors.reset}`);
  }

  if (stats.errors.length > 0) {
    console.log(`\n${colors.red}${colors.bold}Errors encountered:${colors.reset}`);
    for (const error of stats.errors) {
      console.log(`  ${colors.red}• ${error.table} (ID: ${error.id}): ${error.error}${colors.reset}`);
    }
  }

  console.log(`\n${colors.bold}${colors.cyan}═══════════════════════════════════════════════════════════${colors.reset}\n`);

  if (stats.issuesFound > 0 && !shouldFix) {
    console.log(`${colors.yellow}💡 Run with --fix flag to automatically fix issues${colors.reset}\n`);
  }

  // Save report to file
  const reportPath = path.join(__dirname, 'integrity-check-report.json');
  const report = {
    timestamp: new Date().toISOString(),
    mode: shouldFix ? 'fix' : 'check',
    stats: stats,
    errors: stats.errors
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`${colors.green}📄 Report saved to: ${reportPath}${colors.reset}\n`);
}

/**
 * Main execution
 */
async function main() {
  console.log(`${colors.bold}${colors.cyan}Database Integrity Checker${colors.reset}`);
  console.log(`${colors.blue}Mode: ${shouldFix ? 'CHECK & FIX' : 'CHECK ONLY'}${colors.reset}`);

  if (specificTable) {
    console.log(`${colors.blue}Target: ${specificTable}${colors.reset}`);
  }

  try {
    // Test database connection
    await pool.query('SELECT NOW()');
    console.log(`${colors.green}✓ Database connected${colors.reset}`);

    // Check tables
    const tables = getTablesToCheck();
    for (const table of tables) {
      try {
        await checkTable(table);
      } catch (e) {
        console.error(`${colors.red}Error checking table ${table}: ${e.message}${colors.reset}`);
        stats.errors.push({ table: table, error: e.message });
      }
    }

    // Generate report
    generateReport();

  } catch (error) {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the checker
main().catch(console.error);