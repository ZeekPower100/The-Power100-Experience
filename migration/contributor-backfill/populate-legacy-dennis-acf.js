#!/usr/bin/env node
/**
 * Populate Dennis Lugo's ACF fields on the LEGACY power100.io page (id 29175).
 *
 * KEY LEGACY DIFFERENCES vs staging:
 *   - ACF exposed via top-level `acf:{}` envelope, NOT `meta:{}`
 *   - Read with `?context=edit&_fields=acf`
 *   - Write with POST body `{ acf: { ec_*: ... } }`
 *   - Field names differ from staging (see mapping below)
 *
 * Legacy schema (verified by pulling Kyle Deever's page 27338):
 *   ec_name                  — full display name
 *   ec_title_position        — title + company (e.g. "Co-Founder & CRO, Performance Windows")
 *   ec_headshot              — attachment ID
 *   ec_hero_quote            — short quote on hero
 *   ec_linkedin_url
 *   ec_contributor_type      — 'industry_leader' | 'contributor' | 'ranked_ceo' | 'ranked_partner'
 *   ec_stat_years / _revenue / _markets / _custom_label / _custom_value
 *   ec_expertise_bio         — long-form bio (= staging's ec_bio_long)
 *   ec_credentials           — multi-line text
 *   ec_recognition           — multi-line text (was repeater on staging)
 *   ec_contrib_description   — what they bring to the table (= staging's ec_contribution_desc)
 *   ec_contrib_topics        — multi-line text (was repeater on staging ec_topic_1..N)
 *   ec_video_1..7_title/url/thumb
 *   ec_articles_url
 */
const axios = require('axios');

const LEGACY = 'https://power100.io';
const AUTH = 'Basic cG93ZXIxMDA6VjJ1YnpMcHQ3SW5aNmd1Z1o0ckVSN05X';

const PAGE_ID = 29175;
const HEADSHOT_URL = 'https://media.licdn.com/dms/image/v2/D4D03AQGypfdWLbd7_A/profile-displayphoto-crop_800_800/B4DZ3ApSB.K0AI-/0/1777053543746?e=1778716800&v=beta&t=0PBhslqwNjLvuvsU4Wc0Zq9vhO74t3Njdwq9bywRDkc';

// Cleaned 2026-04-27: removed hallucinated Power100 events (Sonnet synthesis lane
// over-extrapolated from his Power100 affiliation). Only "Named VP" is actually true.
const ACF = {
  ec_name: 'Dennis Lugo',
  ec_title_position: 'Vice President, Power100',
  ec_hero_quote: 'Trust is the foundation — build it first, and the growth follows.',
  ec_linkedin_url: 'https://www.linkedin.com/in/dennis-lugo-42981655/',
  ec_contributor_type: 'industry_leader',  // legacy ENUM only allows ceo/partner/industry_leader (no `contributor`)
  ec_stat_years: '15+',
  ec_stat_custom_label: 'Industry Networks',
  ec_stat_custom_value: 'Multi-Vertical',
  ec_expertise_bio: `Dennis Lugo brings a hands-on, ground-up perspective to the home improvement industry that few can match. Based in Pensacola, Florida, his career spans direct sales, B2B partnership development, and VP-level leadership across multiple industry networks — most recently as Business Development Manager at MicroMeshGutterGuards.com — giving him a uniquely broad view of what drives sustainable business growth.

Power100 has named Dennis as Vice President, joining CEO Greg Cummings to advance a mission centered on authority, trust, and geographic relevance for home improvement leaders in the AI era. Known for his straightforward approach to relationship-building and his belief that trust must come before transaction, Dennis is focused on connecting top contractors with the partners, products, and intelligence they need to scale with confidence.`,
  ec_credentials: `Vice President, Power100
Multi-vertical B2B sales and partnership leadership
Direct sales and lead generation expertise
Trust-based sales process specialist`,
  ec_recognition: `🤝 | Appointed Vice President of Power100 (2026), joining CEO Greg Cummings to lead growth and partnership strategy
🌐 | Multi-vertical B2B sales and partnership leadership across direct sales, distribution, and SaaS
🏗️ | Hands-on operator background — built career from direct sales rep up to VP-level roles
🎯 | Specialist in trust-based sales processes and high-margin product strategy for home improvement contractors`,
  ec_contrib_description: `Dennis brings a rare blend of relationship-first sales leadership and broad cross-industry vantage. As VP of Power100, he focuses on connecting top contractors with the partners, products, and intelligence they need to scale — anchored by his belief that trust must come before transaction.`,
  ec_contrib_topics: `Strategic Partnerships & B2B Development
Lead Generation & CRM Systems
Trust-Based Sales Processes
High-Margin Product Sales Strategy
Home Improvement Authority & Geo-Targeting`,
};

async function main() {
  // 1. Sideload headshot
  console.log('1. Sideloading headshot to legacy media library...');
  const imgResp = await axios.get(HEADSHOT_URL, { responseType: 'arraybuffer', timeout: 30000 });
  const headshotBuf = Buffer.from(imgResp.data);
  console.log(`   downloaded ${headshotBuf.length} bytes`);

  const mediaResp = await axios.post(`${LEGACY}/wp-json/wp/v2/media`, headshotBuf, {
    headers: {
      Authorization: AUTH,
      'Content-Type': 'image/jpeg',
      'Content-Disposition': 'attachment; filename="dennis-lugo-headshot.jpg"',
    },
    timeout: 60000,
    maxBodyLength: Infinity,
  });
  const headshotId = mediaResp.data.id;
  console.log(`   ✓ media id=${headshotId}`);
  ACF.ec_headshot = headshotId;

  // 2. Update page: switch template + push all ACF fields
  console.log('2. Updating page → page-expert-contributor.php + 14 ACF fields...');
  const updResp = await axios.post(`${LEGACY}/wp-json/wp/v2/pages/${PAGE_ID}`, {
    template: 'page-expert-contributor.php',
    title: 'Dennis Lugo — Vice President, Power100',
    slug: 'dennis-lugo',
    content: '',  // template renders from ACF, not post_content
    featured_media: headshotId,
    acf: ACF,
  }, {
    headers: { Authorization: AUTH, 'Content-Type': 'application/json; charset=utf-8' },
    timeout: 30000,
  });
  console.log(`   ✓ updated template=${updResp.data.template}`);

  // 3. Verify ACF landed
  console.log('3. Verifying ACF...');
  const verify = await axios.get(`${LEGACY}/wp-json/wp/v2/pages/${PAGE_ID}?context=edit&_fields=template,acf`, {
    headers: { Authorization: AUTH },
    timeout: 15000,
  });
  const a = verify.data.acf || {};
  console.log(`   template=${verify.data.template}`);
  const populated = Object.entries(a).filter(([k, v]) => v !== '' && v !== null && v !== false && (typeof v !== 'object' || (Array.isArray(v) ? v.length : Object.keys(v || {}).length)));
  console.log(`   ${populated.length}/${Object.keys(a).length} ACF fields populated`);
  ['ec_name', 'ec_title_position', 'ec_headshot', 'ec_hero_quote', 'ec_expertise_bio', 'ec_contrib_topics'].forEach(k => {
    const v = a[k];
    const display = typeof v === 'string' ? v.slice(0, 80).replace(/\n/g, ' ') : JSON.stringify(v);
    console.log(`     ${k.padEnd(28)} = ${display || '(empty)'}`);
  });

  console.log(`\nLive URL: https://power100.io/dennis-lugo/`);
}

main().catch(e => {
  console.error('Fatal:', e.response?.status, e.response?.data || e.message);
  process.exit(1);
});
