#!/usr/bin/env node
/**
 * Walk every Power100 contributor lander, pull its full ec_* meta via
 * authenticated WP REST (?context=edit), and POST to IC's upsert endpoint so
 * every IC mirror gets the rich content (bio, recognition, scores, etc.).
 *
 * Why needed: original mirrorToInnerCircle() calls happened BEFORE auto-enrichment
 * filled in the rich fields on P100 — so IC mirrors were created with only basic
 * meta. This script catches them up.
 *
 * Idempotent — safe to re-run.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const axios = require('axios');

const P100_BASE = 'https://power100.io';  // legacy power100 main; IC mirrors target this as canonical source URL
const STAGING_BASE = process.env.STAGING_P100_BASE || 'https://staging.power100.io';
const IC_BASE = 'https://innercircle.power100.io';
const IC_KEY  = process.env.IC_REST_API_KEY || process.env.TPX_IC_API_KEY;
const STG_AUTH = 'Basic ' + Buffer.from(process.env.STAGING_P100_ADMIN_USER + ':' + process.env.STAGING_P100_ADMIN_APP_PWD).toString('base64');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function listP100ContributorPages() {
  const out = [];
  let page = 1;
  for (;;) {
    const res = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/pages`, {
      params: { per_page: 100, page, _fields: 'id,slug,title,link,template' },
      headers: { Authorization: STG_AUTH },
      timeout: 15000,
    }).catch(e => null);
    if (!res || !res.data?.length) break;
    for (const p of res.data) {
      if (p.template === 'page-expert-contributor.php') out.push(p);
    }
    if (res.data.length < 100) break;
    page++;
  }
  return out;
}

async function fetchPageMeta(pageId) {
  const res = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/pages/${pageId}?context=edit&_fields=id,slug,title,meta`, {
    headers: { Authorization: STG_AUTH },
    timeout: 15000,
  });
  return res.data;
}

async function upsertToIc({ slug, title, p100_id, p100_url, meta, headshot_url }) {
  return axios.post(`${IC_BASE}/wp-json/ic/v1/expert-contributor/upsert`, {
    p100_page_id:  p100_id,
    p100_page_url: p100_url,
    slug,
    title,
    meta,
    headshot_url,
  }, {
    headers: { 'X-IC-API-Key': IC_KEY, 'Content-Type': 'application/json' },
    timeout: 30000,
  });
}

(async () => {
  console.log('[refresh] listing P100 contributor pages...');
  const pages = await listP100ContributorPages();
  console.log(`[refresh] found ${pages.length} pages with template=page-expert-contributor.php`);

  let ok = 0, skipped = 0, errored = 0;
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    const title = p.title?.rendered || p.title?.raw || '';
    process.stdout.write(`[${i+1}/${pages.length}] ${title.padEnd(35)} `);
    try {
      const full = await fetchPageMeta(p.id);
      const meta = full.meta || {};
      // Filter to ec_* only (strip elementor + acf internals)
      const ecMeta = {};
      let count = 0;
      for (const [k, v] of Object.entries(meta)) {
        if (k.startsWith('ec_') && v !== null && v !== '') {
          ecMeta[k] = v;
          count++;
        }
      }
      if (count === 0) { process.stdout.write('SKIP (no ec_* meta)\n'); skipped++; continue; }
      // Resolve headshot URL from ec_headshot attachment id
      let headshotUrl = null;
      if (ecMeta.ec_headshot && Number.isFinite(parseInt(ecMeta.ec_headshot, 10))) {
        try {
          const m = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/media/${ecMeta.ec_headshot}?_fields=source_url`, {
            headers: { Authorization: STG_AUTH }, timeout: 10000,
          });
          headshotUrl = m.data?.source_url || null;
        } catch (e) {/* fall through */}
      }
      const r = await upsertToIc({
        slug: p.slug,
        title,
        p100_id: p.id,
        p100_url: p.link,
        meta: ecMeta,
        headshot_url: headshotUrl,
      });
      process.stdout.write(`✓ ${r.data.action || 'synced'} ic_id=${r.data.ic_id} (${count} fields)\n`);
      ok++;
    } catch (e) {
      process.stdout.write(`ERR ${e.response?.data?.error || e.message}\n`);
      errored++;
    }
    await sleep(400);
  }
  console.log(`\n========== Summary ==========`);
  console.log(`Synced:   ${ok}`);
  console.log(`Skipped:  ${skipped} (no ec_* meta on P100)`);
  console.log(`Errors:   ${errored}`);
  process.exit(errored > 0 ? 1 : 0);
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
