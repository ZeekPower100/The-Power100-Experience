const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function addPartnerAnalytics() {
  const db = await open({
    filename: './power100.db',
    driver: sqlite3.Database
  });
  
  try {
    console.log('🔍 Adding partner analytics data...');
    
    // Check if contractors exist
    const contractors = await db.all('SELECT id FROM contractors LIMIT 5');
    console.log(`Found ${contractors.length} contractors`);
    
    if (contractors.length === 0) {
      console.log('Creating sample contractor...');
      await db.run('INSERT INTO contractors (name, email, phone) VALUES (?, ?, ?)', 
        ['Sample Contractor', 'contractor@example.com', '555-0123']);
      const newContractor = await db.get('SELECT id FROM contractors ORDER BY id DESC LIMIT 1');
      contractors.push(newContractor);
    }
    
    // Add partner leads for Auth Test Partner (ID: 16)
    const partnerId = 16;
    console.log(`Adding leads for partner ${partnerId}...`);
    
    // Clear existing leads for this partner
    await db.run('DELETE FROM partner_leads WHERE partner_id = ?', [partnerId]);
    
    // Add 3 sample leads
    for (let i = 0; i < 3; i++) {
      const contractorId = contractors[Math.min(i, contractors.length - 1)].id;
      const createdDate = new Date(Date.now() - (i * 2 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 19).replace('T', ' ');
      
      await db.run(`
        INSERT INTO partner_leads (contractor_id, partner_id, stage, demo_requested_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        contractorId,
        partnerId,
        i === 0 ? 'demo_scheduled' : i === 1 ? 'follow-up' : 'matched',
        i === 0 ? '2025-08-05 10:00:00' : i === 1 ? '2025-08-04 14:30:00' : null,
        createdDate,
        createdDate
      ]);
    }
    
    // Add partner analytics
    console.log('Adding analytics data...');
    
    // Clear existing analytics for this partner
    await db.run('DELETE FROM partner_analytics WHERE partner_id = ?', [partnerId]);
    
    const currentDate = new Date().toISOString().slice(0, 10);
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    
    // Leads received this month
    await db.run(`
      INSERT INTO partner_analytics (partner_id, metric_type, metric_value, period_start, period_end, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [partnerId, 'leads_received', 8, lastMonth, currentDate, new Date().toISOString()]);
    
    // Demo requests
    await db.run(`
      INSERT INTO partner_analytics (partner_id, metric_type, metric_value, period_start, period_end, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [partnerId, 'demos_requested', 3, lastMonth, currentDate, new Date().toISOString()]);
    
    // Conversion rate
    await db.run(`
      INSERT INTO partner_analytics (partner_id, metric_type, metric_value, period_start, period_end, calculated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [partnerId, 'conversion_rate', 37.5, lastMonth, currentDate, new Date().toISOString()]);
    
    // Verify the data was added
    const leads = await db.all('SELECT * FROM partner_leads WHERE partner_id = ?', [partnerId]);
    const analytics = await db.all('SELECT * FROM partner_analytics WHERE partner_id = ?', [partnerId]);
    
    console.log(`✅ Successfully added:`);
    console.log(`   - ${leads.length} partner leads`);
    console.log(`   - ${analytics.length} analytics records`);
    
    // Show sample data
    console.log('\n📊 Sample leads:');
    leads.forEach((lead, i) => {
      console.log(`   ${i+1}. Stage: ${lead.stage}, Created: ${lead.created_at}`);
    });
    
    console.log('\n📈 Analytics:');
    analytics.forEach(metric => {
      console.log(`   - ${metric.metric_type}: ${metric.metric_value}`);
    });
    
  } catch (error) {
    console.error('❌ Error adding analytics data:', error);
  } finally {
    await db.close();
  }
}

addPartnerAnalytics();