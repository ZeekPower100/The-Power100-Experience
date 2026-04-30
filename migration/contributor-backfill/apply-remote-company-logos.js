#!/usr/bin/env node
/**
 * Sister of apply-local-company-logos.js — same upload + patch + IC-sync chain,
 * but downloads from a public URL first instead of reading a local file.
 *
 * Use case: companies whose logos we found via website scrape (og:image, header
 * <img class="logo">, official media kit) — most common for brands without
 * legacy power100.io coverage.
 *
 * Reuses the helpers from apply-local-company-logos.js by re-implementing the
 * upload pipeline here (the local script is structured for in-script MANIFEST,
 * not exporting helpers).
 *
 * Idempotent — re-running with the same MANIFEST is a no-op (existing
 * ec_company_logo / ec_company_logo_dark on a contributor are not overwritten).
 *
 * Usage:
 *   node migration/contributor-backfill/apply-remote-company-logos.js [--dry-run] [--force]
 *   --force overwrites existing ec_company_logo/ec_company_logo_dark.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const axios = require('axios');
const fs    = require('fs');
const path  = require('path');
const sharp = require('sharp');
const https = require('https');
const http  = require('http');

// ── MANIFEST ─────────────────────────────────────────────────────────────
// One entry per company. light_url = light-bg version (P100), dark_url = dark-bg
// version (IC mirror). Either may be omitted; missing variant won't be set.
const MANIFEST = [
  {
    company:   'ABBY Home (Abby Windows & Exteriors)',
    light_url: 'https://www.abbyhome.com/img/logo.png',
    aliases:   ['ABBY Home', 'Abby Windows & Exteriors', 'Abby Windows', 'Abby Home'],
  },
  {
    company:   'ContractingPRO',
    light_url: 'https://www.mycontractingpro.com/img/logo.svg',
    aliases:   ['Contracting Pro', 'Contracting PRO', 'My Contracting Pro'],
  },
  {
    company:   'James Hardie Building Products',
    light_url: 'https://images.ctfassets.net/dzi2asncd44t/1zXM9ZVxSHpXuLLWzOIf5s/8c5abf86f25fc326af14728a31407f5d/james-hardie-vector-logo.svg',
    aliases:   ['James Hardie'],
  },
  {
    company:   'Marcus Sheridan International',
    light_url: 'https://marcussheridan.com/hubfs/Branding/marcus%20sheridan%20international%20logo%20color.svg',
    dark_url:  'https://marcussheridan.com/hubfs/Branding/marcus%20sheridan%20international%20logo%20white.svg',
    aliases:   ['Marcus Sheridan'],
  },
  {
    company:   'Redo Cabinets',
    light_url: 'https://redocabinetrefacing.com/wp-content/uploads/2025/12/Redocabinets-horizontal-logo.webp',
    aliases:   ['Redo Cabinet Refacing'],
  },
  {
    company:   'Tennessee Tech University',
    light_url: 'https://www.tntech.edu/_resources/2023-theme/images/tenn-tech-logo.svg',
    aliases:   ['Tennessee Tech', 'TN Tech', 'Tenn Tech'],
  },
  {
    company:   'KangaRoof',
    light_url: 'https://kangaroof.com/wp-content/uploads/2025/05/kanga-logo-final-footer-min.webp',
    aliases:   ['Kanga Roof', 'A1 Roofing', "A1 Roofing's Kanga Roof"],
  },
  {
    company:   'Marshall Building & Remodeling',
    light_url: 'https://www.marshallbuildingandremodeling.com/wp-content/uploads/logo-with-text.png',
    aliases:   ['Marshall Building and Remodeling'],
  },
  {
    company:   'Monopolize Your Marketplace',
    light_url: 'https://www.monopolizeyourmarketplace.com/wp-content/uploads/2013/10/cropped-cropped-cropped-MONOPOLIZE-YOUR-MARKETPLACE-12.jpg',
  },
  {
    company:   'New Heights Roofing',
    light_url: 'https://www.newheightsroofing.com/wp-content/uploads/2025/10/hr-header-logo.png',
  },
  {
    company:   'Roof Hustlers',
    light_url: 'https://img1.wsimg.com/isteam/ip/299b3946-2c4e-4479-900c-25e5ed7e3248/blob-7145846.png/:/cr=t:7.63%25,l:7.63%25,w:84.75%25,h:84.75%25/rs=w:600,m',
  },
  {
    company:   'Smart Cremation LLC',
    light_url: 'https://www.smartcremation.com/wp-content/uploads/2021/08/smart-crem-logo-black-1.png',
    aliases:   ['Smart Cremation'],
  },
  {
    company:   'ASP Superhome',
    light_url: 'https://cdn.prod.website-files.com/69298778e5c11c0cb3275a3a/692d85a346590c087ee3ef40_asp_superhome___no_tiles__1__l8l2toqpz9qfpmn4byv2hn-1920x894.webp',
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

const argv  = process.argv.slice(2);
const DRY   = argv.includes('--dry-run');
const FORCE = argv.includes('--force');
const MAP_PATH = path.join(__dirname, '..', '..', 'tpe-backend', 'data', 'legacy-company-logos.json');

const norm    = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const slugify = s => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// ── download remote URL → buffer ─────────────────────────────────────────
function downloadBuffer(url) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({
      host: u.host, path: u.pathname + u.search, method: 'GET', timeout: 20000,
      headers: { 'User-Agent': BROWSER_UA, Accept: 'image/*,*/*;q=0.5' },
    }, (r) => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location) {
        const next = new URL(r.headers.location, url).toString();
        resolve(downloadBuffer(next));
        return;
      }
      if (r.statusCode !== 200) {
        reject(new Error(`HTTP ${r.statusCode} on ${url}`));
        return;
      }
      const chunks = [];
      r.on('data', c => chunks.push(c));
      r.on('end',  () => resolve({ buf: Buffer.concat(chunks), contentType: r.headers['content-type'] || '' }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('download timeout')); });
    req.end();
  });
}

