/**
 * Presence Model — Redis-based real-time presence tracking.
 *
 * Key format:  presence:notary:{notaryId}
 * Value:       JSON { notary_id, shift_id, status, last_heartbeat }
 * TTL:         90 seconds (refreshed by heartbeat every 30s)
 *
 * Per §5.2.2: Redis presence:notary:{id} = TTL'd key, 90 seconds;
 * refreshed by heartbeat from notary app.
 */
const { redis: { redis }, config } = require('@sealproof/shared');

const PRESENCE_PREFIX = 'presence:notary:';
const TTL = config.presence.ttlSeconds; // 90s

/**
 * Set or refresh a notary's presence (heartbeat).
 */
async function setPresence(notaryId, { shiftId, status = 'available' }) {
  const key = PRESENCE_PREFIX + notaryId;
  const value = JSON.stringify({
    notary_id: notaryId,
    shift_id: shiftId,
    status, // available | in_session | break
    last_heartbeat: new Date().toISOString(),
  });
  await redis.setex(key, TTL, value);
}

/**
 * Get a notary's current presence.
 * Returns null if TTL expired (notary considered offline).
 */
async function getPresence(notaryId) {
  const key = PRESENCE_PREFIX + notaryId;
  const raw = await redis.get(key);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Remove a notary's presence (explicit check-out).
 */
async function removePresence(notaryId) {
  const key = PRESENCE_PREFIX + notaryId;
  await redis.del(key);
}

/**
 * Get all currently-present notaries.
 * Scans the presence:notary:* keyspace.
 */
async function getAllPresent() {
  const keys = [];
  let cursor = '0';

  do {
    const [newCursor, batch] = await redis.scan(cursor, 'MATCH', PRESENCE_PREFIX + '*', 'COUNT', 100);
    cursor = newCursor;
    keys.push(...batch);
  } while (cursor !== '0');

  if (keys.length === 0) return [];

  const values = await redis.mget(...keys);
  return values
    .filter(Boolean)
    .map((v) => JSON.parse(v));
}

/**
 * Get available notaries (present + status === 'available').
 */
async function getAvailable() {
  const all = await getAllPresent();
  return all.filter((p) => p.status === 'available');
}

/**
 * Update presence status (e.g., available → in_session).
 */
async function updateStatus(notaryId, newStatus) {
  const current = await getPresence(notaryId);
  if (!current) return null;
  current.status = newStatus;
  current.last_heartbeat = new Date().toISOString();
  const key = PRESENCE_PREFIX + notaryId;
  await redis.setex(key, TTL, JSON.stringify(current));
  return current;
}

module.exports = { setPresence, getPresence, removePresence, getAllPresent, getAvailable, updateStatus };
