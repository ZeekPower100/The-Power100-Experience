#!/usr/bin/env node
/**
 * Fetch all 283 articles from the old power100.io site via REST API
 * and save each as a local JSON file. Use this when running on a network
 * Cloudflare hasn't blocked (e.g., local Windows machine).
 *
 * Output: state/article-cache/{old_id}.json — full post objects
 *
 * Then SCP the cache dir to Vultr and run Phase C with --from-cache.
 *
 * Usage:
 *   node fetch-all-articles.js
 *   node fetch-all-articles.js --resume   # skip files already in cache
 */
const fs = require('fs');
const path = require('path');
const config = require('./config');
const { RestClient } = require('./lib/rest-client');
const log = require('./lib/logger');

const RESUME = process.argv.includes('--resume');
const CACHE_DIR = path.join(config.STATE.DIR, 'article-cache');

async function main() {
  log.header('Fetch All Old Articles → Local Cache');

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  const client = new RestClient();

  log.section('1. Counting old-site posts');
  const total = await client.count('/posts');
  log.ok(`Total: ${total}`);

  log.section('2. Fetching full posts (paginated)');
  const progress = new log.Progress('Articles', total);

  let saved = 0;
  let skipped = 0;
  let failed = 0;

  for await (const post of client.iterate('/posts', {
    fields: 'id,slug,date,date_gmt,title,content,excerpt,categories,author',
    perPage: 50,
    onPage: ({ page, totalPages }) => log.info(`  page ${page}/${totalPages}`),
  })) {
    const target = path.join(CACHE_DIR, `${post.id}.json`);
    if (RESUME && fs.existsSync(target)) {
      skipped++;
      progress.tick();
      continue;
    }
    try {
      fs.writeFileSync(target, JSON.stringify(post));
      saved++;
    } catch (err) {
      failed++;
      log.error(`Failed to save ${post.id}: ${err.message}`);
    }
    progress.tick();
  }

  progress.done(`saved=${saved} skipped=${skipped} failed=${failed}`);

  log.header('Cache complete');
  log.info(`Cache dir:  ${CACHE_DIR}`);
  log.info(`Saved:      ${saved}`);
  log.info(`Skipped:    ${skipped}`);
  log.info(`Failed:     ${failed}`);
  log.info('');
  log.info('Next steps:');
  log.info('  1. SCP cache to Vultr:');
  log.info('     scp -r migration/p100-articles/state/article-cache runcloud@155.138.198.250:~/migration/p100-articles/state/');
  log.info('  2. Run Phase C with --from-cache flag (after orchestrator update)');
}

main().catch(err => {
  log.error(err.message);
  console.error(err.stack);
  process.exit(1);
});
