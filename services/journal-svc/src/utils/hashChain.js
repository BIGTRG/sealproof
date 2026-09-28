/**
 * Hash Chain Utilities — NCGS 10B-118 Compliance
 *
 * Every journal entry is hashed with the previous entry's hash,
 * forming a tamper-evident chain per notary. If any entry is
 * modified, the chain breaks at that point.
 */
const crypto = require('crypto');

/**
 * Compute the SHA-256 hash for a journal entry.
 *
 * Per §5.2.7 of the master build prompt:
 * hash = SHA-256(JSON({
 *   notary_id, seq, timestamp, signer_name, signer_address,
 *   document_description, document_date, act_type, fee,
 *   id_method, prev_hash
 * }))
 */
/**
 * Canonical forms so the hash is identical when computed from the in-memory
 * entry at write time and from the row read back from Postgres:
 *  - entry_timestamp: ISO-8601 truncated to whole seconds (TIMESTAMP round-trip
 *    loses/changes sub-second precision depending on driver and column type)
 *  - document_date: calendar date only (column is DATE)
 */
function canonTimestamp(v) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
function canonDate(v) {
  if (!v) return null;
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  // DATE columns come back as local-midnight Date objects; use local Y-M-D
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function computeEntryHash(entry, prevHash) {
  const payload = JSON.stringify({
    notary_id: entry.notary_id,
    seq: Number(entry.entry_sequence_number),
    timestamp: canonTimestamp(entry.entry_timestamp),
    signer_name: entry.signer_name,
    signer_address: entry.signer_address,
    document_description: entry.document_description,
    document_date: canonDate(entry.document_date),
    act_type: entry.notarial_act_type,
    fee: Number(entry.fee_charged_cents),
    id_method: entry.id_verification_method,
    prev_hash: prevHash,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Verify an entire chain for a notary.
 * Returns { valid, entries_checked, break_at_seq } if broken.
 */
function verifyChain(entries) {
  if (entries.length === 0) return { valid: true, entries_checked: 0 };

  // Entries must be sorted by entry_sequence_number ASC
  const sorted = [...entries].sort(
    (a, b) => a.entry_sequence_number - b.entry_sequence_number
  );

  let prevHash = '0'.repeat(64); // Genesis hash

  for (const entry of sorted) {
    const expected = computeEntryHash(entry, prevHash);
    if (expected !== entry.entry_hash) {
      return {
        valid: false,
        entries_checked: entry.entry_sequence_number,
        break_at_seq: entry.entry_sequence_number,
        expected_hash: expected,
        actual_hash: entry.entry_hash,
      };
    }
    prevHash = entry.entry_hash;
  }

  return { valid: true, entries_checked: sorted.length };
}

module.exports = { computeEntryHash, verifyChain };
