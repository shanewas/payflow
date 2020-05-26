const db = require('../config/database');

const Order = {
  async create({ user_id, total_amount, items, status = 'pending', shipping_address }) {
    const { rows } = await db.query(
      'INSERT INTO orders (user_id, total_amount, items, status, shipping_address) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, total_amount, items, status, shipping_address]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM orders WHERE id = $1', [id]);
    return rows[0];
  },

  async findByUserId(userId) {
    const { rows } = await db.query('SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
    return rows;
  },

  async updateStatus(id, status) {
    const { rows } = await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    return rows[0];
  },

  async attachPayment(orderId, paymentId) {
    const { rows } = await db.query(
      'UPDATE orders SET payment_id = $1 WHERE id = $2 RETURNING *',
      [paymentId, orderId]
    );
    return rows[0];
  },
};

module.exports = Order;
