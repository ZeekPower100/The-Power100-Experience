#!/usr/bin/env node
/**
 * Audit: how many of the legacy contributor pages already have ec_company_logo
 * populated? Builds a company → logo URL map for backfill use.
 *
 * Output: prints (a) coverage stats, (b) a JSON map of {company_name → logo_url}
 * to /tmp/legacy-company-logo-map.json for downstream backfill.
 */
const axios = require('axios');
const fs = require('fs');
const AUTH = 'Basic cG93ZXIxMDA6VjJ1YnpMcHQ3SW5aNmd1Z1o0ckVSN05X';

(async () => {
  // 1. Find all contributor pages on legacy (filter by template — this matches
  // pages bound to page-expert-contributor.php template).
  const pages = [];
  for (let p = 1; p <= 5; p++) {
    const r = await axios.get(`https://power100.io/wp-json/wp/v2/pages?per_page=100&page=${p}&_fields=id,slug,title,template`, {
      headers: { Authorization: AUTH }, timeout: 30000,
    });
    if (!r.data.length) break;
    pages.push(...r.data.filter(p => p.template === 'page-expert-contributor.php'));
    if (r.data.length < 100) break;
  }
  console.log(`contributor pages on legacy: ${pages.length}`);

  // 2. For each, pull acf:{} and check ec_company_name + ec_company_logo
  const companyLogoMap = {};       // { "Performance Windows": "https://.../logo.png", ... }
  const stats = { total: pages.length, with_logo: 0, missing_logo: 0, missing_company: 0 };
  for (let i = 0; i < pages.length; i++) {
    const pg = pages[i];
    try {
      const r = await axios.get(`https://power100.io/wp-json/wp/v2/pages/${pg.id}?context=edit&_fields=acf`, {
        headers: { Authorization: AUTH }, timeout: 15000,
      });
      const a = r.data.acf || {};
      const company = (a.ec_company_name || '').trim();
      const logoId = parseInt(a.ec_company_logo, 10);
      if (!company) { stats.missing_company++; continue; }
      if (!logoId) { stats.missing_logo++; continue; }
      // Resolve logo attachment → source_url
      const m = await axios.get(`https://power100.io/wp-json/wp/v2/media/${logoId}?_fields=source_url`, {
        headers: { Authorization: AUTH }, timeout: 15000,
      });
      const url = m.data.source_url;
      if (!companyLogoMap[company]) companyLogoMap[company] = { url, attachment_id: logoId, sample_pages: [] };
      companyLogoMap[company].sample_pages.push(pg.slug);
      stats.with_logo++;
    } catch (e) {
      // skip and move on
    }
    if ((i + 1) % 20 === 0) process.stdout.write(`  ${i + 1}/${pages.length}\r`);
  }

  console.log(`\n--- Stats ---`);
  console.log(`Total contributor pages:           ${stats.total}`);
  console.log(`Pages with ec_company_logo set:    ${stats.with_logo}`);
  console.log(`Pages missing ec_company_logo:     ${stats.missing_logo}`);
  console.log(`Pages missing ec_company_name:     ${stats.missing_company}`);
  console.log(`\n--- Unique companies with logos: ${Object.keys(companyLogoMap).length} ---`);
  Object.entries(companyLogoMap).slice(0, 20).forEach(([co, data]) => {
    console.log(`  ${co.padEnd(40)} → ${data.url.slice(-60)}`);
  });
  if (Object.keys(companyLogoMap).length > 20) console.log(`  ... and ${Object.keys(companyLogoMap).length - 20} more`);

  const path = require('path');
  const outPath = path.join(__dirname, '..', 'tpe-backend', 'data', 'legacy-company-logos.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(companyLogoMap, null, 2));
  console.log(`\nFull map written to ${outPath}`);
})().catch(e => { console.error('Fatal:', e.response?.data || e.message); process.exit(1); });
