#!/usr/bin/env node
/**
 * Reverse-sync staging WP contributor pages → prod tpedb expert_contributors.
 *
 * The platform's primary data flow is one-directional (tpedb → upsertContributorLander
 * → staging WP). When orphan staging pages got tpedb rows INSERTed earlier (to satisfy
 * the "every contributor MUST have a tpedb row" rule), only minimal name/email fields
 * were populated. Hand-edits to staging WP also drift away from tpedb. This script
 * walks every staging contributor page and writes its ec_* meta back into tpedb.
 *
 * Match strategy (in order):
 *   1. wp_page_id (set by upserter — most reliable)
 *   2. slug match (parse wp_page_url)
 *   3. (--allow-email-match only) email match
 *
 * Field mapping: staging post meta → tpedb column. Idempotent — by default only
 * writes when target column is empty/null. Use --force to overwrite. Always
 * skips email (UNIQUE constraint) and first_name/last_name (already set).
 *
 * Special: ec_headshot is an attachment_id; resolved to source_url via WP REST,
 * then written to tpedb headshot_url.
 *
 * Usage (run on prod EC2):
 *   node migration/contributor-backfill/reverse-sync-staging-to-tpedb.js [--dry-run] [--force] [--allow-email-match]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const axios = require('axios');
const { Client } = require('pg');

const STAGING_BASE = process.env.STAGING_P100_BASE || 'https://staging.power100.io';
const STG_AUTH = 'Basic ' + Buffer.from(
  (process.env.STAGING_P100_ADMIN_USER || 'power100') + ':' +
  (process.env.STAGING_P100_ADMIN_APP_PWD || '')
).toString('base64');
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Safari/537.36';

const argv = process.argv.slice(2);
const DRY = argv.includes('--dry-run');
const FORCE = argv.includes('--force');
const ALLOW_EMAIL_MATCH = argv.includes('--allow-email-match');

// ── meta_key → tpedb column mapping ──────────────────────────────────────
// NOT mapped (handled separately or off-limits): ec_headshot (resolved to URL),
// ec_company_logo / ec_company_logo_dark (staging-only by design, attachment IDs).
const META_TO_COLUMN = {
  ec_company_name:        'company',
  ec_website_url:         'website_url',
  ec_linkedin_url:        'linkedin_url',
  ec_phone:               'phone',
  ec_position:            'title_position',
  ec_years_in_industry:   'years_in_industry',
  ec_credentials:         'credentials',
  ec_expertise_topics:    'expertise_topics',
  ec_company_description: 'company_description',
  ec_bio:                 'bio',
  ec_hero_quote:          'hero_quote',
  ec_revenue_value:       'revenue_value',
  ec_geographic_reach:    'geographic_reach',
  ec_custom_stat:         'custom_stat',
  ec_recognition:         'recognition',
  ec_videos:              'videos',
  ec_testimonials:        'testimonials',
};

// Columns that we NEVER overwrite from staging (off-limits even with --force).
const OFF_LIMITS = new Set(['email', 'id', 'first_name', 'last_name', 'created_at', 'stripe_customer_id', 'stripe_subscription_id', 'payment_status', 'plan', 'amount_cents']);

// ── staging WP helpers ───────────────────────────────────────────────────
async function fetchAllStagingContributors() {
  let all = [];
  let page = 1;
  while (page <= 30) {
    const r = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/pages?_fields=id,slug,link,meta&per_page=100&page=${page}`, {
      headers: { Authorization: STG_AUTH, 'User-Agent': BROWSER_UA },
      timeout: 30000,
      validateStatus: s => s < 500,
    });
    if (r.status === 400 || !r.data || r.data.length === 0) break;
    all = all.concat(r.data);
    if (r.data.length < 100) break;
    page++;
  }
  // Only contributor pages (those with ec_contributor_type meta)
  return all.filter(p => p.meta && p.meta.ec_contributor_type);
}

async function resolveAttachmentUrl(attId) {
  if (!attId || attId === '0' || attId === 0) return null;
  try {
    const r = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/media/${attId}?_fields=source_url`, {
      headers: { Authorization: STG_AUTH, 'User-Agent': BROWSER_UA }, timeout: 10000,
    });
    return r.data?.source_url || null;
  } catch { return null; }
}

// ── tpedb match strategy ────────────────────────────────────────────────
function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  return false;
}

function normalizeMetaValue(metaKey, val) {
  if (val === null || val === undefined) return null;
  let s = String(val).trim();
  if (s === '' || s === '0' && metaKey !== 'ec_years_in_industry' && metaKey !== 'ec_revenue_value') return null;
  return s;
}

async function findTpedbRow(client, page) {
  const meta = page.meta || {};
  // 1. wp_page_id match
  let r = await client.query('SELECT * FROM expert_contributors WHERE wp_page_id = $1 LIMIT 1', [page.id]);
  if (r.rows.length) return { row: r.rows[0], match_by: 'wp_page_id' };
  // 2. slug match (extract from wp_page_url that some rows have)
  r = await client.query("SELECT * FROM expert_contributors WHERE wp_page_url LIKE $1 LIMIT 1", [`%/${page.slug}%`]);
  if (r.rows.length) return { row: r.rows[0], match_by: 'wp_page_url-slug' };
  // 3. (opt-in) email match — skip by default since staging may have stale email
  if (ALLOW_EMAIL_MATCH && meta.ec_email) {
    r = await client.query('SELECT * FROM expert_contributors WHERE LOWER(email) = LOWER($1) LIMIT 1', [meta.ec_email]);
    if (r.rows.length) return { row: r.rows[0], match_by: 'email' };
  }
  return { row: null, match_by: null };
}

// ── per-page reconciler ──────────────────────────────────────────────────
async function reconcilePage(client, page, stats) {
  const meta = page.meta || {};
  const { row, match_by } = await findTpedbRow(client, page);
  if (!row) {
    stats.unmatched.push({ page_id: page.id, slug: page.slug, ec_company_name: meta.ec_company_name });
    return;
  }

  // Build patch: each staging meta value → tpedb column, only when target empty (or --force)
  const patch = {};
  for (const [metaKey, col] of Object.entries(META_TO_COLUMN)) {
    if (OFF_LIMITS.has(col)) continue;
    const stagingVal = normalizeMetaValue(metaKey, meta[metaKey]);
    if (stagingVal === null) continue;
    if (!FORCE && !isEmpty(row[col])) continue;
    patch[col] = stagingVal;
  }

  // Special: ec_headshot (att_id) → headshot_url
  if (meta.ec_headshot && (FORCE || isEmpty(row.headshot_url))) {
    const url = await resolveAttachmentUrl(meta.ec_headshot);
    if (url) patch.headshot_url = url;
  }

  // Always set wp_page_id + wp_page_url if we matched a different way (so future runs are wp_page_id-fast)
  if (match_by !== 'wp_page_id' && isEmpty(row.wp_page_id)) patch.wp_page_id = page.id;
  if (isEmpty(row.wp_page_url)) patch.wp_page_url = page.link;

  if (Object.keys(patch).length === 0) {
    stats.no_change++;
    return;
  }

  if (DRY) {
    stats.would_update.push({ tpedb_id: row.id, page_id: page.id, slug: page.slug, match_by, patch_keys: Object.keys(patch), patch });
    return;
  }

  // Apply UPDATE
  const cols = Object.keys(patch);
  const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const vals = cols.map(c => patch[c]);
  vals.push(row.id);
  await client.query(`UPDATE expert_contributors SET ${sets}, updated_at = NOW() WHERE id = $${vals.length}`, vals);
  stats.updated.push({ tpedb_id: row.id, page_id: page.id, slug: page.slug, match_by, fields: cols });
}

// ── main ─────────────────────────────────────────────────────────────────
(async () => {
  console.log(DRY ? '== DRY RUN ==' : (FORCE ? '== LIVE (FORCE) ==' : '== LIVE =='));
  if (ALLOW_EMAIL_MATCH) console.log('   (email match fallback ENABLED)');

  console.log('\nFetching all staging contributor pages...');
  const pages = await fetchAllStagingContributors();
  console.log(`  got ${pages.length} contributor pages`);

  const client = new Client({
    host: process.env.DB_HOST, port: process.env.DB_PORT,
    user: process.env.DB_USER, password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });
  await client.connect();
  console.log(`  connected to tpedb @ ${process.env.DB_HOST}`);

  const stats = { no_change: 0, would_update: [], updated: [], unmatched: [] };
  let i = 0;
  for (const page of pages) {
    i++;
    if (i % 25 === 0) console.log(`  ... processed ${i}/${pages.length}`);
    try { await reconcilePage(client, page, stats); }
    catch (e) { console.error(`  ERR on page ${page.id}/${page.slug}:`, e.message); }
  }

  await client.end();

  console.log('\n=== SUMMARY ===');
  console.log(`Pages scanned:   ${pages.length}`);
  console.log(`Unmatched:       ${stats.unmatched.length}`);
  console.log(`No change:       ${stats.no_change}`);
  console.log(DRY ? `Would update:    ${stats.would_update.length}` : `Updated:         ${stats.updated.length}`);

  if (DRY && stats.would_update.length) {
    console.log('\n=== WOULD UPDATE (sample) ===');
    stats.would_update.slice(0, 10).forEach(u => console.log(' ', JSON.stringify({tpedb_id:u.tpedb_id, slug:u.slug, match_by:u.match_by, fields:u.patch_keys})));
    // Field-level histogram
    const fieldCounts = {};
    stats.would_update.forEach(u => u.patch_keys.forEach(k => fieldCounts[k] = (fieldCounts[k]||0)+1));
    console.log('\n=== FIELDS THAT WOULD BE FILLED ===');
    Object.entries(fieldCounts).sort((a,b)=>b[1]-a[1]).forEach(([k,n])=>console.log(`  ${k.padEnd(25)} ${n}`));
  }
  if (stats.unmatched.length) {
    console.log('\n=== UNMATCHED STAGING PAGES (no tpedb row found) ===');
    stats.unmatched.forEach(u => console.log(` ${u.page_id} | ${u.slug} | ${u.ec_company_name||''}`));
    console.log('\n  Re-run with --allow-email-match to also try email-based matching.');
  }
})().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
