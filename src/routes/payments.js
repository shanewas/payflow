const express = require('express');
const { stripe } = require('../config/stripe');
const authMiddleware = require('../middleware/auth');
const { validatePaymentCreation } = require('../middleware/validate');
const Payment = require('../models/Payment');

const router = express.Router();

// @route   GET /payments
// @desc    Get user's payment history with pagination and filtering
// @access  Private
router.get('/', authMiddleware, async (req, res, next) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const userId = req.user.id;

        const results = await Payment.findByUserIdWithFilters(userId, { status, page, limit });

        res.json(results);
    } catch (error) {
        next(error);
    }
});

// @route   GET /payments/:id
// @desc    Get payment details
// @access  Private
router.get('/:id', authMiddleware, async (req, res, next) => {
    try {
        const paymentId = parseInt(req.params.id, 10);
        if (isNaN(paymentId)) {
            return res.status(400).json({ message: 'Invalid payment ID.' });
        }
        const userId = req.user.id;

        const payment = await Payment.findDetailsById(paymentId);

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found.' });
        }

        if (payment.user_id !== userId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        res.json(payment);
    } catch (error) {
        next(error);
    }
});

// @route   POST /payments/:id/refund
// @desc    Refund a payment
// @access  Private
router.post('/:id/refund', authMiddleware, async (req, res, next) => {
    try {
        const paymentId = parseInt(req.params.id, 10);
        if (isNaN(paymentId)) {
            return res.status(400).json({ message: 'Invalid payment ID.' });
        }
        const userId = req.user.id;

        const payment = await Payment.findById(paymentId);

        if (!payment) {
            return res.status(404).json({ message: 'Payment not found.' });
        }

        if (payment.user_id !== userId) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        if (payment.status !== 'succeeded') {
            return res.status(400).json({ message: 'Payment is not in a refundable state.' });
        }

        // Create a refund via Stripe
        const refund = await stripe.refunds.create({
            payment_intent: payment.stripe_payment_intent_id,
        });

        // Update payment status in our database
        const updatedPayment = await Payment.updateStatus(payment.id, 'refunded');

        res.json({
            message: 'Refund successful',
            payment: updatedPayment,
            refund,
        });
    } catch (error) {
        // Handle Stripe-specific errors
        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
});

router.post(
    '/intent',
    authMiddleware,
    validatePaymentCreation,
    async (req, res, next) => {
        try {
            const { amount, currency } = req.body;
            const userId = req.user.id;

            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // convert to cents
                currency,
                metadata: { userId },
            });

            // Save the payment intent to our database
            await Payment.create({
                user_id: userId,
                stripe_payment_intent_id: paymentIntent.id,
                amount,
                currency,
                status: 'pending',
            });

            res.status(201).send({
                clientSecret: paymentIntent.client_secret,
            });
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
