const express = require('express');
const stripe = require('../config/stripe');
const Payment = require('../models/Payment');

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

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntentSucceeded = event.data.object;
      await Payment.updateStatusByStripeId(paymentIntentSucceeded.id, 'succeeded');
      console.log(`PaymentIntent for ${paymentIntentSucceeded.amount} was successful!`);
      break;
    case 'payment_intent.payment_failed':
      const paymentIntentFailed = event.data.object;
      await Payment.updateStatusByStripeId(paymentIntentFailed.id, 'failed');
      console.log(`PaymentIntent for ${paymentIntentFailed.amount} failed.`);
      break;
    case 'payment_intent.canceled':
        const paymentIntentCanceled = event.data.object;
        await Payment.updateStatusByStripeId(paymentIntentCanceled.id, 'canceled');
        console.log(`PaymentIntent for ${paymentIntentCanceled.amount} was canceled.`);
        break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.send();
});

module.exports = router;
