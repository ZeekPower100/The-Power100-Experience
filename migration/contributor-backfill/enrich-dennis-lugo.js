#!/usr/bin/env node
/**
 * One-shot: enrich + publish Dennis Lugo's contributor lander.
 *
 * Dennis is the new VP of Power100 (announcement scheduled for 2026-04-28).
 * Power100 is his company, so websiteUrl points to power100.io.
 *
 * Headshot: auto-pulled from LinkedIn via Apify (no override). If LinkedIn
 * doesn't return one, follow-up step is to upload a manual one + force-update.
 *
 * After this completes:
 *   - staging.power100.io/dennis-lugo-contributor/  (canonical, auto)
 *   - innercircle.power100.io/contributor/dennis-lugo/  (mirror, auto via fire-and-forget)
 *   - power100.io/dennis-lugo/  (LEGACY — separate manual /p100-page-build flow)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const { query } = require('../../tpe-backend/src/config/database');
const enrich = require('../../tpe-backend/src/services/contributorEnrichmentService');
const research = require('../../tpe-backend/src/services/contributorResearchService');

const TARGET = {
  name: 'Dennis Lugo',
  company: 'Power100',
  websiteUrl: 'https://power100.io',
  knownLinkedinUrl: 'https://www.linkedin.com/in/dennis-lugo-42981655/',
};

(async () => {
  console.log(`=== ${TARGET.name} ===`);

  const [first, ...rest] = TARGET.name.split(/\s+/);
  const last = rest.join(' ');
  const slug = TARGET.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  // 1. Find or create EC row
  const existing = await query(
    'SELECT * FROM expert_contributors WHERE first_name=$1 AND last_name=$2 ORDER BY id LIMIT 1',
    [first, last]
  );
  let row;
  if (existing.rows[0]) {
    row = existing.rows[0];
    console.log(`  Found existing row id=${row.id}`);
  } else {
    const ins = await query(
      `INSERT INTO expert_contributors
         (first_name, last_name, email, company, contributor_class, contributor_type,
          linkedin_url, source, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'contributor', 'staff', $5, 'manual_dennis_lugo', 'lead', NOW(), NOW())
       RETURNING *`,
      [first, last, `${slug}@placeholder.power100.io`, TARGET.company, TARGET.knownLinkedinUrl]
    );
    row = ins.rows[0];
    console.log(`  Created new row id=${row.id}`);
  }

  // 2. Run enrichment (LinkedIn + Apify SERP — site lane will scrape power100.io)
  console.log('  Running researchContributor...');
  let r;
  try {
    r = await research.researchContributor({
      name: TARGET.name,
      company: TARGET.company,
      knownLinkedinUrl: TARGET.knownLinkedinUrl,
      websiteUrl: TARGET.websiteUrl,
      contributorClass: 'contributor',
    });
  } catch (e) {
    console.error('  ERR:', e.message);
    process.exit(1);
  }

  if (!r.success) {
    console.log('  Enrichment FAIL:', r.error);
    console.log('  Candidates tried:', JSON.stringify(r.candidates_tried || []));
  } else {
    const p = r.payload;
    console.log('  Sources:', JSON.stringify(r.sources), 'verified:', r.linkedin_verified);
    console.log('  LinkedIn URL:', p.linkedin_url);
    console.log('  Headshot URL from research:', p.headshot_url || '(none)');

    // Persist enriched fields. Take auto headshot (LinkedIn) since user didn't supply one.
    await query(`UPDATE expert_contributors SET
      title_position=COALESCE(NULLIF($1,''), title_position),
      hero_quote=COALESCE(NULLIF($2,''), hero_quote),
      bio=COALESCE(NULLIF($3,''), bio),
      credentials=COALESCE(NULLIF($4,''), credentials),
      expertise_topics=COALESCE(NULLIF($5,''), expertise_topics),
      recognition=COALESCE(NULLIF($6,''), recognition),
      company_description=COALESCE(NULLIF($7,''), company_description),
      geographic_reach=COALESCE(NULLIF($8,''), geographic_reach),
      website_url=COALESCE(NULLIF($9,''), website_url),
      linkedin_url=COALESCE(NULLIF($10,''), linkedin_url),
      years_in_industry=COALESCE(NULLIF($11,''), years_in_industry),
      headshot_url=COALESCE(NULLIF($12,''), headshot_url),
      testimonials=COALESCE(NULLIF($13,'[]')::jsonb, testimonials),
      updated_at=NOW()
      WHERE id=$14`, [
      p.title_position || 'Vice President, Power100',
      p.hero_quote || '',
      p.bio || '',
      Array.isArray(p.credentials)      ? p.credentials.join('\n')      : (p.credentials || ''),
      Array.isArray(p.expertise_topics) ? p.expertise_topics.join('\n') : (p.expertise_topics || ''),
      Array.isArray(p.recognition)      ? p.recognition.join('\n')      : (p.recognition || ''),
      p.company_description || 'Power100 is the leading CEO ranking and media platform for the home improvement industry, delivering rankings, podcast content, and Inner Circle membership for industry leaders.',
      p.geographic_reach || '',
      p.website_url || TARGET.websiteUrl,
      p.linkedin_url || TARGET.knownLinkedinUrl,
      p.stat_years || '',
      p.headshot_url || '',
      JSON.stringify(p.testimonials || []),
      row.id,
    ]);

    const refreshed = await query('SELECT * FROM expert_contributors WHERE id=$1', [row.id]);
    Object.assign(row, refreshed.rows[0]);
    row.scores = Array.isArray(p.scores) ? p.scores.join('\n') : p.scores;
    row.ec_stat_custom_label = p.ec_stat_custom_label;
    row.ec_stat_custom_value = p.ec_stat_custom_value;
  }

  // 3. Push lander to staging + auto-mirror to IC
  console.log('  Calling upsertContributorLander...');
  const result = await enrich.upsertContributorLander(row, { source: 'manual_dennis_lugo' });
  console.log(`  ✓ ${result.action} → ${result.wp_page_url}`);
  console.log('  Headshot in DB now:', row.headshot_url || '(NONE — will need manual upload)');

  // Wait for fire-and-forget IC mirror
  console.log('  Waiting 4s for IC mirror to complete...');
  await new Promise(r => setTimeout(r, 4000));
  process.exit(0);
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
