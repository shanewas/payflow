const express = require('express');
const { stripe } = require('../config/stripe');
const authMiddleware = require('../middleware/auth');
const { validatePaymentCreation } = require('../middleware/validate');
const Payment = require('../models/Payment');
const { generalLimiter, paymentIntentLimiter } = require('../middleware/rateLimiter');
const db = require('../config/database');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Payment management
 */

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Get user's payment history
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by payment status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: A list of payments
 *       401:
 *         description: Unauthorized
 */
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

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: Get payment details
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Payment details
 *       404:
 *         description: Payment not found
 *       403:
 *         description: Forbidden
 */
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

/**
 * @swagger
 * /payments/{id}/refund:
 *   post:
 *     summary: Refund a payment
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Payment ID
 *     responses:
 *       200:
 *         description: Refund successful
 *       400:
 *         description: Invalid request
 *       404:
 *         description: Payment not found
 */
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

/**
 * @swagger
 * /payments/intent:
 *   post:
 *     summary: Create a payment intent
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *     responses:
 *       201:
 *         description: Payment intent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 clientSecret:
 *                   type: string
 *       400:
 *         description: Invalid input
 */
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
