#!/usr/bin/env node
/**
 * Phase B: Migrate media library from old power100.io to new P100 site.
 *
 * Strategy: REST API enumeration. Uses old site's /wp-json/wp/v2/media endpoint
 * (paginated via X-WP-Total / X-WP-TotalPages headers). For each media item,
 * downloads the original file via HTTPS GET to its source_url and saves to
 * the new server preserving the date-based path (/wp-content/uploads/YYYY/MM/file.ext).
 *
 * SEO requirement: image URLs MUST be preserved byte-for-byte. The new server's
 * uploads directory ends up mirroring the old server's structure exactly.
 *
 * Resumability: state/media-progress.json tracks which media IDs are done.
 * Re-running skips completed items.
 *
 * Usage:
 *   node 02-migrate-media.js --dry-run               # Enumerate, count, sample (no downloads)
 *   node 02-migrate-media.js --sample 5              # Download only the first 5 (smoke test)
 *   node 02-migrate-media.js                         # Full migration
 *   node 02-migrate-media.js --resume                # Continue from last state
 */
const config = require('./config');
const { RestClient } = require('./lib/rest-client');
const { WpCli } = require('./lib/wp-cli');
const log = require('./lib/logger');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const SAMPLE_IDX = ARGS.indexOf('--sample');
const SAMPLE_LIMIT = SAMPLE_IDX >= 0 ? parseInt(ARGS[SAMPLE_IDX + 1], 10) : null;
const RESUME = ARGS.includes('--resume');

async function main() {
  log.header(`Phase B: Media Migration${DRY_RUN ? ' (DRY RUN)' : ''}${SAMPLE_LIMIT ? ` (SAMPLE ${SAMPLE_LIMIT})` : ''}`);

  const client = new RestClient();
  const wp = new WpCli();

  // ── Load existing progress (for resumability) ──
  fs.mkdirSync(config.STATE.DIR, { recursive: true });
  let progress = { completed: [], failed: [], skipped: [], started_at: new Date().toISOString() };
  if (RESUME && fs.existsSync(config.STATE.MEDIA_PROGRESS)) {
    progress = JSON.parse(fs.readFileSync(config.STATE.MEDIA_PROGRESS, 'utf8'));
    log.info(`Resuming — already completed: ${progress.completed.length}`);
  }
  const completedSet = new Set(progress.completed);

  // ── Step 1: count ──
  log.section('1. Counting media items on old site');
  const totalCount = await client.count('/media');
  log.ok(`Total media items: ${totalCount}`);

  if (totalCount === 0) {
    log.warn('No media to migrate.');
    return;
  }

  if (DRY_RUN) {
    log.section('2. Sampling first 10 items (dry-run)');
    let i = 0;
    for await (const item of client.iterate('/media', { fields: 'id,date,source_url,mime_type,media_type,media_details', perPage: 10 })) {
      const sizes = item.media_details && item.media_details.sizes ? Object.keys(item.media_details.sizes).length : 0;
      log.info(`  #${item.id} ${item.mime_type}  ${item.source_url}`);
      log.info(`    sizes: ${sizes} thumbnails`);
      i++;
      if (i >= 10) break;
    }

    log.section('3. Estimating workload');
    log.info(`Would download ${totalCount} originals + their thumbnail variants`);
    log.info(`At ~3 files/sec, full migration ETA: ~${Math.ceil(totalCount * 4 / 60)} minutes (depends on thumbnail counts)`);
    log.header('DRY RUN complete — re-run without --dry-run to download');
    return;
  }

  // ── Step 2: full enumeration + download ──
  log.section('2. Downloading media (preserving date paths)');
  const progressBar = new log.Progress('Media', SAMPLE_LIMIT || totalCount);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;
  let bytes = 0;

  const itemsToProcess = [];

  for await (const item of client.iterate('/media', {
    fields: 'id,date,source_url,mime_type,media_details',
    perPage: 100,
    onPage: ({ page, totalPages }) => log.info(`  enumerated page ${page}/${totalPages}`),
  })) {
    if (completedSet.has(item.id)) {
      skipped++;
      progressBar.tick();
      continue;
    }
    itemsToProcess.push(item);
    if (SAMPLE_LIMIT && itemsToProcess.length >= SAMPLE_LIMIT) break;
  }

  log.info(`Items to process this run: ${itemsToProcess.length} (already done: ${skipped})`);

  // Batch downloads — ~25 items per SSH connection, MUCH faster than one-per-SSH
  const BATCH_SIZE = 25;
  for (let i = 0; i < itemsToProcess.length; i += BATCH_SIZE) {
    const batch = itemsToProcess.slice(i, i + BATCH_SIZE);
    try {
      const result = await downloadMediaBatch(batch, wp);
      downloaded += result.filesDownloaded;
      bytes += result.bytesDownloaded;
      for (const id of result.successIds) {
        progress.completed.push(id);
      }
      for (const failure of result.failures) {
        failed++;
        progress.failed.push(failure);
        log.error(`Failed #${failure.id}: ${failure.error}`);
      }
      progressBar.tick(batch.length);

      // Persist progress every batch
      fs.writeFileSync(config.STATE.MEDIA_PROGRESS, JSON.stringify(progress, null, 2));
    } catch (err) {
      // Whole-batch failure (SSH connection issue, etc.) — mark all items in batch as failed
      for (const item of batch) {
        failed++;
        progress.failed.push({ id: item.id, source_url: item.source_url, error: `batch failure: ${err.message}` });
      }
      log.error(`Batch failure (${batch.length} items): ${err.message}`);
      progressBar.tick(batch.length);
    }
  }

  fs.writeFileSync(config.STATE.MEDIA_PROGRESS, JSON.stringify(progress, null, 2));
  progressBar.done(`${downloaded} files, ${(bytes / 1024 / 1024).toFixed(1)} MB`);

  log.header('Phase B complete');
  log.info(`Downloaded: ${downloaded} files`);
  log.info(`Skipped (already done): ${skipped}`);
  log.info(`Failed: ${failed}`);
  log.info(`Total bytes: ${(bytes / 1024 / 1024).toFixed(1)} MB`);
  if (failed > 0) {
    log.warn(`See state/media-progress.json failed[] for retry candidates`);
  }
}

