#!/usr/bin/env node
// One-shot backfill: tag every existing ic_content post with ic_function,
// and migrate the 27 posts mis-tagged with Sales/Marketing/Operations/CX
// under ic_pillar into the new ic_function taxonomy + a proper pillar.
//
// Runs in two phases:
//   --plan   Fetches posts, classifies via GPT-4o-mini, writes
//            scripts/ic-function-backfill-plan.jsonl. Safe to re-run.
//   --apply  Reads the plan file and builds a shell script of
//            `wp post term set` commands. Run that script via SSH
//            to actually mutate the live site.
//
// Usage:
//   OPENAI_API_KEY=sk-... node scripts/backfill-ic-function-taxonomy.js --plan
//   node scripts/backfill-ic-function-taxonomy.js --apply
//   ssh runcloud@45.76.62.153 "bash -s" < scripts/ic-function-backfill-apply.sh

const fs = require('fs');
const path = require('path');
const https = require('https');

const IC_BASE = 'https://innercircle.power100.io/wp-json';
const IC_API_KEY = '6463a09fe4c73631610df73c0390f09d50d6a08f6cb01481499326a9d6257222';

const PILLAR_SLUGS = ['growth', 'culture', 'community', 'innovation'];
const FUNCTION_SLUGS = ['sales', 'marketing', 'operations', 'customer-experience'];
const MIS_TAGGED_PILLARS = new Set(FUNCTION_SLUGS); // these show up in ic_pillar today but belong in ic_function

const PLAN_FILE = path.join(__dirname, 'ic-function-backfill-plan.jsonl');
const APPLY_FILE = path.join(__dirname, 'ic-function-backfill-apply.sh');
const DUMP_FILE = path.join(__dirname, 'ic-posts-dump.jsonl');

function fetchJson(url, { headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    https.get({
      hostname: u.hostname, path: u.pathname + u.search,
      headers: { 'X-IC-API-Key': IC_API_KEY, ...headers }
    }, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(body), headers: res.headers }); }
        catch { resolve({ status: res.statusCode, body, headers: res.headers }); }
      });
    }).on('error', reject);
  });
}

async function fetchAllPosts() {
  // Query with both current terms embedded
  const all = [];
  let page = 1;
  while (true) {
    const url = `${IC_BASE}/wp/v2/ic_content?per_page=100&page=${page}&_fields=id,title,excerpt,ic_pillar,ic_function,date`;
    const res = await fetchJson(url);
    if (res.status !== 200 || !Array.isArray(res.body)) {
      if (page === 1) throw new Error(`Failed to fetch posts: ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`);
      break;
    }
    if (res.body.length === 0) break;
    all.push(...res.body);
    const totalPages = parseInt(res.headers['x-wp-totalpages'] || '1', 10);
    if (page >= totalPages) break;
    page++;
  }
  return all;
}

