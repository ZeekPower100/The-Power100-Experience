#!/usr/bin/env node
/**
 * One-shot: enrich + publish Brian McCauley's contributor lander.
 *
 * Brian is Director of Sales Training at Cornerstone Building Brands and
 * founder of The Sales Guy. He has a published article ("Always Ask for the
 * Sale") so he needs a contributor-level lander (not paid EC).
 *
 * Headshot is pre-sideloaded to staging at attachment id 1350 (via Drive folder
 * 1YUXcu8y9TMGZGL_rMkhq5BCzwmFRWn_o); we override the auto-enrichment headshot
 * so we keep the user-supplied one rather than whatever LinkedIn returns.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const { query } = require('../../tpe-backend/src/config/database');
const enrich = require('../../tpe-backend/src/services/contributorEnrichmentService');
const research = require('../../tpe-backend/src/services/contributorResearchService');

const TARGET = {
  name: 'Brian McCauley',
  company: 'Cornerstone Building Brands',
  websiteUrl: 'https://www.cornerstonebuildingbrands.com',
  headshotAttachmentId: 1350,
  headshotUrl: 'https://staging.power100.io/wp-content/uploads/2026/04/brian-mccauley-headshot.jpg',
};

(async () => {
  console.log(`=== ${TARGET.name} ===`);

  // 1. Find or create EC row
  const [first, ...rest] = TARGET.name.split(/\s+/);
  const last = rest.join(' ');
  const slug = TARGET.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

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
          headshot_url, source, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'contributor', 'article_writer', $5, 'manual_brian_mccauley', 'lead', NOW(), NOW())
       RETURNING *`,
      [first, last, `${slug}@placeholder.power100.io`, TARGET.company, TARGET.headshotUrl]
    );
    row = ins.rows[0];
    console.log(`  Created new row id=${row.id}`);
  }

  // 2. Run enrichment
  console.log('  Running researchContributor (LinkedIn + ranked + website + Apify SERP)...');
  let r;
  try {
    r = await research.researchContributor({
      name: TARGET.name,
      company: TARGET.company,
      knownLinkedinUrl: row.linkedin_url || undefined,
      rankedSlug: slug,
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
    // Continue anyway with the data we have
  } else {
    const p = r.payload;
    console.log('  Sources:', JSON.stringify(r.sources), 'verified:', r.linkedin_verified);
    console.log('  LinkedIn URL:', p.linkedin_url);

    // Persist enriched fields — but FORCE our headshot (don't let LinkedIn override)
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
      headshot_url=$12,
      testimonials=COALESCE(NULLIF($13,'[]')::jsonb, testimonials),
      updated_at=NOW()
      WHERE id=$14`, [
      p.title_position || `${p.title_position || 'Director of Sales Training, Cornerstone Building Brands'}`,
      p.hero_quote || '',
      p.bio || '',
      Array.isArray(p.credentials)      ? p.credentials.join('\n')      : (p.credentials || ''),
      Array.isArray(p.expertise_topics) ? p.expertise_topics.join('\n') : (p.expertise_topics || ''),
      Array.isArray(p.recognition)      ? p.recognition.join('\n')      : (p.recognition || ''),
      p.company_description || '', p.geographic_reach || '',
      p.website_url || TARGET.websiteUrl, p.linkedin_url || '',
      p.stat_years || '',
      TARGET.headshotUrl,                // FORCE our Drive headshot
      JSON.stringify(p.testimonials || []),
      row.id,
    ]);

    const refreshed = await query('SELECT * FROM expert_contributors WHERE id=$1', [row.id]);
    Object.assign(row, refreshed.rows[0]);
    row.scores = Array.isArray(p.scores) ? p.scores.join('\n') : p.scores;
    row.ec_stat_custom_label = p.ec_stat_custom_label;
    row.ec_stat_custom_value = p.ec_stat_custom_value;
    row.headshot_url = TARGET.headshotUrl; // re-pin in memory just in case
  }

  // 3. Push lander to staging.power100 + auto-mirror to IC
  console.log('  Calling upsertContributorLander...');
  const result = await enrich.upsertContributorLander(row, { source: 'manual_brian_mccauley' });
  console.log(`  ✓ ${result.action} → ${result.wp_page_url}`);
  process.exit(0);
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
