#!/usr/bin/env node
/**
 * Auto-enrich the 4 remaining sample contributors via researchContributor().
 * Serial with 15s throttle to avoid Anthropic per-minute rate limits.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const { query } = require('../../tpe-backend/src/config/database');
const enrich = require('../../tpe-backend/src/services/contributorEnrichmentService');
const research = require('../../tpe-backend/src/services/contributorResearchService');
const axios = require('axios');

const targets = [
  { id: 28, name: 'Alex Marck',        company: 'First Call Closer',   websiteUrl: 'https://firstcallcloser.com' },
  { id: 29, name: 'Alexander Keyles',  company: 'PJ Fitzpatrick',      websiteUrl: 'https://www.pjfitz.com' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    console.log(`\n[${i+1}/${targets.length}] === ${t.name} ===`);

    const stored = (await query('SELECT * FROM expert_contributors WHERE id=$1', [t.id])).rows[0];
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
      continue;
    }

    if (!r.success) {
      console.log('  FAIL:', r.error);
      console.log('  candidates:', JSON.stringify(r.candidates_tried || []));
      // Throttle even on failure to respect rate limits
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
      p.stat_years, p.headshot_url, JSON.stringify(p.testimonials || []), t.id,
    ]);

    const row = (await query('SELECT * FROM expert_contributors WHERE id=$1', [t.id])).rows[0];
    row.scores = Array.isArray(p.scores) ? p.scores.join('\n') : p.scores;
    row.ec_stat_custom_label = p.ec_stat_custom_label;
    row.ec_stat_custom_value = p.ec_stat_custom_value;

    // Reset ec_headshot meta so the new (verified) URL gets sideloaded fresh
    if (row.wp_page_id) {
      const auth = 'Basic ' + Buffer.from(process.env.STAGING_P100_ADMIN_USER+':'+process.env.STAGING_P100_ADMIN_APP_PWD).toString('base64');
      await axios.post(`https://staging.power100.io/wp-json/wp/v2/pages/${row.wp_page_id}`,
        { meta: { ec_headshot: 0 } },
        { headers: { Authorization: auth, 'Content-Type': 'application/json' } }
      ).catch(()=>{});
    }

    const result = await enrich.upsertContributorLander(row, { source: 'auto_research_sample' });
    console.log(`  ✓ ${result.action} → ${result.wp_page_url}`);

    if (i < targets.length - 1) {
      console.log('  ...sleeping 90s for rate limit');
      await sleep(90000);
    }
  }
  process.exit(0);
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
