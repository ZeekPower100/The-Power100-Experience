const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tpedb',
  user: 'postgres',
  password: 'TPXP0stgres!!'
});

// Simple SVG data URL that will always work
const logoDataUrl = 'data:image/svg+xml,%3Csvg width="150" height="150" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="150" height="150" fill="%2310B981"/%3E%3Ctext x="50%25" y="50%25" fill="white" text-anchor="middle" dy=".3em" font-size="20"%3ELogo%3C/text%3E%3C/svg%3E';

async function updatePartnerLogos() {
  try {
    // Update all partners table logos
    const result = await pool.query(
      'UPDATE partners SET logo_url = $1',
      [logoDataUrl]
    );
    console.log(`Updated ${result.rowCount} partners with data URL logo`);

    pool.end();
  } catch (error) {
    console.error('Error:', error);
    pool.end();
  }
}

updatePartnerLogos();