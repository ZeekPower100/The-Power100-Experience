#!/usr/bin/env node
/**
 * Re-run upsertContributorLander on Dennis Lugo to push the corrected DB row
 * (Power100 company, no MicroMesh as current role, cleaned recognition list)
 * to staging WP + auto-mirror to IC.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const { query } = require('../../tpe-backend/src/config/database');
const enrich = require('../../tpe-backend/src/services/contributorEnrichmentService');

(async () => {
  const r = await query('SELECT * FROM expert_contributors WHERE id=124');
  const row = r.rows[0];
  console.log(`Refreshing ${row.first_name} ${row.last_name}: ${row.title_position}`);

  const result = await enrich.upsertContributorLander(row, { source: 'manual_dennis_lugo_refresh' });
  console.log(`✓ ${result.action} → ${result.wp_page_url}`);
  await new Promise(r => setTimeout(r, 4000));
  process.exit(0);
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
