// Migration: Add wp_term_slug column to shows table
// Maps TPX shows to WordPress ic_show taxonomy term slugs for n8n sync
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function migrate() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  try {
    console.log('Adding wp_term_slug column to shows table...');

    // Add the column
    await pool.query(`
      ALTER TABLE shows
      ADD COLUMN IF NOT EXISTS wp_term_slug VARCHAR(100)
    `);

    // Populate with WordPress taxonomy slugs
    // Shows 1-3 have matching WP terms, show 4 is audio-only (no WP equivalent yet)
    await pool.query(`
      UPDATE shows SET wp_term_slug = CASE
        WHEN slug = 'powerchat' THEN 'powerchat'
        WHEN slug = 'inner-circle' THEN 'inner-circle'
        WHEN slug = 'outside-the-lines' THEN 'outside-the-lines'
        ELSE NULL
      END
    `);

    // Verify
    const result = await pool.query('SELECT id, name, slug, wp_term_slug FROM shows ORDER BY id');
    console.log('Shows after migration:');
    console.table(result.rows);

    console.log('Migration complete.');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
