#!/usr/bin/env node
/**
 * Backfill ec_company_logo (and ec_company_name where missing) on every
 * staging.power100.io contributor lander, by pulling the existing data from
 * the LEGACY power100.io page of the same slug.
 *
 * Why this script exists
 * ----------------------
 * 96 of 152 staging contributors are missing ec_company_logo. The
 * upserter in contributorEnrichmentService.js was updated to auto-fill it
 * from data/legacy-company-logos.json, but only for new contributors.
 * Existing rows were never re-run. This walks them all and fills the gaps
 * by sideloading logos directly off legacy URLs into staging media, then
 * mirrors to IC via the existing upsert endpoint.
 *
 * Idempotent — safe to re-run. Skips any contributor that already has
 * ec_company_logo set, and skips legacy lookups for any slug that 404s.
 *
 * Usage:
 *   node migration/contributor-backfill/backfill-company-logos.js [--dry-run] [--limit N] [--slug NAME]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ─── config ──────────────────────────────────────────────────────────────
const STAGING_BASE = process.env.STAGING_P100_BASE || 'https://staging.power100.io';
const LEGACY_BASE  = 'https://power100.io';
const IC_BASE      = 'https://innercircle.power100.io';
const IC_KEY       = process.env.IC_REST_API_KEY || process.env.TPX_IC_API_KEY;

const STG_AUTH = 'Basic ' + Buffer.from(
  (process.env.STAGING_P100_ADMIN_USER || 'power100') + ':' +
  (process.env.STAGING_P100_ADMIN_APP_PWD || '')
).toString('base64');

// Legacy uses the same Basic auth (same credential pair, different host)
const LEGACY_AUTH = 'Basic cG93ZXIxMDA6VjJ1YnpMcHQ3SW5aNmd1Z1o0ckVSN05X';

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const STATE_PATH = path.join(__dirname, 'logo-backfill-state.json');

// ─── args ────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const DRY  = argv.includes('--dry-run');
const limitIdx = argv.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(argv[limitIdx + 1], 10) : null;
const slugIdx = argv.indexOf('--slug');
const ONLY_SLUG = slugIdx >= 0 ? argv[slugIdx + 1] : null;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── state (resume across runs) ──────────────────────────────────────────
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); }
  catch { return { processed: {}, started: new Date().toISOString() }; }
}
function saveState(s) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
}

// ─── staging: list missing-logo contributors ─────────────────────────────
async function listStagingMissingLogo() {
  const out = [];
  let page = 1;
  for (;;) {
    const res = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/pages`, {
      params: { per_page: 100, page, _fields: 'id,slug,title,template', context: 'edit' },
      headers: { Authorization: STG_AUTH, 'User-Agent': BROWSER_UA },
      timeout: 20000,
    }).catch(() => null);
    if (!res || !res.data?.length) break;
    for (const p of res.data) {
      if (p.template === 'page-expert-contributor.php') out.push(p);
    }
    if (res.data.length < 100) break;
    page++;
  }

  // For each, fetch meta and keep only those missing ec_company_logo
  const missing = [];
  for (const p of out) {
    const meta = await fetchStagingMeta(p.id).catch(() => null);
    if (!meta) continue;
    const logo = meta.ec_company_logo;
    if (!logo || logo === '0' || logo === 0) {
      missing.push({ id: p.id, slug: p.slug, title: p.title.rendered, meta });
    }
  }
  return missing;
}

async function fetchStagingMeta(pageId) {
  const res = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/pages/${pageId}`, {
    params: { context: 'edit', _fields: 'id,slug,title,meta' },
    headers: { Authorization: STG_AUTH, 'User-Agent': BROWSER_UA },
    timeout: 15000,
  });
  return res.data.meta;
}

// ─── legacy lookup ───────────────────────────────────────────────────────
// Try several slug variants because legacy uses inconsistent suffixes
function legacySlugCandidates(stagingSlug) {
  const base = stagingSlug.replace(/-contributor$|-expert-contributor$|-power-ranked-ceo$|-power-ranked$/, '');
  return [
    base,
    `${base}-expert-contributor`,
    `${base}-contributor`,
    `${base}-power-ranked-ceo`,
    stagingSlug,
  ];
}

const _norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Lookup chain: (1) try slug variants, (2) fall back to title search by name
async function findLegacyPage(stagingPage) {
  const { slug, title } = stagingPage;
  const fullName = (typeof title === 'string' ? title : title?.rendered || '').replace(/&[^;]+;/g, '').trim();

  // Pass A: slug variants
  for (const cand of legacySlugCandidates(slug)) {
    const res = await axios.get(`${LEGACY_BASE}/wp-json/wp/v2/pages`, {
      params: { slug: cand, _fields: 'id,slug,title,acf', context: 'edit' },
      headers: { Authorization: LEGACY_AUTH, 'User-Agent': BROWSER_UA },
      timeout: 20000,
    }).catch(() => null);
    if (res?.data?.length) return res.data[0];
  }

  // Pass B: title search → verify match by normalized name comparison
  if (fullName && fullName.length >= 4) {
    const res = await axios.get(`${LEGACY_BASE}/wp-json/wp/v2/pages`, {
      params: { search: fullName, per_page: 30, _fields: 'id,slug,title', context: 'edit' },
      headers: { Authorization: LEGACY_AUTH, 'User-Agent': BROWSER_UA },
      timeout: 20000,
    }).catch(() => null);
    if (res?.data?.length) {
      const want = _norm(fullName);
      // Prefer pages whose slug stem includes the normalized full name AND uses ec template suffix
      const candidates = res.data.filter(p => {
        const slugN = _norm(p.slug);
        return slugN.startsWith(want) || want.startsWith(slugN.replace(/(expertcontributor|contributor|powerranked|ceo)$/, ''));
      });
      if (candidates.length) {
        // Prefer ones with -expert-contributor or -power-ranked suffix (CEO landers)
        const sorted = candidates.sort((a, b) => {
          const score = s => (s.includes('expert-contributor') ? 3 : 0) + (s.includes('power-ranked') ? 2 : 0) + (s.includes('contributor') ? 1 : 0);
          return score(b.slug) - score(a.slug);
        });
        const pick = sorted[0];
        // Hydrate ACF
        const full = await axios.get(`${LEGACY_BASE}/wp-json/wp/v2/pages/${pick.id}?context=edit&_fields=id,slug,title,acf`, {
          headers: { Authorization: LEGACY_AUTH, 'User-Agent': BROWSER_UA }, timeout: 15000,
        }).catch(() => null);
        if (full?.data) return full.data;
      }
    }
  }
  return null;
}

// Resolve legacy attachment ID → public URL
async function legacyAttachmentUrl(attId) {
  if (!attId) return null;
  const res = await axios.get(`${LEGACY_BASE}/wp-json/wp/v2/media/${attId}`, {
    params: { _fields: 'id,source_url' },
    headers: { Authorization: LEGACY_AUTH, 'User-Agent': BROWSER_UA },
    timeout: 15000,
  }).catch(() => null);
  return res?.data?.source_url || null;
}

// ─── staging: sideload + update ──────────────────────────────────────────
async function sideloadToStaging(imageUrl, filenameHint) {
  const imgRes = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: { 'User-Agent': BROWSER_UA, 'Accept': 'image/*,*/*;q=0.8' },
  });
  let buf = Buffer.from(imgRes.data);
  let contentType = imgRes.headers['content-type'] || 'image/png';
  const urlExt = (imageUrl.split('?')[0].split('.').pop() || '').toLowerCase();
  let ext = ['jpg','jpeg','png','gif','webp','svg'].includes(urlExt) ? urlExt :
            (contentType.split('/')[1] || 'png').split(';')[0].toLowerCase();

  // WordPress rejects SVG by default. Rasterize to PNG via sharp (1024px wide,
  // transparent bg preserved). Logos render fine at this size on contributor cards.
  if (ext === 'svg' || contentType.includes('svg')) {
    try {
      const sharp = require('sharp');
      buf = await sharp(buf, { density: 300 }).resize({ width: 1024, withoutEnlargement: false }).png().toBuffer();
      contentType = 'image/png';
      ext = 'png';
    } catch (e) {
      throw new Error('SVG→PNG conversion failed: ' + e.message);
    }
  }

  const filename = `${filenameHint}.${ext}`;
  const up = await axios.post(
    `${STAGING_BASE}/wp-json/wp/v2/media`,
    buf,
    {
      headers: {
        Authorization: STG_AUTH,
        'User-Agent': BROWSER_UA,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      timeout: 60000,
      maxBodyLength: Infinity,
    }
  );
  return up.data.id;
}

