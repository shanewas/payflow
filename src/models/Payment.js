const db = require('../config/database');

const Payment = {
  async create({ user_id, stripe_payment_intent_id, amount, currency, status }) {
    const { rows } = await db.query(
      'INSERT INTO payments (user_id, stripe_payment_intent_id, amount, currency, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, stripe_payment_intent_id, amount, currency, status]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM payments WHERE id = $1', [id]);
    return rows[0];
  },

  async findByStripeId(stripeId) {
    const { rows } = await db.query('SELECT * FROM payments WHERE stripe_payment_intent_id = $1', [stripeId]);
    return rows[0];
  },

  async findByUserId(userId) {
    const { rows } = await db.query('SELECT * FROM payments WHERE user_id = $1', [userId]);
    return rows;
  },

  async updateStatus(id, status) {
    const { rows } = await db.query(
      'UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    return rows[0];
  },
};

module.exports = Payment;
