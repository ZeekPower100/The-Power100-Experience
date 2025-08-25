const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');

async function migrate() {
  // PostgreSQL connection with SSL
  const pgClient = new Client({
    host: 'tpe-database-production.cmtcsi0kytrf.us-east-1.rds.amazonaws.com',
    port: 5432,
    database: 'tpedb',
    user: 'tpeadmin',
    password: 'dBP0wer100!!',
    ssl: {
      rejectUnauthorized: false
    }
  });

  // SQLite connection
  const sqliteDb = new sqlite3.Database('./power100.db');

  try {
    await pgClient.connect();
    console.log('Connected to PostgreSQL');

    // Get data and migrate
    const adminUsers = await new Promise((resolve, reject) => {
      sqliteDb.all("SELECT * FROM admin_users", (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    for (const user of adminUsers) {
      await pgClient.query(
        'INSERT INTO admin_users (email, password, name) VALUES ($1, $2, $3) ON CONFLICT (email) DO NOTHING',
        [user.email, user.password, user.name]
      );
    }
    console.log(`Migrated ${adminUsers.length} admin users`);

    // Migrate partners
    const partners = await new Promise((resolve, reject) => {
      sqliteDb.all("SELECT * FROM strategic_partners", (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });

    for (const partner of partners) {
      await pgClient.query(
        'INSERT INTO partners (company_name, email, capabilities, revenue_tiers, powerconfidence_score, is_active) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (email) DO NOTHING',
        [partner.company_name, partner.primary_email || `${partner.company_name.toLowerCase().replace(/\s+/g, '')}@example.com`, 
         partner.focus_areas, partner.revenue_tiers, partner.powerconfidence_score || 0, partner.is_active == 1]
      );
    }
    console.log(`Migrated ${partners.length} partners`);

    // Check what we have
    const result = await pgClient.query('SELECT COUNT(*) FROM partners');
    console.log(`Total partners in PostgreSQL: ${result.rows[0].count}`);

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await pgClient.end();
    sqliteDb.close();
  }
}

migrate();
