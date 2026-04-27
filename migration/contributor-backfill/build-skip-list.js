#!/usr/bin/env node
/**
 * Generate skip-list.json by intersecting:
 *   - Power100 EC directory   → https://power100.io/expert-contributors/
 *   - IC contributors index   → https://innercircle.power100.io/contributors/
 *
 * Any IC ic_leader term whose slug also appears as `*-expert-contributor` on
 * Power100 already has a paid EC lander and must be excluded from the
 * contributor backfill (otherwise we'd create a parallel "contributor"
 * lander competing with the existing EC page).
 *
 * USAGE:
 *   node build-skip-list.js              # writes skip-list.json + prints summary
 *   node build-skip-list.js --dry        # prints intersection only, no write
 *
 * Output JSON shape:
 *   {
 *     generated_at: "2026-04-26T...",
 *     ec_count: 90, ic_count: 106, intersect_count: 23,
 *     skip: [
 *       { term_id: 365, slug: "brian-gottlieb", name: "Brian Gottlieb",
 *         ec_url: "https://power100.io/brian-gottlieb-expert-contributor/" },
 *       ...
 *     ]
 *   }
 */
const path = require('path');
const fs   = require('fs');
const axios = require('axios');

const DUMP_PATH      = path.join(__dirname, 'ic-leaders-dump.json');
const SKIP_LIST_PATH = path.join(__dirname, 'skip-list.json');
const dryRun = process.argv.includes('--dry');

const EC_DIRECTORY_URL = 'https://power100.io/expert-contributors/';
// staging mirror — sometimes prod 000s from this CI box; staging is reliable
const EC_DIRECTORY_FALLBACK = 'https://staging.power100.io/expert-contributors/';
const IC_DIRECTORY_URL = 'https://innercircle.power100.io/contributors/';

// Manual skip list — covered by the cross-reference above when slugs match,
// but kept here for cases where slugs DRIFT (Mike vs Michael Hollander, Greg vs
// Greg Cummings). These are duplicates of canonical EC contributors who use
// a different name spelling on the EC lander.
const MANUAL_SKIP_NAMES = [
  'Mike Hollander',     // canonical EC is "Michael Hollander" → /mike-hollander-expert-contributor/
  'Greg Cummings',      // duplicate of "Greg" 443
];

async function fetchHtml(url) {
  try {
    const res = await axios.get(url, {
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 Power100 Backfill Skip-List Generator' },
      maxRedirects: 5,
      validateStatus: s => s < 500,
    });
    return res.status === 200 ? res.data : null;
  } catch (e) { return null; }
}

function extractEcSlugs(html) {
  if (!html) return new Set();
  const slugs = new Set();
  const matches = html.matchAll(/href="https?:\/\/(?:www\.)?(?:staging\.)?power100\.io\/([a-z0-9-]+)-expert-contributor\/?"/g);
  for (const m of matches) {
    if (m[1] === 'become-an') continue;            // matches "become-an-expert-contributor"
    slugs.add(m[1]);
  }
  return slugs;
}

function nameToSlug(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

(async () => {
  console.log('Fetching Power100 EC directory...');
  let ecHtml = await fetchHtml(EC_DIRECTORY_URL);
  if (!ecHtml) {
    console.log('  prod 000\'d, falling back to staging...');
    ecHtml = await fetchHtml(EC_DIRECTORY_FALLBACK);
  }
  if (!ecHtml) {
    console.error('FATAL: could not fetch EC directory from prod or staging');
    process.exit(1);
  }
  const ecSlugs = extractEcSlugs(ecHtml);
  console.log(`  → ${ecSlugs.size} EC slugs`);

  console.log('Loading IC ic_leader dump...');
  const icDump = JSON.parse(fs.readFileSync(DUMP_PATH, 'utf8'));
  console.log(`  → ${icDump.length} IC terms`);

  // Intersect: any IC term whose slug is in EC slug set is a dupe to skip.
  const skip = [];
  const seen = new Set();

  for (const t of icDump) {
    const icSlug = (t.slug || nameToSlug(t.name));
    if (ecSlugs.has(icSlug)) {
      skip.push({
        term_id: t.term_id,
        slug:    icSlug,
        name:    t.name,
        reason:  'slug matches existing EC lander',
        ec_url:  `https://power100.io/${icSlug}-expert-contributor/`,
      });
      seen.add(t.term_id);
    }
  }

  // Append manual entries (name-drift cases not caught by slug match)
  for (const manualName of MANUAL_SKIP_NAMES) {
    const match = icDump.find(t => t.name === manualName);
    if (match && !seen.has(match.term_id)) {
      skip.push({
        term_id: match.term_id,
        slug:    match.slug || nameToSlug(match.name),
        name:    match.name,
        reason:  'manual: duplicate of canonical EC under different name spelling',
        ec_url:  null,
      });
      seen.add(match.term_id);
    }
  }

  skip.sort((a, b) => a.name.localeCompare(b.name));

  const out = {
    generated_at:    new Date().toISOString(),
    ec_count:        ecSlugs.size,
    ic_count:        icDump.length,
    intersect_count: skip.length,
    skip,
  };

  console.log('');
  console.log(`=== Skip list (${skip.length} entries) ===`);
  for (const s of skip) {
    console.log(`  ${String(s.term_id).padStart(4)} | ${s.name.padEnd(28)} | ${s.reason}`);
  }
  console.log('');
  console.log(`IC backfill universe: ${icDump.length} - ${skip.length} = ${icDump.length - skip.length}`);

  if (dryRun) {
    console.log('\n(--dry — not writing skip-list.json)');
    return;
  }
  fs.writeFileSync(SKIP_LIST_PATH, JSON.stringify(out, null, 2));
  console.log(`\nWrote ${SKIP_LIST_PATH}`);
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
