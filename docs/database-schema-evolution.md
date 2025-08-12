# Database Schema Evolution Guide

## 🎯 Overview

This guide provides technical procedures for evolving The Power100 Experience database schema safely and efficiently. It covers migration strategies, rollback procedures, and best practices for maintaining data integrity during schema changes.

## 📋 Schema Change Categories

### Category 1: Non-Breaking Changes (Safe)
- Adding new optional columns
- Adding new tables
- Adding indexes
- Adding constraints that don't affect existing data
- Expanding column sizes (varchar limits)

### Category 2: Breaking Changes (Requires Migration)
- Removing columns
- Renaming columns
- Changing column types
- Adding NOT NULL constraints to existing columns
- Splitting or merging tables

### Category 3: Data Migration Required
- Moving data between tables
- Transforming existing data formats
- Consolidating or splitting data fields
- Updating foreign key relationships

## 🗃️ Current Schema State

### Core Tables
```sql
-- Contractors (11 records in production)
CREATE TABLE contractors (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  company_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Strategic Partners (3 records in production)
CREATE TABLE strategic_partners (
  id INTEGER PRIMARY KEY,
  company_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Admin Users (1 record in production)
CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔄 Migration Procedures

### Step 1: Pre-Migration Assessment

#### Database Backup
```bash
# SQLite Backup
cp power100.db power100_backup_$(date +%Y%m%d_%H%M%S).db

# PostgreSQL Backup (for production)
pg_dump power100_prod > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Data Inventory
```sql
-- Check current data volumes
SELECT 'contractors' as table_name, COUNT(*) as record_count FROM contractors
UNION ALL
SELECT 'strategic_partners', COUNT(*) FROM strategic_partners  
UNION ALL
SELECT 'admin_users', COUNT(*) FROM admin_users;

-- Check for data quality issues
SELECT 
  'contractors_missing_email' as issue,
  COUNT(*) as count 
FROM contractors WHERE email IS NULL OR email = '';
```

### Step 2: Migration Script Template

```sql
-- Migration: Add Enhanced Contractor Fields
-- Date: 2025-01-XX
-- Description: Add all screenshot-based fields to contractors table
-- Risk Level: LOW (Non-breaking additions)

BEGIN TRANSACTION;

-- Add new fields with safe defaults
ALTER TABLE contractors ADD COLUMN company_website TEXT;
ALTER TABLE contractors ADD COLUMN service_area TEXT;
ALTER TABLE contractors ADD COLUMN services_offered TEXT DEFAULT '[]'; -- JSON array
ALTER TABLE contractors ADD COLUMN verification_status TEXT DEFAULT 'pending';
ALTER TABLE contractors ADD COLUMN verification_code TEXT;
ALTER TABLE contractors ADD COLUMN focus_areas TEXT DEFAULT '[]'; -- JSON array
ALTER TABLE contractors ADD COLUMN primary_focus_area TEXT;
ALTER TABLE contractors ADD COLUMN annual_revenue TEXT;
ALTER TABLE contractors ADD COLUMN team_size INTEGER;
ALTER TABLE contractors ADD COLUMN increased_tools BOOLEAN DEFAULT FALSE;
ALTER TABLE contractors ADD COLUMN increased_people BOOLEAN DEFAULT FALSE;
ALTER TABLE contractors ADD COLUMN increased_activity BOOLEAN DEFAULT FALSE;
ALTER TABLE contractors ADD COLUMN current_stage TEXT DEFAULT 'verification';
ALTER TABLE contractors ADD COLUMN assigned_partner_id INTEGER;
ALTER TABLE contractors ADD COLUMN demo_scheduled_date DATETIME;
ALTER TABLE contractors ADD COLUMN opted_in_coaching BOOLEAN DEFAULT FALSE;

-- Add foreign key constraint
CREATE INDEX idx_contractors_assigned_partner ON contractors(assigned_partner_id);

-- Verify migration
SELECT COUNT(*) as contractor_count FROM contractors;

-- Check new columns exist
PRAGMA table_info(contractors);

COMMIT;
```

### Step 3: Migration Execution

#### Development Environment
```bash
# Navigate to backend directory
cd tpe-backend

# Run migration script
sqlite3 power100.db < migrations/001_add_contractor_fields.sql

# Verify migration
node -e "
const { query } = require('./src/config/database.sqlite.js');
query('PRAGMA table_info(contractors)').then(result => {
  console.log('Contractor table schema:', result);
});
"
```

#### Production Environment
```bash
# 1. Create backup
pg_dump power100_prod > pre_migration_backup.sql

# 2. Test migration on copy
createdb power100_test
psql power100_test < pre_migration_backup.sql
psql power100_test < migrations/001_add_contractor_fields.sql

# 3. If test succeeds, run on production
psql power100_prod < migrations/001_add_contractor_fields.sql
```

### Step 4: Post-Migration Verification

```sql
-- Verify all new columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'contractors'
ORDER BY ordinal_position;

-- Verify data integrity
SELECT COUNT(*) as total_contractors FROM contractors;
SELECT COUNT(*) as contractors_with_defaults 
FROM contractors 
WHERE current_stage = 'verification' AND verification_status = 'pending';

-- Test JSON field functionality
UPDATE contractors 
SET services_offered = '["plumbing", "electrical"]' 
WHERE id = 1;

SELECT id, services_offered FROM contractors WHERE id = 1;
```

## 🛡️ Rollback Procedures

### Immediate Rollback (Within Transaction)
```sql
-- If migration fails during transaction
ROLLBACK;
-- Database returns to pre-migration state
```

