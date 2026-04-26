#!/usr/bin/env node
/**
 * Phase D.1 — Lossless IC ic_leader → P100 contributor lander backfill.
 *
 * Walks every ic_leader term from ic-leaders-dump.json, maps the IC term
 * meta to the unified expert_contributors row shape, INSERTs/UPDATEs the
 * tpedb row, then fires upsertContributorLander() to create the
 * staging.power100.io canonical + IC mirror via the existing Phase B/C
 * chain. Idempotent — safe to re-run.
 *
 * USAGE:
 *   node backfill-ic-leaders.js --dry-run            # preview, no writes
 *   node backfill-ic-leaders.js --limit 5            # process only first 5
 *   node backfill-ic-leaders.js --term 390           # process single term_id
 *   node backfill-ic-leaders.js                      # full run
 *   node backfill-ic-leaders.js --resume             # skip already-processed (uses state.json)
 *
 * STATE: migration/contributor-backfill/state.json keyed by term_id with
 *   { ec_id, p100_page_id, ic_post_id, status, error?, ts }
 *
 * RUN FROM tpe-backend/ directory so it picks up .env.production correctly,
 * OR set NODE_ENV=production explicitly:
 *   cd tpe-backend && node ../migration/contributor-backfill/backfill-ic-leaders.js
 */

const path = require('path');
const fs   = require('fs');

// Load env file the same way the backend does so we hit prod RDS + IC keys.
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: path.join(__dirname, '..', '..', 'tpe-backend', envFile) });

const enrich = require(path.join(__dirname, '..', '..', 'tpe-backend', 'src', 'services', 'contributorEnrichmentService'));
const { query } = require(path.join(__dirname, '..', '..', 'tpe-backend', 'src', 'config', 'database'));

const DUMP_PATH  = path.join(__dirname, 'ic-leaders-dump.json');
const STATE_PATH = path.join(__dirname, 'state.json');

const args = process.argv.slice(2);
const flags = {
  dryRun:  args.includes('--dry-run'),
  resume:  args.includes('--resume'),
  limit:   parseInt((args.find(a => a.startsWith('--limit=')) || args[args.indexOf('--limit') + 1] || '').replace('--limit=', ''), 10) || null,
  term:    parseInt((args.find(a => a.startsWith('--term=')) || args[args.indexOf('--term') + 1] || '').replace('--term=', ''), 10) || null,
};

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')); }
  catch (e) { return {}; }
}
function saveState(s) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(s, null, 2));
}

function safeJson(s) {
  if (!s) return null;
  if (typeof s === 'object') return s;
  try { return JSON.parse(s); } catch (e) { return null; }
}

// IC ic_contributor_stats is [{label, value}, ...]. Map to ec_stat slots
// based on label keywords. First match wins; rest cascade to custom.
function mapStatsToSlots(statsArr) {
  if (!Array.isArray(statsArr)) return {};
  const out = { years: '', revenue: '', markets: '', customLabel: '', customValue: '' };
  const customs = [];
  for (const s of statsArr) {
    if (!s || !s.value) continue;
    const label = String(s.label || '').toLowerCase();
    const value = String(s.value);
    if (!out.years && (/year/.test(label) || /found/.test(label) || /experience/.test(label))) {
      out.years = value;
    } else if (!out.revenue && (/revenue/.test(label) || /\$/.test(value) || /sales/.test(label))) {
      out.revenue = value;
    } else if (!out.markets && (/market/.test(label) || /state/.test(label) || /countr/.test(label) || /region/.test(label) || /geograph/.test(label))) {
      out.markets = value;
    } else {
      customs.push({ label: s.label || '', value });
    }
  }
  if (customs.length > 0) {
    // Pick the most "metric-y" first custom (numeric value preferred)
    const numericFirst = customs.find(c => /\d/.test(c.value)) || customs[0];
    out.customLabel = numericFirst.label;
    out.customValue = numericFirst.value;
  }
  return out;
}

