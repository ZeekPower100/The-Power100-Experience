#!/usr/bin/env node
/**
 * Backfill `pr_author_ec` + `pr_author_type` on the 283 P100 articles.
 *
 * Strategy:
 *   1. Bulk-dump every P100 post (id, title, post_content) via wp eval-file.
 *   2. For each post, parse the byline from the first 800 chars of content
 *      (typical pattern: "By {Name}, {Title} at {Company}" or "By {Name}").
 *   3. Match the parsed name against ic_contributor / EC pages on P100 (we have
 *      152 contributor landers — that's the lookup universe). Match by exact
 *      name → fall back to last-name match.
 *   4. If matched: PATCH pr_author_type='ec' + pr_author_ec=<page_id> on the post.
 *   5. If not matched: leave alone (will fall to staff backfill in #153).
 *
 * Idempotent: skips posts that already have pr_author_ec set.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', 'tpe-backend', '.env.production') });
const { spawnSync } = require('child_process');

const SSH = 'runcloud@155.138.198.250';
const WP_PATH = '/home/runcloud/webapps/power100';

function sshPipePhp(phpCode) {
  const r = spawnSync('ssh', ['-o', 'BatchMode=yes', SSH, `cd ${WP_PATH} && wp eval-file -`], {
    input: '<?php\n' + phpCode,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`ssh wp eval-file failed (${r.status}): ${r.stderr}`);
  return r.stdout;
}

// Subject-detection: P100 articles don't use explicit "By X" bylines — the
// featured contributor is mentioned in prose ("...under John DePaola, Director
// of Marketing at Long Home..."). So we scan title + first 800 chars for any
// of the 151 known contributor full-names. Single unique match wins.
function detectSubject(article, landers) {
  const haystack = (article.title + ' ' + article.content_head)
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, ' ');
  const hits = new Set();
  for (const l of landers) {
    if (!l.name || l.name.length < 4) continue;
    // Word-boundary match on full name (case-insensitive). Escape regex meta chars.
    const safe = l.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('\\b' + safe + '\\b', 'i');
    if (re.test(haystack)) hits.add(l.id);
  }
  if (hits.size === 1) return { id: [...hits][0], confidence: 'unique-name' };
  if (hits.size > 1)   return { ambiguous: [...hits] };
  return null;
}

(async () => {
  console.log('[backfill] Bulk-dumping articles + contributor lookup table...');
  // Output one TSV row per record to bulletproof against JSON-breaking
  // characters in post_content (Elementor inline JSON, smart quotes, etc.).
  // Schema: TYPE\tID\tNAME_OR_TITLE\tBASE64_CONTENT_HEAD
  const dumpPhp = `
$posts = get_posts(['post_type' => 'post', 'post_status' => 'publish', 'posts_per_page' => -1, 'fields' => 'ids']);
foreach ($posts as $id) {
    $existing = (int) get_post_meta($id, 'pr_author_ec', true);
    if ($existing > 0) continue;
    $p = get_post($id);
    $head = mb_substr(strval($p->post_content), 0, 800);
    echo "POST\\t" . $id . "\\t" . str_replace(["\\t","\\n","\\r"], ' ', $p->post_title) . "\\t" . base64_encode($head) . "\\n";
}

$pages = get_posts([
    'post_type' => 'page', 'post_status' => 'publish', 'posts_per_page' => -1,
    'fields' => 'ids',
    'meta_query' => [['key' => '_wp_page_template', 'value' => 'page-expert-contributor.php']],
]);
foreach ($pages as $pid) {
    $title = get_the_title($pid);
    // JS will strip "Expert Contributor" suffix — keep raw title here to avoid PHP escaping hell
    echo "LANDER\\t" . $pid . "\\t" . str_replace(["\\t","\\n","\\r"], ' ', $title) . "\\t\\n";
}
`;
  const stdout = sshPipePhp(dumpPhp);
  const data = { posts: [], landers: [] };
  for (const line of stdout.split('\n')) {
    const parts = line.split('\t');
    if (parts[0] === 'POST' && parts.length >= 4) {
      data.posts.push({
        id: parseInt(parts[1], 10),
        title: parts[2],
        content_head: Buffer.from(parts[3], 'base64').toString('utf8'),
      });
    } else if (parts[0] === 'LANDER' && parts.length >= 3) {
      // Strip "Expert Contributor" suffix (with or without em-dash separator) in JS — avoids PHP escaping
      const cleanName = parts[2]
        .replace(/\s*[—-]\s*Expert Contributor\s*$/i, '')
        .replace(/\s+Expert Contributor\s*$/i, '')
        .trim();
      data.landers.push({ id: parseInt(parts[1], 10), name: cleanName });
    }
  }
  console.log(`[backfill] ${data.posts.length} unattributed articles, ${data.landers.length} contributor landers in lookup table\n`);

  let matched = 0, ambiguous = 0, no_match = 0;
  const updates = [];   // [{ post_id, ec_page_id }]
  const ambiguousList = [];
  const unmatchedList = [];

  for (const p of data.posts) {
    const detected = detectSubject(p, data.landers);
    if (detected && detected.id) {
      updates.push({ post_id: p.id, ec_page_id: detected.id, title: p.title });
      matched++;
    } else if (detected && detected.ambiguous) {
      ambiguousList.push({ post_id: p.id, title: p.title, candidates: detected.ambiguous });
      ambiguous++;
    } else {
      unmatchedList.push({ post_id: p.id, title: p.title });
      no_match++;
    }
  }

  console.log(`[backfill] Match results: ${matched} unique-name matched, ${ambiguous} ambiguous (multiple contributors named), ${no_match} no contributor name found\n`);

  if (matched === 0) {
    console.log('Nothing to write. Done.');
    process.exit(0);
  }

  // Apply updates in one bulk SSH call
  console.log(`[backfill] Writing pr_author_ec + pr_author_type to ${matched} posts...`);
  const updateLines = updates.map(u =>
    `update_post_meta(${u.post_id}, 'pr_author_ec', ${u.ec_page_id}); ` +
    `update_post_meta(${u.post_id}, 'pr_author_type', 'ec');`
  ).join("\n");
  const writePhp = `
${updateLines}
echo "Wrote ${updates.length} attributions.\\n";
`;
  const writeOut = sshPipePhp(writePhp);
  console.log(writeOut.trim());

  console.log('\n========== Summary ==========');
  console.log(`Matched + written:           ${matched}`);
  console.log(`Ambiguous (multi-mention):   ${ambiguous}  → review queue`);
  console.log(`No contributor name found:   ${no_match}  → likely staff (#153) or NEW contributor not in system`);
  if (ambiguousList.length > 0) {
    console.log(`\nAmbiguous (first 10) — manual review needed:`);
    for (const a of ambiguousList.slice(0, 10)) {
      console.log(`  post ${a.post_id}  candidates=${JSON.stringify(a.candidates)}  title="${a.title.slice(0, 60)}"`);
    }
  }
  if (unmatchedList.length > 0) {
    console.log(`\nNo-match (first 10) — staff articles or new contributors:`);
    for (const u of unmatchedList.slice(0, 10)) {
      console.log(`  post ${u.post_id}  title="${u.title.slice(0, 70)}"`);
    }
  }
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
