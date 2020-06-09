const express = require('express');
const stripe = require('../config/stripe');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /checkout
// @desc    Create a payment intent for an order
// @access  Private
router.post('/', auth, async (req, res, next) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return res.status(400).json({ msg: 'Order ID is required.' });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ msg: 'Order not found.' });
    }

    if (order.user_id.toString() !== userId) {
      return res.status(403).json({ msg: 'Not authorized to pay for this order.' });
    }

    if (order.status !== 'pending') {
      return res.status(400).json({ msg: `Order is not pending. Current status: ${order.status}` });
    }
    
    // In a real app, currency should be stored with the order or come from user profile/site settings.
    const currency = 'usd';

    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripe.paymentIntents.create({
      amount: order.total_amount,
      currency: currency,
      metadata: { orderId: order.id },
    });

    // Create a new payment record in our database
    const newPayment = await Payment.create({
      user_id: userId,
      stripe_payment_intent_id: paymentIntent.id,
      amount: order.total_amount,
      currency: currency,
      status: 'requires_payment_method',
    });

    // Link the payment to the order
    await Order.attachPayment(order.id, newPayment.id);

    res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      order: {
        id: order.id,
        totalAmount: order.total_amount,
        currency: currency,
      },
      paymentId: newPayment.id
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