function leaderToRow(leader) {
  const name = (leader.name || '').trim();
  if (!name) return null;
  const parts = name.split(/\s+/);
  const firstName = parts[0];
  const lastName  = parts.slice(1).join(' ') || '(unknown)';

  const isEc       = !!leader.ic_ec_page_url;
  const class_     = isEc ? 'expert_contributor' : 'contributor';
  const subType    = isEc ? 'ec_individual' : 'show_guest';
  const stats      = mapStatsToSlots(safeJson(leader.ic_contributor_stats));
  const articles   = safeJson(leader.ic_p100_articles) || [];
  const articleUrl = articles.length > 0 ? articles[0].url : '';

  return {
    name,
    first_name:    firstName,
    last_name:     lastName,
    email:         `ic-leader-${leader.slug}@power100.io`,
    company:       leader.ic_contributor_company || '',
    title_position: leader.ic_contributor_title || '',
    bio:           typeof leader.ic_contributor_bio === 'string' ? leader.ic_contributor_bio : '',
    headshot_url:  leader.leader_photo_url || leader.ic_contributor_photo || '',
    contributor_class: class_,
    contributor_type:  subType,
    form_tier:     'full',
    source:        `ic_leader_backfill:term_id=${leader.term_id}`,
    years_in_industry: stats.years,
    revenue_value:     stats.revenue,
    geographic_reach:  stats.markets,
    custom_stat:       '',  // not used — using explicit label/value below to bypass regex parse
    ec_stat_custom_label: stats.customLabel,
    ec_stat_custom_value: stats.customValue,
    power_rank:        leader.ic_power_rank || '',
    articles_url:      articleUrl,
    ic_term_id:        leader.term_id,  // tracked for traceability
  };
}

async function ensureRow(rowShape) {
  // Look up by source tag (most idempotent), then by email, then by name+class.
  const bySource = await query(
    `SELECT id, wp_page_id, wp_page_url FROM expert_contributors WHERE source = $1 LIMIT 1`,
    [rowShape.source]
  );
  if (bySource.rows.length > 0) {
    // Update existing backfill row in case data changed
    await query(
      `UPDATE expert_contributors SET
         first_name=$1, last_name=$2, company=$3, title_position=$4, bio=$5,
         headshot_url=COALESCE($6, headshot_url), contributor_class=$7, contributor_type=$8,
         years_in_industry=$9, revenue_value=$10, geographic_reach=$11, custom_stat=$12,
         updated_at=NOW()
       WHERE id=$13`,
      [
        rowShape.first_name, rowShape.last_name, rowShape.company, rowShape.title_position,
        rowShape.bio, rowShape.headshot_url || null, rowShape.contributor_class, rowShape.contributor_type,
        rowShape.years_in_industry, rowShape.revenue_value, rowShape.geographic_reach, rowShape.custom_stat,
        bySource.rows[0].id,
      ]
    );
    const fresh = await query('SELECT * FROM expert_contributors WHERE id=$1', [bySource.rows[0].id]);
    return { row: fresh.rows[0], created: false };
  }
  // New row
  const inserted = await query(
    `INSERT INTO expert_contributors
       (first_name, last_name, email, company, title_position, bio, headshot_url,
        contributor_class, contributor_type, form_tier, source,
        years_in_industry, revenue_value, geographic_reach, custom_stat,
        status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
             'lead', NOW(), NOW())
     RETURNING *`,
    [
      rowShape.first_name, rowShape.last_name, rowShape.email,
      rowShape.company, rowShape.title_position, rowShape.bio,
      rowShape.headshot_url || null, rowShape.contributor_class,
      rowShape.contributor_type, rowShape.form_tier, rowShape.source,
      rowShape.years_in_industry, rowShape.revenue_value,
      rowShape.geographic_reach, rowShape.custom_stat,
    ]
  );
  return { row: inserted.rows[0], created: true };
}

