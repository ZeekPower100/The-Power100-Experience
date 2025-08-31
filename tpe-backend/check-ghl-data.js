// Quick script to check GHL-ready data
const { connectDB, query } = require('./src/config/database');

async function checkData() {
  await connectDB();
  
  // Check contractors
  const contractors = await query(`
    SELECT id, name, email, phone 
    FROM contractors 
    WHERE email IS NOT NULL 
    LIMIT 5
  `);
  
  console.log('\n📋 Sample Contractors with emails:');
  console.log('Total with emails:', contractors.rows.length);
  contractors.rows.forEach(c => {
    console.log(`  - ${c.name}: ${c.email} | ${c.phone || 'No phone'}`);
  });
  
  // Check partners
  const partners = await query(`
    SELECT id, company_name, ceo_contact_name, ceo_contact_email 
    FROM strategic_partners 
    WHERE ceo_contact_email IS NOT NULL
    LIMIT 5
  `);
  
  console.log('\n🏢 Sample Partners with CEO emails:');
  console.log('Total with emails:', partners.rows.length);
  partners.rows.forEach(p => {
    console.log(`  - ${p.company_name}: ${p.ceo_contact_name} | ${p.ceo_contact_email}`);
  });
  
  // Count totals
  const contractorCount = await query('SELECT COUNT(*) as total FROM contractors WHERE email IS NOT NULL');
  const partnerCount = await query('SELECT COUNT(*) as total FROM strategic_partners WHERE ceo_contact_email IS NOT NULL');
  
  console.log('\n📊 Totals:');
  console.log(`  - Contractors with emails: ${contractorCount.rows[0].total}`);
  console.log(`  - Partners with CEO emails: ${partnerCount.rows[0].total}`);
  
  process.exit(0);
}

checkData().catch(console.error);