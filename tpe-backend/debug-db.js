const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function debugDatabase() {
  try {
    const db = await open({
      filename: './power100.db',
      driver: sqlite3.Database
    });

    console.log('🔍 Debugging SQLite database...\n');

    // Check contractors table
    const contractors = await db.all('SELECT * FROM contractors ORDER BY created_at DESC LIMIT 10');
    console.log(`📊 Total contractors: ${contractors.length}`);
    if (contractors.length > 0) {
      console.log('Recent contractors:');
      contractors.forEach(c => {
        console.log(`  - ID: ${c.id}, Name: ${c.name}, Email: ${c.email}, Stage: ${c.current_stage}, Created: ${c.created_at}`);
      });
    }
    console.log('');

    // Check admin users
    const admins = await db.all('SELECT id, email, full_name FROM admin_users');
    console.log(`👥 Admin users: ${admins.length}`);
    admins.forEach(a => {
      console.log(`  - ID: ${a.id}, Email: ${a.email}, Name: ${a.full_name}`);
    });
    console.log('');

    // Check partners
    const partners = await db.all('SELECT id, company_name, is_active FROM strategic_partners LIMIT 5');
    console.log(`🤝 Partners: ${partners.length}`);
    partners.forEach(p => {
      console.log(`  - ID: ${p.id}, Company: ${p.company_name}, Active: ${p.is_active}`);
    });

    await db.close();
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

debugDatabase();