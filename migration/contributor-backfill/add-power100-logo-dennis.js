#!/usr/bin/env node
/**
 * Set ec_company_logo for Dennis Lugo on all 3 surfaces using the official
 * Power100 logo (already in legacy media library at attachment id 26497).
 *
 * Steps:
 *   1. Legacy: set ec_company_logo = 26497 (already there, just attach)
 *   2. Staging: download logo → sideload → set ec_company_logo
 *   3. IC: download logo → sideload → set ec_company_logo
 *
 * Source canonical: https://power100.io/wp-content/uploads/2026/02/Power100-Logo-4x-scaled.png
 */
const axios = require('axios');
const { spawnSync } = require('child_process');

const LOGO_URL = 'https://power100.io/wp-content/uploads/2026/02/Power100-Logo-4x-scaled.png';
const LEGACY_LOGO_ATT_ID = 26497;

const LEGACY_AUTH = 'Basic cG93ZXIxMDA6VjJ1YnpMcHQ3SW5aNmd1Z1o0ckVSN05X';

const SSH_STAGING = 'runcloud@155.138.198.250';
const WP_STAGING = '/home/runcloud/webapps/power100';
const STAGING_PAGE = 1354;

const SSH_IC = 'runcloud@45.76.62.153';
const WP_IC = '/home/runcloud/webapps/innercircle';
const IC_PAGE = 1674;  // ic_contributor post id for Dennis

function ssh(host, wp, cmd) {
  const r = spawnSync('ssh', ['-o', 'BatchMode=yes', host, `cd ${wp} && ${cmd}`],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`ssh ${host} failed: ${r.stderr}`);
  return r.stdout.trim();
}

async function downloadLogo() {
  console.log(`Downloading logo from ${LOGO_URL}...`);
  const resp = await axios.get(LOGO_URL, { responseType: 'arraybuffer', timeout: 30000 });
  const buf = Buffer.from(resp.data);
  require('fs').writeFileSync('./.tmp-power100-logo.png', buf);
  console.log(`  ✓ ${buf.length} bytes saved to ./.tmp-power100-logo.png`);
}

(async () => {
  // ── 1. LEGACY ──
  console.log('\n=== LEGACY ===');
  const legacy = await axios.post(`https://power100.io/wp-json/wp/v2/pages/29175`, {
    acf: { ec_company_logo: LEGACY_LOGO_ATT_ID },
  }, { headers: { Authorization: LEGACY_AUTH, 'Content-Type': 'application/json; charset=utf-8' } });
  console.log(`  ✓ ec_company_logo = ${LEGACY_LOGO_ATT_ID}`);

  // ── 2. STAGING ──
  console.log('\n=== STAGING ===');
  await downloadLogo();
  // SCP the logo to staging
  const scp1 = spawnSync('scp', ['./.tmp-power100-logo.png', `${SSH_STAGING}:/tmp/power100-logo.png`], { encoding: 'utf8' });
  if (scp1.status !== 0) throw new Error('scp to staging failed: ' + scp1.stderr);
  // Sideload via wp-cli
  const stagingAttId = ssh(SSH_STAGING, WP_STAGING,
    `wp media import /tmp/power100-logo.png --title="Power100 Logo" --porcelain`);
  console.log(`  ✓ staging media id=${stagingAttId}`);
  ssh(SSH_STAGING, WP_STAGING,
    `wp post meta update ${STAGING_PAGE} ec_company_logo ${stagingAttId}`);
  console.log(`  ✓ ec_company_logo set on staging page ${STAGING_PAGE}`);

  // ── 3. IC ──
  console.log('\n=== IC ===');
  const scp2 = spawnSync('scp', ['./.tmp-power100-logo.png', `${SSH_IC}:/tmp/power100-logo.png`], { encoding: 'utf8' });
  if (scp2.status !== 0) throw new Error('scp to IC failed: ' + scp2.stderr);
  const icAttId = ssh(SSH_IC, WP_IC,
    `wp media import /tmp/power100-logo.png --title="Power100 Logo" --porcelain`);
  console.log(`  ✓ IC media id=${icAttId}`);
  ssh(SSH_IC, WP_IC,
    `wp post meta update ${IC_PAGE} ec_company_logo ${icAttId}`);
  console.log(`  ✓ ec_company_logo set on IC page ${IC_PAGE}`);

  console.log('\n✓ All 3 surfaces have Power100 logo on Dennis Lugo.');
  console.log(`  Legacy: https://power100.io/dennis-lugo/`);
  console.log(`  Staging: https://staging.power100.io/dennis-lugo-contributor/`);
  console.log(`  IC: https://innercircle.power100.io/contributor/dennis-lugo/`);
})().catch(e => { console.error('Fatal:', e.response?.data || e.message); process.exit(1); });
