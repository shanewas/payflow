const express = require('express');
const { stripe } = require('../config/stripe');
const Payment = require('../models/Payment');

const router = express.Router();

router.post('/stripe', async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed.`, err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} was successful!`);
      const payment = await Payment.findByStripeId(paymentIntent.id);
      if (payment) {
        await Payment.updateStatus(payment.id, 'succeeded');
      }
      break;
    }
    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object;
      console.log(`PaymentIntent for ${paymentIntent.amount} failed.`);
      const payment = await Payment.findByStripeId(paymentIntent.id);
      if (payment) {
        await Payment.updateStatus(payment.id, 'failed');
      }
      break;
    }
    case 'payment_intent.canceled': {
        const paymentIntent = event.data.object;
        console.log(`PaymentIntent for ${paymentIntent.amount} was canceled.`);
        const payment = await Payment.findByStripeId(paymentIntent.id);
        if (payment) {
          await Payment.updateStatus(payment.id, 'canceled');
        }
        break;
      }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.status(200).json({ received: true });
});

module.exports = router;
