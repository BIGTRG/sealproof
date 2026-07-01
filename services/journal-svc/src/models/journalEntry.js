/**
 * Journal Entry Model
 *
 * Immutable journal entries per NCGS 10B-118.
 * Entries are append-only — the DB trigger prevents UPDATE/DELETE.
 * Each entry hashes the previous entry's hash for tamper detection.
 */
const { db } = require('@sealproof/shared');
const { computeEntryHash } = require('../utils/hashChain');

const GENESIS_HASH = '0'.repeat(64);

/**
 * Create a new journal entry for a completed session.
 *
 * Atomic operation:
 *   1. Get the latest entry for this notary (for seq + prev_hash)
 *   2. Compute new hash
 *   3. Insert (sequence enforced at application level)
 */
async function create(data) {
  return db.transaction(async (client) => {
    // Get last entry for this notary
    const lastResult = await client.query(
      `SELECT entry_sequence_number, entry_hash
       FROM notary_journal_entries
       WHERE notary_id = $1
       ORDER BY entry_sequence_number DESC
       LIMIT 1
       FOR UPDATE`, // Lock to prevent concurrent inserts for same notary
      [data.notary_id]
    );

    const lastEntry = lastResult.rows[0];
    const nextSeq = lastEntry ? lastEntry.entry_sequence_number + 1 : 1;
    const prevHash = lastEntry ? lastEntry.entry_hash : GENESIS_HASH;

    // Build entry payload
    const entry = {
      notary_id: data.notary_id,
      session_id: data.session_id,
      entry_sequence_number: nextSeq,
      entry_timestamp: new Date(),
      signer_name: data.signer_name,
      signer_address: data.signer_address || '',
      document_description: data.document_description,
      document_date: data.document_date || new Date(),
      notarial_act_type: data.notarial_act_type || 'acknowledgment',
      fee_charged_cents: data.fee_charged_cents || 0,
      id_verification_method: data.id_verification_method || 'credential_analysis',
    };

    // Compute hash
    const entryHash = computeEntryHash(entry, prevHash);

    // Insert (immutable — trigger prevents modification)
    const result = await client.query(
      `INSERT INTO notary_journal_entries
        (notary_id, session_id, entry_sequence_number, entry_timestamp,
         signer_name, signer_address, document_description, document_date,
         notarial_act_type, fee_charged_cents, id_verification_method,
         entry_hash, prev_entry_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        entry.notary_id, data.session_id, nextSeq, entry.entry_timestamp,
        entry.signer_name, entry.signer_address, entry.document_description,
        entry.document_date, entry.notarial_act_type, entry.fee_charged_cents,
        entry.id_verification_method, entryHash, prevHash,
      ]
    );

    return result.rows[0];
  });
}

/**
 * Get all journal entries for a notary.
 */
async function getByNotary(notaryId, { limit = 500, offset = 0 } = {}) {
  const result = await db.query(
    `SELECT * FROM notary_journal_entries
     WHERE notary_id = $1
     ORDER BY entry_sequence_number ASC
     LIMIT $2 OFFSET $3`,
    [notaryId, limit, offset]
  );
  return result.rows;
}

/**
 * Get journal entries for an audit export (date range).
 */
async function getForAudit({ notaryId, from, to }) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (notaryId) {
    conditions.push(`notary_id = $${idx++}`);
    values.push(notaryId);
  }
  if (from) {
    conditions.push(`entry_timestamp >= $${idx++}`);
    values.push(from);
  }
  if (to) {
    conditions.push(`entry_timestamp <= $${idx++}`);
    values.push(to);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const result = await db.query(
    `SELECT * FROM notary_journal_entries ${where}
     ORDER BY notary_id, entry_sequence_number ASC`,
    values
  );
  return result.rows;
}

/**
 * Get a single entry by ID.
 */
async function findById(id) {
  const result = await db.query(
    'SELECT * FROM notary_journal_entries WHERE id = $1', [id]
  );
  return result.rows[0] || null;
}

/**
 * Count entries for a notary.
 */
async function countByNotary(notaryId) {
  const result = await db.query(
    'SELECT COUNT(*) FROM notary_journal_entries WHERE notary_id = $1',
    [notaryId]
  );
  return parseInt(result.rows[0].count);
}

module.exports = { create, getByNotary, getForAudit, findById, countByNotary };
