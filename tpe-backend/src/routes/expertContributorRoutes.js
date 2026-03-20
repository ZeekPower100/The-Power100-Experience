const express = require('express');
const router = express.Router();
const { createExpertContributor, updatePaymentStatus, getDelegateProfile, completeDelegateProfile, linkCompany, markPageLive, getDrcStatus } = require('../controllers/expertContributorController');

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

module.exports = router;
