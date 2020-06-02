const express = require('express');
const Order = require('../models/Order');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /orders
// @desc    Create a new order
// @access  Private
router.post('/', auth, async (req, res, next) => {
  try {
    const { items, shipping_address } = req.body;
    const user_id = req.user.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ msg: 'Order must contain at least one item.' });
    }

    // In a real application, you would fetch product prices from your database
    // to prevent price tampering on the client-side.
    const total_amount = items.reduce((acc, item) => {
      if (typeof item.price !== 'number' || typeof item.quantity !== 'number' || item.price <= 0 || item.quantity <= 0) {
        throw new Error('Invalid item price or quantity.');
      }
      return acc + (item.price * item.quantity);
    }, 0);

    const newOrder = await Order.create({
      user_id,
      items,
      total_amount,
      shipping_address,
    });

    res.status(201).json(newOrder);
  } catch (err) {
    if (err.message === 'Invalid item price or quantity.') {
        return res.status(400).json({ msg: err.message });
    }
    next(err);
  }
});

module.exports = router;
