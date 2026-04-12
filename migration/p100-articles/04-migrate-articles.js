#!/usr/bin/env node
/**
 * Phase C: Migrate articles from old power100.io to the new P100 site.
 *
 * For each old article:
 *   1. Fetch full post via old-site REST API (read auth)
 *   2. Pipe content.rendered through extract-article-fields.php → JSON with subtitle/youtube/images/faq/cleaned_body
 *   3. Build upsert spec (title, slug, dates, content, ACF fields)
 *   4. Pipe spec into upsert-article.php via `wp eval-file` → creates or updates post
 *   5. Persist progress (idempotency key = `_p100_old_post_id` post meta)
 *
 * Usage:
 *   node 04-migrate-articles.js --dry-run                # No upserts, just show what would happen
 *   node 04-migrate-articles.js --post 28281             # Single article (by old-site ID)
 *   node 04-migrate-articles.js --sample 3               # First 3 articles
 *   node 04-migrate-articles.js                          # Full migration
 *   node 04-migrate-articles.js --resume                 # Skip articles already in progress state
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const config = require('./config');
const { RestClient } = require('./lib/rest-client');
const { WpCli } = require('./lib/wp-cli');
const log = require('./lib/logger');

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const POST_IDX = ARGS.indexOf('--post');
const POST_FILTER = POST_IDX >= 0 ? parseInt(ARGS[POST_IDX + 1], 10) : null;
const SAMPLE_IDX = ARGS.indexOf('--sample');
const SAMPLE_LIMIT = SAMPLE_IDX >= 0 ? parseInt(ARGS[SAMPLE_IDX + 1], 10) : null;
const RESUME = ARGS.includes('--resume');
const CACHE_DIR_IDX = ARGS.indexOf('--cache-dir');
const CACHE_DIR = CACHE_DIR_IDX >= 0 ? ARGS[CACHE_DIR_IDX + 1] : null;
const FROM_CACHE = ARGS.includes('--from-cache');
// If --from-cache is set without --cache-dir, default to ./state/article-cache
const RESOLVED_CACHE_DIR = CACHE_DIR || (FROM_CACHE ? path.join(__dirname, 'state', 'article-cache') : null);

const SCRIPT_DIR = __dirname;
const EXTRACTOR = path.join(SCRIPT_DIR, 'extract-article-fields.php');
const UPSERTER  = path.join(SCRIPT_DIR, 'upsert-article.php');

async function main() {
  log.header(`Phase C: Article Migration${DRY_RUN ? ' (DRY RUN)' : ''}${POST_FILTER ? ` (POST ${POST_FILTER})` : ''}${SAMPLE_LIMIT ? ` (SAMPLE ${SAMPLE_LIMIT})` : ''}${RESOLVED_CACHE_DIR ? ' (FROM CACHE)' : ''}`);

  const client = RESOLVED_CACHE_DIR ? null : new RestClient();
  const wp = new WpCli();

  if (RESOLVED_CACHE_DIR) {
    if (!fs.existsSync(RESOLVED_CACHE_DIR)) {
      throw new Error(`Cache dir not found: ${RESOLVED_CACHE_DIR}`);
    }
    log.info(`Reading from local cache: ${RESOLVED_CACHE_DIR}`);
  }

  // Verify the PHP scripts exist (they should be alongside this JS file)
  if (!fs.existsSync(EXTRACTOR)) throw new Error(`Missing extractor: ${EXTRACTOR}`);
  if (!fs.existsSync(UPSERTER)) throw new Error(`Missing upserter: ${UPSERTER}`);

  // ── Load progress (for --resume) ──
  fs.mkdirSync(config.STATE.DIR, { recursive: true });
  let progress = { completed: [], failed: [], started_at: new Date().toISOString() };
  if (RESUME && fs.existsSync(config.STATE.ARTICLE_PROGRESS)) {
    progress = JSON.parse(fs.readFileSync(config.STATE.ARTICLE_PROGRESS, 'utf8'));
    log.info(`Resuming — already completed: ${progress.completed.length}`);
  }
  const completedSet = new Set(progress.completed);

  // ── Build the work list ──
  const itemsToProcess = [];

  if (POST_FILTER) {
    log.section(`1. Fetching single article (id=${POST_FILTER})`);
    const post = RESOLVED_CACHE_DIR
      ? loadFromCache(POST_FILTER)
      : await fetchFullPost(client, POST_FILTER);
    if (!post) {
      log.error(`Post ${POST_FILTER} not found ${RESOLVED_CACHE_DIR ? 'in cache' : 'on old site'}`);
      process.exit(1);
    }
    itemsToProcess.push(post);
  } else if (RESOLVED_CACHE_DIR) {
    log.section('1. Loading articles from cache');
    const files = fs.readdirSync(RESOLVED_CACHE_DIR).filter(f => f.endsWith('.json'));
    log.ok(`Cache files: ${files.length}`);
    for (const f of files) {
      const post = JSON.parse(fs.readFileSync(path.join(RESOLVED_CACHE_DIR, f), 'utf8'));
      if (completedSet.has(post.id)) continue;
      itemsToProcess.push(post);
      if (SAMPLE_LIMIT && itemsToProcess.length >= SAMPLE_LIMIT) break;
    }
    log.ok(`To process this run: ${itemsToProcess.length}`);
  } else {
    log.section('1. Counting articles on old site');
    const total = await client.count('/posts');
    log.ok(`Total articles: ${total}`);

    log.section('2. Fetching article list');
    let i = 0;
    for await (const stub of client.iterate('/posts', { fields: 'id,slug,date,title', perPage: 100 })) {
      if (completedSet.has(stub.id)) continue;
      itemsToProcess.push(stub);
      i++;
      if (SAMPLE_LIMIT && itemsToProcess.length >= SAMPLE_LIMIT) break;
    }
    log.ok(`To process this run: ${itemsToProcess.length}`);
  }

  // ── Process each ──
  log.section('3. Migrating articles');
  const progressBar = new log.Progress('Articles', itemsToProcess.length);

  let succeeded = 0;
  let failed = 0;
  let created = 0;
  let updated = 0;

  for (const stub of itemsToProcess) {
    try {
      // Fetch full post if we only have a stub (and not in cache mode)
      let post;
      if (stub.content) {
        post = stub;
      } else if (RESOLVED_CACHE_DIR) {
        post = loadFromCache(stub.id);
      } else {
        post = await fetchFullPost(client, stub.id);
      }
      if (!post) {
        throw new Error('full post fetch returned null');
      }

      // 1. Pipe content through PHP extractor
      const extracted = runExtractor(post.content.rendered);
      if (extracted.error) {
        throw new Error(`extractor error: ${extracted.error}`);
      }

      // 2. Build the upsert spec
      const spec = buildUpsertSpec(post, extracted);

      if (DRY_RUN) {
        log.info(`[DRY] would upsert id=${post.id} slug=${post.slug.slice(0,60)} subtitle="${(extracted.subtitle||'').slice(0,60)}" yt=${extracted.youtube_url ? 'yes' : 'no'} images=${extracted.images.length} faq=${extracted.faq.length}`);
        progressBar.tick();
        continue;
      }

      // 3. Pipe spec into the WP upsert helper via wp eval-file
      const result = runUpserter(spec, wp);
      if (!result.ok) {
        throw new Error(`upsert error: ${result.error || JSON.stringify(result)}`);
      }

      if (result.action === 'create') created++;
      else updated++;

      if (!result.slug_match) {
        log.warn(`  slug mismatch on post ${post.id}: expected="${post.slug}" got="${result.slug_set}"`);
      }
      if ((result.fields_failed || []).length > 0) {
        log.warn(`  fields failed on post ${post.id}: ${result.fields_failed.join(', ')}`);
      }

      progress.completed.push(post.id);
      succeeded++;

      // Persist after every successful article
      fs.writeFileSync(config.STATE.ARTICLE_PROGRESS, JSON.stringify(progress, null, 2));
      progressBar.tick();
    } catch (err) {
      failed++;
      progress.failed.push({ id: stub.id, slug: stub.slug, error: err.message });
      log.error(`Failed #${stub.id}: ${err.message}`);
      progressBar.tick();
    }
  }

  fs.writeFileSync(config.STATE.ARTICLE_PROGRESS, JSON.stringify(progress, null, 2));
  progressBar.done(`${succeeded} ok (${created} created, ${updated} updated)`);

  log.header('Phase C complete');
  log.info(`Succeeded: ${succeeded}`);
  log.info(`  Created:  ${created}`);
  log.info(`  Updated:  ${updated}`);
  log.info(`Failed:    ${failed}`);
  if (failed > 0) log.warn('See state/article-progress.json failed[] for details');
}

/**
 * Fetch a single full post from the old site by ID.
 * Returns null on 404.
 */
