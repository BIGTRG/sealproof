/**
 * Notary Matching Algorithm (§5.2.3)
 *
 * Round-robin fairness: assigns the notary who has been idle the longest.
 *
 * Algorithm:
 *   1. Filter notaries on shift in the correct state
 *   2. Filter by language (if specified)
 *   3. Filter by load (max 1 active session per notary)
 *   4. Sort by longest-since-last-session (round-robin fairness)
 *   5. Return first candidate
 */
const { db } = require('@sealproof/shared');
const { redis: { redis } } = require('@sealproof/shared');

const PRESENCE_PREFIX = 'presence:notary:';

/**
 * Find the best available notary for a session.
 * @param {object} params
 * @param {string} params.state       State of the notarial act (e.g., 'NC')
 * @param {string} [params.language]  Customer's preferred language
 * @returns {Promise<object|null>} The matched notary row, or null if none available
 */
async function findBestNotary({ state, language }) {
  // Step 1: Get all notaries currently present in Redis and available
  const presentKeys = [];
  let cursor = '0';
  do {
    const [newCursor, batch] = await redis.scan(cursor, 'MATCH', PRESENCE_PREFIX + '*', 'COUNT', 100);
    cursor = newCursor;
    presentKeys.push(...batch);
  } while (cursor !== '0');

  if (presentKeys.length === 0) return null;

  // Get presence data to filter available-only
  const presenceValues = await redis.mget(...presentKeys);
  const availableNotaryIds = [];

  for (const raw of presenceValues) {
    if (!raw) continue;
    const p = JSON.parse(raw);
    if (p.status === 'available') {
      availableNotaryIds.push(p.notary_id);
    }
  }

  if (availableNotaryIds.length === 0) return null;

  // Step 2-4: DB query combining state filter, language filter,
  //           active-session exclusion, and round-robin sort
  const placeholders = availableNotaryIds.map((_, i) => `$${i + 1}`).join(', ');
  const values = [...availableNotaryIds];
  let idx = availableNotaryIds.length + 1;

  let languageFilter = '';
  if (language) {
    languageFilter = `AND $${idx}::text = ANY(n.languages)`;
    values.push(language);
    idx++;
  }

  values.push(state);

  const result = await db.query(
    `SELECT n.*
     FROM notaries n
     JOIN notary_shifts ns ON ns.notary_id = n.id AND ns.status = 'active'
     WHERE n.id IN (${placeholders})
       AND n.is_active = true
       AND n.state = $${idx}
       ${languageFilter}
       -- Exclude notaries with an active session (max 1 per notary)
       AND NOT EXISTS (
         SELECT 1 FROM notarization_sessions s
         WHERE s.notary_id = n.id
           AND s.status IN ('matched_to_notary', 'in_session')
       )
     ORDER BY (
       SELECT COALESCE(MAX(s2.session_ended_at), '1970-01-01'::timestamp)
       FROM notarization_sessions s2
       WHERE s2.notary_id = n.id AND s2.status = 'completed'
     ) ASC
     LIMIT 1`,
    values
  );

  return result.rows[0] || null;
}

module.exports = { findBestNotary };
