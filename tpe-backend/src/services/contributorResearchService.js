/**
 * Contributor Research Service — Phase D.2 enrichment orchestrator.
 *
 * Combines 4 research lanes in parallel and synthesizes a structured
 * ec_* enrichment payload via Claude Sonnet:
 *
 *   1. LinkedIn      → Apify (apifyLinkedInService)
 *   2. Ranked CEO/Partner lander → HTTP fetch staging.power100.io
 *   3. Company website → HTTP fetch
 *   4. Web search    → Apify Google SERP (title + snippet + url for awards/podcasts/press)
 *
 * Output: structured payload merge-able into upsertContributorLander row.
 *
 * Cost per contributor: ~$0.06 (Apify ~$0.01 + Sonnet synthesis ~$0.05).
 * Decoupling lane 4 from Anthropic web_search keeps us comfortably inside Tier 1
 * rate limits (no token amplification from in-call tool calls) and is ~3x faster.
 *
 * Usage:
 *   const r = await researchContributor({
 *     name: 'Abby Binder', company: 'ABBY Home',
 *     knownLinkedinUrl: '...optional...',
 *     rankedSlug: 'abby-binder',  // optional — if exists, fetches /abby-binder-power-ranked-ceo/
 *     websiteUrl: 'https://abbyhome.com',  // optional — auto-discovered via Sonnet otherwise
 *   });
 *   // r.payload has hero_quote, bio, credentials, expertise_topics, recognition,
 *   //   scores, testimonials, geographic_reach, company_description, title_position,
 *   //   stat_years, ec_stat_custom_label, ec_stat_custom_value, headshot_url, linkedin_url
 */

const axios = require('axios');
const li = require('./apifyLinkedInService');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const CLAUDE_MODEL = 'claude-sonnet-4-6';  // current Sonnet
const STAGING_BASE = process.env.STAGING_P100_BASE || 'https://staging.power100.io';

// ─── Lane 2: Ranked lander (Power100 CEO or Partner page) ───
async function fetchRankedLanderSnippets(slug) {
  if (!slug) return null;
  const candidates = [
    `${STAGING_BASE}/${slug}-power-ranked-ceo/`,
    `${STAGING_BASE}/${slug}-power-ranked-partner/`,
    `${STAGING_BASE}/${slug}-preferred-partner/`,
    // Old site fallbacks (some legacy landers still live there)
    `https://power100.io/${slug}-ceo-lander/`,
    `https://power100.io/${slug}-power-ranked-ceo/`,
  ];
  for (const url of candidates) {
    try {
      const res = await axios.get(url, { timeout: 12000, validateStatus: s => s < 500 });
      if (res.status === 200 && res.data && res.data.length > 5000) {
        return { url, html: res.data };
      }
    } catch (e) { /* try next */ }
  }
  return null;
}