async function fetchFullPost(client, id) {
  return await client.getById('/posts', id, {
    fields: 'id,slug,date,date_gmt,title,content,excerpt,categories,author',
  });
}

/**
 * Load a single full post from the local cache directory.
 * Returns null if the cache file doesn't exist.
 */
function loadFromCache(id) {
  const file = path.join(RESOLVED_CACHE_DIR, `${id}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/**
 * Run extract-article-fields.php with the article HTML on stdin.
 * Returns the parsed JSON.
 */
function runExtractor(html) {
  const stdout = execFileSync('php', [EXTRACTOR], {
    input: html,
    encoding: 'utf8',
    maxBuffer: 100 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return JSON.parse(stdout);
}

/**
 * Build the upsert spec from old post + extracted fields.
 */
function buildUpsertSpec(post, extracted) {
  // WordPress REST returns title.rendered with HTML entities decoded by the client,
  // but for safety we decode common ones.
  const title = decodeEntities(post.title.rendered);

  // The slug from REST is URL-encoded (`%e2%80%91` for U+2011). Decode to the raw char first.
  const rawSlug = decodeURIComponent(post.slug);
  // Sanitize to ASCII — the new WP install's URL routing can't resolve non-ASCII slugs
  // even when stored byte-for-byte in the DB. We track the original slug as _p100_old_slug
  // post meta so a redirect map can be generated for nginx before DNS cutover.
  const slug = sanitizeSlugToAscii(rawSlug);

  // Old site dates are local time (no timezone). REST also exposes date_gmt.
  const date = post.date;
  const date_gmt = post.date_gmt || post.date;

  return {
    old_post_id: post.id,
    old_slug: rawSlug,                // RAW original slug — tracked for redirect map generation
    title,
    slug,                              // ASCII-sanitized slug — what WP actually routes to
    date,
    date_gmt,
    post_content: extracted.cleaned_body,
    post_status: 'publish',
    // Categories: skip for first pass — old site has everything in Uncategorized.
    // Phase D or a later manual pass will categorize.
    categories: [],
    fields: {
      pr_subtitle:        extracted.subtitle,
      pr_company_label:   null,                      // Defer — needs author/company resolution
      pr_youtube_url:     extracted.youtube_url,
      pr_video_thumbnail: extracted.video_thumbnail, // URL string (template handles)
      pr_images:          [],                         // Defer — needs WP attachment IDs (Phase B+)
      pr_image_1_caption: extracted.images[0]?.caption || null,
      pr_image_2_caption: extracted.images[1]?.caption || null,
      pr_image_3_caption: extracted.images[2]?.caption || null,
      pr_faq:             extracted.faq,             // ACF repeater
      pr_author_type:     'staff',                    // Defer — author resolution comes later
      pr_author_name:     'Power100 Staff',
      pr_author_ec:       null,
      pr_author_photo:    null,
    },
  };
}

/**
 * Pipe spec JSON into upsert-article.php via wp eval-file.
 * Returns the parsed JSON result.
 */
function runUpserter(spec, wp) {
  const json = JSON.stringify(spec);

  // We pipe the spec via stdin, but `wp eval-file` doesn't natively pass stdin to the script.
  // Workaround: write the spec to a temp file on the server, then run wp eval-file that reads it.
  // For LOCAL_MODE, the temp file is local. For SSH mode, we'd need to scp it first.
  // Since this script runs on Vultr (LOCAL_MODE=1), we just write to a local temp file.

  const tmpFile = path.join(config.STATE.DIR, `upsert-spec-${spec.old_post_id}.json`);
  fs.writeFileSync(tmpFile, json);

  try {
    // Pipe spec file to wp eval-file, and cd into the WordPress directory first
    // (wp-cli refuses to run outside a WP install).
    const cmd = `cd ${shellQuote(config.NEW_SITE.WP_PATH)} && cat ${shellQuote(tmpFile)} | wp eval-file ${shellQuote(UPSERTER)}`;
    const stdout = wp.ssh_exec(cmd, { timeout: 60000 });
    // Take just the LAST JSON line (in case wp-cli prints any preamble)
    const lastLine = stdout.split('\n').filter(Boolean).pop();
    return JSON.parse(lastLine);
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  }
}

function shellQuote(s) {
  return `'${String(s).replace(/'/g, "'\\''")}'`;
}