// ── upload buffer → staging media (handles SVG & WebP via sharp → PNG) ──
async function uploadBufferToStaging(buf, urlContentType, sourceUrl, filenameHint) {
  const urlExt = (path.extname(new URL(sourceUrl).pathname).slice(1) || '').toLowerCase();
  let ext = urlExt || (urlContentType.includes('svg') ? 'svg' : urlContentType.includes('png') ? 'png' : urlContentType.includes('webp') ? 'webp' : urlContentType.includes('jpeg') ? 'jpg' : 'png');
  let contentType = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  let outBuf = buf;
  let outExt = ext;
  // Convert SVG (WP rejects by default) and WebP (some themes display poorly) to PNG
  if (ext === 'svg' || ext === 'webp') {
    outBuf = await sharp(buf, { density: 300 }).resize({ width: 1024, withoutEnlargement: true }).png().toBuffer();
    contentType = 'image/png';
    outExt = 'png';
  }
  const filename = `${filenameHint}.${outExt}`;
  if (DRY) {
    console.log(`     [dry-run] would upload ${filename} (${outBuf.length} bytes, ${contentType})`);
    return { id: 0, source_url: '(dry-run)' };
  }
  const r = await axios.post(`${STAGING_BASE}/wp-json/wp/v2/media`, outBuf, {
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

// ── find staging contributors by company name (with aliases) ────────────
async function findContributorsByCompany(companyName, aliases = []) {
  const haystack = [companyName, ...aliases].map(norm);
  let all = [];
  let page = 1;
  while (true) {
    const r = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/pages?_fields=id,slug,title,meta&per_page=100&page=${page}`, {
      headers: { Authorization: STG_AUTH, 'User-Agent': BROWSER_UA },
      timeout: 20000,
      validateStatus: s => s < 500,
    });
    if (r.status === 400) break;
    if (!r.data || r.data.length === 0) break;
    all = all.concat(r.data);
    if (r.data.length < 100) break;
    page++;
    if (page > 30) break;
  }
  return all.filter(p => {
    const co = p.meta?.ec_company_name;
    if (!co) return false;
    return haystack.includes(norm(co));
  });
}

async function patchStaging(pageId, patch) {
  if (DRY) { console.log(`     [dry-run] would PATCH page ${pageId}:`, JSON.stringify(patch)); return; }
  await axios.post(`${STAGING_BASE}/wp-json/wp/v2/pages/${pageId}`, { meta: patch }, {
    headers: { Authorization: STG_AUTH, 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
    timeout: 15000,
  });
}

async function fetchSourceUrl(attId) {
  if (!attId) return null;
  const r = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/media/${attId}?_fields=source_url`, {
    headers: { Authorization: STG_AUTH, 'User-Agent': BROWSER_UA }, timeout: 10000,
  }).catch(() => null);
  return r?.data?.source_url || null;
}

async function upsertToIc(payload) {
  if (!IC_KEY) return null;
  if (DRY) { console.log(`     [dry-run] would IC upsert:`, payload.slug); return null; }
  return axios.post(`${IC_BASE}/wp-json/ic/v1/expert-contributor/upsert`, payload, {
    headers: { 'X-IC-API-Key': IC_KEY, 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
    timeout: 30000,
  }).then(r => r.data).catch(e => ({ error: e.message }));
}

function updateLegacyMap(entry, lightUploaded, darkUploaded) {
  if (DRY) return;
  const map = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8'));
  const key = entry.company;
  const existing = map[key] || {};
  if (lightUploaded?.source_url && lightUploaded.id) {
    existing.url = lightUploaded.source_url;
    existing.attachment_id = lightUploaded.id;
  }
  if (darkUploaded?.source_url && darkUploaded.id) {
    existing.url_dark = darkUploaded.source_url;
    existing.attachment_id_dark = darkUploaded.id;
  }
  if (entry.aliases?.length) {
    existing.aliases = Array.from(new Set([...(existing.aliases || []), ...entry.aliases]));
  }
  existing.source = existing.source || 'remote-scrape';
  existing.updated = new Date().toISOString().slice(0, 10);
  map[key] = existing;
  fs.writeFileSync(MAP_PATH, JSON.stringify(map, null, 2) + '\n');
}

// ── per-entry runner ─────────────────────────────────────────────────────
async function processEntry(entry) {
  console.log(`\n=== ${entry.company} ===`);
  const contribs = await findContributorsByCompany(entry.company, entry.aliases || []);
  if (contribs.length === 0) {
    console.log('  ⚠ no staging contributor pages match — skipping');
    return { company: entry.company, status: 'no-match' };
  }
  console.log(`  matched ${contribs.length} contributor page(s):`, contribs.map(p => `${p.id}/${p.slug}`).join(', '));

  // Upload variants ONCE per company, reuse attachment IDs across contributors
  let lightUp = null, darkUp = null;
  if (entry.light_url) {
    try {
      console.log(`  ↓ downloading light: ${entry.light_url}`);
      const { buf, contentType } = await downloadBuffer(entry.light_url);
      console.log(`    got ${buf.length} bytes (${contentType})`);
      lightUp = await uploadBufferToStaging(buf, contentType, entry.light_url, slugify(entry.company) + '-logo');
      console.log(`    uploaded → att_id=${lightUp.id}, url=${lightUp.source_url}`);
    } catch (e) { console.error(`  ✗ light upload failed: ${e.message}`); }
  }
  if (entry.dark_url) {
    try {
      console.log(`  ↓ downloading dark: ${entry.dark_url}`);
      const { buf, contentType } = await downloadBuffer(entry.dark_url);
      console.log(`    got ${buf.length} bytes (${contentType})`);
      darkUp = await uploadBufferToStaging(buf, contentType, entry.dark_url, slugify(entry.company) + '-logo-dark');
      console.log(`    uploaded → att_id=${darkUp.id}, url=${darkUp.source_url}`);
    } catch (e) { console.error(`  ✗ dark upload failed: ${e.message}`); }
  }
  if (!lightUp && !darkUp) return { company: entry.company, status: 'all-uploads-failed' };

  // Patch each contributor page
  let patched = 0;
  for (const p of contribs) {
    const cur = p.meta || {};
    const patch = {};
    if (lightUp?.id && (FORCE || !cur.ec_company_logo)) patch.ec_company_logo = lightUp.id;
    if (darkUp?.id  && (FORCE || !cur.ec_company_logo_dark)) patch.ec_company_logo_dark = darkUp.id;
    if (Object.keys(patch).length === 0) {
      console.log(`  - page ${p.id}/${p.slug}: already has logo(s), skipping (use --force to overwrite)`);
      continue;
    }
    try {
      await patchStaging(p.id, patch);
      console.log(`  ✓ page ${p.id}/${p.slug}: patched`, JSON.stringify(patch));
      patched++;
    } catch (e) { console.error(`  ✗ page ${p.id}/${p.slug}: patch failed: ${e.message}`); }

    // Trigger IC mirror upsert with the new logo URLs
    const lightUrl = lightUp?.source_url || (cur.ec_company_logo ? await fetchSourceUrl(cur.ec_company_logo) : null);
    const darkUrl  = darkUp?.source_url  || (cur.ec_company_logo_dark ? await fetchSourceUrl(cur.ec_company_logo_dark) : null);
    const icPayload = { slug: p.slug, ec_company_logo_url: lightUrl, ec_company_logo_dark_url: darkUrl };
    await upsertToIc(icPayload);
  }

  updateLegacyMap(entry, lightUp, darkUp);
  return { company: entry.company, status: 'ok', patched, light: !!lightUp, dark: !!darkUp };
}

// ── main ─────────────────────────────────────────────────────────────────
(async () => {
  console.log(DRY ? '== DRY RUN ==' : (FORCE ? '== LIVE (FORCE) ==' : '== LIVE =='));
  const results = [];
  for (const entry of MANIFEST) {
    try { results.push(await processEntry(entry)); }
    catch (e) { results.push({ company: entry.company, status: 'error', error: e.message }); }
  }
  console.log('\n=== SUMMARY ===');
  results.forEach(r => console.log(' ', JSON.stringify(r)));
})();
