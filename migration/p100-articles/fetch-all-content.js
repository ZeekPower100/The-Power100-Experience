#!/usr/bin/env node
/**
 * Generic content cacher for the OLD power100.io site.
 * Uses SafeRestClient (paced, browser-headered, hard-stops on errors).
 *
 * Caches each REST endpoint to a separate subdirectory of state/.
 * Resumable: skips files already in cache (per-record), so re-runs only fetch new items.
 *
 * Designed to be RUN FROM YOUR LOCAL WINDOWS MACHINE (residential IP).
 * Never run from Vultr — Vultr's IP is Cloudflare-blocked on power100.io.
 *
 * Usage:
 *   node fetch-all-content.js                     # Full run — fetch all configured endpoints
 *   node fetch-all-content.js --endpoint pages    # Just one endpoint
 *   node fetch-all-content.js --probe             # Probe-only: check what endpoints exist (1 call)
 *   node fetch-all-content.js --delay 5000        # Override pacing delay (default 3 sec)
 *
 * Output: state/{endpoint-slug}-cache/{id}.json
 */
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { SafeRestClient } = require('./lib/safe-rest-client');
const log = require('./lib/logger');

const ARGS = process.argv.slice(2);
const PROBE_ONLY = ARGS.includes('--probe');
const ENDPOINT_IDX = ARGS.indexOf('--endpoint');
const ENDPOINT_FILTER = ENDPOINT_IDX >= 0 ? ARGS[ENDPOINT_IDX + 1] : null;
const DELAY_IDX = ARGS.indexOf('--delay');
const DELAY_MS = DELAY_IDX >= 0 ? parseInt(ARGS[DELAY_IDX + 1], 10) : 3000;

// Endpoints to cache. Each becomes its own subdirectory under state/.
// Add more as you discover them via --probe.
const ENDPOINTS = [
  { name: 'pages',      path: '/pages',      cacheDir: 'pages-cache',      perPage: 50 },
  { name: 'media',      path: '/media',      cacheDir: 'media-meta-cache', perPage: 100 },
  { name: 'categories', path: '/categories', cacheDir: 'categories-cache', perPage: 100 },
  { name: 'tags',       path: '/tags',       cacheDir: 'tags-cache',       perPage: 100 },
  { name: 'users',      path: '/users',      cacheDir: 'users-cache',      perPage: 100 },
];

// Custom post types — populated dynamically via /types probe.
// Common candidates: ec_lander, ranked_ceo, partner, testimonial, custom_page
// We'll discover them at runtime instead of hardcoding.

async function main() {
  log.header(`Fetch All Content (paced, ${DELAY_MS}ms between requests)${PROBE_ONLY ? ' [PROBE ONLY]' : ''}`);

  const client = new SafeRestClient({ delayMs: DELAY_MS });

  // ── Step 1: PROBE — discover all REST-exposed post types ──
  log.section('1. Probing /types to discover available content types');
  const typesResult = await client.get('/types');
  const types = typesResult.data;
  log.ok(`Found ${Object.keys(types).length} REST-exposed post types`);

  fs.mkdirSync(config.STATE.DIR, { recursive: true });
  const typesFile = path.join(config.STATE.DIR, 'rest-types.json');
  fs.writeFileSync(typesFile, JSON.stringify(types, null, 2));
  log.ok(`Saved type list → ${typesFile}`);

  // Print summary
  for (const [slug, def] of Object.entries(types)) {
    const restBase = def.rest_base || slug;
    const restNamespace = def.rest_namespace || 'wp/v2';
    log.info(`  ${slug.padEnd(20)} → /${restNamespace}/${restBase}  (${def.name || 'unnamed'})`);
  }

  // Add any non-standard custom post types to the fetch list
  const standardTypes = new Set(['post', 'page', 'attachment', 'nav_menu_item', 'wp_block', 'wp_template', 'wp_template_part', 'wp_navigation', 'wp_global_styles', 'wp_font_family', 'wp_font_face']);
  for (const [slug, def] of Object.entries(types)) {
    if (standardTypes.has(slug)) continue;
    const restBase = def.rest_base || slug;
    const cacheDir = `${slug}-cache`;
    const alreadyListed = ENDPOINTS.find(e => e.path === `/${restBase}`);
    if (!alreadyListed) {
      ENDPOINTS.push({
        name: slug,
        path: `/${restBase}`,
        cacheDir,
        perPage: 50,
      });
      log.ok(`  ✓ Added custom post type: ${slug} → ${cacheDir}`);
    }
  }

  if (PROBE_ONLY) {
    log.header('PROBE complete');
    log.info(`Stats: ${JSON.stringify(client.stats())}`);
    log.info('Re-run without --probe to fetch all content');
    return;
  }

  // ── Step 2: Fetch each endpoint ──
  for (const endpoint of ENDPOINTS) {
    if (ENDPOINT_FILTER && endpoint.name !== ENDPOINT_FILTER) continue;

    log.section(`Fetching ${endpoint.name} → ${endpoint.cacheDir}/`);
    const cacheDir = path.join(config.STATE.DIR, endpoint.cacheDir);
    fs.mkdirSync(cacheDir, { recursive: true });

    // Get count first (single call)
    let totalItems = 0;
    let totalPages = 0;
    try {
      const countResult = await client.get(endpoint.path, { per_page: '1', page: '1' });
      totalItems = countResult.totalItems;
      totalPages = Math.ceil(totalItems / endpoint.perPage);
      log.ok(`  Total items: ${totalItems} (will paginate ${totalPages} pages of ${endpoint.perPage})`);
    } catch (err) {
      log.error(`  Failed to count ${endpoint.name}: ${err.message}`);
      throw err;
    }

    if (totalItems === 0) {
      log.info(`  Empty endpoint, skipping`);
      continue;
    }

    let saved = 0;
    let skipped = 0;
    const progress = new log.Progress(endpoint.name, totalItems);

    for (let page = 1; page <= totalPages; page++) {
      const result = await client.get(endpoint.path, { per_page: String(endpoint.perPage), page: String(page) });

      for (const item of result.data) {
        const target = path.join(cacheDir, `${item.id}.json`);
        if (fs.existsSync(target)) {
          skipped++;
          progress.tick();
          continue;
        }
        fs.writeFileSync(target, JSON.stringify(item));
        saved++;
        progress.tick();
      }
    }

    progress.done(`saved=${saved} skipped=${skipped}`);
    log.info(`  Stats: ${JSON.stringify(client.stats())}`);
  }

  log.header('Cache complete');
  log.info(`Total requests made: ${client.stats().requests_made}`);
  log.info('All endpoints cached. Safe to proceed with migration scripts.');
}

main().catch(err => {
  log.error(err.message);
  console.error(err.stack);
  process.exit(1);
});
