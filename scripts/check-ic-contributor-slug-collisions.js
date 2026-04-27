#!/usr/bin/env node
/**
 * Dry-run: check for slug collisions if we drop -contributor / -expert-contributor
 * suffixes from all ic_contributor posts on IC.
 */
const { spawnSync } = require('child_process');
const SSH = 'runcloud@45.76.62.153';
const WP  = '/home/runcloud/webapps/innercircle';

const php = `
$rows = get_posts(['post_type'=>'ic_contributor','post_status'=>['publish','draft','pending','private'],'posts_per_page'=>-1,'fields'=>'ids']);
$by_naked = [];
foreach ($rows as $id) {
    $slug = get_post_field('post_name', $id);
    $naked = preg_replace('/-(expert-contributor|contributor)$/', '', $slug);
    $by_naked[$naked][] = $id . ':' . $slug;
}
$collisions = 0;
foreach ($by_naked as $naked => $list) {
    if (count($list) > 1) {
        echo "COLLISION\\t$naked\\t" . implode(' | ', $list) . "\\n";
        $collisions++;
    }
}
echo "TOTAL_POSTS\\t" . count($rows) . "\\n";
echo "TOTAL_NAKED\\t" . count($by_naked) . "\\n";
echo "COLLISIONS\\t$collisions\\n";
`;

const r = spawnSync('ssh', ['-o','BatchMode=yes', SSH, `cd ${WP} && wp eval-file -`], {
  input: '<?php\n' + php,
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024,
});
if (r.status !== 0) { console.error(r.stderr); process.exit(1); }
console.log(r.stdout);
