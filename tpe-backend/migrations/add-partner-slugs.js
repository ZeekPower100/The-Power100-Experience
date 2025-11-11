// DATABASE-CHECKED: strategic_partners table, public_url column added
// Migration script to generate public_url slugs for all existing partners
const { query } = require('../src/config/database');

// Helper function to generate URL-safe slug from company name
const generateSlug = (companyName) => {
  return companyName
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/-+/g, '-')       // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
};

async function migratePartnerSlugs() {
  console.log('🔄 Starting partner slug migration...\n');

  try {
    // Get all partners without slugs
    const result = await query(`
      SELECT id, company_name, public_url
      FROM strategic_partners
      WHERE public_url IS NULL OR public_url = ''
      ORDER BY id
    `);

    const partners = result.rows;
    console.log(`📊 Found ${partners.length} partners needing slugs\n`);

    if (partners.length === 0) {
      console.log('✅ All partners already have slugs!');
      return;
    }

    let updated = 0;
    let skipped = 0;

    for (const partner of partners) {
      const baseSlug = generateSlug(partner.company_name);
      let finalSlug = baseSlug;
      let attempt = 1;

      // Check for duplicate slugs and append number if needed
      while (true) {
        const existingResult = await query(`
          SELECT id FROM strategic_partners
          WHERE public_url = $1 AND id != $2
        `, [finalSlug, partner.id]);

        if (existingResult.rows.length === 0) {
          break; // Slug is unique
        }

        attempt++;
        finalSlug = `${baseSlug}-${attempt}`;
      }

      // Update partner with generated slug
      await query(`
        UPDATE strategic_partners
        SET public_url = $1, updated_at = NOW()
        WHERE id = $2
      `, [finalSlug, partner.id]);

      console.log(`✅ Partner #${partner.id} (${partner.company_name})`);
      console.log(`   → Slug: ${finalSlug}\n`);
      updated++;
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`   - Updated: ${updated} partners`);
    console.log(`   - Skipped: ${skipped} partners`);

    // Show sample of migrated slugs
    const sampleResult = await query(`
      SELECT id, company_name, public_url
      FROM strategic_partners
      WHERE public_url IS NOT NULL
      ORDER BY id
      LIMIT 10
    `);

    console.log(`\n📋 Sample of migrated partners:`);
    sampleResult.rows.forEach(p => {
      console.log(`   ${p.id}: ${p.company_name} → /pcr/${p.public_url}`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migratePartnerSlugs()
    .then(() => {
      console.log('\n✅ Migration script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { migratePartnerSlugs };
