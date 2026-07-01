/**
 * Hash Chain Verification Tests
 *
 * Tests the SHA-256 hash chain logic used by journal-svc
 * to maintain immutable, tamper-evident notary journal entries
 * per NCGS 10B-118.
 */
const crypto = require('crypto');

// Inline the hash chain logic (mirrors journal-svc/src/utils/hashChain.js)
function computeEntryHash(entry, prevHash) {
  const payload = JSON.stringify({
    notary_id: entry.notary_id,
    entry_sequence_number: entry.entry_sequence_number,
    entry_timestamp: entry.entry_timestamp,
    signer_name: entry.signer_name,
    signer_address: entry.signer_address,
    document_description: entry.document_description,
    document_date: entry.document_date,
    notarial_act_type: entry.notarial_act_type,
    fee_charged_cents: entry.fee_charged_cents,
    id_verification_method: entry.id_verification_method,
    prev_entry_hash: prevHash || null,
  });
  return crypto.createHash('sha256').update(payload).digest('hex');
}

function verifyChain(entries) {
  const sorted = [...entries].sort(
    (a, b) => a.entry_sequence_number - b.entry_sequence_number
  );
  for (let i = 0; i < sorted.length; i++) {
    const entry = sorted[i];
    const prevHash = i === 0 ? null : sorted[i - 1].entry_hash;
    const expectedHash = computeEntryHash(entry, prevHash);
    if (expectedHash !== entry.entry_hash) {
      return {
        intact: false,
        brokenAt: entry.entry_sequence_number,
        expected: expectedHash,
        actual: entry.entry_hash,
      };
    }
  }
  return { intact: true, totalEntries: sorted.length };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Hash Chain', () => {
  const notaryId = 'n-test-001';

  function makeEntry(seq, prevHash) {
    const entry = {
      notary_id: notaryId,
      entry_sequence_number: seq,
      entry_timestamp: `2026-05-${String(seq).padStart(2, '0')}T10:00:00Z`,
      signer_name: `Signer ${seq}`,
      signer_address: `${seq}00 Main St, Raleigh, NC 27601`,
      document_description: `Power of Attorney #${seq}`,
      document_date: `2026-05-${String(seq).padStart(2, '0')}`,
      notarial_act_type: 'acknowledgment',
      fee_charged_cents: 2500,
      id_verification_method: 'identity_proofing',
    };
    entry.prev_entry_hash = prevHash || null;
    entry.entry_hash = computeEntryHash(entry, prevHash);
    return entry;
  }

  test('should produce deterministic hashes', () => {
    const entry1a = makeEntry(1, null);
    const entry1b = makeEntry(1, null);
    expect(entry1a.entry_hash).toBe(entry1b.entry_hash);
  });

  test('should produce different hashes for different entries', () => {
    const entry1 = makeEntry(1, null);
    const entry2 = makeEntry(2, entry1.entry_hash);
    expect(entry1.entry_hash).not.toBe(entry2.entry_hash);
  });

  test('should chain correctly with prev_entry_hash', () => {
    const entry1 = makeEntry(1, null);
    const entry2 = makeEntry(2, entry1.entry_hash);
    const entry3 = makeEntry(3, entry2.entry_hash);

    expect(entry1.prev_entry_hash).toBeNull();
    expect(entry2.prev_entry_hash).toBe(entry1.entry_hash);
    expect(entry3.prev_entry_hash).toBe(entry2.entry_hash);
  });

  test('should verify an intact chain', () => {
    const entry1 = makeEntry(1, null);
    const entry2 = makeEntry(2, entry1.entry_hash);
    const entry3 = makeEntry(3, entry2.entry_hash);

    const result = verifyChain([entry1, entry2, entry3]);
    expect(result.intact).toBe(true);
    expect(result.totalEntries).toBe(3);
  });

  test('should verify an intact chain regardless of input order', () => {
    const entry1 = makeEntry(1, null);
    const entry2 = makeEntry(2, entry1.entry_hash);
    const entry3 = makeEntry(3, entry2.entry_hash);

    // Pass in reverse order
    const result = verifyChain([entry3, entry1, entry2]);
    expect(result.intact).toBe(true);
  });

  test('should detect tampering (modified signer name)', () => {
    const entry1 = makeEntry(1, null);
    const entry2 = makeEntry(2, entry1.entry_hash);
    const entry3 = makeEntry(3, entry2.entry_hash);

    // Tamper with entry 2
    entry2.signer_name = 'TAMPERED NAME';

    const result = verifyChain([entry1, entry2, entry3]);
    expect(result.intact).toBe(false);
    expect(result.brokenAt).toBe(2);
  });

  test('should detect tampering (modified fee)', () => {
    const entry1 = makeEntry(1, null);
    const entry2 = makeEntry(2, entry1.entry_hash);

    entry1.fee_charged_cents = 9999;

    const result = verifyChain([entry1, entry2]);
    expect(result.intact).toBe(false);
    expect(result.brokenAt).toBe(1);
  });

  test('should detect a broken chain link (hash mismatch cascades)', () => {
    const entry1 = makeEntry(1, null);
    const entry2 = makeEntry(2, entry1.entry_hash);
    const entry3 = makeEntry(3, entry2.entry_hash);

    // Forge entry2 with wrong prev hash
    entry2.entry_hash = 'forged_hash_value';

    const result = verifyChain([entry1, entry2, entry3]);
    expect(result.intact).toBe(false);
    expect(result.brokenAt).toBe(2);
  });

  test('should handle a single-entry chain', () => {
    const entry1 = makeEntry(1, null);
    const result = verifyChain([entry1]);
    expect(result.intact).toBe(true);
    expect(result.totalEntries).toBe(1);
  });

  test('should handle an empty chain', () => {
    const result = verifyChain([]);
    expect(result.intact).toBe(true);
    expect(result.totalEntries).toBe(0);
  });

  test('hash output should be 64 hex characters (SHA-256)', () => {
    const entry1 = makeEntry(1, null);
    expect(entry1.entry_hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
