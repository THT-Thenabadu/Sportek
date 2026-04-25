const express = require('express');
const router = express.Router();
const { stripeWebhook } = require('../controllers/bookingController');

// POST /api/payments/webhook
// Raw body is applied in index.js via: app.use('/api/payments/webhook', express.raw({ type: 'application/json' }))
// This MUST remain unprotected (no auth middleware) — Stripe signs the payload itself.
router.post('/webhook', stripeWebhook);

module.exports = router;