/**
 * Sanitize a slug to ASCII so the new WP install can route to it.
 * Replaces common non-ASCII chars with sensible ASCII equivalents.
 *
 * Why: even when post_name is stored byte-for-byte via direct $wpdb writes,
 * WP's URL routing layer can't resolve non-ASCII slugs on the new site
 * (verified 2026-04-10 with U+2011 non-breaking hyphen). The closest ASCII
 * variant routes correctly. The original raw slug is preserved as
 * _p100_old_slug post meta so we can generate a redirect map.
 */
function sanitizeSlugToAscii(slug) {
  return slug
    .replace(/\u2011/g, '-')                       // non-breaking hyphen
    .replace(/[\u2010\u2012\u2013\u2014\u2015]/g, '-') // hyphen, figure dash, en dash, em dash, horizontal bar
    .replace(/[\u2018\u2019]/g, '')                // curly single quotes
    .replace(/[\u201c\u201d]/g, '')                // curly double quotes
    .replace(/[\u2026]/g, '')                      // ellipsis
    .replace(/[\u00a0]/g, '-')                     // non-breaking space
    .replace(/[^a-z0-9-]/gi, '')                   // strip remaining non-ASCII / non-slug chars
    .replace(/-+/g, '-')                           // collapse runs of dashes
    .replace(/^-+|-+$/g, '');                      // trim leading/trailing dashes
}

function decodeEntities(s) {
  if (!s) return '';
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8216;/g, '\u2018')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8212;/g, '\u2014')
    .replace(/&#8220;/g, '\u201c')
    .replace(/&#8221;/g, '\u201d')
    .replace(/&#8230;/g, '\u2026')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, '\u00a0');
}

main().catch(err => {
  log.error(err.message);
  console.error(err.stack);
  process.exit(1);
});