/**
 * Build the URL list (original + thumbnail variants) for a single media item.
 * Returns [{ url, relativePath }, ...] or null if the source_url is unparseable.
 */
function buildUrlList(item) {
  const sourceUrl = item.source_url;
  const match = sourceUrl.match(/\/wp-content\/uploads\/(.+)$/);
  if (!match) return null;
  const relativePath = match[1];  // e.g., "2024/03/foo.jpg"

  const urls = [{ url: sourceUrl, relativePath }];

  if (item.media_details && item.media_details.sizes) {
    const baseDir = relativePath.replace(/\/[^/]+$/, '');  // "2024/03"
    for (const sizeKey of Object.keys(item.media_details.sizes)) {
      const size = item.media_details.sizes[sizeKey];
      if (size && size.source_url && size.source_url !== sourceUrl) {
        const sizeMatch = size.source_url.match(/\/([^/]+)$/);
        if (sizeMatch) {
          urls.push({
            url: size.source_url,
            relativePath: `${baseDir}/${sizeMatch[1]}`,
          });
        }
      }
    }
  }

  return urls;
}

/**
 * Download a BATCH of media items in one SSH connection.
 * MUCH faster than one-SSH-per-item (~10-20x speedup).
 *
 * Each item's curls run sequentially within the batch, but with `|| echo FAIL`
 * fallthroughs so a single bad URL doesn't kill the batch. Per-item success
 * is reported via parsed marker output.
 *
 * Returns { filesDownloaded, bytesDownloaded, successIds, failures }.
 */
async function downloadMediaBatch(items, wp) {
  // Build a single bash script: for each item, mkdir + curls + emit success marker
  const lines = [];
  const itemUrlMap = new Map();  // id → urls[] for size lookup later

  for (const item of items) {
    const urls = buildUrlList(item);
    if (!urls) {
      lines.push(`echo "FAIL:${item.id}:unparseable_url"`);
      continue;
    }
    itemUrlMap.set(item.id, urls);

    const targetDir = `${config.NEW_SITE.UPLOADS_PATH}/${urls[0].relativePath.replace(/\/[^/]+$/, '')}`;

    // mkdir, then ONE curl invocation with multiple -o/-url pairs.
    // This reuses the HTTPS/2 connection to power100.io across all thumbnails
    // for this item — much faster than separate curls.
    lines.push(`mkdir -p '${targetDir}'`);
    const curlArgs = urls
      .map(u => {
        const targetPath = `${config.NEW_SITE.UPLOADS_PATH}/${u.relativePath}`;
        return `-o '${targetPath}' '${u.url}'`;
      })
      .join(' ');
    lines.push(`curl -fsSL ${curlArgs} && echo "OK:${item.id}" || echo "FAIL:${item.id}"`);
  }

  // Run the whole batch in one SSH call. Use longer timeout for big batches.
  const script = lines.join('\n');
  const output = wp.ssh_exec(script, { timeout: 5 * 60 * 1000 });  // 5 min timeout per batch

  // Parse output for OK/FAIL markers
  const successIds = [];
  const failures = [];
  for (const line of output.split('\n')) {
    if (line.startsWith('OK:')) {
      successIds.push(parseInt(line.slice(3), 10));
    } else if (line.startsWith('FAIL:')) {
      const parts = line.slice(5).split(':');
      const id = parseInt(parts[0], 10);
      const reason = parts.slice(1).join(':') || 'unknown';
      failures.push({ id, source_url: '', error: reason });
    }
  }

  // Stat all files to compute total bytes (single SSH call)
  let bytesDownloaded = 0;
  let filesDownloaded = 0;
  const allPaths = [];
  for (const id of successIds) {
    const urls = itemUrlMap.get(id);
    if (!urls) continue;
    for (const u of urls) {
      allPaths.push(`${config.NEW_SITE.UPLOADS_PATH}/${u.relativePath}`);
    }
  }
  if (allPaths.length > 0) {
    const statCmd = allPaths.map(p => `stat -c %s '${p}' 2>/dev/null || echo 0`).join('; ');
    const statOutput = wp.ssh_exec(statCmd, { timeout: 60 * 1000 });
    for (const line of statOutput.split('\n')) {
      const size = parseInt(line.trim(), 10);
      if (!isNaN(size) && size > 0) {
        bytesDownloaded += size;
        filesDownloaded += 1;
      }
    }
  }

  return { filesDownloaded, bytesDownloaded, successIds, failures };
}

main().catch(err => {
  log.error(err.message);
  console.error(err.stack);
  process.exit(1);
});
