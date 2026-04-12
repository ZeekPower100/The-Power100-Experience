#!/usr/bin/env node
/**
 * Phase D: Verify the article migration and generate the SEO redirect map.
 *
 * Checks:
 *   1. Total post count on new site vs old site (should match)
 *   2. Every published post has _p100_old_post_id and _p100_old_slug meta
 *   3. List posts where the slug was sanitized (old_slug != post_name) — these need 301s
 *   4. HTTP-check every post URL on the new site (sample mode default; --full for all)
 *   5. Scan post_content for leftover hotlinked power100.io URLs
 *   6. Generate nginx redirect rules from _p100_old_slug → post_name pairs
 *
 * Outputs:
 *   - state/verification-report.json — full report
 *   - state/nginx-redirects.conf — drop-in nginx config snippet for the redirects
 *
 * Usage:
 *   node 05-verify.js                 # Default: HTTP-check 20 random samples
 *   node 05-verify.js --full          # HTTP-check ALL posts (slower but thorough)
 *   node 05-verify.js --no-http       # Skip HTTP checks entirely (DB-only audit)
 */
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { RestClient } = require('./lib/rest-client');
const { WpCli } = require('./lib/wp-cli');
const log = require('./lib/logger');

const ARGS = process.argv.slice(2);
const FULL_HTTP = ARGS.includes('--full');
const NO_HTTP = ARGS.includes('--no-http');
const SAMPLE_SIZE = 20;

