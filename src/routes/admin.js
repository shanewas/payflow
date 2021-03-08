const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const Payment = require('../models/Payment');
const db = require('../config/database');
const { stripe } = require('../config/stripe');

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin-only operations
 */

// @route   GET /admin/payments
// @desc    Get all payments with filters
// @access  Admin
/**
 * @swagger
 * /admin/payments:
 *   get:
 *     summary: Get all payments with filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: userId
 *         schema:
 *           type: integer
 *       - in: query
 *         name: email
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: A list of payments
 *       401:
 *         description: Unauthorized
 */
router.get('/payments', adminAuth, async (req, res, next) => {
    try {
        const { status, page = 1, limit = 10, userId, email } = req.query;
        const filters = { status, page, limit, userId, email };
        const payments = await Payment.findAllWithFilters(filters);
        res.json(payments);
    } catch (error) {
        next(error);
    }
});

// @route   GET /admin/stats
// @desc    Get revenue and counts
// @access  Admin
/**
 * @swagger
 * /admin/stats:
 *   get:
 *     summary: Get revenue and counts
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', adminAuth, async (req, res, next) => {
    try {
        const totalVolume = await db.query("SELECT SUM(amount) FROM payments WHERE status = 'succeeded'");
        const totalPayments = await db.query("SELECT COUNT(*) FROM payments WHERE status = 'succeeded'");
        const totalUsers = await db.query('SELECT COUNT(*) FROM users');
        
        res.json({
            total_volume: parseFloat(totalVolume.rows[0].sum) || 0,
            total_payments: parseInt(totalPayments.rows[0].count, 10) || 0,
            total_users: parseInt(totalUsers.rows[0].count, 10) || 0,
        });
    } catch (error) {
        next(error);
    }
});

// @route   POST /admin/refund/:id
// @desc    Refund a specific payment
// @access  Admin
/**
 * @swagger
 * /admin/refund/{id}:
 *   post:
 *     summary: Refund a specific payment
 *     tags: [Admin]
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
router.post('/refund/:id', adminAuth, async (req, res, next) => {
    try {
        const paymentId = parseInt(req.params.id, 10);
        if (isNaN(paymentId)) {
            return res.status(400).json({ message: 'Invalid payment ID.' });
        }

        const payment = await Payment.findById(paymentId);
        if (!payment) {
            return res.status(404).json({ message: 'Payment not found.' });
        }

        if (payment.status !== 'succeeded') {
            return res.status(400).json({ message: 'Payment is not in a refundable state.' });
        }

        const refund = await stripe.refunds.create({
            payment_intent: payment.stripe_payment_intent_id,
        });

        const updatedPayment = await Payment.updateStatus(payment.id, 'refunded');

        res.json({
            message: 'Refund successful',
            payment: updatedPayment,
            refund,
        });
    } catch (error) {
        if (error.type === 'StripeInvalidRequestError') {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
});

module.exports = router;
