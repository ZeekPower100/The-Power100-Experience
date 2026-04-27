#!/usr/bin/env node
/**
 * Trigger the P100 → IC mirror hook for the 6 official contributor articles
 * so the new ic_author_contributor_id meta lands on the IC mirrors.
 *
 * Strategy: just call wp_update_post on each of the 6 — that fires save_post_post,
 * which fires our auto-mirror hook, which POSTs to IC.
 *
 * Verifies after by querying IC for the 6 ic_articles and reporting their
 * ic_author_contributor_id meta state.
 */
const { spawnSync } = require('child_process');

const SSH_P100 = 'runcloud@155.138.198.250';
const WP_P100  = '/home/runcloud/webapps/power100';
const SSH_IC   = 'runcloud@45.76.62.153';
const WP_IC    = '/home/runcloud/webapps/innercircle';

const POSTS = [297, 280, 257, 232, 243, 239];

function ssh(host, wp, phpCode) {
  const r = spawnSync('ssh', ['-o', 'BatchMode=yes', host, `cd ${wp} && wp eval-file -`], {
    input: '<?php\n' + phpCode,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`ssh failed (${host}): ${r.stderr}`);
  return r.stdout;
}

(async () => {
  console.log('[sync] Re-triggering save_post_post on 6 P100 articles to fire IC mirror...');
  const triggerPhp = POSTS.map(id => `wp_update_post(['ID' => ${id}]); echo "fired_${id}\\n";`).join('\n');
  console.log(ssh(SSH_P100, WP_P100, triggerPhp).trim());

  console.log('\n[sync] Waiting 4s for IC writes to land (fire-and-forget hook)...');
  await new Promise(r => setTimeout(r, 4000));

  console.log('\n[sync] Verifying IC mirror state for the 6 articles...');
  const verifyPhp = `
$source_ids = [${POSTS.join(',')}];
foreach ($source_ids as $sid) {
    $found = get_posts([
        'post_type'      => 'ic_article',
        'meta_key'       => '_p100_source_id',
        'meta_value'     => $sid,
        'posts_per_page' => 1,
        'fields'         => 'ids',
        'post_status'    => ['publish','draft'],
    ]);
    if (empty($found)) {
        echo "P100=$sid → IC: NOT_FOUND\\n";
        continue;
    }
    $ic_id = $found[0];
    $contrib_id = (int) get_post_meta($ic_id, 'ic_author_contributor_id', true);
    $type       = (string) get_post_meta($ic_id, 'ic_author_type', true);
    $pending    = (int) get_post_meta($ic_id, 'ic_author_p100_pending', true);
    $contrib_name = $contrib_id ? get_the_title($contrib_id) : '(none)';
    echo "P100=$sid → IC=$ic_id  type=$type  contrib=$contrib_id ($contrib_name)  pending=$pending\\n";
}
`;
  console.log(ssh(SSH_IC, WP_IC, verifyPhp).trim());

  console.log('\n[sync] ✓ Done.');
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
