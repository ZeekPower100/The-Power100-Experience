#!/usr/bin/env node
/**
 * Match the 7 official contributor articles (from the Drive folder) against the
 * 283 articles on P100, and report current attribution state.
 *
 * Output for each article:
 *   - Drive title (target)
 *   - Matched P100 post id + actual title (or "NO MATCH")
 *   - Current pr_author_ec / pr_author_type values
 *   - Target EC/contributor lander id for that contributor
 *
 * Read-only diagnostic — no writes.
 */
const { spawnSync } = require('child_process');

const SSH = 'runcloud@155.138.198.250';
const WP_PATH = '/home/runcloud/webapps/power100';

// Drive truth: contributor name → expected article title fragment(s)
const TRUTH = [
  { contributor: 'Mike Vaughn',     fragments: ['Designing the Last Roof', 'Composite Slate and Shake'] },
  { contributor: 'Caleb Nelson',    fragments: ['Blueprint of a Winning Culture', 'Motivation into Momentum'] },
  { contributor: 'Gina Sullivan',   fragments: ['Culture as a Competitive Edge', 'Investing in People'] },
  { contributor: 'Greg Cummings',   fragments: ['Win GEO and AI Search', 'Modern-Day Gold Rush', 'Modern‑Day Gold Rush'] },
  { contributor: 'James Freeman',   fragments: ['Earn the Right to Grow', 'Discipline, Process, and Culture'] },
  { contributor: 'Brian McCauley',  fragments: ['Always Ask for the Sale'] },
];

function ssh(phpCode) {
  const r = spawnSync('ssh', ['-o', 'BatchMode=yes', SSH, `cd ${WP_PATH} && wp eval-file -`], {
    input: '<?php\n' + phpCode,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });
  if (r.status !== 0) throw new Error(`ssh failed: ${r.stderr}`);
  return r.stdout;
}

(async () => {
  console.log('[match] Pulling all 283 articles + all contributor landers...');

  const dump = ssh(`
$posts = get_posts(['post_type'=>'post','post_status'=>'publish','posts_per_page'=>-1,'fields'=>'ids']);
foreach ($posts as $id) {
    $t  = get_the_title($id);
    $ec = (int) get_post_meta($id, 'pr_author_ec', true);
    $tp = (string) get_post_meta($id, 'pr_author_type', true);
    echo "POST\\t$id\\t$ec\\t$tp\\t" . str_replace(["\\t","\\n","\\r"], ' ', $t) . "\\n";
}

$pages = get_posts([
    'post_type'=>'page','post_status'=>'publish','posts_per_page'=>-1,'fields'=>'ids',
    'meta_query'=>[['key'=>'_wp_page_template','value'=>'page-expert-contributor.php']],
]);
foreach ($pages as $pid) {
    echo "LANDER\\t$pid\\t" . str_replace(["\\t","\\n","\\r"], ' ', get_the_title($pid)) . "\\n";
}
`);

  const posts = [];
  const landers = [];
  for (const line of dump.split('\n')) {
    const p = line.split('\t');
    if (p[0] === 'POST' && p.length >= 5) {
      posts.push({ id: +p[1], ec: +p[2], type: p[3], title: p[4] });
    } else if (p[0] === 'LANDER' && p.length >= 3) {
      const cleanName = p[2]
        .replace(/\s*[—-]\s*Expert Contributor\s*$/i, '')
        .replace(/\s+Expert Contributor\s*$/i, '')
        .trim();
      landers.push({ id: +p[1], name: cleanName });
    }
  }
  console.log(`[match] ${posts.length} articles, ${landers.length} contributor landers\n`);

  // For each TRUTH row: find lander by name, find post by title fragment match
  const results = [];
  for (const t of TRUTH) {
    const lander = landers.find(l => l.name.toLowerCase() === t.contributor.toLowerCase());
    const matched = posts.filter(p => {
      const T = p.title.toLowerCase();
      return t.fragments.some(f => T.includes(f.toLowerCase()));
    });
    results.push({ ...t, lander, matched });
  }

  console.log('========== MATCH REPORT ==========\n');
  for (const r of results) {
    console.log(`▶ ${r.contributor}`);
    console.log(`  Lander: ${r.lander ? `id=${r.lander.id} (${r.lander.name})` : 'MISSING ❌'}`);
    if (r.matched.length === 0) {
      console.log(`  Article: NO MATCH ❌  (looked for: ${r.fragments.join(' | ')})`);
    } else {
      for (const m of r.matched) {
        const correct = r.lander && m.ec === r.lander.id ? '✓' : (m.ec === 0 ? '○ (unattributed)' : `✗ (currently ${m.ec})`);
        console.log(`  Article: id=${m.id}  type=${m.type || '(none)'}  attribution=${correct}  "${m.title.slice(0,80)}"`);
      }
    }
    console.log('');
  }

  // Summarize the action plan
  const actions = [];
  for (const r of results) {
    if (!r.lander) continue;
    for (const m of r.matched) {
      if (m.ec !== r.lander.id) {
        actions.push({ post_id: m.id, ec_id: r.lander.id, contributor: r.contributor, title: m.title });
      }
    }
  }
  console.log(`========== ACTION PLAN ==========`);
  console.log(`${actions.length} attribution writes needed:`);
  for (const a of actions) {
    console.log(`  POST ${a.post_id} → ec=${a.ec_id} (${a.contributor})  "${a.title.slice(0,60)}"`);
  }

  // Also: count posts that should be flipped to 'staff'
  const matchedIds = new Set();
  for (const r of results) for (const m of r.matched) matchedIds.add(m.id);
  const staffCandidates = posts.filter(p => !matchedIds.has(p.id) && p.type !== 'staff');
  console.log(`\n${staffCandidates.length} other articles will be flagged pr_author_type='staff' (currently '${[...new Set(posts.map(p=>p.type||'(none)'))]}')`);
})().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
