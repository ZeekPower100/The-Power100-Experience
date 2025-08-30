const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'tpedb',
  user: 'postgres',
  password: 'TPXP0stgres!!'
});

// Simple SVG data URLs that will always work
const bookDataUrl = 'data:image/svg+xml,%3Csvg width="120" height="180" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="120" height="180" fill="%234F46E5"/%3E%3Ctext x="50%25" y="50%25" fill="white" text-anchor="middle" dy=".3em" font-size="20"%3EBook%3C/text%3E%3C/svg%3E';

const logoDataUrl = 'data:image/svg+xml,%3Csvg width="150" height="150" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="150" height="150" fill="%2310B981"/%3E%3Ctext x="50%25" y="50%25" fill="white" text-anchor="middle" dy=".3em" font-size="20"%3ELogo%3C/text%3E%3C/svg%3E';

const podcastDataUrl = 'data:image/svg+xml,%3Csvg width="150" height="150" xmlns="http://www.w3.org/2000/svg"%3E%3Crect width="150" height="150" fill="%239333EA"/%3E%3Ctext x="50%25" y="50%25" fill="white" text-anchor="middle" dy=".3em" font-size="20"%3EPodcast%3C/text%3E%3C/svg%3E';

async function updateLogos() {
  try {
    // Update books
    const bookResult = await pool.query(
      'UPDATE books SET cover_image_url = $1',
      [bookDataUrl]
    );
    console.log(`Updated ${bookResult.rowCount} books`);
    
    // Update podcasts
    const podcastResult = await pool.query(
      'UPDATE podcasts SET logo_url = $1',
      [podcastDataUrl]
    );
    console.log(`Updated ${podcastResult.rowCount} podcasts`);

    // Update manufacturers
    const mfgResult = await pool.query(
      'UPDATE manufacturers SET logo_url = $1',
      [logoDataUrl]
    );
    console.log(`Updated ${mfgResult.rowCount} manufacturers`);

    // Update partners
    const partnerResult = await pool.query(
      'UPDATE strategic_partners SET logo_url = $1',
      [logoDataUrl]
    );
    console.log(`Updated ${partnerResult.rowCount} partners`);

    pool.end();
  } catch (error) {
    console.error('Error:', error);
    pool.end();
  }
}

updateLogos();