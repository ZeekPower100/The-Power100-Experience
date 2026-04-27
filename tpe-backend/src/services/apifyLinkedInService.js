/**
 * Apify LinkedIn Service — TPE port of the Rankings Python integration.
 *
 * Reuses the SAME Apify account / billing as Rankings (single shared paid
 * account — heavy enrichment loops should be coordinated with Rankings team).
 *
 * Two actors:
 *   - apify~google-search-scraper       — Google SERP discovery (find LinkedIn URLs from name+company)
 *   - harvestapi~linkedin-profile-scraper — Profile detail scrape (name, headline, experience, education, photo)
 *
 * Auth: APIFY_API_KEY env var (falls back to APIFY_TOKEN). Same naming as Rankings.
 *
 * Sync pattern: uses /run-sync-get-dataset-items for one-shot calls (single HTTP
 * round-trip, blocks until actor finishes — ideal for our research orchestrator).
 *
 * Cost watch: profile scrape ≈ $0.03 per profile, Google search ≈ $0.15 per 1k.
 */

const axios = require('axios');

const APIFY_TOKEN = process.env.APIFY_API_KEY || process.env.APIFY_TOKEN || '';
const PROFILE_ACTOR  = 'harvestapi~linkedin-profile-scraper';
const SEARCH_ACTOR   = 'apify~google-search-scraper';
const APIFY_BASE     = 'https://api.apify.com/v2';

function ensureToken() {
  if (!APIFY_TOKEN) throw new Error('APIFY_API_KEY (or APIFY_TOKEN) env var is missing');
  return APIFY_TOKEN;
}

// LinkedIn dates come back as either strings, or {month, year, text} objects.
// Normalize to plain text.
function dateText(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  if (typeof d === 'object') return d.text || `${d.month || ''} ${d.year || ''}`.trim();
  return String(d);
}

/**
 * Run an Apify actor synchronously and return its dataset items.
 * Single HTTP call — Apify blocks until finish (or timeout) and streams items back.
 * @param {string} actorId  e.g. 'harvestapi~linkedin-profile-scraper'
 * @param {object} input    actor-specific input JSON
 * @param {number} timeoutSec  max seconds to wait (Apify caps around 5 min for sync calls)
 */
async function runActorSync(actorId, input, timeoutSec = 180) {
  const token = ensureToken();
  const url = `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${token}&timeout=${timeoutSec}`;
  const res = await axios.post(url, input, {
    headers: { 'Content-Type': 'application/json' },
    timeout: (timeoutSec + 30) * 1000,
    maxBodyLength: Infinity,
  });
  return Array.isArray(res.data) ? res.data : [];
}

/**
 * Scrape one or more LinkedIn profile URLs.
 * Returns array of profile objects from harvestapi (firstName, lastName, headline,
 * publicIdentifier, currentPosition[], experience[], education[], profilePicture, etc.)
 *
 * @param {string|string[]} urls  Single URL string or array
 * @returns {Promise<object[]>}   profiles in the same order as input where possible
 */
async function scrapeLinkedInProfiles(urls) {
  const arr = Array.isArray(urls) ? urls : [urls];
  if (arr.length === 0) return [];
  const items = await runActorSync(PROFILE_ACTOR, { urls: arr }, 180);
  return items;
}

/**
 * Convenience: scrape a single profile and return its object (or null).
 */
async function scrapeLinkedInProfile(url) {
  if (!url || typeof url !== 'string') return null;
  const items = await scrapeLinkedInProfiles([url]);
  return items[0] || null;
}

/**
 * Discover candidate LinkedIn URLs for a person via Google search.
 * Returns an ARRAY of candidate URLs ordered by relevance (most likely first).
 * Caller is expected to scrape + verify by name match before trusting one.
 *
 * @param {object} opts { name: string, company?: string }
 * @returns {Promise<string[]>}
 */
async function discoverLinkedInCandidates({ name, company }) {
  if (!name || !name.trim()) return [];
  const n = name.trim();
  const queries = [];
  if (company) {
    queries.push(`${n} CEO ${company} site:linkedin.com/in`);
    queries.push(`${n} ${company} site:linkedin.com/in`);
  }
  queries.push(`${n} site:linkedin.com/in`);

  const items = await runActorSync(SEARCH_ACTOR, {
    queries: queries.join('\n'),
    resultsPerPage: 5,
    maxPagesPerQuery: 1,
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  }, 90);

  const urls = [];
  for (const item of items) {
    for (const r of (item.organicResults || [])) {
      if (r.url && /linkedin\.com\/in\//i.test(r.url)) {
        // Strip query params + fragments for deduping
        const clean = r.url.split('?')[0].split('#')[0].replace(/\/$/, '');
        if (!urls.includes(clean)) urls.push(clean);
      }
    }
  }
  return urls;
}

// Backwards-compat: returns first candidate URL (no verification).
async function discoverLinkedInUrl({ name, company }) {
  const urls = await discoverLinkedInCandidates({ name, company });
  return urls[0] || null;
}

/**
 * Generic Google SERP fetch — used as the "web search" lane for synthesis grounding
 * when we want title+snippet+url for arbitrary queries (not just LinkedIn discovery).
 * One Apify run handles all queries in a single billable call.
 *
 * @param {object} opts { queries: string[], resultsPerQuery?: number }
 * @returns {Promise<Array<{ query, title, url, snippet }>>}
 */
