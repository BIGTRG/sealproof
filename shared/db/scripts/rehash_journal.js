/**
 * One-time: recompute the journal hash chain with the canonical hash function
 * (fixes entries written before the DATE/TIMESTAMP canonicalisation fix).
 * Run as root on the server: node shared/db/scripts/rehash_journal.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env') });
const { Pool } = require('pg');
const { computeEntryHash } = require('../../../services/journal-svc/src/utils/hashChain');

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Run beforehand as superuser: ALTER TABLE notary_journal_entries DISABLE TRIGGER trg_journal_immutable_update;
    const notaries = (await client.query('SELECT DISTINCT notary_id FROM notary_journal_entries')).rows;
    let fixed = 0;
    for (const { notary_id } of notaries) {
      const rows = (await client.query('SELECT * FROM notary_journal_entries WHERE notary_id = $1 ORDER BY entry_sequence_number', [notary_id])).rows;
      let prev = '0'.repeat(64);
      for (const row of rows) {
        const h = computeEntryHash(row, prev);
        if (h !== row.entry_hash || prev !== row.prev_entry_hash) {
          await client.query('UPDATE notary_journal_entries SET entry_hash = $1, prev_entry_hash = $2 WHERE id = $3', [h, prev, row.id]);
          fixed++;
        }
        prev = h;
      }
    }
    // Afterwards: ALTER TABLE notary_journal_entries ENABLE TRIGGER trg_journal_immutable_update;
    await client.query('COMMIT');
    console.log(`rehashed ${fixed} entries across ${notaries.length} notaries`);
  } catch (e) { await client.query('ROLLBACK'); console.error(e); process.exit(1); }
  finally { client.release(); await pool.end(); }
})();
