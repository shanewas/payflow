require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env') });
const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function migrate() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY
    )
  `);

  const { rows } = await db.query('SELECT version FROM schema_migrations');
  const runMigrations = rows.map(row => row.version);

  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    if (!runMigrations.includes(file)) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await db.query(sql);
      await db.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
    }
  }

  console.log('Migrations are up to date.');
  await db.close();
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
