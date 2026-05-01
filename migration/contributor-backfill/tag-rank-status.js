#!/usr/bin/env node
/**
 * Cross-reference IC/staging contributors against the published Power100
 * National Rankings lists, then write ec_rank_status + ec_rank_number to
 * each matching staging WP contributor page. The contributor-sync webhook
 * (POST /api/contributor-sync/from-staging) will then auto-fire and propagate
 * the new fields into tpedb expert_contributors.
 *
 * Two-axis model — see memory/reference_two_axis_contributor_model.md.
 * Ranking status is INDEPENDENT of expert_contributor / contributor.
 *
 * Source of truth for ranks:
 *   - CEO list:    98 entries from staging WP pages with pcl_rank_number meta
 *                  (the page-power-ranked-ceo.php landers)
 *   - Partner list: 13 entries hardcoded from page-preferred-partners-2026.php
 *                  template (5 voting cards excluded). Rilla + Siro tied at #2.
 *
 * Match strategy:
 *   - CEO match:     full name (first_last, normalized) — IC contributor's
 *                    post_title vs ranked CEO's pcl_ceo_full_name
 *   - Partner match: company name — staging ec_company_name vs partner's name
 *
 * Idempotent. Use --dry-run to preview.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const axios = require('axios');

const STAGING_BASE = process.env.STAGING_P100_BASE || 'https://staging.power100.io';
const STG_AUTH = 'Basic ' + Buffer.from(
  (process.env.STAGING_P100_ADMIN_USER || 'power100') + ':' +
  (process.env.STAGING_P100_ADMIN_APP_PWD || '')
).toString('base64');
const BROWSER_UA = 'Mozilla/5.0 (TPE-rank-tagger)';
const argv = process.argv.slice(2);
const DRY  = argv.includes('--dry-run');

// ── PARTNER LIST (from page-preferred-partners-2026.php — manually extracted) ──
// Voting cards (#5 Financial Partners, #6 CRM Software) excluded — those are open
// categories with no single company tagged yet. Rilla + Siro tied at #2.
const RANKED_PARTNERS = [
  { rank: 1,  company: 'Destination Motivation' },
  { rank: 2,  company: 'Rilla' },
  { rank: 2,  company: 'Siro' },
  { rank: 3,  company: 'Grosso University' },
  { rank: 4,  company: 'Channel Automation' },
  { rank: 7,  company: 'One Click Contractor' },
  { rank: 8,  company: 'Ingage' },
  { rank: 9,  company: 'Project Map It' },
  { rank: 10, company: 'Stone Canyon AI' },
  { rank: 11, company: 'SalesRabbit' },
  { rank: 12, company: 'Truvolv' },
  { rank: 13, company: 'ToolBelt' },
  { rank: 14, company: 'Get The Referral' },
  { rank: 15, company: 'Hover' },
];

const norm = s => (s || '').toString().toLowerCase().replace(/&amp;/g, '&').replace(/[^a-z0-9]/g, '');

// ── ranked CEO list (hardcoded from staging WP pcl_* landers, extracted 2026-04-30) ──
// pcl_* meta keys aren't registered with show_in_rest, so we can't pull live via REST
// without theme changes. This list is the source of truth. Refresh by running:
//   ssh runcloud@155.138.198.250 "cd /home/runcloud/webapps/power100 && wp eval 'global \$wpdb; ...'"
// (See migration/contributor-backfill/refresh-ceo-list.sh — TODO if needed.)
const RANKED_CEOS = [
  { rank: 1, name: 'James Freeman' }, { rank: 2, name: 'Peter Svedin' }, { rank: 3, name: 'Paul Dietzler' },
  { rank: 4, name: 'Andy Lindus' }, { rank: 5, name: 'Jeff Gunhus' }, { rank: 6, name: 'Bill Winters' },
  { rank: 7, name: 'John Dyda' }, { rank: 8, name: 'Todd Schmidt' }, { rank: 9, name: 'Augustine Wadian' },
  { rank: 10, name: 'Bart Rue' }, { rank: 11, name: 'Scott Berman' }, { rank: 12, name: 'Christopher Slocomb' },
  { rank: 13, name: 'Michael Hollander' }, { rank: 14, name: 'Greg Cowan' }, { rank: 15, name: 'Rick Wuest' },
  { rank: 16, name: 'Chris Edwards' }, { rank: 17, name: 'Gary Lancz' }, { rank: 18, name: 'Greg Ramel' },
  { rank: 19, name: 'David Arrowsmith' }, { rank: 20, name: 'Nick Zindel' }, { rank: 21, name: 'Chad Connoy' },
  { rank: 22, name: 'John DePaola' }, { rank: 23, name: 'Justin Bartley' }, { rank: 24, name: 'Adam Shampaine' },
  { rank: 25, name: 'Bill and Kathleen Herren' }, { rank: 26, name: 'Doug Cook' }, { rank: 27, name: 'Jefferson Rogers' },
  { rank: 28, name: 'Alec Cook' }, { rank: 29, name: 'Donnie McMillan Jr' }, { rank: 30, name: 'Tim Brown' },
  { rank: 31, name: 'Robert Amos' }, { rank: 32, name: 'Jordan Gentile' }, { rank: 33, name: 'Cris Keeter' },
  { rank: 34, name: 'Mike Gilkey' }, { rank: 35, name: 'Ray Marzarella' }, { rank: 36, name: 'Patrick Rinard' },
  { rank: 37, name: 'Richard Hotea' }, { rank: 38, name: 'Bill Clarkin' }, { rank: 39, name: 'Mike Vezina' },
  { rank: 40, name: 'Don Katzenberger' }, { rank: 41, name: 'Allen Erskine' }, { rank: 42, name: 'Ryan Connet' },
  { rank: 43, name: 'Tracy Nielson' }, { rank: 44, name: 'Robert Scavuzzo' }, { rank: 45, name: 'Giacomo DiBerardino' },
  { rank: 46, name: 'David Adamson' }, { rank: 47, name: 'Tom Orr' }, { rank: 48, name: 'Zett Quinn' },
  { rank: 49, name: 'Ted Kirk' }, { rank: 50, name: 'Jason Durante' }, { rank: 51, name: 'John Kailian' },
  { rank: 52, name: 'Jayson Shortt' }, { rank: 53, name: 'David Wilhelm' }, { rank: 54, name: 'David Homavand' },
  { rank: 55, name: 'Chris Carey' }, { rank: 56, name: 'Nick Pucci' }, { rank: 57, name: 'Mike Furman' },
  { rank: 58, name: 'Barry Cole' }, { rank: 59, name: 'Brian Rudd' }, { rank: 60, name: 'Tod Colbert' },
  { rank: 61, name: 'Ted Castonguay' }, { rank: 62, name: 'Mark Lavoie' }, { rank: 63, name: 'Jonathan Rodriguez' },
  { rank: 64, name: 'Carl Del Pizzo Jr' }, { rank: 65, name: 'Jerry Laridaen II' }, { rank: 66, name: 'Robert Watts' },
  { rank: 67, name: 'Derek Thexton' }, { rank: 68, name: 'Steve Rennekamp' }, { rank: 69, name: 'Sean Gerathy' },
  { rank: 70, name: 'Mark Nichols' }, { rank: 71, name: 'Patrick Carmody' }, { rank: 72, name: 'Ryan Shutt' },
  { rank: 73, name: 'Voytek Opalski' }, { rank: 75, name: 'Scott McDowell' }, { rank: 76, name: 'Scott Gramm' },
  { rank: 77, name: 'Chris Scura' }, { rank: 78, name: 'John Quillen' }, { rank: 79, name: 'Dave Yount' },
  { rank: 80, name: 'Joe Stoffey' }, { rank: 82, name: 'Steven Jones' }, { rank: 83, name: 'Adrian Au' },
  { rank: 84, name: 'Sami Hanna' }, { rank: 85, name: 'Chris Pollard' }, { rank: 86, name: 'Abby Binder' },
  { rank: 87, name: 'Casey Nelson' }, { rank: 88, name: 'Mike Connors' }, { rank: 89, name: 'Kip Robinson' },
  { rank: 90, name: 'Gerry Rogers' }, { rank: 91, name: 'Jim Lett' }, { rank: 92, name: 'Stephanie Vanderbilt' },
  { rank: 93, name: 'John Kolbaska' }, { rank: 94, name: 'David Jones' }, { rank: 95, name: 'Dustin Thompson' },
  { rank: 96, name: 'Jim Bushey' }, { rank: 97, name: 'Brandon Erdmann' }, { rank: 98, name: 'Tim Sockwell' },
  { rank: 99, name: 'Lenny Scarola' }, { rank: 100, name: 'Kelly Eslinger & Max Loranger' },
];

async function fetchCeoRankings() { return RANKED_CEOS; }

// ── pull all IC/staging contributors ────────────────────────────────────
async function fetchAllContributors() {
  const list = [];
  let page = 1;
  while (page <= 30) {
    const r = await axios.get(`${STAGING_BASE}/wp-json/wp/v2/pages?_fields=id,slug,title,meta&per_page=100&page=${page}`, {
      headers: { Authorization: STG_AUTH, 'User-Agent': BROWSER_UA },
      timeout: 30000,
      validateStatus: s => s < 500,
    });
    if (r.status === 400 || !r.data || r.data.length === 0) break;
    for (const p of r.data) {
      if (p.meta?.ec_contributor_type) list.push(p);
    }
    if (r.data.length < 100) break;
    page++;
  }
  return list;
}

// ── patch staging WP page meta ──────────────────────────────────────────
async function patchStaging(pageId, patch) {
  if (DRY) return;
  await axios.post(`${STAGING_BASE}/wp-json/wp/v2/pages/${pageId}`, { meta: patch }, {
    headers: { Authorization: STG_AUTH, 'Content-Type': 'application/json', 'User-Agent': BROWSER_UA },
    timeout: 15000,
  });
}

// ── main ─────────────────────────────────────────────────────────────────
(async () => {
  console.log(DRY ? '== DRY RUN ==' : '== LIVE ==');
  console.log('\nFetching staging contributor pages + CEO ranking list...');
  const [contributors, ceos] = await Promise.all([fetchAllContributors(), fetchCeoRankings()]);
  console.log(`  ${contributors.length} contributors, ${ceos.length} ranked CEOs, ${RANKED_PARTNERS.length} ranked partners`);

  // Build lookup maps
  const ceoByName = new Map();
  for (const c of ceos) ceoByName.set(norm(c.name), c);
  const partnerByCompany = new Map();
  for (const p of RANKED_PARTNERS) partnerByCompany.set(norm(p.company), p);

  const stats = { ceo_matches: [], partner_matches: [], unchanged: 0, no_match: 0, conflicts: [] };

  for (const c of contributors) {
    const meta = c.meta || {};
    const titleNorm = norm((c.title?.rendered || '').replace(/—.*$/, '').replace(/Expert Contributor/i, '').trim());
    const companyNorm = norm(meta.ec_company_name || '');

    let match = null;
    if (ceoByName.has(titleNorm)) {
      const ceo = ceoByName.get(titleNorm);
      match = { type: 'ranked_ceo', rank: ceo.rank, source: `CEO name match: ${ceo.name}` };
    } else if (partnerByCompany.has(companyNorm)) {
      const p = partnerByCompany.get(companyNorm);
      match = { type: 'ranked_partner', rank: p.rank, source: `partner company match: ${p.company}` };
    }

    if (!match) { stats.no_match++; continue; }

    const curStatus = meta.ec_rank_status || '';
    const curNumber = parseInt(meta.ec_rank_number, 10) || null;
    if (curStatus === match.type && curNumber === match.rank) {
      stats.unchanged++;
      continue;
    }

    const patch = { ec_rank_status: match.type, ec_rank_number: match.rank };
    console.log(`  [${match.type} #${match.rank}] page ${c.id}/${c.slug}  ←  ${match.source}`);
    if (!DRY) {
      try { await patchStaging(c.id, patch); } catch (e) { console.error(`    PATCH FAIL: ${e.message}`); continue; }
    }
    if (match.type === 'ranked_ceo') stats.ceo_matches.push({ page_id: c.id, slug: c.slug, rank: match.rank });
    else stats.partner_matches.push({ page_id: c.id, slug: c.slug, rank: match.rank });
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Contributors scanned:     ${contributors.length}`);
  console.log(`Already correctly tagged: ${stats.unchanged}`);
  console.log(`CEO matches tagged:       ${stats.ceo_matches.length}`);
  console.log(`Partner matches tagged:   ${stats.partner_matches.length}`);
  console.log(`No match (stay generic):  ${stats.no_match}`);
})().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
