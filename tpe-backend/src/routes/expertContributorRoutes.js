const express = require('express');
const router = express.Router();
const { createExpertContributor, updatePaymentStatus } = require('../controllers/expertContributorController');

// Public - called from presentation page after Stripe payment
router.post('/', createExpertContributor);

// Public - called to update payment status after confirmPayment
router.post('/payment-status', updatePaymentStatus);

module.exports = router;
