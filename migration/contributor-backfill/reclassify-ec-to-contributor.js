#!/usr/bin/env node
/**
 * Reclassify non-paid EC landers down to "contributor" level.
 *
 * Updates `ec_contributor_type` meta from ceo/partner/individual → contributor
 * on the Power100 page, then refreshes the IC mirror so the variation-driven
 * copy/badge/CTA all flip automatically. Existing credential / domain-mastery
 * counts are preserved (per spec).
 *
 * PAID LIST is hardcoded — re-run this any time the paid-client roster changes.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const axios = require('axios');

const STAGING_BASE = process.env.STAGING_P100_BASE || 'https://staging.power100.io';
const IC_BASE     = 'https://innercircle.power100.io';
const IC_KEY      = process.env.IC_REST_API_KEY || process.env.TPX_IC_API_KEY;
const STG_AUTH    = 'Basic ' + Buffer.from(process.env.STAGING_P100_ADMIN_USER + ':' + process.env.STAGING_P100_ADMIN_APP_PWD).toString('base64');

// Locked paid list (2026-04-26).
// Anyone NOT in here whose lander has an EC-tier ec_contributor_type
// gets reclassified to 'contributor'.
const PAID_FULL_NAMES = [
  'James Freeman',
  'Peter Svedin',
  'Caleb Nelson',
  'Dominic Caminata',
  'Greg Cummings',     // CEO of Power100 — always EC
  'Paul Burleson',
  'Richard Hotea',
];
const PAID_SET = new Set(PAID_FULL_NAMES.map(n => n.toLowerCase()));

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function listEcLanders() {
  const out = [];
  let page = 1;
  for (;;) {
    const res = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/pages`, {
      params: { per_page: 100, page, _fields: 'id,slug,title,link,template,status' },
      headers: { Authorization: STG_AUTH },
      timeout: 15000,
    }).catch(() => null);
    if (!res || !res.data?.length) break;
    for (const p of res.data) {
      if (p.template === 'page-expert-contributor.php') out.push(p);
    }
    if (res.data.length < 100) break;
    page++;
  }
  return out;
}

async function getMeta(pageId) {
  const r = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/pages/${pageId}?context=edit&_fields=meta`, {
    headers: { Authorization: STG_AUTH }, timeout: 15000,
  });
  return r.data?.meta || {};
}

async function patchMeta(pageId, metaPatch) {
  const r = await axios.post(`${STAGING_BASE}/wp-json/wp/v2/pages/${pageId}`, { meta: metaPatch }, {
    headers: { Authorization: STG_AUTH, 'Content-Type': 'application/json' }, timeout: 15000,
  });
  return r.data;
}

async function pushIcMirror({ slug, title, p100_id, p100_url, meta }) {
  // Resolve headshot URL
  let headshot_url = null;
  if (meta.ec_headshot && Number.isFinite(parseInt(meta.ec_headshot, 10))) {
    try {
      const m = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/media/${meta.ec_headshot}?_fields=source_url`, {
        headers: { Authorization: STG_AUTH }, timeout: 10000,
      });
      headshot_url = m.data?.source_url || null;
    } catch (e) {/* ignore */}
  }
  const ecMeta = {};
  for (const [k, v] of Object.entries(meta)) {
    if (k.startsWith('ec_') && v !== null && v !== '') ecMeta[k] = v;
  }
  return axios.post(`${IC_BASE}/wp-json/ic/v1/expert-contributor/upsert`, {
    p100_page_id: p100_id, p100_page_url: p100_url, slug, title, meta: ecMeta, headshot_url,
  }, {
    headers: { 'X-IC-API-Key': IC_KEY, 'Content-Type': 'application/json' }, timeout: 30000,
  });
}

(async () => {
  console.log('[reclassify] listing P100 EC/Contributor pages...');
  const pages = await listEcLanders();
  console.log(`[reclassify] found ${pages.length} pages on page-expert-contributor.php\n`);

  let kept_paid = 0, reclassified = 0, already_contrib = 0, errors = 0;
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    // Strip trailing "Expert Contributor" with OR without an em-dash/hyphen separator.
    // Legacy titles vary: "James Freeman Expert Contributor", "Brian Gottlieb — Expert Contributor", etc.
    const title = (p.title?.rendered || p.title?.raw || '')
        .replace(/\s*[—-]\s*Expert Contributor\s*$/i, '')
        .replace(/\s+Expert Contributor\s*$/i, '')
        .trim();
    const isPaid = PAID_SET.has(title.toLowerCase());
    process.stdout.write(`[${i+1}/${pages.length}] ${title.padEnd(38)} `);

    try {
      const meta = await getMeta(p.id);
      const currentType = meta.ec_contributor_type || '';

      if (isPaid) {
        process.stdout.write(`PAID — keep type=${currentType || '(unset)'}\n`);
        kept_paid++;
        continue;
      }

      if (currentType === 'contributor') {
        process.stdout.write(`already contributor\n`);
        already_contrib++;
        continue;
      }

      // PATCH P100 meta to flip the type
      await patchMeta(p.id, { ec_contributor_type: 'contributor' });
      meta.ec_contributor_type = 'contributor';
      // Refresh IC mirror with the new type
      const r = await pushIcMirror({
        slug: p.slug,
        title,
        p100_id: p.id,
        p100_url: p.link,
        meta,
      });
      process.stdout.write(`reclassified ceo→contributor, IC ${r.data?.action || 'synced'}\n`);
      reclassified++;
    } catch (e) {
      process.stdout.write(`ERR ${e.response?.data?.error || e.message}\n`);
      errors++;
    }
    await sleep(300);
  }

  console.log(`\n========== Summary ==========`);
  console.log(`Paid (kept):              ${kept_paid}  (target: ${PAID_FULL_NAMES.length})`);
  console.log(`Reclassified → contributor: ${reclassified}`);
  console.log(`Already contributor:      ${already_contrib}`);
  console.log(`Errors:                   ${errors}`);
  process.exit(errors > 0 ? 1 : 0);
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
