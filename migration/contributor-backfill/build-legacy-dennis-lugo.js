#!/usr/bin/env node
/**
 * Build + publish Dennis Lugo's contributor page on the LEGACY power100.io
 * (GoDaddy install, REST-only, no SSH).
 *
 * Strategy: hand-written inline HTML/CSS that approximates the new staging
 * lander design but is self-contained for the legacy WordPress install where
 * we can't deploy our hand-coded PHP template. Uses Elementor Canvas template
 * to bypass the legacy theme chrome.
 *
 * Idempotent: looks up existing /dennis-lugo/ slug first; updates if found.
 */
const axios = require('axios');

const LEGACY = 'https://power100.io';
const AUTH   = 'Basic cG93ZXIxMDA6VjJ1YnpMcHQ3SW5aNmd1Z1o0ckVSN05X';
const HEADERS = { Authorization: AUTH, 'Content-Type': 'application/json' };

const D = {
  name: 'Dennis Lugo',
  first: 'Dennis',
  last: 'Lugo',
  slug: 'dennis-lugo',
  title: 'Vice President, Power100',
  hero_quote: 'Trust is the foundation — build it first, and the growth follows.',
  headshot: 'https://media.licdn.com/dms/image/v2/D4D03AQGypfdWLbd7_A/profile-displayphoto-crop_800_800/B4DZ3ApSB.K0AI-/0/1777053543746?e=1778716800&v=beta&t=0PBhslqwNjLvuvsU4Wc0Zq9vhO74t3Njdwq9bywRDkc',
  linkedin: 'https://www.linkedin.com/in/dennis-lugo-42981655/',
  bio: `Dennis Lugo brings a hands-on, ground-up perspective to the home improvement industry that few can match. Based in Pensacola, Florida, his career spans direct sales, B2B partnership development, and VP-level leadership across multiple industry networks, giving him a uniquely broad view of what drives sustainable business growth.

Power100 named Dennis as Vice President, joining CEO Greg Cummings to advance a mission centered on authority, trust, and geographic relevance for home improvement leaders in the AI era. Known for his straightforward approach to relationship-building and his belief that trust must come before transaction, Dennis is focused on connecting top contractors with the partners, products, and intelligence they need to scale with confidence.`,
  topics: [
    'Strategic Partnerships & B2B Development',
    'High-Margin Product Sales Strategy',
    'Lead Generation & CRM Systems',
    'Trust-Based Sales Processes',
    'Home Improvement Authority & Geo-Targeting',
  ],
  staging_url: 'https://staging.power100.io/dennis-lugo-contributor/',
  ic_url: 'https://innercircle.power100.io/contributor/dennis-lugo/',
};

