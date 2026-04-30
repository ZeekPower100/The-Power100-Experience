// DATABASE-CHECKED: expert_contributors columns verified on 2026-04-07
// ================================================================
// Contributor Enrichment Service
// ================================================================
// Purpose: Automated pipeline for IC contributor profile enrichment
// Handles: Article matching, EC linking, ranking detection, photo sync
// Triggered: Via API endpoint or cron schedule
// ================================================================

const axios = require('axios');
const { query } = require('../config/database');

const P100_WP_API = 'https://power100.io/wp-json/wp/v2';
const IC_WP_API = 'https://innercircle.power100.io/wp-json/ic/v1';
// IC_REST_API_KEY = the key TPX uses to call IC (outbound). Falls back to
// TPX_IC_API_KEY for legacy compat, but that var is misnamed — it's actually
// the inbound key IC uses to call TPX (see flexibleAuth.js:368). Always set
// IC_REST_API_KEY explicitly on new deployments.
const IC_API_KEY = process.env.IC_REST_API_KEY || process.env.TPX_IC_API_KEY;

// ─── Helper: Call IC REST API ───
async function icApiCall(method, endpoint, data = null) {
  const config = {
    method,
    url: `${IC_WP_API}${endpoint}`,
    headers: {
      'X-IC-API-Key': IC_API_KEY,
      'Content-Type': 'application/json',
    },
  };
  if (data) config.data = data;
  const res = await axios(config);
  return res.data;
}

// ─── Helper: Fetch all P100 articles (paginated) ───
async function fetchAllP100Articles() {
  const articles = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    try {
      const res = await axios.get(`${P100_WP_API}/posts`, {
        params: { per_page: perPage, page, orderby: 'date', order: 'desc', _fields: 'id,title,link,date' },
        timeout: 15000,
      });
      articles.push(...res.data);
      // Check if there are more pages
      const totalPages = parseInt(res.headers['x-wp-totalpages'] || '1');
      if (page >= totalPages) break;
      page++;
    } catch (err) {
      if (err.response?.status === 400) break; // No more pages
      throw err;
    }
  }

  return articles;
}

// ─── Helper: Fetch IC leaders from WP ───
async function fetchIcLeaders() {
  const res = await axios.get(`${IC_WP_API}/leaders`, {
    headers: { 'X-IC-API-Key': IC_API_KEY },
    timeout: 15000,
  });
  return res.data;
}