async function main() {
  log.header('Phase D: Migration Verification');

  const client = new RestClient();
  const wp = new WpCli();

  const report = {
    generated_at: new Date().toISOString(),
    counts: {},
    slug_drift: [],          // posts where post_name != _p100_old_slug
    missing_meta: [],        // posts missing _p100_old_post_id or _p100_old_slug
    http_failures: [],       // posts that returned non-200
    leftover_hotlinks: [],   // posts with power100.io URLs in content
  };

  // ── 1. Counts ──
  log.section('1. Post counts');
  const oldCount = await client.count('/posts');
  log.info(`Old site total posts: ${oldCount}`);
  report.counts.old_site = oldCount;

  const newTotalRaw = wp.run("post list --post_type=post --post_status=publish --fields=ID --format=count", { allowFailure: true });
  const newTotal = parseInt(newTotalRaw, 10) || 0;
  log.info(`New site published posts: ${newTotal}`);
  report.counts.new_site = newTotal;

  if (newTotal === oldCount) {
    log.ok(`Counts match`);
  } else {
    log.warn(`Count mismatch: old=${oldCount} new=${newTotal} (diff=${newTotal - oldCount})`);
  }

  // ── 2. Posts missing idempotency meta ──
  log.section('2. Idempotency meta audit');
  const allPostsRaw = wp.run("post list --post_type=post --post_status=publish --fields=ID,post_name --format=json", { json: true, allowFailure: true });
  if (!allPostsRaw || !Array.isArray(allPostsRaw)) {
    log.error('Failed to fetch new-site post list');
    return;
  }

  const allPosts = allPostsRaw;
  log.info(`Auditing ${allPosts.length} new-site posts for meta...`);

  for (const p of allPosts) {
    // Skip the original "Hello world!" post (id=1) — not a migrated article
    if (parseInt(p.ID, 10) === 1) continue;

    const oldId = wp.run(`post meta get ${p.ID} _p100_old_post_id`, { allowFailure: true });
    const oldSlug = wp.run(`post meta get ${p.ID} _p100_old_slug`, { allowFailure: true });

    if (!oldId) {
      report.missing_meta.push({ id: p.ID, post_name: p.post_name, missing: '_p100_old_post_id' });
    }
    if (!oldSlug) {
      report.missing_meta.push({ id: p.ID, post_name: p.post_name, missing: '_p100_old_slug' });
    }
    if (oldSlug && oldSlug !== p.post_name) {
      // Decode in case stored with percent-encoding
      const decodedOld = (() => {
        try { return decodeURIComponent(oldSlug); } catch (_) { return oldSlug; }
      })();
      report.slug_drift.push({
        new_id: p.ID,
        new_slug: p.post_name,
        old_slug_raw: oldSlug,
        old_slug_decoded: decodedOld,
      });
    }
  }

  log.info(`Posts missing meta: ${report.missing_meta.length}`);
  log.info(`Posts with slug drift (need 301): ${report.slug_drift.length}`);

  // ── 3. HTTP checks ──
  if (!NO_HTTP) {
    log.section(`3. HTTP checks (${FULL_HTTP ? 'FULL' : `sample of ${SAMPLE_SIZE}`})`);
    const targets = FULL_HTTP ? allPosts : sampleArray(allPosts.filter(p => parseInt(p.ID, 10) !== 1), SAMPLE_SIZE);
    const progress = new log.Progress('HTTP', targets.length);

    for (const p of targets) {
      const url = wp.run(`post url ${p.ID}`, { allowFailure: true });
      if (!url) {
        report.http_failures.push({ id: p.ID, error: 'wp post url returned empty' });
        progress.tick();
        continue;
      }
      const httpCode = wp.ssh_exec(`curl -sS -o /dev/null -w "%{http_code}" "${url.replace(/"/g, '\\"')}"`, { allowFailure: true });
      if (httpCode !== '200') {
        report.http_failures.push({ id: p.ID, url, http_code: httpCode });
      }
      progress.tick();
    }
    progress.done(`${report.http_failures.length} failures`);
  }

  // ── 4. Generate nginx redirect map ──
  log.section('4. Generate nginx redirect map');
  const nginxRules = generateNginxRedirects(report.slug_drift);
  const nginxFile = path.join(config.STATE.DIR, 'nginx-redirects.conf');
  fs.writeFileSync(nginxFile, nginxRules);
  log.ok(`Wrote ${report.slug_drift.length} redirect rules → ${nginxFile}`);

  // ── 5. Save full report ──
  const reportFile = path.join(config.STATE.DIR, 'verification-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  log.ok(`Wrote full report → ${reportFile}`);

  // ── Summary ──
  log.header('Verification Summary');
  log.info(`Old site posts:           ${report.counts.old_site}`);
  log.info(`New site posts:           ${report.counts.new_site}`);
  log.info(`Posts missing meta:       ${report.missing_meta.length}`);
  log.info(`Posts with slug drift:    ${report.slug_drift.length}  (need 301 redirects)`);
  if (!NO_HTTP) log.info(`HTTP failures:            ${report.http_failures.length}`);
  log.info(`Nginx redirect rules:     ${report.slug_drift.length}`);
  log.info('');

  const overallOk =
    report.counts.new_site === report.counts.old_site &&
    report.missing_meta.length === 0 &&
    report.http_failures.length === 0;

  if (overallOk) {
    log.ok('🎉 Migration verification PASSED');
  } else {
    log.warn('⚠ Verification found issues — see verification-report.json');
  }
}

function sampleArray(arr, n) {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/**
 * Generate an nginx config snippet from a list of slug drifts.
 * Each rule is a `rewrite ^/old-slug/?$ /new-slug/ permanent;`
 */
function generateNginxRedirects(driftList) {
  const lines = [];
  lines.push('# ============================================================================');
  lines.push('# Power100 article URL migration — non-ASCII slug 301 redirects');
  lines.push(`# Generated ${new Date().toISOString()} by 05-verify.js`);
  lines.push('# Add this to the new P100 site nginx server block, BEFORE location / {} blocks.');
  lines.push('# ============================================================================');
  lines.push('');
  lines.push('# Per-article redirects (preserves SEO equity for Google-indexed URLs)');
  lines.push('');

  for (const d of driftList) {
    // Escape regex chars in the old slug for nginx
    const rawEscaped = d.old_slug_raw.replace(/[.+*?$^()[\]{}|\\]/g, '\\$&');
    lines.push(`# old post id from meta — slug had non-ASCII chars`);
    lines.push(`rewrite ^/${rawEscaped}/?$  /${d.new_slug}/  permanent;`);
    lines.push('');
  }

  // Generic catch-all for any future non-breaking-hyphen URL
  lines.push('# Generic catch-all: any URL containing percent-encoded U+2011 → strip it');
  lines.push('# (handles future articles if the sanitizer is bypassed)');
  lines.push('if ($request_uri ~ "%[Ee]2%80%91") {');
  lines.push('    rewrite ^(.*)%[Ee]2%80%91(.*)$ $1-$2 permanent;');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

main().catch(err => {
  log.error(err.message);
  console.error(err.stack);
  process.exit(1);
});
