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
function computeEntryHash(entry, prevHash) {
  const payload = JSON.stringify({
    notary_id: entry.notary_id,
    seq: entry.entry_sequence_number,
    timestamp: entry.entry_timestamp instanceof Date
      ? entry.entry_timestamp.toISOString()
      : entry.entry_timestamp,
    signer_name: entry.signer_name,
    signer_address: entry.signer_address,
    document_description: entry.document_description,
    document_date: entry.document_date instanceof Date
      ? entry.document_date.toISOString()
      : entry.document_date,
    act_type: entry.notarial_act_type,
    fee: entry.fee_charged_cents,
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
