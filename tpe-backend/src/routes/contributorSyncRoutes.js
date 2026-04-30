const express = require('express');
const router = express.Router();
const { syncFromStaging } = require('../controllers/contributorSyncController');

// POST /api/contributor-sync/from-staging
// Body: { wp_page_id: <int> }
// Header: X-Sync-Secret: <CONTRIBUTOR_SYNC_SECRET>
router.post('/from-staging', syncFromStaging);

module.exports = router;
