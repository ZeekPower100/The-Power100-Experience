#!/usr/bin/env node
/**
 * Bulk-rename all ic_contributor post slugs: drop trailing
 * `-contributor` / `-expert-contributor` suffix.
 *
 * Idempotent. Safe to re-run.
 *
 * After this runs, the new contributor-routing.php emits canonical URLs at:
 *   /contributor/{naked}/         (for non-EC)
 *   /expert-contributor/{naked}/  (for EC)
 *
 * The old `-contributor` / `-expert-contributor` suffix slugs that lived under
 * /expert-contributor/ continue to work via the 404-recovery 301 in routing.
 */
const { spawnSync } = require('child_process');
const SSH = 'runcloud@45.76.62.153';
const WP  = '/home/runcloud/webapps/innercircle';

const php = `
$rows = get_posts(['post_type'=>'ic_contributor','post_status'=>['publish','draft','pending','private'],'posts_per_page'=>-1,'fields'=>'ids']);
$renamed = 0; $kept = 0; $errs = 0;
foreach ($rows as $id) {
    $cur = get_post_field('post_name', $id);
    $naked = preg_replace('/-(expert-contributor|contributor)$/', '', $cur);
    if ($naked === $cur) { $kept++; continue; }
    $r = wp_update_post(['ID' => $id, 'post_name' => $naked], true);
    if (is_wp_error($r)) {
        echo "ERR\\t$id\\t$cur\\t" . $r->get_error_message() . "\\n";
        $errs++;
    } else {
        $renamed++;
    }
}
echo "RENAMED\\t$renamed\\n";
echo "KEPT\\t$kept\\n";
echo "ERRORS\\t$errs\\n";
`;

const r = spawnSync('ssh', ['-o','BatchMode=yes', SSH, `cd ${WP} && wp eval-file -`], {
  input: '<?php\n' + php,
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024,
});
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
console.log(r.stdout);