async function updateStagingPage(pageId, metaPatch) {
  return axios.post(
    `${STAGING_BASE}/wp-json/wp/v2/pages/${pageId}`,
    { meta: metaPatch },
    {
      headers: {
        Authorization: STG_AUTH,
        'User-Agent': BROWSER_UA,
        'Content-Type': 'application/json; charset=utf-8',
      },
      timeout: 20000,
    }
  );
}

// ─── IC mirror ───────────────────────────────────────────────────────────
async function upsertToIc({ slug, title, p100_id, p100_url, meta, headshot_url, company_logo_url, company_logo_url_dark }) {
  if (!IC_KEY) return null;
  return axios.post(
    `${IC_BASE}/wp-json/ic/v1/expert-contributor/upsert`,
    {
      p100_page_id:  p100_id,
      p100_page_url: p100_url,
      slug,
      title,
      meta,
      headshot_url:          headshot_url || null,
      company_logo_url:      company_logo_url || null,
      company_logo_url_dark: company_logo_url_dark || null,
    },
    {
      headers: { 'X-IC-API-Key': IC_KEY, 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
      timeout: 30000,
    }
  ).catch(e => ({ error: e.response?.status || e.message }));
}

// Load the company → logo map (data/legacy-company-logos.json)
const _logoMap = (() => {
  const m = require('../../tpe-backend/data/legacy-company-logos.json');
  delete m.__normalized;
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const lookup = {};
  for (const [k, v] of Object.entries(m)) lookup[norm(k)] = { name: k, ...v };
  return { raw: m, lookup };
})();

function findLogoForCompany(companyName) {
  if (!companyName) return null;
  const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const lk = _logoMap.lookup;

  // Exact / normalized match
  let hit = lk[norm(companyName)];
  if (hit) return hit;

  // Fuzzy: trim parens/commas, try first-2-words, then first-word
  const stems = [
    companyName.replace(/\s*[(,].*/, '').trim(),
    companyName.split(' ').slice(0, 3).join(' '),
    companyName.split(' ').slice(0, 2).join(' '),
    companyName.split(' ')[0],
  ].filter((v, i, a) => v && v.length >= 4 && a.indexOf(v) === i);
  for (const stem of stems) {
    hit = lk[norm(stem)];
    if (hit) return hit;
  }
  return null;
}

// ─── per-contributor pipeline ────────────────────────────────────────────
async function processOne(stagingPage, state) {
  const { id, slug, title, meta } = stagingPage;
  const logKey = `${id}::${slug}`;

  if (state.processed[logKey]?.status === 'done') {
    return { skip: 'already-done' };
  }

  const company = (meta.ec_company_name || '').trim();
  if (!company) {
    state.processed[logKey] = { status: 'no-company-name', slug };
    return { fail: 'no-company-name' };
  }

  // Look up company in our prebuilt logo map
  const logoEntry = findLogoForCompany(company);
  if (!logoEntry) {
    state.processed[logKey] = { status: 'company-not-in-map', slug, company };
    return { fail: 'company-not-in-map', company };
  }

  const logoUrl     = logoEntry.url;
  const logoUrlDark = logoEntry.url_dark || null;  // optional dark-bg variant
  const matchedName = logoEntry.name;

  if (DRY) {
    return { dry: true, slug, company, matchedName, logoUrl, logoUrlDark };
  }

  // 3. Sideload BOTH variants to staging media (light required, dark optional)
  const safe = (matchedName || company || slug).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const newAttId = await sideloadToStaging(logoUrl, `${safe}-logo`);
  let newAttIdDark = null;
  if (logoUrlDark) {
    try { newAttIdDark = await sideloadToStaging(logoUrlDark, `${safe}-logo-dark`); }
    catch (e) { console.warn(`  [warn] dark-variant sideload failed for ${matchedName}: ${e.message}`); }
  }

  // 4. Patch staging page meta (write both keys when dark exists)
  const patch = { ec_company_logo: String(newAttId) };
  if (newAttIdDark) patch.ec_company_logo_dark = String(newAttIdDark);
  await updateStagingPage(id, patch);

  // 5. Re-fetch full meta + mirror to IC
  const fullMeta = await fetchStagingMeta(id);
  const headshotUrl = await (async () => {
    if (!fullMeta.ec_headshot) return null;
    const r = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/media/${fullMeta.ec_headshot}?_fields=source_url`, {
      headers: { Authorization: STG_AUTH, 'User-Agent': BROWSER_UA }, timeout: 10000,
    }).catch(() => null);
    return r?.data?.source_url || null;
  })();
  const fetchSourceUrl = async (attId) => {
    if (!attId) return null;
    const r = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/media/${attId}?_fields=source_url`, {
      headers: { Authorization: STG_AUTH, 'User-Agent': BROWSER_UA }, timeout: 10000,
    }).catch(() => null);
    return r?.data?.source_url || null;
  };
  const companyLogoUrl     = await fetchSourceUrl(fullMeta.ec_company_logo);
  const companyLogoUrlDark = await fetchSourceUrl(fullMeta.ec_company_logo_dark);

  await upsertToIc({
    slug,
    title: title.rendered || title,
    p100_id: id,
    p100_url: `${STAGING_BASE}/${slug}/`,
    meta: fullMeta,
    headshot_url: headshotUrl,
    company_logo_url: companyLogoUrl,
    company_logo_url_dark: companyLogoUrlDark,
  });

  state.processed[logKey] = {
    status: 'done',
    slug,
    company,
    matchedName,
    newAttId,
    when: new Date().toISOString(),
  };

  return { ok: true, slug, company, matchedName, newAttId };
}

// ─── main ────────────────────────────────────────────────────────────────
(async () => {
  console.log(`Logo backfill — dry=${DRY ? 'YES' : 'NO'} limit=${LIMIT || 'none'} slug=${ONLY_SLUG || 'all'}`);
  if (!IC_KEY) console.warn('[warn] IC_REST_API_KEY not set — IC upsert will be skipped');

  const state = loadState();

  console.log('Listing staging contributors with missing ec_company_logo...');
  let missing = await listStagingMissingLogo();
  console.log(`  → ${missing.length} contributors missing ec_company_logo on staging`);

  if (ONLY_SLUG) missing = missing.filter(m => m.slug === ONLY_SLUG);
  if (LIMIT) missing = missing.slice(0, LIMIT);

  let ok = 0, dry = 0, skip = 0, failNoCompany = 0, failNotInMap = 0, failOther = 0;
  const failureSamples = [];
  const unmatchedCompanies = new Set();

  for (let i = 0; i < missing.length; i++) {
    const c = missing[i];
    process.stdout.write(`[${i + 1}/${missing.length}] ${c.slug} ... `);
    try {
      const r = await processOne(c, state);
      if (r.ok)        { ok++;       console.log(`✓ ${r.matchedName} → att#${r.newAttId}`); }
      else if (r.dry)  { dry++;      console.log(`(dry) ${r.company} → match=${r.matchedName}`); }
      else if (r.skip) { skip++;     console.log(`skip (${r.skip})`); }
      else if (r.fail === 'no-company-name')     { failNoCompany++; failureSamples.push({slug: c.slug, why: r.fail}); console.log('✗ no ec_company_name'); }
      else if (r.fail === 'company-not-in-map')  { failNotInMap++; unmatchedCompanies.add(r.company); failureSamples.push({slug: c.slug, why: r.fail, company: r.company}); console.log(`✗ company not in map: ${r.company}`); }
      else                                        { failOther++;   failureSamples.push({slug: c.slug, why: r.fail}); console.log(`✗ ${r.fail}`); }
    } catch (e) {
      failOther++;
      failureSamples.push({slug: c.slug, why: 'exception: ' + e.message});
      console.log(`✗ exception: ${e.message}`);
    }
    saveState(state);
    await sleep(DRY ? 0 : 400);
  }

  console.log('');
  console.log('=== summary ===');
  console.log(`  ok                    : ${ok}`);
  if (DRY) console.log(`  dry                  : ${dry}`);
  console.log(`  already-done          : ${skip}`);
  console.log(`  no-company-name       : ${failNoCompany}  (need company resolution first)`);
  console.log(`  company-not-in-map    : ${failNotInMap}  (need to expand legacy-company-logos.json)`);
  console.log(`  other-failures        : ${failOther}`);
  console.log(`  state file            : ${STATE_PATH}`);
  if (unmatchedCompanies.size) {
    console.log('');
    console.log('=== unique companies missing from map (run audit-v2 with these as --targets) ===');
    [...unmatchedCompanies].sort().forEach(c => console.log(`  ${c}`));
  }
  process.exit(0);
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
