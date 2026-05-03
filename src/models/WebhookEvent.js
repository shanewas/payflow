const db = require('../config/database');

const WebhookEvent = {
  async create({ event_id, event_type, payment_intent_id }) {
    const { rows } = await db.query(
      `INSERT INTO webhook_events (event_id, event_type, payment_intent_id, status)
       VALUES ($1, $2, $3, 'pending')
       ON CONFLICT (event_id) DO NOTHING
       RETURNING *`,
      [event_id, event_type, payment_intent_id]
    );
    return rows[0];
  },

  async findByEventId(event_id) {
    const { rows } = await db.query(
      'SELECT * FROM webhook_events WHERE event_id = $1',
      [event_id]
    );
    return rows[0];
  },

  async markAsProcessed(event_id) {
    const { rows } = await db.query(
      `UPDATE webhook_events 
       SET status = 'processed', processed_at = NOW()
       WHERE event_id = $1
       RETURNING *`,
      [event_id]
    );
    return rows[0];
  },

  async markAsFailed(event_id, error_message) {
    const { rows } = await db.query(
      `UPDATE webhook_events 
       SET status = 'failed', processed_at = NOW()
       WHERE event_id = $1
       RETURNING *`,
      [event_id]
    );
    return rows[0];
  },

  async isProcessed(event_id) {
    const { rows } = await db.query(
      "SELECT 1 FROM webhook_events WHERE event_id = $1 AND status = 'processed'",
      [event_id]
    );
    return rows.length > 0;
  },
};

module.exports = WebhookEvent;
