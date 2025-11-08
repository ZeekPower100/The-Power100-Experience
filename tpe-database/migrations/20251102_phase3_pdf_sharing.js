// ============================================================================
// PHASE 3: PCR Reports - PDF Generation & Sharing System
// Migration: 20251102_phase3_pdf_sharing.js
// Created: November 2, 2025
// ============================================================================
//
// PURPOSE: Add PDF generation, secure sharing, and analytics tracking
//
// ADDS TO partner_reports:
//   - share_token: Secure token for public report sharing
//   - share_expires_at: Token expiration for time-limited access
//   - pdf_url: AWS S3 URL for generated PDF
//   - pdf_generated_at: Timestamp when PDF was created
//   - download_count: Track how many times report was downloaded
//   - last_downloaded_at: Last download timestamp for analytics
//   - public_url: Custom public URL for branded PCR pages
//   - is_public: Toggle for public visibility
//
// PRE-FLIGHT VERIFIED:
//   ✅ partner_reports has 23 columns (Phase 1 & 2 complete)
//   ✅ No Phase 3 columns exist yet
//   ✅ 8 test reports available for PDF generation
// ============================================================================

const path = require('path');
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'tpe-backend', envFile) });

const { query } = require('../../tpe-backend/src/config/database');

async function runMigration() {
  console.log('🚀 Starting Phase 3 Migration: PDF Generation & Sharing System\n');

  try {
    // Step 1: Add PDF generation fields
    console.log('📄 Adding PDF generation fields...');
    await query(`
      ALTER TABLE partner_reports
      ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(500),
      ADD COLUMN IF NOT EXISTS pdf_generated_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS pdf_file_size INTEGER;
    `);
    console.log('✅ PDF generation fields added\n');

    // Step 2: Add secure sharing fields
    console.log('🔐 Adding secure sharing fields...');
    await query(`
      ALTER TABLE partner_reports
      ADD COLUMN IF NOT EXISTS share_token VARCHAR(64) UNIQUE,
      ADD COLUMN IF NOT EXISTS share_expires_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
    `);
    console.log('✅ Secure sharing fields added\n');

    // Step 3: Add analytics tracking fields
    console.log('📊 Adding analytics tracking fields...');
    await query(`
      ALTER TABLE partner_reports
      ADD COLUMN IF NOT EXISTS download_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_downloaded_at TIMESTAMP,
      ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_public_view_at TIMESTAMP;
    `);
    console.log('✅ Analytics tracking fields added\n');

    // Step 4: Add custom branding fields
    console.log('🎨 Adding custom branding fields...');
    await query(`
      ALTER TABLE partner_reports
      ADD COLUMN IF NOT EXISTS public_url VARCHAR(100) UNIQUE,
      ADD COLUMN IF NOT EXISTS custom_branding JSONB;
    `);
    console.log('✅ Custom branding fields added\n');

    // Step 5: Create indexes
    console.log('🔍 Creating indexes for fast lookups...');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_partner_reports_share_token
      ON partner_reports(share_token)
      WHERE share_token IS NOT NULL;
    `);
    console.log('  ✅ Share token index created');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_partner_reports_public_url
      ON partner_reports(public_url)
      WHERE public_url IS NOT NULL;
    `);
    console.log('  ✅ Public URL index created');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_partner_reports_pdf_url
      ON partner_reports(pdf_url)
      WHERE pdf_url IS NOT NULL;
    `);
    console.log('  ✅ PDF URL index created');

    await query(`
      CREATE INDEX IF NOT EXISTS idx_partner_reports_share_expires
      ON partner_reports(share_expires_at)
      WHERE share_expires_at IS NOT NULL;
    `);
    console.log('  ✅ Share expiration index created\n');

    // Step 6: Add column comments for documentation
    console.log('📝 Adding column documentation...');
    await query(`
      COMMENT ON COLUMN partner_reports.share_token IS 'Phase 3: Secure token for public report sharing (64-char hex)';
    `);
    await query(`
      COMMENT ON COLUMN partner_reports.pdf_url IS 'Phase 3: AWS S3 URL for generated PDF report';
    `);
    await query(`
      COMMENT ON COLUMN partner_reports.pdf_generated_at IS 'Phase 3: Timestamp when PDF was generated';
    `);
    await query(`
      COMMENT ON COLUMN partner_reports.download_count IS 'Phase 3: Total number of PDF downloads for analytics';
    `);
    await query(`
      COMMENT ON COLUMN partner_reports.public_url IS 'Phase 3: Custom branded URL slug (e.g., /pcr/techflow-q3-2025)';
    `);
    await query(`
      COMMENT ON COLUMN partner_reports.is_public IS 'Phase 3: Toggle for public PCR page visibility';
    `);
    console.log('✅ Column documentation added\n');

    // Verification: Check column count
    console.log('🔍 Verifying migration...');
    const columnCount = await query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_name = 'partner_reports';
    `);
    console.log(`✅ Total columns: ${columnCount.rows[0].count} (expected: 33)`);

    // Verification: List new Phase 3 columns
    const phase3Columns = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'partner_reports'
      AND column_name IN ('share_token', 'pdf_url', 'pdf_generated_at',
                          'download_count', 'public_url', 'is_public',
                          'pdf_file_size', 'share_expires_at', 'view_count',
                          'last_downloaded_at', 'last_public_view_at', 'custom_branding')
      ORDER BY column_name;
    `);

    console.log('\n📋 Phase 3 Columns Added:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    phase3Columns.rows.forEach(col => {
      console.log(`  ${col.column_name.padEnd(25)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 Phase 3 Migration Complete!\n');
    console.log('Next Steps:');
    console.log('  1. Create pdfGenerationService.js');
    console.log('  2. Configure AWS S3 for PDF storage');
    console.log('  3. Add PDF generation endpoint to reports API');
    console.log('  4. Test PDF generation with existing reports\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run migration
runMigration();
