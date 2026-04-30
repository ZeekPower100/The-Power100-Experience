// DATABASE-CHECKED: expert_contributors columns verified on 2026-04-30
// Endpoint that the staging WP `save_post_page` hook calls when an
// ec_contributor_type page is saved. Pulls that one page's meta and
// reverse-syncs to the matching tpedb expert_contributors row.
//
// Auth: shared-secret header X-Sync-Secret (matches CONTRIBUTOR_SYNC_SECRET env).
// Behavior: ADDITIVE ONLY. Never overwrites a populated tpedb column.
// Idempotent: returns no_change if everything already aligns.

const { syncFromStagingByWpPageId } = require('../services/contributorReverseSyncService');

async function syncFromStaging(req, res) {
  try {
    const provided = req.get('x-sync-secret') || req.body?.secret;
    const expected = process.env.CONTRIBUTOR_SYNC_SECRET;
    if (!expected) {
      console.error('[contributorSync] CONTRIBUTOR_SYNC_SECRET not set in env');
      return res.status(500).json({ success: false, error: 'sync secret not configured' });
    }
    if (!provided || provided !== expected) {
      return res.status(401).json({ success: false, error: 'invalid sync secret' });
    }

    const wpPageId = parseInt(req.body?.wp_page_id, 10);
    if (!Number.isFinite(wpPageId) || wpPageId <= 0) {
      return res.status(400).json({ success: false, error: 'wp_page_id required (positive integer)' });
    }

    const result = await syncFromStagingByWpPageId(wpPageId, { force: false, allowEmailMatch: false });

    // Concise log line for observability
    if (result.status === 'updated') {
      console.log(`[contributorSync] wp_page=${wpPageId} → tpedb=${result.tpedb_id} filled:`, result.fields_filled.join(','));
    } else {
      console.log(`[contributorSync] wp_page=${wpPageId} → ${result.status}`);
    }

    return res.json({ success: true, ...result });
  } catch (err) {
    console.error('[contributorSync] error:', err.message, err.stack);
    return res.status(500).json({ success: false, error: 'sync failed' });
  }
}

module.exports = { syncFromStaging };