async function googleSearchSnippets({ queries, resultsPerQuery = 5 } = {}) {
  if (!Array.isArray(queries) || queries.length === 0) return [];
  const items = await runActorSync(SEARCH_ACTOR, {
    queries: queries.join('\n'),
    resultsPerPage: resultsPerQuery,
    maxPagesPerQuery: 1,
    saveHtml: false,
    saveHtmlToKeyValueStore: false,
  }, 90);

  const out = [];
  for (const item of items) {
    const q = item.searchQuery?.term || item.searchQuery?.query || '';
    for (const r of (item.organicResults || [])) {
      if (!r.url) continue;
      out.push({
        query: q,
        title: (r.title || '').slice(0, 200),
        url: r.url,
        snippet: (r.description || r.descriptionHTML || '').replace(/<[^>]+>/g, '').slice(0, 400),
      });
    }
  }
  return out;
}

// Verify a scraped profile actually belongs to the expected person.
// Returns true if firstName + lastName both substring-match (case-insensitive).
function profileMatchesName(profile, expectedName) {
  if (!profile || !expectedName) return false;
  const parts = expectedName.trim().split(/\s+/);
  const expFirst = (parts[0] || '').toLowerCase();
  const expLast  = (parts[parts.length - 1] || '').toLowerCase();
  const pFirst   = (profile.firstName || '').toLowerCase();
  const pLast    = (profile.lastName || '').toLowerCase();
  // Allow nicknames (Mike↔Michael etc.) by checking starts-with on first name
  const firstOk = pFirst === expFirst || pFirst.startsWith(expFirst) || expFirst.startsWith(pFirst);
  const lastOk  = pLast === expLast;
  return firstOk && lastOk;
}

/**
 * Full enrichment orchestrator: given a name + company (and optional known
 * LinkedIn URL), return a normalized contributor enrichment payload ready to
 * merge into expert_contributors / ec_* meta.
 *
 * @param {object} opts { name, company?, knownLinkedinUrl? }
 * @returns {Promise<object>} { linkedin_url, profile_raw, normalized:{ headline, currentTitle, currentCompany, summary, experience[], education[], skills[], photoUrl } }
 *                            or { error } on failure
 */
async function enrichFromLinkedIn({ name, company, knownLinkedinUrl } = {}) {
  if (!name) return { error: 'name required' };

  let profile = null;
  let url = null;
  let discovered = false;
  let candidatesTried = [];

  // 1. If we have a known URL, scrape it directly. STILL verify name match — guard against
  //    stale/wrong stored URLs.
  if (knownLinkedinUrl) {
    try {
      const p = await scrapeLinkedInProfile(knownLinkedinUrl);
      if (p && profileMatchesName(p, name)) {
        profile = p; url = knownLinkedinUrl;
      } else if (p) {
        // Stored URL points to wrong person — fall through to discovery
        candidatesTried.push({ url: knownLinkedinUrl, rejected: 'name-mismatch (stored)' });
      }
    } catch (e) { /* fall through to discovery */ }
  }

  // 2. Discovery + verification loop — try up to 3 candidates until one matches.
  if (!profile) {
    let candidates = [];
    try { candidates = await discoverLinkedInCandidates({ name, company }); discovered = true; }
    catch (e) { return { error: `discoverLinkedInCandidates failed: ${e.message}` }; }
    if (candidates.length === 0) return { error: 'no LinkedIn URL found via discovery', discovered, candidatesTried };

    for (const candidate of candidates.slice(0, 3)) {
      try {
        const p = await scrapeLinkedInProfile(candidate);
        if (p && profileMatchesName(p, name)) {
          profile = p; url = candidate; break;
        } else if (p) {
          candidatesTried.push({ url: candidate, rejected: `name-mismatch (got ${p.firstName} ${p.lastName})` });
        } else {
          candidatesTried.push({ url: candidate, rejected: 'scrape-empty' });
        }
      } catch (e) {
        candidatesTried.push({ url: candidate, rejected: `error: ${e.message}` });
      }
    }
  }

  if (!profile) return { error: 'all candidates failed verification', discovered, candidatesTried };

  const current = (profile.currentPosition && profile.currentPosition[0]) || {};
  const exp = Array.isArray(profile.experience) ? profile.experience : [];
  const edu = Array.isArray(profile.education) ? profile.education : [];
  const photoUrl = (profile.profilePicture && (profile.profilePicture.url || profile.profilePicture.displayImage)) || profile.photo || '';

  return {
    linkedin_url: url,
    discovered,
    profile_raw: profile,
    normalized: {
      first_name: profile.firstName || (name.split(/\s+/)[0] || ''),
      last_name:  profile.lastName  || (name.split(/\s+/).slice(1).join(' ') || ''),
      headline:   profile.headline  || '',
      current_title:   current.position || '',
      current_company: current.companyName || current.company || '',
      photo_url:  photoUrl,
      experience: exp.slice(0, 10).map(e => ({
        company:    e.companyName || e.company || '',
        position:   e.position || '',
        start_date: dateText(e.startDate || e.start),
        end_date:   dateText(e.endDate || e.end),
        location:   e.location || '',
      })),
      education: edu.slice(0, 6).map(e => ({
        school: e.schoolName || e.school || '',
        degree: e.degree || '',
        field:  e.field || e.fieldOfStudy || '',
        years:  `${dateText(e.startDate)}${e.endDate ? ' - ' + dateText(e.endDate) : ''}`.trim(),
      })),
      certifications: Array.isArray(profile.certifications) ? profile.certifications.slice(0, 8) : [],
      skills:         Array.isArray(profile.skills) ? profile.skills.slice(0, 12) : [],
    },
  };
}

module.exports = {
  scrapeLinkedInProfile,
  scrapeLinkedInProfiles,
  discoverLinkedInUrl,
  discoverLinkedInCandidates,
  profileMatchesName,
  enrichFromLinkedIn,
  googleSearchSnippets,
};
