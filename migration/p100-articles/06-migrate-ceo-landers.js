#!/usr/bin/env node
/**
 * Phase E: Migrate ranked CEO landers from cached HTML files to the new P100 site.
 *
 * Reads HTML files from state/ceo-lander-html-cache/, runs each through
 * extract-ceo-lander-fields.php, builds a spec, pipes to upsert-ceo-lander.php
 * via wp eval-file. Idempotent — existing pages identified by `_pcl_source_slug`
 * meta get UPDATEd in place instead of duplicated.
 *
 * Run on Vultr with LOCAL_MODE=1 for max speed.
 *
 * Usage:
 *   LOCAL_MODE=1 node 06-migrate-ceo-landers.js                    # full run
 *   LOCAL_MODE=1 node 06-migrate-ceo-landers.js --slug ANDY        # just one
 *   LOCAL_MODE=1 node 06-migrate-ceo-landers.js --limit 3          # smoke test
 *   LOCAL_MODE=1 node 06-migrate-ceo-landers.js --dry-run          # no upserts
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const config = require('./config');
const { WpCli } = require('./lib/wp-cli');
const log = require('./lib/logger');

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const SLUG_IDX = ARGS.indexOf('--slug');
const SLUG_FILTER = SLUG_IDX >= 0 ? ARGS[SLUG_IDX + 1] : null;
const LIMIT_IDX = ARGS.indexOf('--limit');
const LIMIT = LIMIT_IDX >= 0 ? parseInt(ARGS[LIMIT_IDX + 1], 10) : null;

const SCRIPT_DIR = __dirname;
const EXTRACTOR = path.join(SCRIPT_DIR, 'extract-ceo-lander-fields.php');
const UPSERTER  = path.join(SCRIPT_DIR, 'upsert-ceo-lander.php');
const HTML_CACHE = path.join(SCRIPT_DIR, 'state', 'ceo-lander-html-cache');
const PROGRESS_FILE = path.join(SCRIPT_DIR, 'state', 'ceo-lander-progress.json');

async function main() {
  log.header(`Phase E: CEO Lander Migration${DRY_RUN ? ' (DRY RUN)' : ''}${SLUG_FILTER ? ' (slug='+SLUG_FILTER+')' : ''}${LIMIT ? ' (limit='+LIMIT+')' : ''}`);

  if (!fs.existsSync(EXTRACTOR)) throw new Error(`Missing extractor: ${EXTRACTOR}`);
  if (!fs.existsSync(UPSERTER)) throw new Error(`Missing upserter: ${UPSERTER}`);
  if (!fs.existsSync(HTML_CACHE)) throw new Error(`Missing HTML cache: ${HTML_CACHE}`);

  const wp = new WpCli();
  const files = fs.readdirSync(HTML_CACHE).filter(f => f.endsWith('.html'));

  // Filter by slug if requested
  let targets = files;
  if (SLUG_FILTER) {
    targets = files.filter(f => f.toLowerCase().includes(SLUG_FILTER.toLowerCase()));
  }
  if (LIMIT) targets = targets.slice(0, LIMIT);

  log.info(`Total CEO landers in cache: ${files.length}`);
  log.info(`To process this run: ${targets.length}`);

  let progress = { completed: [], failed: [], started_at: new Date().toISOString() };
  if (fs.existsSync(PROGRESS_FILE)) {
    try { progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch (_) {}
  }

  const progressBar = new log.Progress('CEO landers', targets.length);
  let succeeded = 0, failed = 0, created = 0, updated = 0;

  for (const filename of targets) {
    try {
      const slug = filename.replace(/\.html$/, '');
      const filePath = path.join(HTML_CACHE, filename);
      const html = fs.readFileSync(filePath, 'utf8');

      // 1. Run extractor
      const extracted = runExtractor(html);
      if (!extracted.ok) throw new Error(`extractor: ${extracted.error}`);

      // 2. Build spec
      const spec = {
        old_slug: slug,
        title: extracted.fields.pcl_ceo_full_name || slug,
        fields: extracted.fields,
      };

      if (DRY_RUN) {
        log.info(`[DRY] would upsert ${slug} | name=${spec.title} | rank=${extracted.fields.pcl_rank_number} | videos=${extracted.stats.videos_valid} | snapshots=${extracted.stats.snapshots_found} | bio=${extracted.stats.bio_chars}`);
        progressBar.tick();
        continue;
      }

      // 3. Upsert
      const result = runUpserter(spec, wp);
      if (!result.ok) throw new Error(`upsert: ${result.error || JSON.stringify(result)}`);

      if (result.action === 'create') created++;
      else updated++;
      succeeded++;
      progress.completed.push({ slug, post_id: result.post_id, action: result.action });

      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
      progressBar.tick();
    } catch (err) {
      failed++;
      const slug = filename.replace(/\.html$/, '');
      progress.failed.push({ slug, error: err.message });
      log.error(`Failed: ${slug}: ${err.message.split('\n')[0]}`);
      progressBar.tick();
    }
  }

  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  progressBar.done(`${succeeded} ok (${created} created, ${updated} updated)`);

  log.header('Phase E complete');
  log.info(`Succeeded: ${succeeded}`);
  log.info(`  Created: ${created}`);
  log.info(`  Updated: ${updated}`);
  log.info(`Failed:    ${failed}`);
  if (failed > 0) log.warn('See state/ceo-lander-progress.json failed[] for details');
}

function runExtractor(html) {
  const stdout = execFileSync('php', [EXTRACTOR], {
    input: html,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return JSON.parse(stdout);
}

function runUpserter(spec, wp) {
  const json = JSON.stringify(spec);
  const tmpFile = path.join(SCRIPT_DIR, 'state', `pcl-spec-tmp-${Date.now()}-${Math.random().toString(36).slice(2,8)}.json`);
  fs.writeFileSync(tmpFile, json);
  try {
    const cmd = `cd ${shellQuote(config.NEW_SITE.WP_PATH)} && cat ${shellQuote(tmpFile)} | wp eval-file ${shellQuote(UPSERTER)}`;
    const stdout = wp.ssh_exec(cmd, { timeout: 60000 });
    const lastLine = stdout.split('\n').filter(Boolean).pop();
    return JSON.parse(lastLine);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  }
}

function shellQuote(s) {
  return `'${String(s).replace(/'/g, "'\\''")}'`;
}

main().catch(err => {
  log.error(err.message);
  console.error(err.stack);
  process.exit(1);
});
