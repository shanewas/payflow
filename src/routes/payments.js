const express = require('express');
const { stripe } = require('../config/stripe');
const auth = require('../middleware/auth');
const { paymentIntentValidation, validate } = require('../middleware/validate');
// const Payment = require('../models/Payment'); // To be added in Phase 19

const router = express.Router();

// Create a new payment intent
router.post('/intent', auth, paymentIntentValidation(), validate, async (req, res, next) => {
  try {
    const { amount, currency } = req.body;
    const { id: userId } = req.user;

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Amount in cents
      currency,
      metadata: { userId },
    });

    // TODO: Phase 19 - Save the payment intent to the database
    // await Payment.create({
    //   user_id: userId,
    //   stripe_payment_intent_id: paymentIntent.id,
    //   amount: amount,
    //   currency,
    //   status: 'pending',
    // });

    res.status(201).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
