#!/usr/bin/env node
/**
 * Apply Drive-folder source-of-truth article attribution on P100.
 *
 * Drive truth (folder 1d9ChSru3Drx-Mww6i2SAwAjYdjJWPS0F):
 *   Mike Vaughn (197)        → post 297
 *   Caleb Nelson (194)       → post 280
 *   Gina Ruiz Sullivan (90)  → post 257
 *   Greg Cummings (180)      → post 232
 *   James Freeman (200)      → post 243
 *   Brian McCauley (1352)    → post 239
 *
 * For these 6 posts: pr_author_type='ec', pr_author_ec=<lander_id>
 * For ALL OTHER published posts: pr_author_type='staff', clear pr_author_ec
 * (this wipes the earlier subject-detection backfill, which was authorship-unreliable)
 */
const { spawnSync } = require('child_process');

const SSH = 'runcloud@155.138.198.250';
const WP_PATH = '/home/runcloud/webapps/power100';

const OFFICIAL = [
  { post_id: 297, ec_id: 197,  contributor: 'Mike Vaughn' },
  { post_id: 280, ec_id: 194,  contributor: 'Caleb Nelson' },
  { post_id: 257, ec_id: 90,   contributor: 'Gina Ruiz Sullivan' },
  { post_id: 232, ec_id: 180,  contributor: 'Greg Cummings' },
  { post_id: 243, ec_id: 200,  contributor: 'James Freeman' },
  { post_id: 239, ec_id: 1352, contributor: 'Brian McCauley' },
];

function ssh(phpCode) {
  const r = spawnSync('ssh', ['-o', 'BatchMode=yes', SSH, `cd ${WP_PATH} && wp eval-file -`], {
    input: '<?php\n' + phpCode,
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`ssh failed: ${r.stderr}`);
  return r.stdout;
}

(async () => {
  // ── Step 1: official attributions ──────────────────────────────────────────
  const officialIds = OFFICIAL.map(o => o.post_id).join(',');
  const officialWrites = OFFICIAL.map(o =>
    `update_post_meta(${o.post_id}, 'pr_author_ec', ${o.ec_id});\n` +
    `update_post_meta(${o.post_id}, 'pr_author_type', 'ec');`
  ).join('\n');

  console.log(`[apply] Writing ${OFFICIAL.length} official attributions + flipping all others to staff...`);

  const phpScript = `
${officialWrites}

// Flip everything else to staff: clear pr_author_ec, set pr_author_type='staff'
$official = [${officialIds}];
$all = get_posts(['post_type'=>'post','post_status'=>'publish','posts_per_page'=>-1,'fields'=>'ids']);
$flipped = 0;
$cleared_ec = 0;
foreach ($all as $pid) {
    if (in_array($pid, $official, true)) continue;
    $had_ec = (int) get_post_meta($pid, 'pr_author_ec', true);
    if ($had_ec > 0) {
        delete_post_meta($pid, 'pr_author_ec');
        $cleared_ec++;
    }
    $cur_type = (string) get_post_meta($pid, 'pr_author_type', true);
    if ($cur_type !== 'staff') {
        update_post_meta($pid, 'pr_author_type', 'staff');
        $flipped++;
    }
}
echo "OFFICIAL_WRITTEN\\t" . count($official) . "\\n";
echo "FLIPPED_TO_STAFF\\t" . $flipped . "\\n";
echo "CLEARED_EC_REFS\\t" . $cleared_ec . "\\n";

// Verification: pull current state for the 6 official + summary stats
echo "\\n--- VERIFICATION ---\\n";
foreach ([${officialIds}] as $pid) {
    $ec = (int) get_post_meta($pid, 'pr_author_ec', true);
    $tp = (string) get_post_meta($pid, 'pr_author_type', true);
    $tt = get_the_title($pid);
    echo "$pid\\tec=$ec\\ttype=$tp\\t" . substr($tt, 0, 60) . "\\n";
}
echo "\\n--- TYPE BREAKDOWN (all 283 posts) ---\\n";
$by_type = ['ec'=>0, 'staff'=>0, 'other'=>0];
foreach ($all as $pid) {
    $t = (string) get_post_meta($pid, 'pr_author_type', true);
    if ($t === 'ec' || $t === 'staff') $by_type[$t]++;
    else $by_type['other']++;
}
foreach ($by_type as $k => $v) echo "$k\\t$v\\n";
`;

  const out = ssh(phpScript);
  console.log(out.trim());
  console.log('\n[apply] ✓ Drive-folder attribution applied.');
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
