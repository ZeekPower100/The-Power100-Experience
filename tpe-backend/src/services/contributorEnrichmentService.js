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
  const customStat = row.custom_stat || '';
  let customLabel = '', customValue = '';
  const m = customStat.match(/^([\d,]+\+?)\s+(.+)$/);
  if (m) { customValue = m[1]; customLabel = m[2]; } else { customValue = customStat; }

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
async function mirrorToInnerCircle({ p100PageId, p100PageUrl, slug, fullName, meta, headshotUrl }) {
  if (!IC_API_KEY) {
    console.warn('[mirrorToInnerCircle] IC_API_KEY missing, skipping IC mirror');
    return null;
  }
  try {
    const res = await axios.post(`${IC_WP_API}/expert-contributor/upsert`, {
      p100_page_id:  p100PageId,
      p100_page_url: p100PageUrl,
      slug,
      title:         fullName,
      meta,
      headshot_url:  headshotUrl || null,
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

async function upsertContributorLander(row, opts = {}) {
  if (!row || !row.first_name || !row.last_name) {
    throw new Error('upsertContributorLander: row.first_name + row.last_name required');
  }
  const source = opts.source || 'unknown';
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

  // 1. wp_page_id direct hit
  if (row.wp_page_id && Number.isFinite(parseInt(row.wp_page_id, 10))) {
    try {
      const pageId = parseInt(row.wp_page_id, 10);
      const url = `${STAGING_P100_BASE}/wp-json/wp/v2/pages/${pageId}`;
      const res = await axios.post(url, { meta }, {
        headers: { Authorization: auth, 'Content-Type': 'application/json' },
        timeout: 12000,
      });
      const pageUrl = res.data.link || `${STAGING_P100_BASE}/?page_id=${pageId}`;
      console.log(`[upsertContributorLander] Updated existing page ${pageId} for "${fullName}" (source=${source})`);
      mirrorToInnerCircle({ p100PageId: pageId, p100PageUrl: pageUrl, slug, fullName, meta, headshotUrl: row.headshot_url || null });
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
    if (row.id) {
      await query(
        'UPDATE expert_contributors SET wp_page_id = $1, wp_page_url = $2, updated_at = NOW() WHERE id = $3',
        [pageId, pageUrl, row.id]
      ).catch(e => console.warn(`[upsertContributorLander] Failed to back-link wp_page_id on row ${row.id}:`, e.message));
    }
    console.log(`[upsertContributorLander] Linked existing page ${pageId} for "${fullName}" (source=${source})`);
    mirrorToInnerCircle({ p100PageId: pageId, p100PageUrl: pageUrl, slug, fullName, meta, headshotUrl: row.headshot_url || null });
    return { wp_page_id: pageId, wp_page_url: pageUrl, created: false, action: 'linked' };
  }

  // 3. Create new draft page (slug declared above for shared use with IC mirror)
  const url = `${STAGING_P100_BASE}/wp-json/wp/v2/pages`;
  const res = await axios.post(url, {
    title:    fullName,
    slug,
    status:   'draft',
    template: 'page-expert-contributor.php',
    meta,
  }, {
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  const pageId  = res.data.id;
  const pageUrl = res.data.link || `${STAGING_P100_BASE}/${slug}/`;
  if (row.id) {
    await query(
      'UPDATE expert_contributors SET wp_page_id = $1, wp_page_url = $2, updated_at = NOW() WHERE id = $3',
      [pageId, pageUrl, row.id]
    ).catch(e => console.warn(`[upsertContributorLander] Failed to back-link wp_page_id on row ${row.id}:`, e.message));
  }
  console.log(`[upsertContributorLander] Created new page ${pageId} for "${fullName}" (source=${source}, type=${ecType})`);

  // 4. Mirror to IC (non-blocking — IC failure does not affect Power100 truth).
  // Always fired on first create; updated paths fire it too via the early-return branches.
  mirrorToInnerCircle({
    p100PageId:  pageId,
    p100PageUrl: pageUrl,
    slug,
    fullName,
    meta,
    headshotUrl: row.headshot_url || null,
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
  ensureContributorRowFromEpisode,
};
