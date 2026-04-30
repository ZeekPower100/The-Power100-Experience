// DATABASE-CHECKED: expert_contributors columns verified on 2026-04-30
// Reverse-sync logic: staging WP contributor page → tpedb expert_contributors row.
// Used by both the bulk reconciler (migration/contributor-backfill/reverse-sync-staging-to-tpedb.js)
// and the per-page webhook endpoint (POST /api/contributor-sync/from-staging).
//
// CRITICAL INVARIANT: Additive only. NEVER overwrites a tpedb column that already
// has a value. The webhook caller cannot opt into --force. Only the bulk script
// supports --force, by passing { force: true } directly here.

const axios = require('axios');
const { query } = require('../config/database');

const STAGING_BASE = process.env.STAGING_P100_BASE || 'https://staging.power100.io';
const STG_AUTH = 'Basic ' + Buffer.from(
  (process.env.STAGING_P100_ADMIN_USER || 'power100') + ':' +
  (process.env.STAGING_P100_ADMIN_APP_PWD || '')
).toString('base64');
const BROWSER_UA = 'Mozilla/5.0 (TPE-reverse-sync)';

// ── meta_key → tpedb column mapping (kept in sync with bulk reconciler) ──
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

// Off-limits even with force (UNIQUE constraint, system-managed, or already auth'd elsewhere)
const OFF_LIMITS = new Set([
  'email', 'id', 'first_name', 'last_name', 'created_at',
  'stripe_customer_id', 'stripe_subscription_id', 'payment_status', 'plan', 'amount_cents',
]);

function isEmpty(v) {
  if (v === null || v === undefined) return true;
  if (typeof v === 'string' && v.trim() === '') return true;
  return false;
}

function normalizeMetaValue(metaKey, val) {
  if (val === null || val === undefined) return null;
  const s = String(val).trim();
  if (s === '') return null;
  // For numeric/non-trim fields, "0" is a legitimate value
  if (s === '0' && metaKey !== 'ec_years_in_industry' && metaKey !== 'ec_revenue_value') return null;
  return s;
}

async function fetchStagingPage(wpPageId) {
  const r = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/pages/${wpPageId}?_fields=id,slug,link,meta`, {
    headers: { Authorization: STG_AUTH, 'User-Agent': BROWSER_UA },
    timeout: 15000,
    validateStatus: s => s < 500,
  });
  if (r.status === 404) return null;
  if (r.status >= 400) throw new Error(`staging WP returned ${r.status} for page ${wpPageId}`);
  return r.data;
}

async function resolveAttachmentUrl(attId) {
  if (!attId || String(attId) === '0') return null;
  try {
    const r = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/media/${attId}?_fields=source_url`, {
      headers: { Authorization: STG_AUTH, 'User-Agent': BROWSER_UA }, timeout: 8000,
    });
    return r.data?.source_url || null;
  } catch { return null; }
}

// Match a staging page to a tpedb row. wp_page_id is the strongest signal,
// then wp_page_url-slug, then (opt-in) email.
async function findTpedbRow(page, { allowEmailMatch = false } = {}) {
  const meta = page.meta || {};
  let r = await query('SELECT * FROM expert_contributors WHERE wp_page_id = $1 LIMIT 1', [page.id]);
  if (r.rows.length) return { row: r.rows[0], match_by: 'wp_page_id' };
  r = await query("SELECT * FROM expert_contributors WHERE wp_page_url LIKE $1 LIMIT 1", [`%/${page.slug}%`]);
  if (r.rows.length) return { row: r.rows[0], match_by: 'wp_page_url-slug' };
  if (allowEmailMatch && meta.ec_email) {
    r = await query('SELECT * FROM expert_contributors WHERE LOWER(email) = LOWER($1) LIMIT 1', [meta.ec_email]);
    if (r.rows.length) return { row: r.rows[0], match_by: 'email' };
  }
  return { row: null, match_by: null };
}