// Pull just the text-heavy bits from a lander HTML — avoid sending 100KB to Sonnet.
function extractLanderSignals(html) {
  if (!html) return '';
  const out = [];
  // Hero quote
  const heroQuote = html.match(/class="(?:pcl|ec)-hero-quote[^"]*"[^>]*>([\s\S]{20,500}?)</);
  if (heroQuote) out.push(`HERO QUOTE: ${stripTags(heroQuote[1]).trim()}`);
  // PCL or EC quote sections
  const pclQuotes = [...html.matchAll(/class="pcl-quote-text"[^>]*>([^<]{30,400})</g)];
  for (const m of pclQuotes.slice(0, 2)) out.push(`QUOTE: ${m[1].trim()}`);
  // Testimonials
  const testis = [...html.matchAll(/class="(?:pcl|ec)-testi(?:monial)?-?(?:text|quote)[^"]*"[^>]*>([^<]{40,500})</g)];
  for (const m of testis.slice(0, 5)) out.push(`TESTIMONIAL: ${m[1].trim()}`);
  // Bio paragraphs (any p > 100 chars)
  const bigPs = [...html.matchAll(/<p[^>]*>([^<]{100,800})<\/p>/g)];
  for (const m of bigPs.slice(0, 4)) out.push(`PARA: ${m[1].trim()}`);
  return out.join('\n\n').slice(0, 8000);
}

function stripTags(s) { return String(s || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); }

// ─── Lane 3: Company website (raw HTTP fetch + text extraction) ───
async function fetchCompanyWebsiteText(url) {
  if (!url) return null;
  try {
    const res = await axios.get(url, {
      timeout: 12000,
      headers: { 'User-Agent': 'Mozilla/5.0 (Power100 Contributor Research Bot)' },
      maxRedirects: 5,
      validateStatus: s => s < 500,
    });
    if (res.status !== 200) return null;
    const text = stripTags(res.data).slice(0, 6000);
    return { url, text };
  } catch (e) { return null; }
}

// ─── Lane 4: Web search snippets via Apify Google SERP ───
// One Apify run, multiple targeted queries — title+snippet+url returned to Sonnet
// as plain text (no in-call tool overhead, no token amplification).
async function fetchWebSearchSnippets({ name, company }) {
  if (!name) return [];
  const n = name.trim();
  const queries = [];
  if (company) {
    queries.push(`"${n}" "${company}"`);
    queries.push(`"${n}" "${company}" award OR honor OR "named"`);
  }
  queries.push(`"${n}" podcast OR speaker OR keynote`);
  queries.push(`"${n}" home improvement OR contractor OR remodeling`);
  try {
    const snippets = await li.googleSearchSnippets({ queries, resultsPerQuery: 4 });
    // Drop LinkedIn results (already covered by lane 1) and dedupe by URL.
    const seen = new Set();
    const filtered = [];
    for (const s of snippets) {
      if (/linkedin\.com\/in\//i.test(s.url)) continue;
      if (seen.has(s.url)) continue;
      seen.add(s.url);
      filtered.push(s);
      if (filtered.length >= 16) break;
    }
    return filtered;
  } catch (e) {
    return [];
  }
}

// ─── Sonnet synthesis: take all raw inputs, output structured ec_* JSON ───
async function synthesizeWithClaude({ name, company, contributorClass, linkedin, landerSignals, websiteText, webSnippets, gapFillFields }) {
  if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY missing');
  // contributorClass is 'expert_contributor' (paid — 8 entries) or 'contributor' (unpaid — 6 entries)
  const targetCount = contributorClass === 'expert_contributor' ? 8 : 6;

  // Gap-fill mode: if the caller passes a list of fields, instruct Sonnet to ONLY
  // synthesize those specific keys. Used by form controllers so user-submitted
  // fields are never overwritten by AI synthesis.
  const gapFillNote = (Array.isArray(gapFillFields) && gapFillFields.length > 0)
    ? `\n\n**GAP-FILL MODE ACTIVE.** The user has already provided these fields and you MUST NOT overwrite them. Output the JSON as normal but ONLY populate these specific keys: ${gapFillFields.join(', ')}. For all other keys in the schema, output an empty string "" or empty array []. Do not invent content for fields the user already filled in.`
    : '';

  const sysPrompt = `You compose Power100 Expert Contributor lander content. Power100 is a B2B platform for the home improvement industry that profiles industry leaders.${gapFillNote}

You will receive raw research data from up to 4 sources (LinkedIn profile, Power100 ranked lander excerpt, company website text, web search results). Synthesize a structured contributor profile.

OUTPUT a single JSON object (no preamble, no markdown) matching this exact schema:
{
  "title_position": "Title, Company Name",
  "hero_quote": "One short, punchy quote that captures their leadership voice (40-200 chars). Pull from sources if a real quote exists; otherwise compose one in their voice from bio themes.",
  "bio": "Rich 3-5 sentence professional bio (120-220 words). Tell their story: founding moment, growth metrics, current focus, what they're known for. Use ONLY facts present in sources — do NOT invent revenue figures, employee counts, or awards.",
  "credentials": ["${targetCount} entries", "one per line", "...", "verifiable from sources"],
  "expertise_topics": ["${targetCount} entries", "topic phrases (2-5 words each)", "..."],
  "recognition": ["${targetCount} entries with emoji prefix", "Format: 'EMOJI | text'", "Examples: '🏆 | Top 500 Qualified Remodeler', '🎙️ | Host of XYZ Podcast'"],
  "scores": ["${targetCount} entries", "Format: 'Domain Name | 9.X'", "Score 9.0-9.7. Domain names UNIQUE to this person derived from their actual strengths in sources. Examples: 'Sales Leadership | 9.5', 'Operational Excellence | 9.3'"],
  "company_description": "2-3 sentence company description (60-150 words). Founded year, services, geographic scope, employee scale if known.",
  "geographic_reach": "Short region label like 'Southern Wisconsin' or 'NYC + Long Island' or 'National'.",
  "stat_years": "If you can determine years in industry from start dates, e.g. '15+' or '2010' (founding year). Empty string if unknown.",
  "ec_stat_custom_label": "Short label for a 4th custom stat slot (e.g. 'Top 500 Rank', 'Customers Served', 'Acquisition Year').",
  "ec_stat_custom_value": "Value for that slot (e.g. '#18', '100,000+', '2025'). Pull from sources only.",
  "testimonials": [
    { "quote": "...", "name": "Customer Name or 'Customer Review'", "role": "ABBY Windows Client" }
  ]
}

CRITICAL RULES:
- Every claim in bio/credentials/recognition must trace to source data. NEVER invent revenue, employee count, project count, awards, or rankings.
- If a section's data is thin, output fewer entries (5 instead of ${targetCount}) — quality over quantity.
- Recognition entries should highlight real awards, podcasts, speaking, certifications, leadership milestones — not generic phrases.
- Domain Mastery scores (the "scores" array) are derived placeholders; use 9.0-9.7 range and pick domains that match their actual strengths shown in sources.
- testimonials: pull verbatim from lander signals if present (look for "TESTIMONIAL:" entries). If none in sources, output an empty array [].
- Apostrophes in strings are fine — output valid JSON.`;

  const userMessage = [
    `CONTRIBUTOR: ${name}`,
    company ? `KNOWN COMPANY: ${company}` : null,
    `CONTRIBUTOR_CLASS: ${contributorClass}`,
    '',
    '--- LANE 1: LINKEDIN ---',
    linkedin ? JSON.stringify({
      headline: linkedin.normalized.headline,
      current_title: linkedin.normalized.current_title,
      current_company: linkedin.normalized.current_company,
      experience: linkedin.normalized.experience,
      education: linkedin.normalized.education,
      skills: linkedin.normalized.skills,
    }, null, 2) : '(no LinkedIn data)',
    '',
    '--- LANE 2: RANKED LANDER SIGNALS ---',
    landerSignals || '(no ranked lander found)',
    '',
    '--- LANE 3: COMPANY WEBSITE TEXT (excerpt) ---',
    websiteText ? websiteText.text.slice(0, 4000) : '(no website data)',
    '',
    '--- LANE 4: WEB SEARCH SNIPPETS (Google SERP via Apify) ---',
    Array.isArray(webSnippets) && webSnippets.length
      ? webSnippets.map((s, i) => `[${i + 1}] ${s.title}\n    ${s.url}\n    ${s.snippet}`).join('\n')
      : '(no web search results)',
    '',
    'Lane 4 is supplementary grounding: industry awards, podcast/speaking presence, press mentions, acquisitions. Use it to strengthen credentials/recognition/bio — but ONLY surface a fact if a snippet directly supports it. Do not infer awards from generic profile pages.',
    '',
    'Now synthesize the JSON output per the schema. Output ONLY the JSON, no preamble.',
  ].filter(Boolean).join('\n');

  const res = await axios.post('https://api.anthropic.com/v1/messages', {
    model: CLAUDE_MODEL,
    max_tokens: 4096,
    system: sysPrompt,
    messages: [{ role: 'user', content: userMessage }],
    // Lane 4 is now Apify Google SERP snippets injected into the prompt above —
    // no in-call web_search tool, so Tier 1 limits are not amplified.
  }, {
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    timeout: 90000,
  });

  // Pull text from Claude response (handle tool-use sequences)
  const blocks = res.data.content || [];
  const textBlocks = blocks.filter(b => b.type === 'text').map(b => b.text).join('\n');
  // Extract first JSON object — Claude may include explanation; isolate the JSON
  const jsonMatch = textBlocks.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude did not return JSON. Raw: ' + textBlocks.slice(0, 500));
  let parsed;
  try { parsed = JSON.parse(jsonMatch[0]); }
  catch (e) { throw new Error('JSON parse failed: ' + e.message + '. Raw: ' + jsonMatch[0].slice(0, 500)); }
  return parsed;
}

// ─── Public orchestrator ───
async function researchContributor(opts) {
  const { name, company, knownLinkedinUrl, rankedSlug, websiteUrl, contributorClass = 'contributor', gapFillFields } = opts;
  if (!name) throw new Error('researchContributor: name is required');

  // Lanes 1-4 in parallel.
  // Lane 1 (LinkedIn) name-match verifies — knownLinkedinUrl is trusted only if it
  // resolves to a profile whose firstName+lastName match. Otherwise falls back to discovery.
  // Lane 4 (Web search) is Apify Google SERP — title+snippet+url for awards/podcasts/press.
  const [linkedin, lander, websiteFromOpts, webSnippets] = await Promise.all([
    li.enrichFromLinkedIn({ name, company, knownLinkedinUrl }).catch(e => ({ error: e.message })),
    fetchRankedLanderSnippets(rankedSlug || (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''))),
    websiteUrl ? fetchCompanyWebsiteText(websiteUrl) : Promise.resolve(null),
    fetchWebSearchSnippets({ name, company }),
  ]);

  const liResult = (linkedin && !linkedin.error) ? linkedin : null;
  const landerSignals = lander ? extractLanderSignals(lander.html) : null;

  // Sonnet synthesis (lane 4 snippets are now plain-text in the prompt — no in-call tool)
  let synthesized;
  try {
    synthesized = await synthesizeWithClaude({
      name, company, contributorClass,
      linkedin: liResult,
      landerSignals,
      websiteText: websiteFromOpts,
      webSnippets,
      gapFillFields,
    });
  } catch (e) {
    return {
      error: 'synthesis failed: ' + e.message,
      partial: {
        linkedin_url: liResult?.linkedin_url,
        photo_url:    liResult?.normalized?.photo_url,
        ranked_lander_url: lander?.url,
        website_url:  websiteUrl,
      },
    };
  }

  // Stitch into final payload — LinkedIn auto-fills photo + URL.
  // linkedin_url is trustworthy because enrichFromLinkedIn name-match verified it.
  return {
    success: true,
    sources: {
      linkedin: !!liResult,
      ranked_lander: !!lander,
      company_website: !!websiteFromOpts,
      web_search: Array.isArray(webSnippets) ? webSnippets.length : 0,
    },
    linkedin_verified: !!liResult,    // tells callers it's safe to persist as the "locked" URL
    candidates_tried: linkedin?.candidatesTried || [],
    payload: {
      ...synthesized,
      headshot_url:  liResult?.normalized?.photo_url || null,
      linkedin_url:  liResult?.linkedin_url || null,
      website_url:   websiteUrl || null,
    },
  };
}

module.exports = { researchContributor, fetchRankedLanderSnippets, extractLanderSignals, fetchCompanyWebsiteText, fetchWebSearchSnippets };
