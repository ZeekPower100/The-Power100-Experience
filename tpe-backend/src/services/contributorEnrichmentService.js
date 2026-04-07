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
const IC_API_KEY = process.env.TPX_IC_API_KEY;

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

    // Build slug from name
    const slug = leader.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const url = `https://power100.io/${slug}-ceo-lander/`;

    try {
      const res = await axios.head(url, { timeout: 5000, validateStatus: s => s < 500 });
      if (res.status === 200) {
        // Fetch the page to extract rank number
        const pageRes = await axios.get(url, { timeout: 10000 });
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
            meta_value: url,
          });
          results.found++;
          console.log(`[ContributorEnrichment] Found ranking: ${leader.name} #${rank}`);
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

  // Check for ranked CEO lander
  try {
    const rankRes = await axios.head(`https://power100.io/${slug}-ceo-lander/`, {
      timeout: 5000, validateStatus: s => s < 500,
    });
    if (rankRes.status === 200) {
      results.rankedCeo = `https://power100.io/${slug}-ceo-lander/`;
    }
  } catch (err) { /* not ranked */ }

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

module.exports = {
  syncArticles,
  linkEcPages,
  detectRankings,
  propagatePhotos,
  enrichSingleLeader,
  runFullEnrichment,
};
