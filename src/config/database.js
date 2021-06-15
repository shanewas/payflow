const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', () => {
  console.log('Connected to the database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: async (text, params) => {
    const start = Date.now();
    try {
      const res = await pool.query(text, params);
      const duration = Date.now() - start;
      if (process.env.NODE_ENV === 'development' && duration > 100) {
        console.log('Executed query', { text, duration, rows: res.rowCount });
      }
      return res;
    } catch (err) {
      console.error('Query error', { text, err });
      throw err;
    }
  },
  close: () => {
    console.log('Closing database connection pool');
    return pool.end();
  },
};
