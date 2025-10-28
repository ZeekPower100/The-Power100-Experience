// DATABASE-CHECKED: partner_users table verified October 27, 2025
// ================================================================
// VERIFIED FIELD NAMES (copied from partner_users pattern):
// - password (NOT password_hash)
// - last_login (NOT last_login_at)
// - reset_token (NOT password_reset_token)
// - reset_token_expires (NOT password_reset_expires)
// - contractor_id (NOT contractors_id)
// - is_active (NOT active)
// ================================================================
// MIGRATION: Create contractor_users table for authentication
// PATTERN: Exact copy of partner_users table structure
// PURPOSE: Phase 1 - Contractor Authentication System
// ================================================================

require('dotenv').config({ path: './tpe-backend/.env' });
const { query } = require('../../tpe-backend/src/config/database');

async function createContractorUsersTable() {
  console.log('\n🚀 CREATING CONTRACTOR_USERS TABLE');
  console.log('='.repeat(80));

  try {
    // ================================================================
    // TABLE: contractor_users
    // Purpose: Contractor authentication - mirrors partner_users
    // ================================================================

    console.log('\n📋 Creating contractor_users table...');
    await query(`
      CREATE TABLE IF NOT EXISTS contractor_users (
        id SERIAL PRIMARY KEY,
        contractor_id INTEGER REFERENCES contractors(id) ON DELETE CASCADE,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'contractor',
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ contractor_users table created');

    // Create indexes for performance (matching partner_users pattern)
    console.log('\n📊 Creating indexes for contractor_users...');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_contractor_users_contractor_id
      ON contractor_users(contractor_id);
    `);
    console.log('✅ Created index: idx_contractor_users_contractor_id');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_contractor_users_email
      ON contractor_users(email);
    `);
    console.log('✅ Created index: idx_contractor_users_email');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_contractor_users_reset_token
      ON contractor_users(reset_token);
    `);
    console.log('✅ Created index: idx_contractor_users_reset_token');

    // Add table and column comments for documentation
    console.log('\n📝 Adding table comments...');

    await query(`
      COMMENT ON TABLE contractor_users IS 'Contractor authentication users - mirrors partner_users structure';
    `);

    await query(`
      COMMENT ON COLUMN contractor_users.password IS 'Stores bcrypt hash with 12 rounds - NEVER plain text';
    `);

    await query(`
      COMMENT ON COLUMN contractor_users.last_login IS 'Updated on each successful login';
    `);

    await query(`
      COMMENT ON COLUMN contractor_users.reset_token IS 'Temporary token for password reset flow';
    `);

    await query(`
      COMMENT ON COLUMN contractor_users.reset_token_expires IS 'Expiration timestamp for reset token';
    `);

    console.log('✅ Table comments added');

    // ================================================================
    // VERIFICATION
    // ================================================================

    console.log('\n🔍 VERIFYING TABLE CREATION');
    console.log('='.repeat(80));

    // Verify contractor_users column count (should be 13 like partner_users)
    const columnCount = await query(`
      SELECT COUNT(*) as column_count
      FROM information_schema.columns
      WHERE table_name = 'contractor_users';
    `);
    console.log(`\n✅ contractor_users: ${columnCount.rows[0].column_count} columns (expected 13)`);

    // Verify column names match partner_users pattern
    const columns = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'contractor_users'
      ORDER BY ordinal_position;
    `);
    console.log('\n✅ Column structure:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    // Verify UNIQUE constraint on email
    const uniqueConstraints = await query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'contractor_users'::regclass AND contype = 'u';
    `);
    console.log(`\n✅ UNIQUE constraints: ${uniqueConstraints.rows.length}`);
    uniqueConstraints.rows.forEach(c => {
      console.log(`   - ${c.conname}: ${c.pg_get_constraintdef}`);
    });

    // Verify foreign key constraint
    const foreignKeys = await query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'contractor_users'::regclass AND contype = 'f';
    `);
    console.log(`\n✅ Foreign keys: ${foreignKeys.rows.length}`);
    foreignKeys.rows.forEach(fk => {
      console.log(`   - ${fk.conname}: ${fk.pg_get_constraintdef}`);
    });

    // Verify indexes
    const indexes = await query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'contractor_users' AND indexname NOT LIKE '%pkey';
    `);
    console.log(`\n✅ Indexes: ${indexes.rows.length}`);
    indexes.rows.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });

    // Verify table matches partner_users structure
    console.log('\n🔍 COMPARING WITH partner_users PATTERN');
    console.log('='.repeat(80));

    const partnerUsersColumns = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'partner_users'
      ORDER BY ordinal_position;
    `);

    const contractorUsersColumns = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'contractor_users'
      ORDER BY ordinal_position;
    `);

    console.log('\n✅ Column count match:');
    console.log(`   - partner_users: ${partnerUsersColumns.rows.length} columns`);
    console.log(`   - contractor_users: ${contractorUsersColumns.rows.length} columns`);

    // Check for field name differences (should only be partner_id vs contractor_id)
    const partnerFieldNames = partnerUsersColumns.rows.map(r => r.column_name);
    const contractorFieldNames = contractorUsersColumns.rows.map(r => r.column_name);

    const partnerOnly = partnerFieldNames.filter(f => !contractorFieldNames.includes(f));
    const contractorOnly = contractorFieldNames.filter(f => !partnerFieldNames.includes(f));

    if (partnerOnly.length === 1 && contractorOnly.length === 1 &&
        partnerOnly[0] === 'partner_id' && contractorOnly[0] === 'contractor_id') {
      console.log('\n✅ Field naming matches pattern (partner_id → contractor_id)');
    } else {
      console.log('\n⚠️  Field naming differences detected:');
      console.log(`   - In partner_users only: ${partnerOnly.join(', ')}`);
      console.log(`   - In contractor_users only: ${contractorOnly.join(', ')}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ CONTRACTOR_USERS TABLE CREATED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log('\n📌 NEXT STEPS:');
    console.log('   1. Build contractorAuthController.js (Task 2)');
    console.log('   2. Build contractorAuthRoutes.js (Task 3)');
    console.log('   3. Build contractorAuth.js middleware (Task 4)');
    console.log('   4. Build frontend login page (Task 5)');
    console.log('   5. Build frontend dashboard page (Task 6)');
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
createContractorUsersTable();