// ════════════════════════════════════════
// 1. ARTICLE-TO-LEADER MATCHING
// ════════════════════════════════════════
async function syncArticles() {
  console.log('[ContributorEnrichment] Starting article sync...');
  const articles = await fetchAllP100Articles();
  const leaders = await fetchIcLeaders();

  console.log(`[ContributorEnrichment] Fetched ${articles.length} articles, ${leaders.length} leaders`);

  const results = { matched: 0, updated: 0, errors: [] };

  for (const leader of leaders) {
    const name = leader.name;
    if (!name || name.length < 4) continue; // Skip "Greg" type single names

    // Match articles where title contains the leader's full name
    const matched = articles.filter(a => {
      const title = (a.title?.rendered || '').toLowerCase();
      return title.includes(name.toLowerCase());
    });

    if (matched.length === 0) continue;
    results.matched++;

    const articleData = matched.map(a => ({
      title: (a.title?.rendered || '')
        .replace(/&#8217;/g, "'")
        .replace(/&#8211;/g, '-')
        .replace(/&#8220;/g, '"')
        .replace(/&#8221;/g, '"')
        .replace(/&#038;/g, '&')
        .substring(0, 150),
      url: a.link,
    }));

    try {
      await icApiCall('POST', '/leader/update-meta', {
        term_id: leader.term_id,
        meta_key: 'ic_p100_articles',
        meta_value: JSON.stringify(articleData),
      });
      results.updated++;
      console.log(`[ContributorEnrichment] ${name}: ${articleData.length} articles matched`);
    } catch (err) {
      results.errors.push({ leader: name, error: err.message });
    }
  }

  console.log(`[ContributorEnrichment] Article sync complete: ${results.matched} matched, ${results.updated} updated, ${results.errors.length} errors`);
  return results;
}

// ════════════════════════════════════════
// 2. EC PAGE AUTO-LINKING
// ════════════════════════════════════════
async function linkEcPages() {
  console.log('[ContributorEnrichment] Starting EC page linking...');

  // Fetch all pages from Power100 and filter for EC landers (slug ends with -expert-contributor)
  const ecPages = [];
  let page = 1;
  while (true) {
    try {
      const res = await axios.get(`${P100_WP_API}/pages`, {
        params: { per_page: 100, page, _fields: 'id,slug,title,link' },
        timeout: 15000,
      });
      const filtered = res.data.filter(p =>
        p.slug?.endsWith('-expert-contributor') && p.slug !== 'become-an-expert-contributor'
      );
      ecPages.push(...filtered);
      const totalPages = parseInt(res.headers['x-wp-totalpages'] || '1');
      if (page >= totalPages) break;
      page++;
    } catch (err) {
      if (err.response?.status === 400) break;
      throw err;
    }
  }

  console.log(`[ContributorEnrichment] Found ${ecPages.length} EC pages on Power100`);

  // Build name → URL map from EC page titles
  const ecMap = {};
  for (const p of ecPages) {
    const title = (p.title?.rendered || '').replace(/\s*—\s*Expert Contributor$/i, '').trim();
    if (title && title !== 'Become An Expert Contributor') {
      ecMap[title.toLowerCase()] = p.link;
    }
  }

  const leaders = await fetchIcLeaders();
  const results = { linked: 0, alreadyLinked: 0, errors: [] };

  for (const leader of leaders) {
    const nameKey = leader.name.toLowerCase();
    const ecUrl = ecMap[nameKey];
    if (!ecUrl) continue;

    // Skip if already linked
    if (leader.ic_ec_page_url) {
      results.alreadyLinked++;
      continue;
    }

    try {
      await icApiCall('POST', '/leader/update-meta', {
        term_id: leader.term_id,
        meta_key: 'ic_ec_page_url',
        meta_value: ecUrl,
      });
      results.linked++;
      console.log(`[ContributorEnrichment] Linked EC: ${leader.name} → ${ecUrl}`);
    } catch (err) {
      results.errors.push({ leader: leader.name, error: err.message });
    }
  }

  console.log(`[ContributorEnrichment] EC linking complete: ${results.linked} new, ${results.alreadyLinked} existing`);
  return results;
}

// ════════════════════════════════════════
// 3. RANKINGS DETECTION
// ════════════════════════════════════════
async function detectRankings() {
  console.log('[ContributorEnrichment] Starting rankings detection...');
  const leaders = await fetchIcLeaders();
  const results = { found: 0, errors: [] };

  for (const leader of leaders) {
    // Skip if already ranked
    if (leader.ic_power_rank) continue;

    // Build slug from name — check both URL patterns
    const slug = leader.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const patterns = [
      `https://power100.io/${slug}-power-ranked-ceo/`,   // New pattern (2026+)
      `https://power100.io/${slug}-ceo-lander/`,    // Legacy pattern
    ];

    try {
      let foundUrl = null;
      for (const url of patterns) {
        const res = await axios.head(url, { timeout: 5000, validateStatus: s => s < 500 });
        if (res.status === 200) { foundUrl = url; break; }
      }

      if (foundUrl) {
        // Fetch the page to extract rank number
        const pageRes = await axios.get(foundUrl, { timeout: 10000 });
        const rankMatch = pageRes.data.match(/<h[^>]*>\s*#(\d+)\s*<\/h/i);
        if (rankMatch) {
          const rank = parseInt(rankMatch[1]);
          await icApiCall('POST', '/leader/update-meta', {
            term_id: leader.term_id,
            meta_key: 'ic_power_rank',
            meta_value: String(rank),
          });
          await icApiCall('POST', '/leader/update-meta', {
            term_id: leader.term_id,
            meta_key: 'ic_rank_lander_url',
            meta_value: foundUrl,
          });
          results.found++;
          console.log(`[ContributorEnrichment] Found ranking: ${leader.name} #${rank} (${foundUrl})`);
        }
      }
    } catch (err) {
      // 404 is expected for most leaders — not an error
      if (err.response?.status !== 404) {
        results.errors.push({ leader: leader.name, error: err.message });
      }
    }

    // Rate limit: don't hammer P100
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`[ContributorEnrichment] Rankings detection complete: ${results.found} found`);
  return results;
}

// ════════════════════════════════════════
// 4. PHOTO PROPAGATION
// ════════════════════════════════════════
async function propagatePhotos() {
  console.log('[ContributorEnrichment] Starting photo propagation...');
  // This runs on the WP side — trigger via IC REST endpoint
  try {
    const result = await icApiCall('POST', '/leader/propagate-photos', {});
    console.log(`[ContributorEnrichment] Photo propagation: ${JSON.stringify(result)}`);
    return result;
  } catch (err) {
    console.error(`[ContributorEnrichment] Photo propagation error: ${err.message}`);
    return { error: err.message };
  }
}

// ════════════════════════════════════════
// 5. SINGLE LEADER ENRICHMENT (on new leader creation)
// ════════════════════════════════════════
async function enrichSingleLeader(leaderName) {
  console.log(`[ContributorEnrichment] Enriching: ${leaderName}`);
  const results = {};

  // Match articles
  const articles = await fetchAllP100Articles();
  const matched = articles.filter(a =>
    (a.title?.rendered || '').toLowerCase().includes(leaderName.toLowerCase())
  );
  if (matched.length > 0) {
    results.articles = matched.length;
  }

  // Check for EC page
  const slug = leaderName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  try {
    const ecRes = await axios.head(`https://power100.io/${slug}-expert-contributor/`, {
      timeout: 5000, validateStatus: s => s < 500,
    });
    if (ecRes.status === 200) {
      results.ecPage = `https://power100.io/${slug}-expert-contributor/`;
    }
  } catch (err) { /* not an EC */ }

  // Check for ranked CEO lander (both patterns)
  for (const pattern of [`${slug}-ranked-ceo`, `${slug}-ceo-lander`]) {
    try {
      const rankRes = await axios.head(`https://power100.io/${pattern}/`, {
        timeout: 5000, validateStatus: s => s < 500,
      });
      if (rankRes.status === 200) {
        results.rankedCeo = `https://power100.io/${pattern}/`;
        break;
      }
    } catch (err) { /* not ranked */ }
  }

  console.log(`[ContributorEnrichment] Enrichment results for ${leaderName}:`, results);
  return results;
}

// ════════════════════════════════════════
// 6. FULL ENRICHMENT ORCHESTRATOR
// ════════════════════════════════════════
async function runFullEnrichment() {
  console.log('[ContributorEnrichment] ═══ Starting full enrichment run ═══');
  const startTime = Date.now();
  const report = {};

  try {
    report.articles = await syncArticles();
  } catch (err) {
    report.articles = { error: err.message };
    console.error('[ContributorEnrichment] Article sync failed:', err.message);
  }

  try {
    report.ecLinks = await linkEcPages();
  } catch (err) {
    report.ecLinks = { error: err.message };
    console.error('[ContributorEnrichment] EC linking failed:', err.message);
  }

  try {
    report.rankings = await detectRankings();
  } catch (err) {
    report.rankings = { error: err.message };
    console.error('[ContributorEnrichment] Rankings detection failed:', err.message);
  }

  try {
    report.photos = await propagatePhotos();
  } catch (err) {
    report.photos = { error: err.message };
    console.error('[ContributorEnrichment] Photo propagation failed:', err.message);
  }

  report.duration = `${((Date.now() - startTime) / 1000).toFixed(1)}s`;
  console.log('[ContributorEnrichment] ═══ Full enrichment complete ═══', JSON.stringify(report, null, 2));
  return report;
}

// ════════════════════════════════════════
// 7. UPSERT CONTRIBUTOR LANDER on staging.power100.io (Phase B)
// ════════════════════════════════════════
//
// Creates or updates a contributor lander page on staging.power100.io.
// Idempotent: same fn safe to call from form submit AND episode publish.
//
// Lookup chain (first match wins):
//   1. row.wp_page_id is set → PATCH that page's ACF (no search)
//   2. else search staging by ec_name match → PATCH if found, link wp_page_id back
//   3. else POST new draft page with template page-expert-contributor.php
//
// Returns: { wp_page_id, wp_page_url, created (bool), action ('created'|'updated'|'linked') }
//
// Auth: Basic auth via STAGING_P100_ADMIN_USER + STAGING_P100_ADMIN_APP_PWD env.
// (Power100 user is read-only; needs admin user with create perms.)

const STAGING_P100_BASE = process.env.STAGING_P100_BASE || 'https://staging.power100.io';
const STAGING_P100_USER = process.env.STAGING_P100_ADMIN_USER || 'zkpower';
const STAGING_P100_PWD  = process.env.STAGING_P100_ADMIN_APP_PWD || '';

function stagingAuthHeader() {
  if (!STAGING_P100_PWD) {
    throw new Error('STAGING_P100_ADMIN_APP_PWD env var is missing');
  }
  return 'Basic ' + Buffer.from(STAGING_P100_USER + ':' + STAGING_P100_PWD).toString('base64');
}

// Download a remote image URL and upload it into staging.power100.io's
// media library. Returns the new attachment ID. Used to populate
// ec_headshot (which is registered as an integer attachment ID).
// ─── Legacy company logo lookup ──────────────────────────────────────────
// 60 unique company → logo URL map sourced from legacy power100.io contributor
// pages (95% of which already have ec_company_logo populated). Built via
// scripts/audit-legacy-company-logos.js. Refresh that script to update.
let _logoMap = null;
function getLogoMap() {
  if (_logoMap) return _logoMap;
  try {
    _logoMap = require('../../data/legacy-company-logos.json');
  } catch (e) {
    console.warn('[contributorEnrichment] legacy-company-logos.json not loaded:', e.message);
    _logoMap = {};
  }
  // Build a normalized lookup map (lowercase, stripped) for fuzzy matching
  _logoMap.__normalized = {};
  for (const [co, data] of Object.entries(_logoMap)) {
    if (co === '__normalized') continue;
    const key = co.toLowerCase().replace(/[^a-z0-9]/g, '');
    _logoMap.__normalized[key] = data;
  }
  return _logoMap;
}

// Returns { light, dark } variants for a company. `light` is the primary
// (also written to `ec_company_logo`); `dark` is optional, used by the IC
// dark-themed mirror (`ec_company_logo_dark`). Either may be null if the
// legacy map has no entry / no dark variant.
function getCompanyLogoVariants(companyName) {
  if (!companyName) return { light: null, dark: null };
  const map = getLogoMap();
  let data = map[companyName] || null;
  if (!data) {
    const key = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    data = map.__normalized[key] || null;
  }
  if (!data) return { light: null, dark: null };
  return { light: data.url || null, dark: data.url_dark || null };
}

// Back-compat: legacy callers expect just the light URL string.
function getCompanyLogoFromLegacy(companyName) {
  return getCompanyLogoVariants(companyName).light;
}

async function sideloadCompanyLogoToStaging(logoUrl, companyName) {
  const safeSlug = (companyName || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return await sideloadImageToStagingGeneric(logoUrl, `${safeSlug}-logo`);
}

// Generic version used by both headshot + logo sideloads
async function sideloadImageToStagingGeneric(imageUrl, filenameHint) {
  const imgRes = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  const buf = Buffer.from(imgRes.data);
  const contentType = imgRes.headers['content-type'] || 'image/jpeg';
  const urlExt = (imageUrl.split('?')[0].split('.').pop() || '').toLowerCase();
  const ext = ['jpg','jpeg','png','gif','webp','svg','avif'].includes(urlExt) ? urlExt :
              (contentType.split('/')[1] || 'jpg').split(';')[0].toLowerCase();
  const filename = `${filenameHint}.${ext}`;
  const uploadRes = await axios.post(
    `${STAGING_P100_BASE}/wp-json/wp/v2/media`,
    buf,
    {
      headers: {
        Authorization: stagingAuthHeader(),
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      timeout: 30000,
      maxBodyLength: Infinity,
    }
  );
  return uploadRes.data.id;
}

async function sideloadImageToStaging(imageUrl, filenameHint) {
  // LinkedIn CDN often 403s default axios UA — masquerade as a browser so it serves the image.
  const imgRes = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 20000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  });
  const buf = Buffer.from(imgRes.data);
  const contentType = imgRes.headers['content-type'] || 'image/jpeg';
  // Pull a sane extension from URL or content-type
  const urlExt = (imageUrl.split('?')[0].split('.').pop() || '').toLowerCase();
  const ext = ['jpg','jpeg','png','gif','webp'].includes(urlExt) ? urlExt :
              (contentType.split('/')[1] || 'jpg').split(';')[0].toLowerCase();
  const filename = `${filenameHint}-headshot.${ext}`;

  const uploadRes = await axios.post(
    `${STAGING_P100_BASE}/wp-json/wp/v2/media`,
    buf,
    {
      headers: {
        Authorization: stagingAuthHeader(),
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      timeout: 30000,
      maxBodyLength: Infinity,
    }
  );
  return uploadRes.data.id;
}

// Map a contributor row → ec_* ACF schema. Used for both POST and PATCH bodies.
function rowToAcfFields(row) {
  const fullName  = `${row.first_name || ''} ${row.last_name || ''}`.trim();
  const company   = row.company || '';
  const titlePos  = row.title_position
    ? (company && !row.title_position.includes(company) ? `${row.title_position}, ${company}` : row.title_position)
    : (company ? `Leader at ${company}` : '');

  // contributor_class drives ec_contributor_type. Paid ECs derive from contributor_type column.
  let ecType = 'contributor';
  if (row.contributor_class === 'expert_contributor') {
    if (row.contributor_type === 'ec_partner' || row.contributor_type === 'ec_partner_plus') ecType = 'ranked_partner';
    else if (row.contributor_type === 'ec_enterprise') ecType = 'industry_leader';
    else ecType = 'industry_leader'; // ec_individual + anything else → industry_leader by default
  }

  // Stat slot mapping: form gives years_in_industry / revenue_value / geographic_reach + 1 custom.
  // Form's custom_stat is a single text field like "500+ Companies Trained" — parse value+label out.
  // Backfill / programmatic callers can pass row.ec_stat_custom_label + row.ec_stat_custom_value
  // directly to bypass the regex round-trip (which loses # prefix on rank values, etc.).
  let customLabel = row.ec_stat_custom_label || '';
  let customValue = row.ec_stat_custom_value || '';
  if (!customLabel && !customValue) {
    const customStat = row.custom_stat || '';
    const m = customStat.match(/^([\d,]+\+?)\s+(.+)$/);
    if (m) { customValue = m[1]; customLabel = m[2]; } else { customValue = customStat; }
  }

  // Videos / testimonials may arrive as JSONB array OR JSON string from postgres.
  const parseJsonArr = (v) => {
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' && v.trim()) { try { return JSON.parse(v); } catch (e) { return []; } }
    return [];
  };
  const videos = parseJsonArr(row.videos).slice(0, 7);
  const testis = parseJsonArr(row.testimonials).slice(0, 4);

  const acf = {
    ec_name:              fullName,
    ec_title_position:    titlePos,
    ec_contributor_type:  ecType,
    ec_hero_quote:        row.hero_quote || '',
    ec_linkedin_url:      row.linkedin_url || '',
    ec_website_url:       row.website_url || '',
    ec_expertise_bio:     row.bio || row.expertise_bio || '',
    ec_credentials:       row.credentials || '',
    ec_contrib_topics:    row.expertise_topics || '',
    ec_recognition:       row.recognition || '',
    ec_scores:            row.scores || row.ec_scores || '',
    ec_company_name:      company,
    ec_company_desc:      row.company_description || '',
    ec_stat_years:        row.years_in_industry || '',
    ec_stat_revenue:      row.revenue_value || '',
    ec_stat_markets:      row.geographic_reach || '',
    ec_stat_custom_label: customLabel,
    ec_stat_custom_value: customValue,
  };
  for (let i = 0; i < videos.length; i++) {
    acf[`ec_video_${i + 1}_title`] = videos[i].title || '';
    acf[`ec_video_${i + 1}_url`]   = videos[i].url || '';
  }
  for (let i = 0; i < testis.length; i++) {
    acf[`ec_testi_${i + 1}_quote`] = testis[i].quote || '';
    acf[`ec_testi_${i + 1}_name`]  = testis[i].name || '';
    acf[`ec_testi_${i + 1}_role`]  = testis[i].role || '';
  }
  return { acf, fullName, ecType };
}

function contributorSlug(fullName, ecType) {
  const slugLevel = {
    ranked_ceo: 'ranked-ceo',
    ranked_partner: 'ranked-partner',
    industry_leader: 'industry-leader',
    contributor: 'contributor',
  }[ecType] || 'contributor';
  const nameSlug = fullName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return `${nameSlug}-${slugLevel}`;
}

async function findStagingPageByName(fullName) {
  // Search by title — WP returns matches anywhere in title. We filter by exact title match
  // (ec_name meta isn't always exposed pre-mu-plugin, but title === fullName for our pages).
  const url = `${STAGING_P100_BASE}/wp-json/wp/v2/pages`;
  const res = await axios.get(url, {
    params: { search: fullName, per_page: 5, status: 'publish,draft,pending,private', _fields: 'id,slug,title,template,meta' },
    headers: { Authorization: stagingAuthHeader() },
    timeout: 10000,
  });
  const target = fullName.trim().toLowerCase();
  const matches = (res.data || []).filter(p => {
    if (p.template !== 'page-expert-contributor.php') return false;
    const titleMatch = (p.title && typeof p.title.rendered === 'string')
      && p.title.rendered.trim().toLowerCase() === target;
    const metaMatch = (p.meta && typeof p.meta.ec_name === 'string')
      && p.meta.ec_name.trim().toLowerCase() === target;
    return titleMatch || metaMatch;
  });
  return matches[0] || null;
}

// Mirror the canonical Power100 lander into IC as an `ic_expert_contributor`
// post (dark-themed gated copy). Idempotent on (_p100_source_id, slug).
// Non-blocking — Power100 write is the source of truth; IC mirror failures
// are logged but never surfaced to the caller.
async function mirrorToInnerCircle({ p100PageId, p100PageUrl, slug, fullName, meta, headshotUrl, companyLogoUrl, companyLogoUrlDark }) {
  if (!IC_API_KEY) {
    console.warn('[mirrorToInnerCircle] IC_API_KEY missing, skipping IC mirror');
    return null;
  }
  // IC routes contributor landers via tier-aware paths (/contributor/{slug} OR
  // /expert-contributor/{slug}); slugs are bare names with NO suffix. Strip any
  // legacy -contributor / -expert-contributor suffix before sending.
  const icSlug = String(slug || '').replace(/-(expert-contributor|contributor)$/i, '');
  try {
    const res = await axios.post(`${IC_WP_API}/expert-contributor/upsert`, {
      p100_page_id:     p100PageId,
      p100_page_url:    p100PageUrl,
      slug:             icSlug,
      title:            fullName,
      meta,
      headshot_url:          headshotUrl || null,
      company_logo_url:      companyLogoUrl || null,
      company_logo_url_dark: companyLogoUrlDark || null,
    }, {
      headers: { 'X-IC-API-Key': IC_API_KEY, 'Content-Type': 'application/json' },
      timeout: 25000, // image sideload can take a few seconds
    });
    console.log(`[mirrorToInnerCircle] ${res.data.action || 'synced'} ic_id=${res.data.ic_id} for "${fullName}"`);
    return res.data;
  } catch (err) {
    console.error(`[mirrorToInnerCircle] failed for "${fullName}":`, err.response?.data || err.message);
    return null;
  }
}

/**
 * Score a contributor row 0-100 by which lander-critical fields are populated.
 * Used by the gap-fill enrichment decision: form data scoring 70+ skips research
 * entirely; below 70, researchContributor() runs in gap-fill mode to ONLY
 * synthesize the empty fields, never touching what the user submitted.
 *
 * Weights are tuned so a "thin" row (just name + title + company) scores ~25,
 * a "decent" row (name + title + company + bio + headshot) scores ~55, and a
 * "form-complete" row (above + recognition + credentials) scores 75+.
 */
function completenessScore(row) {
  if (!row) return 0;
  const has = (v, minLen = 1) => {
    if (v === null || v === undefined) return false;
    const s = typeof v === 'string' ? v.trim() : String(v).trim();
    return s.length >= minLen;
  };
  const lineCount = v => has(v) ? String(v).split(/[\n\r]+/).filter(l => l.trim()).length : 0;

  let score = 0;
  if (has(row.headshot_url))               score += 20;
  if (has(row.bio, 120))                   score += 20;
  if (has(row.title_position))             score += 15;
  if (has(row.hero_quote))                 score += 10;
  if (lineCount(row.recognition) >= 3)     score += 10;
  if (lineCount(row.credentials) >= 3)     score += 10;
  if (lineCount(row.expertise_topics) >= 3) score += 5;
  if (has(row.company_description))        score += 5;
  if (has(row.linkedin_url))               score += 5;
  return score;
}

/**
 * Compute the list of fields that are MISSING (empty) on a row — used by
 * researchContributor() gap-fill mode to know what to synthesize.
 * Returns an array of canonical field names; pass to research as
 * `existingFields` (the inverse — fields TO PRESERVE) by omission.
 */
function missingFields(row) {
  const has = v => v !== null && v !== undefined && String(v).trim() !== '';
  const lineCount = v => has(v) ? String(v).split(/[\n\r]+/).filter(l => l.trim()).length : 0;
  const out = [];
  if (!has(row.bio))                       out.push('bio');
  if (!has(row.hero_quote))                out.push('hero_quote');
  if (!has(row.title_position))            out.push('title_position');
  if (lineCount(row.recognition) < 3)      out.push('recognition');
  if (lineCount(row.credentials) < 3)      out.push('credentials');
  if (lineCount(row.expertise_topics) < 3) out.push('expertise_topics');
  if (!has(row.scores))                    out.push('scores');
  if (!has(row.company_description))       out.push('company_description');
  if (!has(row.geographic_reach))          out.push('geographic_reach');
  if (!has(row.years_in_industry))         out.push('stat_years');
  if (!has(row.testimonials) || row.testimonials === '[]') out.push('testimonials');
  return out;
}

async function upsertContributorLander(row, opts = {}) {
  if (!row || !row.first_name || !row.last_name) {
    throw new Error('upsertContributorLander: row.first_name + row.last_name required');
  }
  const source = opts.source || 'unknown';

  // ── Optional gap-fill enrichment ──
  // When the caller passes `enrichOnGap: true` (form controllers) we score the
  // row's existing data density. If it's below threshold (default 70/100), we
  // run researchContributor() in GAP-FILL mode to populate the missing fields
  // ONLY. User-submitted form fields are never overwritten.
  if (opts.enrichOnGap) {
    const score = completenessScore(row);
    const threshold = opts.gapFillThreshold ?? 70;
    if (score < threshold) {
      const gaps = missingFields(row);
      if (gaps.length > 0) {
        console.log(`[upsertContributorLander] Gap-fill enrichment for "${row.first_name} ${row.last_name}" (score=${score}/${threshold}, gaps=${gaps.length}): ${gaps.join(', ')}`);
        try {
          const research = require('./contributorResearchService');
          const r = await research.researchContributor({
            name: `${row.first_name} ${row.last_name}`.trim(),
            company: row.company || undefined,
            knownLinkedinUrl: row.linkedin_url || undefined,
            websiteUrl: row.website_url || undefined,
            contributorClass: row.contributor_class || 'contributor',
            existingFields: gaps.reduce((acc, k) => {
              // Tell research what's "owned" by user (NOT in gaps) so Sonnet preserves them
              return acc;
            }, {}),
            gapFillFields: gaps,  // tell research which fields to synthesize
          });
          if (r.success && r.payload) {
            const p = r.payload;
            // Merge ONLY the gap fields back onto the row in-memory; never touch user-set data
            const mergeIfGap = (rowKey, payloadKey, transform) => {
              if (gaps.includes(payloadKey) || gaps.includes(rowKey)) {
                const v = transform ? transform(p[payloadKey]) : p[payloadKey];
                if (v !== undefined && v !== null && v !== '') row[rowKey] = v;
              }
            };
            mergeIfGap('bio', 'bio');
            mergeIfGap('hero_quote', 'hero_quote');
            mergeIfGap('title_position', 'title_position');
            mergeIfGap('recognition', 'recognition', v => Array.isArray(v) ? v.join('\n') : v);
            mergeIfGap('credentials', 'credentials', v => Array.isArray(v) ? v.join('\n') : v);
            mergeIfGap('expertise_topics', 'expertise_topics', v => Array.isArray(v) ? v.join('\n') : v);
            mergeIfGap('scores', 'scores', v => Array.isArray(v) ? v.join('\n') : v);
            mergeIfGap('company_description', 'company_description');
            mergeIfGap('geographic_reach', 'geographic_reach');
            mergeIfGap('years_in_industry', 'stat_years');
            mergeIfGap('testimonials', 'testimonials', v => v ? JSON.stringify(v) : null);
            // headshot: only fill if user didn't upload one
            if (!row.headshot_url && p.headshot_url) row.headshot_url = p.headshot_url;
            // linkedin_url: only fill if user didn't supply one
            if (!row.linkedin_url && p.linkedin_url) row.linkedin_url = p.linkedin_url;
            console.log(`[upsertContributorLander] Gap-fill complete (sources=${JSON.stringify(r.sources)}, li_verified=${r.linkedin_verified})`);
          }
        } catch (e) {
          console.warn(`[upsertContributorLander] Gap-fill enrichment failed (non-blocking): ${e.message}`);
        }
      }
    } else {
      console.log(`[upsertContributorLander] Skipping gap-fill (score=${score}/${threshold}, form data sufficient)`);
    }
  }

  const { acf, fullName, ecType } = rowToAcfFields(row);
  const auth = stagingAuthHeader();

  // staging has no ACF field group — write to raw post_meta via the
  // mu-register-ec-meta.php mu-plugin which exposes ec_* meta to REST.
  // Empty values dropped so they don't blank existing data on PATCH.
  const meta = {};
  for (const k in acf) {
    if (acf[k] !== undefined && acf[k] !== null && acf[k] !== '') meta[k] = acf[k];
  }

  // Slug for use in IC mirror (same on both sites)
  const slug = contributorSlug(fullName, ecType);

  // Pre-fetch existing page's ec_headshot meta if we have a wp_page_id —
  // this prevents the sideload from creating duplicate WP attachments on
  // re-runs (every re-fire would otherwise sideload a fresh copy).
  // Fail silently — if the GET fails, we fall through to maybe sideload.
  if (row.wp_page_id && Number.isFinite(parseInt(row.wp_page_id, 10)) && !meta.ec_headshot) {
    try {
      const pid = parseInt(row.wp_page_id, 10);
      const existing = await axios.get(
        `${STAGING_P100_BASE}/wp-json/wp/v2/pages/${pid}?_fields=meta`,
        { headers: { Authorization: auth }, timeout: 8000 }
      );
      if (existing.data && existing.data.meta && existing.data.meta.ec_headshot) {
        meta.ec_headshot = existing.data.meta.ec_headshot;
      }
    } catch (e) { /* fall through to sideload */ }
  }

  // If still no ec_headshot and we have a URL, sideload it once.
  if (row.headshot_url && !meta.ec_headshot) {
    try {
      const attId = await sideloadImageToStaging(row.headshot_url, slug);
      meta.ec_headshot = attId;
      console.log(`[upsertContributorLander] Sideloaded headshot ${attId} for "${fullName}"`);
    } catch (e) {
      console.warn(`[upsertContributorLander] Headshot sideload failed for "${fullName}":`, e.message);
    }
  }

  // ec_company_logo + ec_company_logo_dark: lookup chain — legacy map → sideload to staging.
  // Skip each variant if already set on existing page (preserves manual overrides).
  // Light variant powers P100 (light bg). Dark variant powers IC mirror (dark bg).
  if (meta.ec_company_name) {
    // Pull both existing variants from staging if we have a page reference
    if ((!meta.ec_company_logo || !meta.ec_company_logo_dark) &&
        row.wp_page_id && Number.isFinite(parseInt(row.wp_page_id, 10))) {
      try {
        const pid = parseInt(row.wp_page_id, 10);
        const ex = await axios.get(`${STAGING_P100_BASE}/wp-json/wp/v2/pages/${pid}?_fields=meta`,
          { headers: { Authorization: auth }, timeout: 8000 });
        if (!meta.ec_company_logo && ex.data?.meta?.ec_company_logo) {
          meta.ec_company_logo = ex.data.meta.ec_company_logo;
        }
        if (!meta.ec_company_logo_dark && ex.data?.meta?.ec_company_logo_dark) {
          meta.ec_company_logo_dark = ex.data.meta.ec_company_logo_dark;
        }
      } catch (e) { /* fall through */ }
    }
    // Sideload missing variants from the legacy map
    if (!meta.ec_company_logo || !meta.ec_company_logo_dark) {
      const variants = getCompanyLogoVariants(meta.ec_company_name);
      if (!meta.ec_company_logo && variants.light) {
        try {
          const id = await sideloadCompanyLogoToStaging(variants.light, meta.ec_company_name);
          meta.ec_company_logo = id;
          console.log(`[upsertContributorLander] Sideloaded company logo (light) ${id} for "${meta.ec_company_name}"`);
        } catch (e) {
          console.warn(`[upsertContributorLander] Logo (light) sideload failed for "${meta.ec_company_name}":`, e.message);
        }
      }
      if (!meta.ec_company_logo_dark && variants.dark) {
        try {
          const id = await sideloadCompanyLogoToStaging(variants.dark, `${meta.ec_company_name} dark`);
          meta.ec_company_logo_dark = id;
          console.log(`[upsertContributorLander] Sideloaded company logo (dark) ${id} for "${meta.ec_company_name}"`);
        } catch (e) {
          console.warn(`[upsertContributorLander] Logo (dark) sideload failed for "${meta.ec_company_name}":`, e.message);
        }
      }
    }
  }

  // Paid EC controllers (createExpertContributor, markPageLive) pass
  // ignoreStoredWpPageId=true because their row.wp_page_id refers to the
  // legacy power100.io page, NOT a staging page — using it would 404 then
  // fall through anyway. Skip path 1 to avoid the wasted REST call.
  // preserveExistingPageLink=true prevents the back-link UPDATE that would
  // overwrite the legacy URL with the staging URL (DRC dashboard still
  // needs the legacy URL until DNS cutover).
  const ignoreStoredId  = !!opts.ignoreStoredWpPageId;
  const preserveLegacy  = !!opts.preserveExistingPageLink;

  // 1. wp_page_id direct hit
  if (!ignoreStoredId && row.wp_page_id && Number.isFinite(parseInt(row.wp_page_id, 10))) {
    try {
      const pageId = parseInt(row.wp_page_id, 10);
      const url = `${STAGING_P100_BASE}/wp-json/wp/v2/pages/${pageId}`;
      const res = await axios.post(url, { meta }, {
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        timeout: 12000,
      });
      const pageUrl = res.data.link || `${STAGING_P100_BASE}/?page_id=${pageId}`;
      console.log(`[upsertContributorLander] Updated existing page ${pageId} for "${fullName}" (source=${source})`);
      const _v1 = getCompanyLogoVariants(meta.ec_company_name);
      mirrorToInnerCircle({ p100PageId: pageId, p100PageUrl: pageUrl, slug, fullName, meta, headshotUrl: row.headshot_url || null, companyLogoUrl: _v1.light, companyLogoUrlDark: _v1.dark });
      return { wp_page_id: pageId, wp_page_url: pageUrl, created: false, action: 'updated' };
    } catch (err) {
      // Fall through to lookup-by-name if the stored page_id is gone
      console.warn(`[upsertContributorLander] Stored wp_page_id ${row.wp_page_id} stale for "${fullName}", falling back to name search`);
    }
  }

  // 2. Name lookup
  let existing = null;
  try { existing = await findStagingPageByName(fullName); }
  catch (err) { console.error(`[upsertContributorLander] Name search failed for "${fullName}":`, err.message); }
  if (existing && existing.id) {
    const pageId = existing.id;
    const url = `${STAGING_P100_BASE}/wp-json/wp/v2/pages/${pageId}`;
    const res = await axios.post(url, { meta }, {
      headers: { Authorization: auth, 'Content-Type': 'application/json' },
      timeout: 12000,
    });
    const pageUrl = res.data.link || `${STAGING_P100_BASE}/?page_id=${pageId}`;
    if (row.id && !(preserveLegacy && row.wp_page_id)) {
      await query(
        'UPDATE expert_contributors SET wp_page_id = $1, wp_page_url = $2, updated_at = NOW() WHERE id = $3',
        [pageId, pageUrl, row.id]
      ).catch(e => console.warn(`[upsertContributorLander] Failed to back-link wp_page_id on row ${row.id}:`, e.message));
    }
    console.log(`[upsertContributorLander] Linked existing page ${pageId} for "${fullName}" (source=${source})`);
    const _v2 = getCompanyLogoVariants(meta.ec_company_name);
    mirrorToInnerCircle({ p100PageId: pageId, p100PageUrl: pageUrl, slug, fullName, meta, headshotUrl: row.headshot_url || null, companyLogoUrl: _v2.light, companyLogoUrlDark: _v2.dark });
    return { wp_page_id: pageId, wp_page_url: pageUrl, created: false, action: 'linked' };
  }

  // 3. Create new page (slug declared above for shared use with IC mirror).
  // Default is 'publish' — auto-enrichment is the primary path now and live
  // landers are the desired outcome. Pass opts.publishOnCreate=false for the
  // legacy operator-review-then-publish workflow.
  const createStatus = opts.publishOnCreate === false ? 'draft' : 'publish';
  const url = `${STAGING_P100_BASE}/wp-json/wp/v2/pages`;
  const res = await axios.post(url, {
    title:    fullName,
    slug,
    status:   createStatus,
    template: 'page-expert-contributor.php',
    meta,
  }, {
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  const pageId  = res.data.id;
  const pageUrl = res.data.link || `${STAGING_P100_BASE}/${slug}/`;
  // Skip back-link only if preserveLegacy=true AND there's actually a legacy
  // value to preserve. If row.wp_page_id is null, writing the staging ID is
  // the helpful behavior (nothing to overwrite).
  if (row.id && !(preserveLegacy && row.wp_page_id)) {
    await query(
      'UPDATE expert_contributors SET wp_page_id = $1, wp_page_url = $2, updated_at = NOW() WHERE id = $3',
      [pageId, pageUrl, row.id]
    ).catch(e => console.warn(`[upsertContributorLander] Failed to back-link wp_page_id on row ${row.id}:`, e.message));
  }
  console.log(`[upsertContributorLander] Created new page ${pageId} for "${fullName}" (source=${source}, type=${ecType})`);

  // 4. Mirror to IC (non-blocking — IC failure does not affect Power100 truth).
  // Always fired on first create; updated paths fire it too via the early-return branches.
  const _v3 = getCompanyLogoVariants(meta.ec_company_name);
  mirrorToInnerCircle({
    p100PageId:        pageId,
    p100PageUrl:       pageUrl,
    slug,
    fullName,
    meta,
    headshotUrl:       row.headshot_url || null,
    companyLogoUrl:    _v3.light,
    companyLogoUrlDark: _v3.dark,
  });

  return { wp_page_id: pageId, wp_page_url: pageUrl, created: true, action: 'created' };
}

// Used by Trigger 2 (episode-publish): creates a minimal contributor row from
// just speaker name+title+company+photo, then calls upsertContributorLander.
// Idempotent on (lower(name), company) within contributor_class='contributor'.
async function ensureContributorRowFromEpisode(speaker) {
  const name    = (speaker.name || '').trim();
  const company = (speaker.company || '').trim();
  if (!name) throw new Error('ensureContributorRowFromEpisode: speaker.name required');

  const parts = name.split(/\s+/);
  const firstName = parts[0];
  const lastName  = parts.slice(1).join(' ') || '(unknown)';
  const sourceTag = speaker.episode_post_id ? `episode_publish:ic-${speaker.episode_post_id}` : 'episode_publish';

  // Look up by name + company (no email — speakers don't have one). Match on contributor_class.
  const existing = await query(
    `SELECT id, first_name, last_name, email, phone, company, title_position, hero_quote, bio,
            linkedin_url, website_url, headshot_url, years_in_industry, revenue_value, geographic_reach,
            custom_stat, credentials, expertise_topics, recognition, company_description,
            videos, testimonials, contributor_class, contributor_type, source, wp_page_id, wp_page_url
       FROM expert_contributors
      WHERE LOWER(first_name) = LOWER($1) AND LOWER(last_name) = LOWER($2)
        AND (LOWER(COALESCE(company,'')) = LOWER($3) OR $3 = '')
      LIMIT 1`,
    [firstName, lastName, company]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  // Create a minimal row
  const result = await query(
    `INSERT INTO expert_contributors
       (first_name, last_name, email, company, title_position, headshot_url,
        contributor_class, contributor_type, source, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'contributor', 'show_guest', $7, 'lead',
             CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
     RETURNING *`,
    [
      firstName, lastName,
      `episode-speaker+${firstName}.${lastName}@power100.io`.toLowerCase().replace(/\s+/g, ''),
      company || null,
      speaker.title || null,
      speaker.photo_url || null,
      sourceTag,
    ]
  );
  console.log(`[ensureContributorRowFromEpisode] Created lead row for "${name}" from ${sourceTag}`);
  return result.rows[0];
}

module.exports = {
  syncArticles,
  linkEcPages,
  detectRankings,
  propagatePhotos,
  enrichSingleLeader,
  runFullEnrichment,
  upsertContributorLander,
  completenessScore,
  missingFields,
  ensureContributorRowFromEpisode,
};
