#!/usr/bin/env node
/**
 * Phase D.3 — Operator Review Queue.
 *
 * Reads state.json + tpedb to surface contributors that need human review
 * after the auto-enrichment backfill. Renders a self-contained HTML report
 * with action buttons (open lander, WP edit, LinkedIn, re-enrich command).
 *
 * USAGE:
 *   node build-review-queue.js                # all flag categories, open in browser
 *   node build-review-queue.js --filter=photo # only no-photo
 *   node build-review-queue.js --json         # also write review-queue.json
 *
 * REVIEW FLAGS:
 *   - needs_photo       — LinkedIn returned no photo URL (flagged in state.json)
 *   - linkedin_unverified — Apify name-match could not verify a LinkedIn profile
 *   - thin_bio          — bio < 100 chars
 *   - thin_recognition  — recognition has < 3 entries
 *   - questionable_claim — recognition contains heuristic over-assert phrases
 *                         ("$1B", "world's largest", "trained 500+", "top 500", "#1 ranked")
 *
 * Re-runs are safe — output is a fresh HTML file each time.
 */
const path = require('path');
const fs   = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const { query } = require('../../tpe-backend/src/config/database');

const STATE_PATH = path.join(__dirname, 'state.json');
const HTML_PATH  = path.join(__dirname, 'review-queue.html');
const JSON_PATH  = path.join(__dirname, 'review-queue.json');

const args = process.argv.slice(2);
const filter = (args.find(a => a.startsWith('--filter=')) || '').replace('--filter=', '') || null;
const writeJson = args.includes('--json');

const QUESTIONABLE_PATTERNS = [
  /\$\s*\d+\s*(billion|b\b)/i,
  /world'?s\s+largest/i,
  /trained\s+\d{3,}\+/i,
  /top\s+\d{3,}\b/i,
  /#1\s+(ranked|in\s+the)/i,
  /once[- ]in[- ]a[- ]generation/i,
  /best[- ]selling/i,
];