async function fetchTermsById(taxonomy) {
  // Maps term_id → slug so we can decode ic_pillar / ic_function arrays.
  const url = `${IC_BASE}/wp/v2/${taxonomy}?per_page=50&_fields=id,slug,name`;
  const res = await fetchJson(url);
  if (res.status !== 200) throw new Error(`Failed to fetch ${taxonomy} terms: ${res.status}`);
  const map = {};
  for (const t of res.body) map[t.id] = { slug: t.slug, name: t.name };
  return map;
}

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function classify(openaiKey, { title, excerpt, takeaways, timestamps, speakers, needsPillar, needsFunction }) {
  // Single prompt asks for whatever's needed. GPT-4o-mini is fast + cheap.
  // Each taxonomy returns ARRAY of 1-2 slugs (primary first).
  const asks = [];
  if (needsPillar) asks.push('pillars: ARRAY of 1-2 values from [Growth, Culture, Community, Innovation] — the STRATEGIC LENS. Return just one unless there are 2+ strong takeaways genuinely addressing a different pillar.');
  if (needsFunction) asks.push('functions: ARRAY of 1-2 values from [Sales, Marketing, Operations, Customer Experience] — the BUSINESS FUNCTION. Return just one unless there are 2+ strong takeaways genuinely addressing a different function.');

  const contextLines = [];
  if (title) contextLines.push(`Title: ${title}`);
  if (excerpt) contextLines.push(`Excerpt: ${stripHtml(excerpt).slice(0, 300)}`);
  if (Array.isArray(speakers) && speakers.length) contextLines.push(`Speakers: ${speakers.join(', ')}`);
  if (Array.isArray(takeaways) && takeaways.length) contextLines.push(`Key takeaways:\n${takeaways.slice(0, 6).map((t, i) => `  ${i + 1}. ${t}`).join('\n')}`);
  if (Array.isArray(timestamps) && timestamps.length) contextLines.push(`Chapter labels:\n${timestamps.slice(0, 8).map((t, i) => `  ${i + 1}. ${t}`).join('\n')}`);

  const prompt = `Classify this Inner Circle video for a home-services contractor audience.

${contextLines.join('\n\n')}

Return ONLY a JSON object with these keys:
${asks.map((a) => `- ${a}`).join('\n')}

Classification guidance:
- Sales = revenue acquisition, closing, sales teams, sales processes, pipeline, selling to homeowners
- Marketing = lead generation, branding, content, demand gen, advertising, positioning
- Operations = running the business, scaling systems, delegation, leadership systems, financial management, process/quality
- Customer Experience = homeowner satisfaction, client journey, post-sale service, reputation, retention

Multi-tag rule (IMPORTANT — most videos should be multi-tag):
- For each value in the taxonomy, ask: "is there at least one takeaway, chapter label, or signal in this content that specifically addresses this bucket?"
- If YES → include it in the array. Order by which is most central (primary first).
- Return ONE value only if the content is genuinely single-topic (rare for IC videos).
- Cap at 2 values per taxonomy.

How to weigh signals:
- A takeaway saying "implement scalable sales systems" → counts for Sales.
- A takeaway saying "use AI to enhance marketing strategies" → counts for Marketing.
- A takeaway saying "foster company culture" → counts for Operations (people/culture systems live here unless the explicit pillar/function is about external customers).
- Generic "leadership and scaling" content → Operations (the default for general business management).
- Don't add a second tag for tangential mentions; only when there's a substantive takeaway/chapter on it.

Example outputs:
${needsPillar && needsFunction
  ? '  Single-topic: {"pillars": ["Growth"], "functions": ["Sales"]}\n  Multi-topic:  {"pillars": ["Growth", "Innovation"], "functions": ["Sales", "Operations"]}\n  Mixed:        {"pillars": ["Growth"], "functions": ["Sales", "Operations"]}'
  : needsPillar
  ? '  Single-topic: {"pillars": ["Growth"]}\n  Multi-topic:  {"pillars": ["Growth", "Innovation"]}'
  : '  Single-topic: {"functions": ["Sales"]}\n  Multi-topic:  {"functions": ["Sales", "Operations"]}\n  Mixed:        {"functions": ["Operations", "Sales"]}'}`;

  const body = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 80,
    temperature: 0.2
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        Authorization: `Bearer ${openaiKey}`
      }
    }, (res) => {
      let buf = '';
      res.on('data', (d) => buf += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(buf);
          if (!json.choices) return reject(new Error('OpenAI: ' + buf.slice(0, 300)));
          resolve(JSON.parse(json.choices[0].message.content));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function planMode() {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) { console.error('OPENAI_API_KEY required'); process.exit(1); }
  // --limit N stops after classifying N posts that need work (skips don't count).
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx > -1 ? parseInt(process.argv[limitIdx + 1], 10) : Infinity;
  if (limit !== Infinity) console.log(`DRY RUN: stopping after ${limit} classifications\n`);

  console.log('Loading IC post dump from ' + DUMP_FILE + '…');
  if (!fs.existsSync(DUMP_FILE)) {
    console.error('Dump file missing. Regenerate with:');
    console.error('  scp scripts/ic-post-dump.php runcloud@45.76.62.153:/tmp/');
    console.error('  ssh runcloud@45.76.62.153 "cd /home/runcloud/webapps/innercircle && wp eval-file /tmp/ic-post-dump.php > /tmp/ic-posts.jsonl"');
    console.error('  scp runcloud@45.76.62.153:/tmp/ic-posts.jsonl scripts/ic-posts-dump.jsonl');
    process.exit(1);
  }
  const posts = fs.readFileSync(DUMP_FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  console.log(`  → ${posts.length} posts`);

  const out = fs.createWriteStream(PLAN_FILE);
  let misTagged = 0, needsFuncOnly = 0, alreadyGood = 0, errors = 0;

  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const title = p.title || '';
    const excerpt = p.excerpt || '';
    const currentPillarSlugs = p.pillar_slugs || [];
    const currentFunctionSlugs = p.function_slugs || [];

    const misTaggedPillar = currentPillarSlugs.find((s) => MIS_TAGGED_PILLARS.has(s));
    const hasValidPillar = currentPillarSlugs.some((s) => PILLAR_SLUGS.includes(s));
    const hasFunction = currentFunctionSlugs.length > 0;

    const needsPillar = !hasValidPillar; // mis-tagged OR completely untagged
    const needsFunction = !hasFunction;
    const migrateOldPillarToFunction = !!misTaggedPillar && !hasFunction;

    if (!needsPillar && !needsFunction) {
      alreadyGood++;
      continue; // nothing to do
    }

    // If we're migrating a mis-tagged pillar into function, we already know the function slug.
    const aiNeedsFunction = needsFunction && !migrateOldPillarToFunction;

    let ai = {};
    try {
      if (needsPillar || aiNeedsFunction) {
        ai = await classify(openaiKey, {
          title, excerpt,
          takeaways: p.takeaways, timestamps: p.timestamps, speakers: p.speakers,
          needsPillar, needsFunction: aiNeedsFunction
        });
      }
    } catch (e) {
      console.error(`  ! [${p.id}] classify failed: ${e.message}`);
      errors++;
      continue;
    }

    // AI returns arrays (pillars / functions, 1-2 values each). Normalize to slugs.
    const toSlug = (s) => String(s).toLowerCase().replace(/\s+/g, '-');
    const aiPillars = Array.isArray(ai.pillars) ? ai.pillars : (ai.pillar ? [ai.pillar] : []);
    const aiFunctions = Array.isArray(ai.functions) ? ai.functions : (ai.function ? [ai.function] : []);

    const finalPillarSlugs = needsPillar
      ? (aiPillars.length ? aiPillars.map(toSlug).filter((s) => PILLAR_SLUGS.includes(s)).slice(0, 2) : ['growth'])
      : currentPillarSlugs.filter((s) => PILLAR_SLUGS.includes(s)).slice(0, 2);
    const finalFunctionSlugs = migrateOldPillarToFunction
      ? [misTaggedPillar]
      : (aiNeedsFunction
        ? (aiFunctions.length ? aiFunctions.map(toSlug).filter((s) => FUNCTION_SLUGS.includes(s)).slice(0, 2) : ['operations'])
        : currentFunctionSlugs.slice(0, 2));

    // Safety — never emit empty arrays
    const outPillars = finalPillarSlugs.length ? finalPillarSlugs : ['growth'];
    const outFunctions = finalFunctionSlugs.length ? finalFunctionSlugs : ['operations'];

    const decision = {
      post_id: p.id,
      title: title.slice(0, 100),
      current_pillar: currentPillarSlugs[0] || null,
      current_function: currentFunctionSlugs[0] || null,
      action: migrateOldPillarToFunction ? 'migrate' : (needsPillar ? 'full' : 'function-only'),
      new_pillar_slugs: outPillars,
      new_function_slugs: outFunctions,
      pillar_reasoning: ai.pillar_reasoning || null,
      function_reasoning: ai.function_reasoning || null,
    };
    out.write(JSON.stringify(decision) + '\n');

    if (migrateOldPillarToFunction) misTagged++;
    else needsFuncOnly++;

    if ((i + 1) % 10 === 0) {
      process.stdout.write(`  ${i + 1}/${posts.length}   (${misTagged} migrate, ${needsFuncOnly} function-only, ${alreadyGood} unchanged, ${errors} errors)\r`);
    }
    if (misTagged + needsFuncOnly >= limit) {
      console.log(`\n\n⏹  Reached --limit ${limit}, stopping early.`);
      break;
    }
  }
  out.end();
  console.log(`\n\n✅ Plan written → ${PLAN_FILE}`);
  console.log(`   migrations (mis-tagged pillar → function + new pillar): ${misTagged}`);
  console.log(`   function-only additions:                                 ${needsFuncOnly}`);
  console.log(`   already-correct (skipped):                               ${alreadyGood}`);
  console.log(`   errors:                                                  ${errors}`);
  console.log(`\nReview ${PLAN_FILE}, then run \`node ${path.basename(__filename)} --apply\`.`);
}

function applyMode() {
  if (!fs.existsSync(PLAN_FILE)) {
    console.error(`Plan file missing: ${PLAN_FILE}. Run --plan first.`);
    process.exit(1);
  }
  const lines = fs.readFileSync(PLAN_FILE, 'utf8').split('\n').filter(Boolean);
  const out = fs.createWriteStream(APPLY_FILE);
  out.write('#!/bin/bash\nset -e\ncd /home/runcloud/webapps/innercircle\n\n');
  let cmds = 0;
  for (const line of lines) {
    const d = JSON.parse(line);
    // `wp post term set` with multiple slugs REPLACES all existing terms with
    // the given list — exactly what we want for migrate/full (clear mis-tagged)
    // and for multi-tag (primary + optional secondary).
    const pillars = (d.new_pillar_slugs || [d.new_pillar]).filter(Boolean);
    const functions = (d.new_function_slugs || [d.new_function]).filter(Boolean);
    if (d.action === 'migrate' || d.action === 'full') {
      out.write(`wp post term set ${d.post_id} ic_pillar ${pillars.join(' ')} --quiet\n`);
    }
    out.write(`wp post term set ${d.post_id} ic_function ${functions.join(' ')} --quiet\n`);
    cmds += (d.action === 'migrate' || d.action === 'full') ? 2 : 1;
  }
  out.write(`\necho "✅ Applied ${cmds} taxonomy updates"\n`);
  out.end();
  console.log(`✅ Apply script written → ${APPLY_FILE}`);
  console.log(`   ${cmds} wp commands queued`);
  console.log(`\nDeploy:`);
  console.log(`   ssh runcloud@45.76.62.153 "bash -s" < ${APPLY_FILE}`);
}

(async function main() {
  const mode = process.argv[2];
  if (mode === '--plan') return planMode();
  if (mode === '--apply') return applyMode();
  console.log(`Usage: node ${path.basename(__filename)} --plan | --apply`);
  process.exit(1);
})();
