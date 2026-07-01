/**
 * SealProof — Migration Runner
 * Reads .sql files from migrations/ in order and applies them.
 * Tracks applied migrations in the _migrations table.
 *
 * Usage: node shared/db/migrate.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function run() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://sealproof_app:changeme@localhost:5432/sealproof',
  });

  try {
    // Ensure _migrations table exists (bootstrap)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Get already-applied migrations
    const applied = await pool.query('SELECT name FROM _migrations ORDER BY id');
    const appliedNames = new Set(applied.rows.map((r) => r.name));

    // Read migration files
    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    let count = 0;
    for (const file of files) {
      const name = file.replace('.sql', '');
      if (appliedNames.has(name)) {
        console.log(`  SKIP  ${file} (already applied)`);
        continue;
      }

      console.log(`  APPLY ${file} ...`);
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      await pool.query(sql);
      count++;
      console.log(`  OK    ${file}`);
    }

    console.log(`\nDone. ${count} migration(s) applied, ${appliedNames.size} already up-to-date.`);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