function detectFlags(row, stateEntry) {
  const flags = [];
  if (stateEntry?.needs_photo_review || !row.headshot_url) flags.push('needs_photo');
  if (stateEntry?.research && stateEntry.research.linkedin_verified === false) flags.push('linkedin_unverified');
  if (!row.bio || row.bio.length < 100) flags.push('thin_bio');
  const recogLines = (row.recognition || '').split('\n').filter(s => s.trim()).length;
  if (recogLines < 3) flags.push('thin_recognition');
  const recogText = String(row.recognition || '');
  if (QUESTIONABLE_PATTERNS.some(re => re.test(recogText))) flags.push('questionable_claim');
  return flags;
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function flagBadgeHtml(flag) {
  const palette = {
    needs_photo:        ['#ef4444', 'NO PHOTO'],
    linkedin_unverified:['#f97316', 'LI UNVERIFIED'],
    thin_bio:           ['#eab308', 'THIN BIO'],
    thin_recognition:   ['#eab308', 'THIN RECOG'],
    questionable_claim: ['#a855f7', 'CLAIM CHECK'],
  };
  const [color, label] = palette[flag] || ['#6b7280', flag];
  return `<span class="badge" style="background:${color}">${label}</span>`;
}

(async () => {
  if (!fs.existsSync(STATE_PATH)) {
    console.error(`No state.json at ${STATE_PATH} — run the backfill first.`);
    process.exit(1);
  }
  const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));

  // Collect all ec_ids that came out of the backfill successfully
  const successEntries = Object.entries(state).filter(([_, s]) => s.status === 'success' && s.ec_id);
  if (successEntries.length === 0) {
    console.log('No successful backfill entries yet. Re-run after the backfill makes progress.');
    process.exit(0);
  }
  const ecIds = successEntries.map(([_, s]) => s.ec_id);

  // Fetch the full row data
  const rows = (await query(
    `SELECT id, first_name, last_name, company, title_position, bio, recognition,
            headshot_url, linkedin_url, website_url, wp_page_id, wp_page_url,
            contributor_class
       FROM expert_contributors
      WHERE id = ANY($1::int[])`,
    [ecIds]
  )).rows;
  const byId = new Map(rows.map(r => [r.id, r]));

  // Build review entries
  const review = [];
  for (const [term_id, s] of successEntries) {
    const row = byId.get(s.ec_id);
    if (!row) continue;
    const flags = detectFlags(row, s);
    if (flags.length === 0) continue;
    if (filter === 'photo' && !flags.includes('needs_photo')) continue;
    if (filter === 'linkedin' && !flags.includes('linkedin_unverified')) continue;
    if (filter === 'bio' && !flags.includes('thin_bio')) continue;
    if (filter === 'claims' && !flags.includes('questionable_claim')) continue;

    review.push({
      term_id, ec_id: row.id,
      name: `${row.first_name} ${row.last_name}`.trim(),
      title: row.title_position || '',
      company: row.company || '',
      contributor_class: row.contributor_class,
      bio: row.bio || '',
      recognition: row.recognition || '',
      headshot_url: row.headshot_url || '',
      linkedin_url: row.linkedin_url || '',
      website_url: row.website_url || '',
      wp_page_id: row.wp_page_id,
      wp_page_url: s.p100_page_url || row.wp_page_url || '',
      wp_edit_url: row.wp_page_id ? `https://staging.power100.io/wp-admin/post.php?post=${row.wp_page_id}&action=edit` : '',
      flags,
    });
  }

  review.sort((a, b) => {
    // Sort by flag severity: photo first, then linkedin, then bio/recog/claims
    const score = e => (e.flags.includes('needs_photo') ? 0 : 1)
                    + (e.flags.includes('linkedin_unverified') ? 0 : 1) * 0.5;
    return score(a) - score(b) || a.name.localeCompare(b.name);
  });

  const counts = review.reduce((acc, e) => {
    e.flags.forEach(f => acc[f] = (acc[f] || 0) + 1);
    return acc;
  }, {});

  // ── Render HTML ──
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Contributor Review Queue (${review.length})</title>
<style>
  :root { --red:#ef4444; --orange:#f97316; --yellow:#eab308; --purple:#a855f7; --grey:#6b7280; --bg:#f5f5f5; --card:#fff; }
  * { box-sizing: border-box; }
  body { font: 14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; background:var(--bg); margin:0; padding:24px; color:#111; }
  h1 { margin:0 0 4px; font-size:24px; }
  .subhead { color:#555; margin-bottom:16px; }
  .filter-bar { display:flex; gap:8px; margin-bottom:24px; flex-wrap:wrap; }
  .filter-bar a { padding:6px 14px; background:#fff; border:1px solid #ddd; border-radius:999px; color:#111; text-decoration:none; font-weight:500; }
  .filter-bar a.active { background:#111; color:#fff; border-color:#111; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(380px, 1fr)); gap:16px; }
  .card { background:var(--card); border-radius:10px; padding:16px; box-shadow:0 1px 3px rgba(0,0,0,0.08); display:flex; flex-direction:column; gap:12px; }
  .card-head { display:flex; gap:12px; align-items:flex-start; }
  .photo { width:64px; height:64px; border-radius:50%; object-fit:cover; background:#eee; flex-shrink:0; }
  .no-photo { width:64px; height:64px; border-radius:50%; background:#fee; display:flex; align-items:center; justify-content:center; color:#c00; font-size:11px; font-weight:600; flex-shrink:0; }
  .name { font-weight:600; font-size:16px; margin:0; }
  .title { color:#555; font-size:13px; margin:2px 0 0; }
  .class-tag { display:inline-block; padding:2px 6px; background:#eef; color:#33c; border-radius:4px; font-size:10px; font-weight:600; text-transform:uppercase; margin-top:4px; }
  .badges { display:flex; gap:4px; flex-wrap:wrap; }
  .badge { color:#fff; padding:2px 8px; border-radius:999px; font-size:10px; font-weight:600; letter-spacing:0.3px; }
  .recog { font-size:12px; color:#444; max-height:90px; overflow:hidden; white-space:pre-line; border-left:3px solid #eee; padding-left:8px; }
  .actions { display:flex; gap:6px; flex-wrap:wrap; margin-top:auto; }
  .actions a { padding:6px 10px; background:#111; color:#fff; text-decoration:none; border-radius:6px; font-size:12px; font-weight:500; }
  .actions a.outline { background:#fff; color:#111; border:1px solid #ccc; }
  .actions a.disabled { background:#eee; color:#999; pointer-events:none; }
  .meta { font-size:11px; color:#999; margin-top:4px; }
</style>
</head>
<body>
  <h1>Contributor Review Queue</h1>
  <div class="subhead">${review.length} contributors flagged for review · generated ${new Date().toISOString()}</div>
  <div class="filter-bar">
    <a href="?" class="${!filter ? 'active' : ''}">All (${review.length})</a>
    <a href="?filter=photo" class="${filter==='photo'?'active':''}">No Photo (${counts.needs_photo || 0})</a>
    <a href="?filter=linkedin" class="${filter==='linkedin'?'active':''}">LI Unverified (${counts.linkedin_unverified || 0})</a>
    <a href="?filter=bio" class="${filter==='bio'?'active':''}">Thin Bio (${counts.thin_bio || 0})</a>
    <a href="?filter=claims" class="${filter==='claims'?'active':''}">Claim Check (${counts.questionable_claim || 0})</a>
  </div>
  <div class="grid">
    ${review.map(e => `
      <div class="card">
        <div class="card-head">
          ${e.headshot_url
            ? `<img class="photo" src="${escapeHtml(e.headshot_url)}" alt="">`
            : `<div class="no-photo">NO PHOTO</div>`}
          <div style="flex:1; min-width:0;">
            <div class="name">${escapeHtml(e.name)}</div>
            <div class="title">${escapeHtml(e.title || e.company)}</div>
            <span class="class-tag">${escapeHtml(e.contributor_class)}</span>
            <div class="meta">term=${e.term_id} · ec_id=${e.ec_id} · pid=${e.wp_page_id || '—'}</div>
          </div>
        </div>
        <div class="badges">${e.flags.map(flagBadgeHtml).join('')}</div>
        ${e.recognition ? `<div class="recog">${escapeHtml(e.recognition).slice(0, 400)}</div>` : ''}
        <div class="actions">
          ${e.wp_page_url ? `<a href="${escapeHtml(e.wp_page_url)}" target="_blank">Open Lander</a>` : '<a class="disabled">No URL</a>'}
          ${e.wp_edit_url ? `<a class="outline" href="${escapeHtml(e.wp_edit_url)}" target="_blank">Edit</a>` : ''}
          ${e.linkedin_url ? `<a class="outline" href="${escapeHtml(e.linkedin_url)}" target="_blank">LinkedIn</a>` : ''}
          ${e.website_url ? `<a class="outline" href="${escapeHtml(e.website_url)}" target="_blank">Site</a>` : ''}
        </div>
      </div>
    `).join('')}
  </div>
</body>
</html>`;

  fs.writeFileSync(HTML_PATH, html);
  console.log(`✓ Wrote ${HTML_PATH}`);
  console.log(`  ${review.length} contributors flagged across ${Object.keys(counts).length} categories:`);
  for (const [k, v] of Object.entries(counts).sort((a,b) => b[1]-a[1])) {
    console.log(`    ${k.padEnd(22)} ${v}`);
  }
  console.log(`\n  Open: file://${HTML_PATH.replace(/\\/g, '/')}`);

  if (writeJson) {
    fs.writeFileSync(JSON_PATH, JSON.stringify({ generated_at: new Date().toISOString(), count: review.length, counts, review }, null, 2));
    console.log(`✓ Also wrote ${JSON_PATH}`);
  }
  process.exit(0);
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
