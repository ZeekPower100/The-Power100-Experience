// DATABASE-CHECKED: account_creation_audit table for Phase 2 - October 27, 2025
// ================================================================
// PURPOSE: Audit trail for automatic account creation
// ================================================================
// VERIFIED: This table DOES NOT exist yet (verified October 27, 2025)
// ================================================================
// FIELD NAMES:
// - user_type VARCHAR(20) CHECK (user_type IN ('partner', 'contractor'))
// - user_id INTEGER (partner_id or contractor_id)
// - user_account_id INTEGER (partner_users.id or contractor_users.id)
// - email VARCHAR(255)
// - created_by VARCHAR(50) DEFAULT 'system'
// - trigger_source VARCHAR(100)
// - password_sent_via VARCHAR(50)
// - success BOOLEAN (use true/false NOT 'true'/'false')
// - error_message TEXT
// - created_at TIMESTAMP DEFAULT NOW()
// ================================================================

require('dotenv').config({ path: './tpe-backend/.env' });
const { query } = require('../../tpe-backend/src/config/database');

async function createAccountCreationAuditTable() {
  console.log('\n🚀 CREATING ACCOUNT_CREATION_AUDIT TABLE');
  console.log('='.repeat(80));

  try {
    // ================================================================
    // TABLE: account_creation_audit
    // Purpose: Track all automatic account creation events
    // ================================================================

    console.log('\n📋 Creating account_creation_audit table...');
    await query(`
      CREATE TABLE IF NOT EXISTS account_creation_audit (
        id SERIAL PRIMARY KEY,
        user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('partner', 'contractor')),
        user_id INTEGER NOT NULL,
        user_account_id INTEGER NOT NULL,
        email VARCHAR(255) NOT NULL,
        created_by VARCHAR(50) DEFAULT 'system',
        trigger_source VARCHAR(100),
        password_sent_via VARCHAR(50),
        success BOOLEAN NOT NULL,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ account_creation_audit table created');

    // Create indexes for performance
    console.log('\n📊 Creating indexes for account_creation_audit...');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_account_audit_user_type
      ON account_creation_audit(user_type);
    `);
    console.log('✅ Created index: idx_account_audit_user_type');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_account_audit_user_id
      ON account_creation_audit(user_id);
    `);
    console.log('✅ Created index: idx_account_audit_user_id');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_account_audit_created_at
      ON account_creation_audit(created_at);
    `);
    console.log('✅ Created index: idx_account_audit_created_at');

    // Add table comments
    console.log('\n📝 Adding table comments...');
    await query(`
      COMMENT ON TABLE account_creation_audit IS 'Audit trail for all automatic account creation events';
    `);
    console.log('✅ Table comments added');

    // Verification
    console.log('\n🔍 VERIFYING TABLE CREATION');
    console.log('='.repeat(80));

    const columnCount = await query(`
      SELECT COUNT(*) as column_count
      FROM information_schema.columns
      WHERE table_name = 'account_creation_audit';
    `);
    console.log(`\n✅ account_creation_audit: ${columnCount.rows[0].column_count} columns (expected 11)`);

    // Verify column names
    const columns = await query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'account_creation_audit'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Column verification:');
    columns.rows.forEach(col => {
      console.log(`   ✅ ${col.column_name} (${col.data_type})`);
    });

    // Verify constraints
    const constraints = await query(`
      SELECT conname, pg_get_constraintdef(oid)
      FROM pg_constraint
      WHERE conrelid = 'account_creation_audit'::regclass;
    `);

    console.log(`\n📋 Constraints created: ${constraints.rows.length}`);
    constraints.rows.forEach(con => {
      console.log(`   ✅ ${con.conname}`);
    });

    // Verify indexes
    const indexes = await query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'account_creation_audit';
    `);

    console.log(`\n📋 Indexes created: ${indexes.rows.length} (expected 4: 1 primary + 3 custom)`);
    indexes.rows.forEach(idx => {
      console.log(`   ✅ ${idx.indexname}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ ACCOUNT_CREATION_AUDIT TABLE CREATED SUCCESSFULLY');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }

  process.exit(0);
}

createAccountCreationAuditTable();
