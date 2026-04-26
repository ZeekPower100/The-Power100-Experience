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
 * Discover the most-likely LinkedIn URL for a person via Google search.
 * Strategy: run 3 queries in one search batch (CEO+company, owner+company, name+linkedin).
 * Returns first organic result that's a LinkedIn /in/ URL, or null.
 *
 * @param {object} opts { name: string, company?: string }
 */
async function discoverLinkedInUrl({ name, company }) {
  if (!name || !name.trim()) return null;
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

  // items is an array of search-result objects; each has organicResults[].url
  const urls = [];
  for (const item of items) {
    for (const r of (item.organicResults || [])) {
      if (r.url && /linkedin\.com\/in\//i.test(r.url)) {
        urls.push(r.url);
      }
    }
  }
  return urls[0] || null;
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
  let url = knownLinkedinUrl || null;
  let discovered = false;
  if (!url) {
    try { url = await discoverLinkedInUrl({ name, company }); discovered = !!url; }
    catch (e) { return { error: `discoverLinkedInUrl failed: ${e.message}` }; }
  }
  if (!url) return { error: 'no LinkedIn URL found via discovery', discovered: false };

  let profile;
  try { profile = await scrapeLinkedInProfile(url); }
  catch (e) { return { error: `scrapeLinkedInProfile failed: ${e.message}`, linkedin_url: url, discovered }; }
  if (!profile) return { error: 'scrape returned no profile', linkedin_url: url, discovered };

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
  enrichFromLinkedIn,
};
