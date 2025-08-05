// Cleanup script for fixing [object Object] JSON data in the database
const { connectDB, query } = require('./src/config/database.sqlite');

async function cleanupJsonData() {
  try {
    await connectDB();
    console.log('🔧 Starting JSON data cleanup...');

    // Get all contractors with invalid JSON data
    const contractorsResult = await query(`
      SELECT id, name, focus_areas, services_offered 
      FROM contractors 
      WHERE focus_areas LIKE '%[object Object]%' 
         OR services_offered LIKE '%[object Object]%'
    `);

    console.log(`Found ${contractorsResult.rows.length} contractors with invalid JSON data`);

    // Fix each contractor
    for (const contractor of contractorsResult.rows) {
      console.log(`Fixing contractor ${contractor.id}: ${contractor.name}`);
      
      // For now, set empty arrays for invalid data
      // In a real scenario, you'd want to recover the actual data if possible
      const updates = {};
      
      if (contractor.focus_areas && contractor.focus_areas.includes('[object Object]')) {
        updates.focus_areas = '[]'; // Empty array as JSON string
        console.log(`  - Fixed focus_areas`);
      }
      
      if (contractor.services_offered && contractor.services_offered.includes('[object Object]')) {
        updates.services_offered = '[]'; // Empty array as JSON string
        console.log(`  - Fixed services_offered`);
      }

      if (Object.keys(updates).length > 0) {
        const setClause = Object.keys(updates).map((key, i) => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(contractor.id);

        await query(
          `UPDATE contractors SET ${setClause} WHERE id = ?`,
          values
        );
      }
    }

    // Also check partners
    const partnersResult = await query(`
      SELECT id, company_name, focus_areas_served, target_revenue_range, geographic_regions
      FROM strategic_partners 
      WHERE focus_areas_served LIKE '%[object Object]%' 
         OR target_revenue_range LIKE '%[object Object]%'
         OR geographic_regions LIKE '%[object Object]%'
    `);

    console.log(`Found ${partnersResult.rows.length} partners with invalid JSON data`);

    // Fix each partner
    for (const partner of partnersResult.rows) {
      console.log(`Fixing partner ${partner.id}: ${partner.company_name}`);
      
      const updates = {};
      
      if (partner.focus_areas_served && partner.focus_areas_served.includes('[object Object]')) {
        updates.focus_areas_served = '[]';
        console.log(`  - Fixed focus_areas_served`);
      }
      
      if (partner.target_revenue_range && partner.target_revenue_range.includes('[object Object]')) {
        updates.target_revenue_range = '[]';
        console.log(`  - Fixed target_revenue_range`);
      }
      
      if (partner.geographic_regions && partner.geographic_regions.includes('[object Object]')) {
        updates.geographic_regions = '[]';
        console.log(`  - Fixed geographic_regions`);
      }

      if (Object.keys(updates).length > 0) {
        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = Object.values(updates);
        values.push(partner.id);

        await query(
          `UPDATE strategic_partners SET ${setClause} WHERE id = ?`,
          values
        );
      }
    }

    console.log('✅ JSON data cleanup completed!');
    
    // Verify the cleanup worked
    const verifyResult = await query(`
      SELECT COUNT(*) as count FROM contractors 
      WHERE focus_areas LIKE '%[object Object]%' 
         OR services_offered LIKE '%[object Object]%'
    `);
    
    console.log(`Remaining contractors with invalid JSON: ${verifyResult.rows[0]?.count || 0}`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    process.exit(0);
  }
}

cleanupJsonData();