async function processLeader(leader, state) {
  const shape = leaderToRow(leader);
  if (!shape) return { skip: true, reason: 'no name' };

  if (flags.dryRun) {
    return { dryRun: true, name: shape.name, class: shape.contributor_class, has_bio: !!shape.bio, has_photo: !!shape.headshot_url };
  }

  const { row, created } = await ensureRow(shape);
  // Merge the shape's computed override fields onto the fresh DB row
  // (these aren't actual columns — they're transient ACF mapping hints).
  row.power_rank            = shape.power_rank || row.power_rank;
  row.ec_stat_custom_label  = shape.ec_stat_custom_label;
  row.ec_stat_custom_value  = shape.ec_stat_custom_value;

  const result = await enrich.upsertContributorLander(row, {
    source: 'ic_leader_backfill',
    ignoreStoredWpPageId: false, // freshly-created backfill rows haven't been pushed yet
    preserveExistingPageLink: false, // we WANT the back-link for backfill rows
  });

  return {
    name: shape.name,
    ec_id: row.id,
    ec_created: created,
    p100_page_id: result.wp_page_id,
    p100_page_url: result.wp_page_url,
    p100_action: result.action,
  };
}

async function main() {
  if (!fs.existsSync(DUMP_PATH)) {
    console.error(`Missing dump file: ${DUMP_PATH}`);
    console.error('Re-export with: ssh runcloud@45.76.62.153 ... > ic-leaders-dump.json');
    process.exit(1);
  }
  const leaders = JSON.parse(fs.readFileSync(DUMP_PATH, 'utf8'));
  console.log(`[backfill] loaded ${leaders.length} leaders from dump`);

  let target = leaders;
  if (flags.term) {
    target = leaders.filter(l => l.term_id === flags.term);
    if (!target.length) { console.error(`No leader with term_id=${flags.term}`); process.exit(1); }
  }
  if (flags.limit) target = target.slice(0, flags.limit);

  const state = loadState();
  const results = { processed: 0, created: 0, updated: 0, skipped: 0, errors: 0 };

  for (let i = 0; i < target.length; i++) {
    const leader = target[i];
    const sk = String(leader.term_id);
    if (flags.resume && state[sk] && state[sk].status === 'success') {
      results.skipped++;
      continue;
    }
    process.stdout.write(`[${i + 1}/${target.length}] ${leader.name} (term_id=${leader.term_id}) ... `);
    try {
      const r = await processLeader(leader, state);
      if (r.skip) {
        results.skipped++;
        process.stdout.write(`SKIP (${r.reason})\n`);
        state[sk] = { status: 'skip', reason: r.reason, ts: Date.now() };
      } else if (r.dryRun) {
        results.processed++;
        process.stdout.write(`DRY: class=${r.class}, bio=${r.has_bio?'Y':'N'}, photo=${r.has_photo?'Y':'N'}\n`);
      } else {
        results.processed++;
        if (r.ec_created) results.created++; else results.updated++;
        process.stdout.write(`OK ec_id=${r.ec_id} p100=${r.p100_page_id} (${r.p100_action})\n`);
        state[sk] = { status: 'success', ec_id: r.ec_id, p100_page_id: r.p100_page_id, p100_page_url: r.p100_page_url, p100_action: r.p100_action, ts: Date.now() };
      }
    } catch (err) {
      results.errors++;
      process.stdout.write(`ERROR: ${err.message}\n`);
      state[sk] = { status: 'error', error: err.message, ts: Date.now() };
    }

    // Throttle: 1s between contributors so IC + Power100 + IC-mirror chain
    // (3 REST calls per contributor, plus headshot sideload) doesn't hammer.
    if (!flags.dryRun) await new Promise(r => setTimeout(r, 1000));
    // Save state every 5 to allow safe Ctrl+C
    if (i % 5 === 0) saveState(state);
  }
  saveState(state);

  console.log('\n========== Summary ==========');
  console.log(`Processed: ${results.processed}`);
  console.log(`  Created (new tpedb row): ${results.created}`);
  console.log(`  Updated (existing tpedb row): ${results.updated}`);
  console.log(`Skipped: ${results.skipped}`);
  console.log(`Errors: ${results.errors}`);
  console.log(`State saved: ${STATE_PATH}`);
  process.exit(results.errors > 0 ? 1 : 0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
