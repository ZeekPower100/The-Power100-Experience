const express = require('express');
const router = express.Router();
const { createExpertContributor, updatePaymentStatus, getDelegateProfile, completeDelegateProfile, linkCompany, markPageLive, getDrcStatus, getEcsByRep, createFromForm, upsertFromEpisode } = require('../controllers/expertContributorController');

/**
 * X-API-Key auth — mirrors /api/sales-agent/* (TPX_SALES_AGENT_API_KEY env).
 * Used for DRC dashboard endpoints called by the rankings system.
 */
function drcApiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) {
    return res.status(401).json({ success: false, error: 'API key required. Set X-API-Key header.' });
  }
  if (apiKey !== process.env.TPX_SALES_AGENT_API_KEY) {
    return res.status(403).json({ success: false, error: 'Invalid API key.' });
  }
  next();
}

// Public - called from presentation page after Stripe payment
router.post('/', createExpertContributor);

// Public - called to update payment status after confirmPayment
router.post('/payment-status', updatePaymentStatus);

// Public - delegate profile lookup by token
router.get('/delegate/:token', getDelegateProfile);

// Public - delegate profile completion
router.post('/delegate/:token/complete', completeDelegateProfile);

// EC-DRC Integration endpoints
router.post('/:id/link-company', linkCompany);
router.post('/:id/page-live', markPageLive);
router.get('/:id/drc-status', getDrcStatus);

// DRC dashboard: rep's EC pipeline ("Your EC Pipeline" widget)
router.get('/by-rep/:rankings_user_id', drcApiKeyAuth, getEcsByRep);

// n8n EC intake adapter — called after WP draft page is created
router.post('/from-form', drcApiKeyAuth, createFromForm);

// IC speaker-sync hook — called once per speaker per episode publish
router.post('/upsert-from-episode', drcApiKeyAuth, upsertFromEpisode);

module.exports = router;
