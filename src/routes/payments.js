const express = require('express');
const { stripe } = require('../config/stripe');
const authMiddleware = require('../middleware/auth');
const { validatePaymentCreation } = require('../middleware/validate');
const Payment = require('../models/Payment');
const { generalLimiter, paymentIntentLimiter } = require('../middleware/rateLimiter');
const db = require('../config/database');

const router = express.Router();

// @route   GET /payments
// @desc    Get user's payment history with pagination and filtering
// @access  Private
router.get('/', generalLimiter, authMiddleware, async (req, res, next) => {
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
router.get('/:id', generalLimiter, authMiddleware, async (req, res, next) => {
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
router.post('/:id/refund', generalLimiter, authMiddleware, async (req, res, next) => {
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
    paymentIntentLimiter,
    authMiddleware,
    validatePaymentCreation,
    async (req, res, next) => {
        const idempotencyKey = req.get('Idempotency-Key');

        if (idempotencyKey) {
            try {
                const { rows } = await db.query('SELECT response FROM idempotency_keys WHERE key = $1', [idempotencyKey]);
                if (rows.length > 0) {
                    console.log(`Idempotency key match found for ${idempotencyKey}. Returning cached response.`);
                    return res.status(200).json(rows[0].response);
                }
            } catch (dbError) {
                console.error('Error checking idempotency key:', dbError);
                // If the DB check fails, we can either fail the request or proceed.
                // For this implementation, we'll proceed but log the error.
            }
        }

        try {
            const { amount, currency } = req.body;
            const userId = req.user.id;

            // Create a PaymentIntent with the order amount and currency
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100), // convert to cents
                currency,
                metadata: { userId },
            });

            const responsePayload = {
                clientSecret: paymentIntent.client_secret,
            };

            if (idempotencyKey) {
                try {
                    await db.query('INSERT INTO idempotency_keys (key, response) VALUES ($1, $2)', [idempotencyKey, responsePayload]);
                } catch (dbError) {
                    console.error('Error saving idempotency key:', dbError);
                    // If this fails, we don't fail the whole request, but we log the issue.
                    // A background process could retry saving these.
                }
            }

            res.status(201).send(responsePayload);
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;