### Post-Migration Rollback
```sql
-- Remove added columns (SQLite limitation workaround)
-- SQLite doesn't support DROP COLUMN, so we need to recreate table

BEGIN TRANSACTION;

-- Create backup of modified table
CREATE TABLE contractors_backup AS SELECT * FROM contractors;

-- Recreate original table structure
DROP TABLE contractors;
CREATE TABLE contractors (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  company_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Restore original data only
INSERT INTO contractors (id, name, email, phone, company_name, created_at, updated_at)
SELECT id, name, email, phone, company_name, created_at, updated_at
FROM contractors_backup;

-- Verify rollback
SELECT COUNT(*) FROM contractors;

COMMIT;
```

## 📁 Migration File Organization

### Directory Structure
```
tpe-database/
├── migrations/
│   ├── 001_add_contractor_fields.sql
│   ├── 002_add_partner_fields.sql
│   ├── 003_create_supporting_tables.sql
│   └── rollbacks/
│       ├── 001_rollback_contractor_fields.sql
│       └── 002_rollback_partner_fields.sql
├── seeds/
│   ├── focus_areas.sql
│   ├── revenue_ranges.sql
│   └── sample_data.sql
└── utilities/
    ├── backup.sh
    ├── migrate.sh
    └── verify.sh
```

### Migration Naming Convention
```
{number}_{description}.sql
001_add_contractor_fields.sql
002_enhance_partner_table.sql
003_create_tagging_system.sql
```

## ⚡ Performance Considerations

### Index Strategy
```sql
-- Add indexes for commonly searched fields
CREATE INDEX idx_contractors_email ON contractors(email);
CREATE INDEX idx_contractors_stage ON contractors(current_stage);
CREATE INDEX idx_contractors_focus_area ON contractors(primary_focus_area);
CREATE INDEX idx_partners_active ON strategic_partners(is_active);
CREATE INDEX idx_partners_confidence ON strategic_partners(power_confidence_score);
```

### Query Optimization
```sql
-- Before adding indexes, analyze query performance
EXPLAIN QUERY PLAN 
SELECT * FROM contractors 
WHERE current_stage = 'matching' 
AND primary_focus_area = 'greenfield_growth';

-- After adding indexes, verify improvement
EXPLAIN QUERY PLAN 
SELECT * FROM contractors 
WHERE current_stage = 'matching' 
AND primary_focus_area = 'greenfield_growth';
```

## 🧪 Testing Framework

### Migration Testing Script
```javascript
// tests/migrations/migration_test.js
const { query } = require('../../src/config/database.sqlite.js');

async function testMigration() {
  try {
    // Test 1: Verify new columns exist
    const schema = await query('PRAGMA table_info(contractors)');
    const newColumns = ['company_website', 'service_area', 'focus_areas'];
    
    for (const col of newColumns) {
      const exists = schema.find(row => row.name === col);
      console.assert(exists, `Column ${col} should exist`);
    }
    
    // Test 2: Test JSON field functionality
    await query(`UPDATE contractors SET focus_areas = '["test"]' WHERE id = 1`);
    const result = await query('SELECT focus_areas FROM contractors WHERE id = 1');
    console.assert(result[0].focus_areas === '["test"]', 'JSON field should work');
    
    // Test 3: Test foreign key relationships
    const fkTest = await query(`
      SELECT c.name, p.company_name 
      FROM contractors c 
      LEFT JOIN strategic_partners p ON c.assigned_partner_id = p.id 
      LIMIT 1
    `);
    
    console.log('Migration test passed!');
  } catch (error) {
    console.error('Migration test failed:', error);
  }
}

testMigration();
```

## 🔧 Troubleshooting Common Issues

### Issue 1: Column Already Exists
```sql
-- Solution: Check if column exists first
SELECT name FROM pragma_table_info('contractors') WHERE name = 'company_website';
-- Only add if doesn't exist
```

### Issue 2: Data Type Conflicts
```sql
-- Solution: Validate existing data first
SELECT DISTINCT typeof(some_field) FROM table_name;
-- Convert incompatible data before schema change
```

### Issue 3: Foreign Key Violations
```sql
-- Solution: Add constraints after data cleanup
-- 1. Clean up orphaned records
DELETE FROM contractors WHERE assigned_partner_id NOT IN (SELECT id FROM strategic_partners);
-- 2. Then add foreign key constraint
```

### Issue 4: Transaction Locks
```sql
-- Solution: Check for long-running transactions
SELECT * FROM pg_stat_activity WHERE state != 'idle';
-- Kill blocking processes if necessary
SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE pid = [blocking_pid];
```

## 📊 Migration Monitoring

### Performance Metrics
- Migration execution time
- Database size before/after
- Query performance impact
- Downtime duration (for production)

### Health Checks
```sql
-- Post-migration health check
SELECT 
  'Data Integrity' as check_type,
  CASE WHEN COUNT(*) = (SELECT COUNT(*) FROM contractors_backup) 
       THEN 'PASS' ELSE 'FAIL' END as status
FROM contractors;

SELECT
  'Schema Consistency' as check_type,
  CASE WHEN COUNT(*) >= 15 THEN 'PASS' ELSE 'FAIL' END as status
FROM pragma_table_info('contractors');
```

## 🎯 Best Practices Summary

1. **Always Backup** - Never run migrations without backups
2. **Test First** - Run migrations on copy before production
3. **Small Changes** - Break large migrations into smaller steps
4. **Monitor Performance** - Check query performance after schema changes
5. **Document Everything** - Maintain clear migration logs
6. **Rollback Plan** - Always have a rollback strategy
7. **Validate Data** - Check data integrity after migrations
8. **Coordinate Deployments** - Align code deployments with schema changes

---

*This guide should be updated after each major schema change to reflect the current state and lessons learned.*