/**
 * Reconcile a single staging WP page → its matching tpedb row.
 *
 * @param {object} page - staging WP page object (id, slug, link, meta)
 * @param {object} opts
 * @param {boolean} opts.force - overwrite non-empty tpedb cols too (bulk-script-only; webhook never sets this)
 * @param {boolean} opts.allowEmailMatch - opt-in fallback to email match
 * @param {boolean} opts.dryRun - don't actually UPDATE
 * @returns {object} change report with full transparency
 */
async function reconcilePage(page, opts = {}) {
  const { force = false, allowEmailMatch = false, dryRun = false } = opts;
  const meta = page.meta || {};

  const { row, match_by } = await findTpedbRow(page, { allowEmailMatch });
  if (!row) {
    return { status: 'unmatched', wp_page_id: page.id, slug: page.slug };
  }

  const fields_filled = [];           // staging had a value, tpedb was empty → filled
  const fields_skipped_aligned = [];  // both have a value already (skipped, additive-only)
  const fields_skipped_no_staging = []; // staging meta was empty/null
  const patch = {};

  for (const [metaKey, col] of Object.entries(META_TO_COLUMN)) {
    if (OFF_LIMITS.has(col)) continue;
    const stagingVal = normalizeMetaValue(metaKey, meta[metaKey]);
    if (stagingVal === null) { fields_skipped_no_staging.push(col); continue; }
    if (!force && !isEmpty(row[col])) { fields_skipped_aligned.push(col); continue; }
    patch[col] = stagingVal;
    fields_filled.push(col);
  }

  // Special: ec_headshot (att_id) → headshot_url
  if (meta.ec_headshot && (force || isEmpty(row.headshot_url))) {
    const url = await resolveAttachmentUrl(meta.ec_headshot);
    if (url) {
      patch.headshot_url = url;
      fields_filled.push('headshot_url');
    }
  } else if (meta.ec_headshot && !isEmpty(row.headshot_url)) {
    fields_skipped_aligned.push('headshot_url');
  }

  // Always backfill wp_page_id / wp_page_url if matched a different way (cheap, makes future runs faster)
  if (match_by !== 'wp_page_id' && isEmpty(row.wp_page_id)) {
    patch.wp_page_id = page.id;
    fields_filled.push('wp_page_id');
  }
  if (isEmpty(row.wp_page_url)) {
    patch.wp_page_url = page.link;
    fields_filled.push('wp_page_url');
  }

  if (fields_filled.length === 0) {
    return {
      status: 'no_change',
      tpedb_id: row.id, wp_page_id: page.id, slug: page.slug, match_by,
      fields_skipped_aligned, fields_skipped_no_staging,
    };
  }

  if (dryRun) {
    return {
      status: 'would_update',
      tpedb_id: row.id, wp_page_id: page.id, slug: page.slug, match_by,
      fields_filled, fields_skipped_aligned, fields_skipped_no_staging, patch,
    };
  }

  const cols = Object.keys(patch);
  const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
  const vals = cols.map(c => patch[c]);
  vals.push(row.id);
  await query(`UPDATE expert_contributors SET ${sets}, updated_at = NOW() WHERE id = $${vals.length}`, vals);

  return {
    status: 'updated',
    tpedb_id: row.id, wp_page_id: page.id, slug: page.slug, match_by,
    fields_filled, fields_skipped_aligned, fields_skipped_no_staging,
  };
}

// Convenience: fetch + reconcile in one call (used by webhook)
async function syncFromStagingByWpPageId(wpPageId, opts = {}) {
  const page = await fetchStagingPage(wpPageId);
  if (!page) return { status: 'page_not_found_on_staging', wp_page_id: wpPageId };
  if (!page.meta?.ec_contributor_type) {
    return { status: 'not_a_contributor_page', wp_page_id: wpPageId, slug: page.slug };
  }
  return reconcilePage(page, opts);
}

module.exports = {
  reconcilePage,
  syncFromStagingByWpPageId,
  fetchStagingPage,
  META_TO_COLUMN,
  OFF_LIMITS,
};
