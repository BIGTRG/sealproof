/**
 * SealProof — PostgreSQL Connection Pool
 * Shared across all services via @sealproof/shared.
 */
const { Pool } = require('pg');
const config = require('../config');
const logger = require('../utils/logger');

const pool = new Pool({
  connectionString: config.db.url,
  min: config.db.pool.min,
  max: config.db.pool.max,
});

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message });
});

pool.on('connect', () => {
  logger.debug('PostgreSQL client connected');
});

/**
 * Execute a parameterized query.
 * @param {string} text  SQL query with $1, $2, ... placeholders
 * @param {any[]}  params  Parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params = []) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  logger.debug('SQL query', { text: text.substring(0, 80), duration, rows: result.rowCount });
  return result;
}

/**
 * Get a client from the pool for transactions.
 * Caller MUST call client.release() when done.
 */
async function getClient() {
  return pool.connect();
}

/**
 * Run a function inside a transaction.
 * Auto-commits on success, rolls back on error.
 */
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, getClient, transaction };
