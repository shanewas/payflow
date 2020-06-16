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

  async findByUserIdWithFilters(userId, { status, page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM payments WHERE user_id = $1';
    let countQuery = 'SELECT COUNT(*) FROM payments WHERE user_id = $1';
    const queryParams = [userId];

    if (status) {
      queryParams.push(status);
      query += ` AND status = $${queryParams.length}`;
      countQuery += ` AND status = $${queryParams.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const { rows: payments } = await db.query(query, queryParams);
    const { rows: countRows } = await db.query(countQuery, queryParams.slice(0, status ? 2 : 1));
    
    const total = parseInt(countRows[0].count, 10);

    return {
      payments,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit),
    };
  },

  async updateStatus(id, status) {
    const { rows } = await db.query(
      'UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [status, id]
    );
    return rows[0];
  },

  async updateStatusByStripeId(stripeId, status) {
    const { rows } = await db.query(
      'UPDATE payments SET status = $1 WHERE stripe_payment_intent_id = $2 RETURNING *',
      [status, stripeId]
    );
    return rows[0];
  }
};

module.exports = Payment;
