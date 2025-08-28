const { Pool } = require('pg');
require('dotenv').config();

async function addPartnerFocusAreas() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'tpedb',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'TPXP0stgres!!',
  });

  try {
    // Add some sample focus areas to partners
    const updates = [
      {
        id: 1,
        focus_areas_served: JSON.stringify(['customer_retention', 'greenfield_growth', 'hiring_sales_leadership'])
      },
      {
        id: 2,
        focus_areas_served: JSON.stringify(['digital_marketing', 'operational_efficiency', 'recession_proofing'])
      },
      {
        id: 3,
        focus_areas_served: JSON.stringify(['controlling_lead_flow', 'installation_quality', 'sales_training'])
      },
      {
        id: 4,
        focus_areas_served: JSON.stringify(['business_development', 'closing_higher_percentage', 'customer_retention'])
      }
    ];

    for (const update of updates) {
      await pool.query(
        'UPDATE strategic_partners SET focus_areas_served = $1 WHERE id = $2',
        [update.focus_areas_served, update.id]
      );
    }

    console.log('✅ Updated partners with focus areas');

    // Verify the updates
    const result = await pool.query(
      'SELECT id, company_name, focus_areas_served FROM strategic_partners WHERE id <= 4'
    );
    console.log('\nPartner focus areas:');
    result.rows.forEach(row => {
      console.log(`  ${row.company_name}: ${row.focus_areas_served}`);
    });

  } catch (error) {
    console.error('❌ Error updating partners:', error.message);
  } finally {
    await pool.end();
  }
}

addPartnerFocusAreas();