#!/usr/bin/env node
/**
 * Apply local logo files (e.g. user-dropped from Downloads) to staging
 * contributor landers + IC mirror, for both light and dark variants.
 *
 * Use case: companies whose logos were not on legacy power100.io. Operator
 * drops the file(s) on disk, lists them in MANIFEST below, this script:
 *  1. Sideloads to staging media (SVG → PNG via sharp inline)
 *  2. Sets ec_company_logo (light) and/or ec_company_logo_dark on every
 *     staging contributor whose ec_company_name matches (fuzzy)
 *  3. Adds the company to data/legacy-company-logos.json so future intakes
 *     auto-pick it up
 *  4. Triggers IC mirror upsert with both URLs so the dark-themed lander
 *     uses the dark variant
 *
 * Idempotent — re-running with the same MANIFEST is a no-op (existing
 * ec_company_logo / ec_company_logo_dark are not overwritten).
 *
 * Usage:
 *   node migration/contributor-backfill/apply-local-company-logos.js [--dry-run] [--update-map-only]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const axios   = require('axios');
const fs      = require('fs');
const path    = require('path');
const sharp   = require('sharp');

// ── MANIFEST ─────────────────────────────────────────────────────────────
// Edit this list to apply new logos. `light` = dark-text version (for P100
// light bg). `dark` = white-text version (for IC dark bg). Either may be
// omitted; missing variant won't be set.
const MANIFEST = [
  {
    company: 'Dave Yoho Associates',
    light:   'C:/Users/broac/Downloads/Dave-Yoho-Logo-2.png',  // dark text
    dark:    'C:/Users/broac/Downloads/Dave-Yoho-Logo-1.png',  // white text
    aliases: ['Dave Yoho'],
  },
  {
    company: 'Bee Window',
    light:   'C:/Users/broac/Downloads/Bee-Window-logo-1.png',
  },
  {
    company: 'Matrix Home Solutions',
    light:   'C:/Users/broac/Downloads/Matrix Basement FInishing logo 1.png',
    aliases: ['Matrix Basement Finishing', 'Matrix Basement Systems'],
  },
  {
    company: 'Lifetime Home Remodeling',
    light:   'C:/Users/broac/Downloads/Lifetime-Home-Remodeling-Logo-1.svg',
  },
];

// ── config ───────────────────────────────────────────────────────────────
const STAGING_BASE = process.env.STAGING_P100_BASE || 'https://staging.power100.io';
const IC_BASE      = 'https://innercircle.power100.io';
const IC_KEY       = process.env.IC_REST_API_KEY || process.env.TPX_IC_API_KEY;
const STG_AUTH = 'Basic ' + Buffer.from(
  (process.env.STAGING_P100_ADMIN_USER || 'power100') + ':' +
  (process.env.STAGING_P100_ADMIN_APP_PWD || '')
).toString('base64');
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Safari/537.36';

const argv = process.argv.slice(2);
const DRY  = argv.includes('--dry-run');
const MAP_ONLY = argv.includes('--update-map-only');
const MAP_PATH = path.join(__dirname, '..', '..', 'tpe-backend', 'data', 'legacy-company-logos.json');

const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ── upload local file → staging media (handles SVG via sharp) ────────────
async function uploadLocalToStaging(filePath, filenameHint) {
  if (!fs.existsSync(filePath)) throw new Error(`file not found: ${filePath}`);
  let buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  let contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  let outExt = ext;
  if (ext === 'svg') {
    buf = await sharp(buf, { density: 300 }).resize({ width: 1024 }).png().toBuffer();
    contentType = 'image/png';
    outExt = 'png';
  }
  const filename = `${filenameHint}.${outExt}`;
  const r = await axios.post(`${STAGING_BASE}/wp-json/wp/v2/media`, buf, {
    headers: {
      Authorization: STG_AUTH,
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'User-Agent': BROWSER_UA,
    },
    timeout: 30000,
    maxContentLength: 100 * 1024 * 1024,
  });
  return { id: r.data.id, source_url: r.data.source_url };
}

// ── find staging contributors matching a company name ───────────────────
async function findContributorsByCompany(companyName, aliases = []) {
  // Search by ec_company_name meta — pull all `expert_contributor` template pages
  const haystack = [companyName, ...aliases].map(norm);
  let all = [];
  let page = 1;
  while (true) {
    const r = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/pages?_fields=id,slug,title,meta&per_page=100&page=${page}`, {
      headers: { Authorization: STG_AUTH, 'User-Agent': BROWSER_UA },
      timeout: 20000,
      validateStatus: s => s < 500,
    });
    if (r.status === 400) break;  // past last page
    if (!r.data || r.data.length === 0) break;
    all = all.concat(r.data);
    if (r.data.length < 100) break;
    page++;
    if (page > 30) break;  // safety
  }
  return all.filter(p => {
    const co = p.meta?.ec_company_name;
    if (!co) return false;
    return haystack.includes(norm(co));
  });
}

async function fetchStagingMeta(pageId) {
  const r = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/pages/${pageId}?_fields=meta`, {
    headers: { Authorization: STG_AUTH, 'User-Agent': BROWSER_UA }, timeout: 10000,
  });
  return r.data.meta || {};
}

async function patchStaging(pageId, patch) {
  await axios.post(`${STAGING_BASE}/wp-json/wp/v2/pages/${pageId}`, { meta: patch }, {
    headers: { Authorization: STG_AUTH, 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
    timeout: 15000,
  });
}

async function upsertToIc(payload) {
  if (!IC_KEY) return null;
  return axios.post(`${IC_BASE}/wp-json/ic/v1/expert-contributor/upsert`, payload, {
    headers: { 'X-IC-API-Key': IC_KEY, 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
    timeout: 30000,
  }).then(r => r.data).catch(e => ({ error: e.message }));
}

async function fetchSourceUrl(attId) {
  if (!attId) return null;
  const r = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/media/${attId}?_fields=source_url`, {
    headers: { Authorization: STG_AUTH, 'User-Agent': BROWSER_UA }, timeout: 10000,
  }).catch(() => null);
  return r?.data?.source_url || null;
}

// ── update legacy-company-logos.json with new entries ───────────────────
function updateLegacyMap(entry, lightUploaded, darkUploaded) {
  const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const key = entry.company;
  const existing = map[key] || {};
  if (lightUploaded?.source_url) {
    existing.url = lightUploaded.source_url;
    existing.attachment_id = lightUploaded.id;
  }
  if (darkUploaded?.source_url) {
    existing.url_dark = darkUploaded.source_url;
    existing.attachment_id_dark = darkUploaded.id;
  }
  if (entry.aliases?.length) {
    existing.aliases = Array.from(new Set([...(existing.aliases || []), ...entry.aliases]));
  }
  existing.source = existing.source || 'local-upload';
  existing.updated = new Date().toISOString().slice(0, 10);
  map[key] = existing;
  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + '\n');
}

// ── main ─────────────────────────────────────────────────────────────────
async function processEntry(entry) {
  const tag = `[${entry.company}]`;
  console.log(`\n${tag}`);

  let lightUp = null, darkUp = null;
  if (entry.light) {
    if (DRY) console.log(`${tag} would upload light: ${entry.light}`);
    else { lightUp = await uploadLocalToStaging(entry.light, `${slugify(entry.company)}-logo`); console.log(`${tag} light uploaded → att ${lightUp.id} ${lightUp.source_url}`); }
  }
  if (entry.dark) {
    if (DRY) console.log(`${tag} would upload dark:  ${entry.dark}`);
    else { darkUp = await uploadLocalToStaging(entry.dark, `${slugify(entry.company)}-logo-dark`); console.log(`${tag} dark uploaded  → att ${darkUp.id} ${darkUp.source_url}`); }
  }

  if (!DRY) updateLegacyMap(entry, lightUp, darkUp);

  if (MAP_ONLY) { console.log(`${tag} (--update-map-only) skipping contributor patch`); return; }

  const contribs = await findContributorsByCompany(entry.company, entry.aliases || []);
  console.log(`${tag} matched ${contribs.length} staging contributor(s)`);

  for (const c of contribs) {
    const meta = await fetchStagingMeta(c.id);
    const patch = {};
    if (lightUp && !meta.ec_company_logo)      patch.ec_company_logo      = String(lightUp.id);
    if (darkUp  && !meta.ec_company_logo_dark) patch.ec_company_logo_dark = String(darkUp.id);
    if (Object.keys(patch).length === 0) {
      console.log(`  - ${c.slug}: already has both variants, skipping`);
      continue;
    }
    if (DRY) { console.log(`  - ${c.slug}: would patch ${JSON.stringify(patch)}`); continue; }
    await patchStaging(c.id, patch);
    console.log(`  ✓ ${c.slug}: patched ${Object.keys(patch).join(', ')}`);

    // Re-fetch + mirror to IC with both variant URLs
    const fresh = await fetchStagingMeta(c.id);
    const lightUrl = await fetchSourceUrl(fresh.ec_company_logo);
    const darkUrl  = await fetchSourceUrl(fresh.ec_company_logo_dark);
    const headshotUrl = await fetchSourceUrl(fresh.ec_headshot);
    const result = await upsertToIc({
      p100_page_id:  c.id,
      p100_page_url: `${STAGING_BASE}/${c.slug}/`,
      slug:          c.slug,
      title:         (c.title.rendered || c.title || '').replace(/&#?\w+;/g, ''),
      meta:          fresh,
      headshot_url:  headshotUrl,
      company_logo_url:      lightUrl,
      company_logo_url_dark: darkUrl,
    });
    if (result?.error) console.warn(`  ! ${c.slug}: IC mirror failed: ${result.error}`);
    else               console.log(`  ✓ ${c.slug}: IC mirror ${result?.action || 'ok'}`);
  }
}

(async () => {
  console.log(`apply-local-company-logos${DRY ? ' [DRY RUN]' : ''}${MAP_ONLY ? ' [MAP ONLY]' : ''}`);
  console.log(`Manifest: ${MANIFEST.length} entr${MANIFEST.length === 1 ? 'y' : 'ies'}`);
  for (const entry of MANIFEST) {
    try { await processEntry(entry); }
    catch (e) { console.error(`[${entry.company}] FAILED:`, e.message); }
  }
  console.log('\n✓ done');
})();
