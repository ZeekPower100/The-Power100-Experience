#!/usr/bin/env node
/**
 * Scrape the public HTML of all ranked CEO landers from old power100.io.
 *
 * The CEO landers are stored in a WordPress CPT that's NOT exposed via REST,
 * so we have to fetch the public-facing HTML directly. Reads the URL list from
 * state/ceo-lander-urls.json (extracted from cached national-power-rankings pages).
 *
 * Defense layers (same as SafeRestClient pattern):
 *   1. Polite pacing — 3 sec between requests by default
 *   2. Real Chrome browser User-Agent + matching browser headers
 *   3. Save-after-each — every successful fetch is persisted to disk immediately
 *   4. Hard-stop on ANY non-success response — protects IP reputation
 *   5. Resume support — skips slugs already in cache
 *
 * Run from local Windows machine (residential IP), not from Vultr.
 *
 * Usage:
 *   node fetch-ceo-landers-html.js                # full run, 3 sec pacing
 *   node fetch-ceo-landers-html.js --delay 5000   # custom pacing
 *   node fetch-ceo-landers-html.js --resume       # default; skip already-cached
 *   node fetch-ceo-landers-html.js --limit 5      # smoke test first
 *
 * Output:
 *   state/ceo-lander-html-cache/{slug}.html   — raw HTML for each lander
 *   state/ceo-lander-manifest.json            — manifest with original→canonical URL map + sizes
 */
const fs = require('fs');
const path = require('path');
const log = require('./lib/logger');

const ARGS = process.argv.slice(2);
const DELAY_IDX = ARGS.indexOf('--delay');
const DELAY_MS = DELAY_IDX >= 0 ? parseInt(ARGS[DELAY_IDX + 1], 10) : 3000;
const LIMIT_IDX = ARGS.indexOf('--limit');
const LIMIT = LIMIT_IDX >= 0 ? parseInt(ARGS[LIMIT_IDX + 1], 10) : null;

const STATE_DIR = path.join(__dirname, 'state');
const URL_LIST = path.join(STATE_DIR, 'ceo-lander-urls.json');
const HTML_DIR = path.join(STATE_DIR, 'ceo-lander-html-cache');
const MANIFEST = path.join(STATE_DIR, 'ceo-lander-manifest.json');

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Sec-Ch-Ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function urlToSlug(url) {
  return url.replace('https://power100.io/', '').replace(/\/$/, '').replace(/[^a-zA-Z0-9-_]/g, '_');
}

async function main() {
  log.header(`CEO Lander HTML Scraper (${DELAY_MS}ms pacing)`);

  if (!fs.existsSync(URL_LIST)) {
    throw new Error(`URL list not found: ${URL_LIST}`);
  }

  const urls = JSON.parse(fs.readFileSync(URL_LIST, 'utf8'));
  log.info(`Loaded ${urls.length} URLs from ${URL_LIST}`);

  fs.mkdirSync(HTML_DIR, { recursive: true });

  // Load existing manifest if any (for resume)
  let manifest = { generated_at: new Date().toISOString(), entries: {}, failures: [] };
  if (fs.existsSync(MANIFEST)) {
    try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch (_) {}
  }

  const targets = LIMIT ? urls.slice(0, LIMIT) : urls;
  const progress = new log.Progress('CEO landers', targets.length);

  let saved = 0, skipped = 0, failed = 0, totalBytes = 0;

  for (const url of targets) {
    const slug = urlToSlug(url);
    const targetFile = path.join(HTML_DIR, slug + '.html');

    // Resume — skip if already fetched
    if (fs.existsSync(targetFile)) {
      skipped++;
      progress.tick();
      continue;
    }

    // Pace
    if (saved > 0 || failed > 0) {
      await sleep(DELAY_MS);
    }

    try {
      const resp = await fetch(url, {
        headers: BROWSER_HEADERS,
        redirect: 'follow',
      });

      if (!resp.ok) {
        const body = await resp.text().catch(() => '');
        manifest.failures.push({ url, status: resp.status, body_preview: body.slice(0, 200) });

        // 404 = dead URL (lander was deleted/unpublished). Log and continue.
        // 403/429/503 = real bot signals. STOP HARD.
        if (resp.status === 404) {
          log.warn(`  404 (dead URL): ${url}`);
          failed++;
          progress.tick();
          continue;
        }

        fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
        throw new Error(
          `🛑 SAFETY HALT: HTTP ${resp.status} on ${url}\n` +
          `This is a likely Cloudflare bot challenge or rate limit. Stopping immediately.\n` +
          `Persisted manifest with ${Object.keys(manifest.entries).length} successful entries before halt.`
        );
      }

      const html = await resp.text();
      fs.writeFileSync(targetFile, html);
      totalBytes += html.length;

      manifest.entries[url] = {
        slug,
        canonical_url: resp.url,
        was_redirected: resp.url !== url,
        bytes: html.length,
        fetched_at: new Date().toISOString(),
      };

      saved++;
      progress.tick();

      // Persist manifest periodically (every 10 saves) so resume works
      if (saved % 10 === 0) {
        fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
      }
    } catch (err) {
      failed++;
      log.error(`Failed: ${url}: ${err.message.split('\n')[0]}`);
      if (err.message.includes('SAFETY HALT')) {
        throw err;  // re-throw to halt the script
      }
      progress.tick();
    }
  }

  // Final manifest persist
  fs.writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2));
  progress.done(`saved=${saved} skipped=${skipped} failed=${failed} bytes=${(totalBytes / 1024 / 1024).toFixed(1)}MB`);

  log.header('Complete');
  log.info(`Saved:       ${saved}`);
  log.info(`Skipped:     ${skipped} (already in cache)`);
  log.info(`Failed:      ${failed}`);
  log.info(`Total HTML:  ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
  log.info(`Manifest:    ${MANIFEST}`);
  log.info(`HTML cache:  ${HTML_DIR}`);

  // Quick redirect summary
  const redirectCount = Object.values(manifest.entries).filter(e => e.was_redirected).length;
  if (redirectCount > 0) {
    log.info(`URLs that redirected: ${redirectCount}`);
  }
}

main().catch(err => {
  log.error(err.message);
  process.exit(1);
});
