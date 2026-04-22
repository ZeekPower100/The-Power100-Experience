#!/usr/bin/env node
// AI-classify all 283 imported ic_article posts into ic_pillar + ic_function
// taxonomies (multi-tag, primary-first, max 2 per taxonomy). Mirrors the
// video backfill flow at scripts/backfill-ic-function-taxonomy.js but consumes
// article body text instead of takeaways/timestamps.
//
//   --plan   Reads scripts/ic-articles-dump.jsonl, calls OpenAI for each, writes
//            scripts/ic-article-backfill-plan.jsonl.
//   --apply  Reads the plan, generates a wp-cli shell script.
//   --limit N  (with --plan) Stops after N classifications. Useful for dry-runs.
//
// Cost: ~$1 of GPT-4o-mini for 283 articles.

const fs = require('fs');
const path = require('path');
const https = require('https');

const PILLAR_SLUGS = ['growth', 'culture', 'community', 'innovation'];
const FUNCTION_SLUGS = ['sales', 'marketing', 'operations', 'customer-experience'];

const DUMP_FILE = path.join(__dirname, 'ic-articles-dump.jsonl');
const PLAN_FILE = path.join(__dirname, 'ic-article-backfill-plan.jsonl');
const APPLY_FILE = path.join(__dirname, 'ic-article-backfill-apply.sh');

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function classify(openaiKey, { title, excerpt, body }) {
  const contextLines = [];
  if (title) contextLines.push(`Title: ${title}`);
  if (excerpt) contextLines.push(`Excerpt: ${stripHtml(excerpt).slice(0, 300)}`);
  if (body) contextLines.push(`Body (first ~2400 chars):\n${body.slice(0, 2400)}`);

  const prompt = `Classify this Power100 article for a home-services contractor audience.

${contextLines.join('\n\n')}

Return ONLY a JSON object with these keys:
- pillars: ARRAY of 1-2 values from [Growth, Culture, Community, Innovation] — the STRATEGIC LENS. Return just one unless there are 2+ strong signals genuinely addressing a different pillar.
- functions: ARRAY of 1-2 values from [Sales, Marketing, Operations, Customer Experience] — the BUSINESS FUNCTION. Return just one unless there are 2+ strong signals genuinely addressing a different function.

Classification guidance:
- Sales = revenue acquisition, closing, sales teams, sales processes, pipeline, selling to homeowners
- Marketing = lead generation, branding, content, demand gen, advertising, positioning
- Operations = running the business, scaling systems, delegation, leadership systems, financial management, process/quality
- Customer Experience = homeowner satisfaction, client journey, post-sale service, reputation, retention

Multi-tag rule (IMPORTANT — most articles should be multi-tag):
- For each value in the taxonomy, ask: "is there at least one paragraph or section in the body that specifically addresses this bucket?"
- If YES → include it in the array. Order by which is most central (primary first).
- Cap at 2 values per taxonomy.
- Don't add a second tag for tangential mentions; only when there's substantive coverage.

Examples:
  Single-topic: {"pillars": ["Growth"], "functions": ["Sales"]}
  Multi-topic:  {"pillars": ["Growth", "Innovation"], "functions": ["Sales", "Operations"]}
  Mixed:        {"pillars": ["Growth"], "functions": ["Sales", "Operations"]}`;

  const reqBody = JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    max_tokens: 100,
    temperature: 0.2
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(reqBody),
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
    req.write(reqBody);
    req.end();
  });
}

async function planMode() {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) { console.error('OPENAI_API_KEY required'); process.exit(1); }
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx > -1 ? parseInt(process.argv[limitIdx + 1], 10) : Infinity;

  if (!fs.existsSync(DUMP_FILE)) {
    console.error('Dump file missing. Regenerate via wp eval-file ic-article-dump.php');
    process.exit(1);
  }
  const articles = fs.readFileSync(DUMP_FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  console.log(`Loaded ${articles.length} articles${limit !== Infinity ? ` (limit=${limit})` : ''}`);

  const out = fs.createWriteStream(PLAN_FILE);
  let multiF = 0, multiP = 0, errors = 0;

  for (let i = 0; i < articles.length; i++) {
    const a = articles[i];
    // Skip if already classified (rerun safety)
    if (Array.isArray(a.pillar_slugs) && a.pillar_slugs.length && Array.isArray(a.function_slugs) && a.function_slugs.length) {
      continue;
    }

    let ai = {};
    try {
      ai = await classify(openaiKey, a);
    } catch (e) {
      console.error(`  ! [${a.id}] classify failed: ${e.message}`);
      errors++;
      continue;
    }

    const toSlug = (s) => String(s).toLowerCase().replace(/\s+/g, '-');
    const pillars = (Array.isArray(ai.pillars) ? ai.pillars : []).map(toSlug).filter((s) => PILLAR_SLUGS.includes(s)).slice(0, 2);
    const functions = (Array.isArray(ai.functions) ? ai.functions : []).map(toSlug).filter((s) => FUNCTION_SLUGS.includes(s)).slice(0, 2);
    const finalPillars = pillars.length ? pillars : ['growth'];
    const finalFunctions = functions.length ? functions : ['operations'];

    if (finalPillars.length > 1) multiP++;
    if (finalFunctions.length > 1) multiF++;

    out.write(JSON.stringify({
      post_id: a.id,
      title: (a.title || '').slice(0, 100),
      new_pillar_slugs: finalPillars,
      new_function_slugs: finalFunctions,
    }) + '\n');

    if ((i + 1) % 25 === 0) {
      process.stdout.write(`  ${i + 1}/${articles.length}   (multi-pillar: ${multiP}, multi-function: ${multiF}, errors: ${errors})\r`);
    }
    if (i + 1 >= limit) {
      console.log(`\n⏹  Reached --limit ${limit}, stopping early.`);
      break;
    }
  }
  out.end();
  console.log(`\n\n✅ Plan written → ${PLAN_FILE}`);
  console.log(`   multi-tag pillar:   ${multiP}`);
  console.log(`   multi-tag function: ${multiF}`);
  console.log(`   errors:             ${errors}`);
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
    out.write(`wp post term set ${d.post_id} ic_pillar ${d.new_pillar_slugs.join(' ')} --quiet\n`);
    out.write(`wp post term set ${d.post_id} ic_function ${d.new_function_slugs.join(' ')} --quiet\n`);
    cmds += 2;
  }
  out.write(`\necho "✅ Applied ${cmds} taxonomy updates across ${lines.length} articles"\n`);
  out.end();
  console.log(`✅ Apply script → ${APPLY_FILE}`);
  console.log(`   ${cmds} wp commands queued (${lines.length} articles × 2)`);
  console.log(`\nDeploy:`);
  console.log(`   ssh runcloud@45.76.62.153 "bash -s" < ${APPLY_FILE}`);
}

(async function main() {
  const mode = process.argv[2];
  if (mode === '--plan') return planMode();
  if (mode === '--apply') return applyMode();
  console.log(`Usage: node ${path.basename(__filename)} --plan [--limit N] | --apply`);
  process.exit(1);
})();
