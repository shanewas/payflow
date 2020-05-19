const express = require('express');
const stripe = require('../config/stripe');
const webhookService = require('../services/webhookService');

const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Delegate event processing to the webhook service
  await webhookService.handleWebhookEvent(event);

  res.send();
});

module.exports = router;
