#!/usr/bin/env node
/**
 * Auto-enrich sample 5B — first run on the new Apify-Google-SERP web-search lane
 * (replaces Anthropic web_search). Same throttle as sample 4 retry: 90s.
 *
 * Pulls 5 NEW unprocessed IC contributors with company info, picked for diversity:
 *   - Marcus Sheridan (mega industry presence — stress-test lane 4)
 *   - Brad Yoho       (known podcast/speaker — Marck-miss check)
 *   - Chuck Thokey    (sales trainer)
 *   - Patrick Rinard  (regional contractor CEO)
 *   - Nick Richmond   (Matrix Home Solutions, IC PowerChat overlap)
 *
 * The IC-leader → expert_contributors row mapping happens via
 * backfill-ic-leaders.js path; here we either upsert a fresh row or update one
 * created by an earlier backfill pass. Sample-4 pattern is reused.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const { query } = require('../../tpe-backend/src/config/database');
const enrich = require('../../tpe-backend/src/services/contributorEnrichmentService');
const research = require('../../tpe-backend/src/services/contributorResearchService');
const axios = require('axios');

// term_id -> intended row data. We'll resolve / create the EC row at run time.
const targets = [
  { term_id: 408, name: 'Marcus Sheridan',  company: 'Marcus Sheridan International', websiteUrl: 'https://marcussheridan.com' },
  { term_id: 383, name: 'Brad Yoho',        company: 'Dave Yoho Associates',          websiteUrl: 'https://daveyoho.com' },
  { term_id: 357, name: 'Chuck Thokey',     company: 'Top Rep Sales Training',        websiteUrl: 'https://toprepsales.com' },
  { term_id: 367, name: 'Patrick Rinard',   company: 'Bee Window',                    websiteUrl: 'https://beewindow.com' },
  { term_id: 323, name: 'Nick Richmond',    company: 'Matrix Home Solutions',         websiteUrl: 'https://matrixbasementsystems.com' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function findOrCreateEcRow(t) {
  const [first, ...rest] = t.name.split(/\s+/);
  const last = rest.join(' ');
  const r = await query(
    'SELECT * FROM expert_contributors WHERE first_name=$1 AND last_name=$2 ORDER BY id LIMIT 1',
    [first, last]
  );
  if (r.rows[0]) return r.rows[0];

  const slug = t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const placeholderEmail = `${slug}@placeholder.power100.io`;
  const ins = await query(
    `INSERT INTO expert_contributors
       (first_name, last_name, email, company, contributor_class, contributor_type, source, created_at, updated_at)
     VALUES ($1, $2, $3, $4, 'contributor', 'show_guest', 'auto_enrich_sample_5b', NOW(), NOW())
     RETURNING *`,
    [first, last, placeholderEmail, t.company]
  );
  return ins.rows[0];
}

(async () => {
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    console.log(`\n[${i+1}/${targets.length}] === ${t.name} ===`);

    let stored;
    try { stored = await findOrCreateEcRow(t); }
    catch (e) { console.log('  ROW ERR:', e.message); continue; }

    const slug = t.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    let r;
    try {
      r = await research.researchContributor({
        name: t.name, company: t.company,
        knownLinkedinUrl: stored.linkedin_url || undefined,
        rankedSlug: slug, websiteUrl: t.websiteUrl,
        contributorClass: stored.contributor_class || 'contributor',
      });
    } catch (e) {
      console.log('  ERR:', e.message);
      if (i < targets.length - 1) await sleep(90000);
      continue;
    }

    if (!r.success) {
      console.log('  FAIL:', r.error);
      console.log('  candidates:', JSON.stringify(r.candidates_tried || []));
      if (i < targets.length - 1) await sleep(90000);
      continue;
    }

    const p = r.payload;
    console.log('  Sources:', JSON.stringify(r.sources), 'verified:', r.linkedin_verified);
    console.log('  LinkedIn URL:', p.linkedin_url);
    console.log('  Photo:', p.headshot_url ? 'YES' : 'NO');

    await query(`UPDATE expert_contributors SET
      title_position=$1, hero_quote=$2, bio=$3, credentials=$4, expertise_topics=$5,
      recognition=$6, company_description=$7, geographic_reach=$8, website_url=$9,
      linkedin_url=$10, years_in_industry=$11, headshot_url=$12, testimonials=$13::jsonb, updated_at=NOW()
      WHERE id=$14`, [
      p.title_position, p.hero_quote, p.bio,
      Array.isArray(p.credentials)      ? p.credentials.join('\n')      : p.credentials,
      Array.isArray(p.expertise_topics) ? p.expertise_topics.join('\n') : p.expertise_topics,
      Array.isArray(p.recognition)      ? p.recognition.join('\n')      : p.recognition,
      p.company_description, p.geographic_reach, p.website_url, p.linkedin_url,
      p.stat_years, p.headshot_url, JSON.stringify(p.testimonials || []), stored.id,
    ]);

    const row = (await query('SELECT * FROM expert_contributors WHERE id=$1', [stored.id])).rows[0];
    row.scores = Array.isArray(p.scores) ? p.scores.join('\n') : p.scores;
    row.ec_stat_custom_label = p.ec_stat_custom_label;
    row.ec_stat_custom_value = p.ec_stat_custom_value;

    if (row.wp_page_id) {
      const auth = 'Basic ' + Buffer.from(process.env.STAGING_P100_ADMIN_USER+':'+process.env.STAGING_P100_ADMIN_APP_PWD).toString('base64');
      await axios.post(`https://staging.power100.io/wp-json/wp/v2/pages/${row.wp_page_id}`,
        { meta: { ec_headshot: 0 } },
        { headers: { Authorization: auth, 'Content-Type': 'application/json' } }
      ).catch(()=>{});
    }

    const result = await enrich.upsertContributorLander(row, { source: 'auto_research_sample_5b' });
    console.log(`  ✓ ${result.action} → ${result.wp_page_url}`);

    if (i < targets.length - 1) {
      console.log('  ...sleeping 90s for rate limit');
      await sleep(90000);
    }
  }
  process.exit(0);
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
