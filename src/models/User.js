const db = require('../config/database');

const User = {
  async create({ email, password_hash, full_name }) {
    const { rows } = await db.query(
      'INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING *',
      [email, password_hash, full_name]
    );
    return rows[0];
  },

  async findById(id) {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0];
  },

  async findByEmail(email) {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return rows[0];
  },

  async update(id, { email, password_hash, full_name, is_active }) {
    const { rows } = await db.query(
      'UPDATE users SET email = $1, password_hash = $2, full_name = $3, is_active = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [email, password_hash, full_name, is_active, id]
    );
    return rows[0];
  },

  async delete(id) {
    const { rows } = await db.query('DELETE FROM users WHERE id = $1 RETURNING *', [id]);
    return rows[0];
  }
};

module.exports = User;