// Build the full HTML body. Inline CSS + Poppins font, Power100 red branding.
function buildHtml(d) {
  const topicPills = d.topics.map(t => `<span class="dl-topic-pill">${t}</span>`).join('');
  const bioParas = d.bio.split('\n\n').map(p => `<p>${p}</p>`).join('');

  return `<style>
.dl-page * { box-sizing: border-box; }
.dl-page { font-family: 'Poppins', system-ui, sans-serif; color: #222; line-height: 1.55; }
.dl-page p { margin: 0 0 16px; }

.dl-hero { background: linear-gradient(135deg, #0e0e0e 0%, #1a1a1a 100%); color: #fff; padding: 80px 24px 64px; }
.dl-hero-inner { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: 320px 1fr; gap: 56px; align-items: center; }
.dl-hero-photo { width: 320px; height: 320px; border-radius: 50%; background-size: cover; background-position: center; border: 4px solid #FB0401; box-shadow: 0 16px 48px rgba(0,0,0,0.5); }
.dl-hero-badge { display: inline-block; background: rgba(251,4,1,0.15); border: 1px solid rgba(251,4,1,0.4); color: #ff5d5b; padding: 6px 14px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 16px; }
.dl-hero h1 { font-size: clamp(38px, 5vw, 60px); font-weight: 800; margin: 0 0 8px; line-height: 1.05; }
.dl-hero-title { font-size: 18px; color: rgba(255,255,255,0.7); margin: 0 0 24px; font-weight: 500; }
.dl-hero-quote { font-size: 18px; font-style: italic; color: rgba(255,255,255,0.85); border-left: 3px solid #FB0401; padding-left: 18px; margin: 24px 0 0; max-width: 580px; }

.dl-section { padding: 64px 24px; }
.dl-section-grey { background: #f5f5f5; }
.dl-section-inner { max-width: 900px; margin: 0 auto; }
.dl-section h2 { font-size: clamp(28px, 3.5vw, 38px); font-weight: 700; color: #111; margin: 0 0 28px; line-height: 1.15; }
.dl-section h2 span.dl-red { color: #FB0401; }
.dl-section p { font-size: 16px; color: #333; }

.dl-topics { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 12px; }
.dl-topic-pill { background: #fff; border: 1px solid #e5e4e2; padding: 8px 16px; border-radius: 999px; font-size: 13px; font-weight: 600; color: #444; }

.dl-cta { background: linear-gradient(135deg, #FB0401 0%, #d80300 100%); color: #fff; padding: 56px 24px; text-align: center; }
.dl-cta h2 { color: #fff; font-size: clamp(26px, 3vw, 34px); font-weight: 700; margin: 0 0 12px; }
.dl-cta p { color: rgba(255,255,255,0.85); font-size: 16px; margin: 0 0 28px; }
.dl-cta-buttons { display: flex; gap: 14px; justify-content: center; flex-wrap: wrap; }
.dl-cta-btn { display: inline-block; padding: 14px 28px; border-radius: 999px; font-weight: 600; text-decoration: none; font-size: 15px; transition: transform 0.15s; }
.dl-cta-btn:hover { transform: translateY(-2px); }
.dl-cta-btn.primary { background: #fff; color: #FB0401; }
.dl-cta-btn.outline { background: transparent; color: #fff; border: 2px solid rgba(255,255,255,0.6); }

@media (max-width: 800px) {
  .dl-hero { padding: 56px 20px 48px; }
  .dl-hero-inner { grid-template-columns: 1fr; gap: 28px; text-align: center; }
  .dl-hero-photo { width: 220px; height: 220px; margin: 0 auto; }
  .dl-hero-quote { margin-left: auto; margin-right: auto; text-align: left; }
  .dl-section { padding: 48px 20px; }
}
</style>

<div class="dl-page">

<section class="dl-hero">
  <div class="dl-hero-inner">
    <div class="dl-hero-photo" style="background-image: url('${d.headshot}');"></div>
    <div>
      <span class="dl-hero-badge">Power100 Leadership</span>
      <h1>${d.name}</h1>
      <p class="dl-hero-title">${d.title}</p>
      <blockquote class="dl-hero-quote">${d.hero_quote}</blockquote>
    </div>
  </div>
</section>

<section class="dl-section">
  <div class="dl-section-inner">
    <h2>About <span class="dl-red">${d.first}</span></h2>
    ${bioParas}
  </div>
</section>

<section class="dl-section dl-section-grey">
  <div class="dl-section-inner">
    <h2>Areas of <span class="dl-red">Focus</span></h2>
    <p>What ${d.first} brings to the table for the Power100 community:</p>
    <div class="dl-topics">${topicPills}</div>
  </div>
</section>

<section class="dl-cta">
  <h2>Connect with ${d.first}</h2>
  <p>Reach out via LinkedIn or explore his full profile inside the Power100 ecosystem.</p>
  <div class="dl-cta-buttons">
    <a href="${d.linkedin}" class="dl-cta-btn primary" target="_blank" rel="noopener">Connect on LinkedIn</a>
    <a href="${d.staging_url}" class="dl-cta-btn outline">Full Profile</a>
  </div>
</section>

</div>`;
}

function safeAutop(html) {
  // Collapse blank lines so wpautop doesn't wrap our CSS rules in <p> tags.
  // Per memory/feedback_wp_autop_incident_2026_04_21.md.
  return html.replace(/\n{2,}/g, '\n').trim();
}

(async () => {
  console.log('=== Dennis Lugo — LEGACY power100.io build ===');

  // 1. Idempotency check
  const search = await axios.get(`${LEGACY}/wp-json/wp/v2/pages?slug=${D.slug}&_fields=id,slug,status,link`, { headers: HEADERS });
  const existing = search.data?.[0];

  const html = safeAutop(buildHtml(D));
  console.log(`  Built HTML: ${html.length} chars`);

  let res;
  if (existing) {
    console.log(`  Found existing page id=${existing.id} (${existing.link}) — updating...`);
    res = await axios.post(`${LEGACY}/wp-json/wp/v2/pages/${existing.id}`, {
      title:    D.name,
      content:  html,
      status:   'publish',
      template: 'elementor_canvas',
    }, { headers: HEADERS });
  } else {
    console.log(`  No existing /${D.slug}/ — creating...`);
    res = await axios.post(`${LEGACY}/wp-json/wp/v2/pages`, {
      title:    D.name,
      slug:     D.slug,
      content:  html,
      status:   'publish',
      template: 'elementor_canvas',
    }, { headers: HEADERS });
  }

  console.log(`  ✓ ${existing ? 'updated' : 'created'} page id=${res.data.id}`);
  console.log(`  Live URL: ${res.data.link}`);
})().catch(e => {
  console.error('Fatal:', e.response?.status, e.response?.data || e.message);
  process.exit(1);
});
