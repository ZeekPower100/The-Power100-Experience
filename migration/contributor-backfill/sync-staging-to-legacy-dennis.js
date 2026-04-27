#!/usr/bin/env node
/**
 * Pull Dennis's full rich ACF data from staging (where the new pipeline
 * populates everything correctly), translate to legacy field names + ENUM
 * constraints, push to legacy power100.io page 29175.
 *
 * After this runs, the legacy lander should visually match staging:
 * hero with all 4 stat columns + scores section + company section + everything
 * in between. Only sections legacy template can't render at all (e.g. Connected
 * Network, AI persona panel) will remain absent — those are template-level
 * additions only on staging's PHP.
 */
const axios = require('axios');
const { spawnSync } = require('child_process');

const LEGACY = 'https://power100.io';
const AUTH = 'Basic cG93ZXIxMDA6VjJ1YnpMcHQ3SW5aNmd1Z1o0ckVSN05X';
const PAGE_ID = 29175;
const SSH = 'runcloud@155.138.198.250';
const STAGING_PAGE = 1354;

// Pull the full ec_* meta from staging via SSH (REST returns empty because
// staging's mu-plugin only show_in_rest=true on a subset of keys).
function pullStagingMeta() {
  const r = spawnSync('ssh', ['-o', 'BatchMode=yes', SSH,
    `cd /home/runcloud/webapps/power100 && wp post meta list ${STAGING_PAGE} --format=json`],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ssh failed: ${r.stderr}`);
  const arr = JSON.parse(r.stdout);
  const meta = {};
  for (const row of arr) {
    if (row.meta_key.startsWith('ec_')) meta[row.meta_key] = row.meta_value;
  }
  return meta;
}

(async () => {
  console.log('1. Pulling staging meta for Dennis (page 1354)...');
  const staging = pullStagingMeta();
  const populated = Object.entries(staging).filter(([_, v]) => v && v !== '');
  console.log(`   ${populated.length} populated ec_* keys on staging`);

  // 2. Sideload the headshot URL from staging into legacy media (so legacy uses its own attachment id)
  console.log('2. Sideloading headshot to legacy...');
  // Pull staging headshot URL via REST
  const stagingHeadshotUrl = await axios.get(
    `https://staging.power100.io/wp-json/wp/v2/media/${staging.ec_headshot}?_fields=source_url`,
    { headers: { Authorization: AUTH }, timeout: 15000 }
  ).then(r => r.data.source_url);
  console.log(`   staging headshot url: ${stagingHeadshotUrl}`);

  const imgResp = await axios.get(stagingHeadshotUrl, { responseType: 'arraybuffer', timeout: 30000 });
  const mediaResp = await axios.post(`${LEGACY}/wp-json/wp/v2/media`, Buffer.from(imgResp.data), {
    headers: {
      Authorization: AUTH,
      'Content-Type': 'image/jpeg',
      'Content-Disposition': 'attachment; filename="dennis-lugo-headshot.jpg"',
    },
    timeout: 60000, maxBodyLength: Infinity,
  });
  const legacyHeadshotId = mediaResp.data.id;
  console.log(`   legacy media id=${legacyHeadshotId}`);

  // 3. Build legacy ACF payload from staging meta with translations:
  //    - Same-name keys: copy verbatim
  //    - ec_contributor_type: legacy ENUM doesn't allow `contributor` → use `industry_leader`
  //    - ec_bio_long → ec_expertise_bio (different name on legacy)
  //    - Headshot: use legacy attachment id, not staging's
  const acf = {
    ec_name:                 staging.ec_name || 'Dennis Lugo',
    ec_title_position:       staging.ec_title_position || '',
    ec_hero_quote:           staging.ec_hero_quote || '',
    ec_linkedin_url:         staging.ec_linkedin_url || '',
    ec_contributor_type:     staging.ec_contributor_type === 'contributor' ? 'industry_leader' : (staging.ec_contributor_type || 'industry_leader'),
    ec_stat_years:           staging.ec_stat_years || '',
    ec_stat_revenue:         staging.ec_stat_revenue || '',
    ec_stat_markets:         staging.ec_stat_markets || '',
    ec_stat_custom_label:    staging.ec_stat_custom_label || '',
    ec_stat_custom_value:    staging.ec_stat_custom_value || '',
    ec_expertise_bio:        staging.ec_expertise_bio || staging.ec_bio_long || '',
    ec_credentials:          staging.ec_credentials || '',
    ec_recognition:          staging.ec_recognition || '',
    ec_scores:               staging.ec_scores || '',
    ec_contrib_description:  staging.ec_contrib_description || staging.ec_contribution_desc || '',
    ec_contrib_topics:       staging.ec_contrib_topics || '',
    ec_company_name:         staging.ec_company_name || '',
    ec_company_desc:         staging.ec_company_desc || '',
    ec_company_lander_url:   staging.ec_company_lander_url || 'https://power100.io',
    ec_articles_url:         staging.ec_articles_url || '',
    ec_headshot:             legacyHeadshotId,
  };

  // 4. Push
  console.log('4. Pushing 21 ACF fields to legacy page 29175...');
  const upd = await axios.post(`${LEGACY}/wp-json/wp/v2/pages/${PAGE_ID}`, {
    template: 'page-expert-contributor.php',
    title:    'Dennis Lugo — Vice President, Power100',
    slug:     'dennis-lugo',
    status:   'publish',
    featured_media: legacyHeadshotId,
    acf,
  }, {
    headers: { Authorization: AUTH, 'Content-Type': 'application/json; charset=utf-8' },
    timeout: 30000,
  });
  console.log(`   ✓ updated`);

  // 5. Verify
  const verify = await axios.get(`${LEGACY}/wp-json/wp/v2/pages/${PAGE_ID}?context=edit&_fields=acf`, {
    headers: { Authorization: AUTH }, timeout: 15000,
  });
  const a = verify.data.acf || {};
  const set = Object.entries(a).filter(([k, v]) => v !== '' && v !== null && v !== false);
  console.log(`5. Verification: ${set.length}/${Object.keys(a).length} ACF fields populated`);
  for (const k of ['ec_name', 'ec_title_position', 'ec_stat_years', 'ec_stat_markets', 'ec_stat_custom_label', 'ec_scores', 'ec_company_name', 'ec_credentials']) {
    const v = a[k];
    const display = typeof v === 'string' ? v.slice(0, 80).replace(/\n/g, ' | ') : JSON.stringify(v);
    console.log(`   ${k.padEnd(28)} = ${display || '(empty)'}`);
  }

  console.log(`\nLive: https://power100.io/dennis-lugo/`);
  console.log(`Vs:   https://staging.power100.io/dennis-lugo-contributor/`);
})().catch(e => {
  console.error('Fatal:', e.response?.status, e.response?.data || e.message);
  process.exit(1);
});
