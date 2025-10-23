// Update contractor 1 to have better match with contractor 56
const { query } = require('./tpe-backend/src/config/database');

async function updateContractor() {
  try {
    console.log('Updating contractor 1 for better test matching...');

    await query(`
      UPDATE contractors
      SET
        focus_areas = $1::jsonb,
        first_name = 'John',
        last_name = 'Smith',
        revenue_tier = '31_50_million',
        service_area = 'Austin, TX'
      WHERE id = 1
    `, [JSON.stringify(["operational_efficiency","hiring_sales_leadership","controlling_lead_flow"])]);

    console.log('✅ Contractor 1 updated successfully!');

    // Verify
    const result = await query(`
      SELECT id, first_name, last_name, focus_areas, revenue_tier, service_area
      FROM contractors
      WHERE id = 1
    `);

    console.log('\nUpdated contractor 1:');
    console.log(result.rows[0]);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateContractor();
