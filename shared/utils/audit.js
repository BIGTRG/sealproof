/**
 * SealProof — Audit Log Emitter
 * Every state change MUST emit an audit log entry (§4.2 invariant).
 */
const { query } = require('../db/pool');
const logger = require('./logger');

/**
 * Emit an audit log entry.
 * @param {object} params
 * @param {string} params.eventType    e.g. 'session.created', 'notary.approved'
 * @param {string} params.actorType    'customer' | 'notary' | 'admin' | 'system' | 'api_partner'
 * @param {string} [params.actorId]    UUID of the actor
 * @param {string} [params.sessionId]  UUID of the session (if applicable)
 * @param {string} [params.notaryId]   UUID of the notary (if applicable)
 * @param {string} [params.customerId] UUID of the customer (if applicable)
 * @param {object} params.payload      Arbitrary JSON payload with event details
 * @param {string} [params.ipAddress]  Client IP
 * @param {string} [params.userAgent]  Client user agent
 * @returns {Promise<object>} The created audit log entry
 */
async function emitAuditLog({
  eventType,
  actorType,
  actorId = null,
  sessionId = null,
  notaryId = null,
  customerId = null,
  payload = {},
  ipAddress = null,
  userAgent = null,
}) {
  try {
    const result = await query(
      `INSERT INTO audit_log
        (event_type, actor_type, actor_id, session_id, notary_id, customer_id,
         payload, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [eventType, actorType, actorId, sessionId, notaryId, customerId,
       JSON.stringify(payload), ipAddress, userAgent]
    );
    logger.debug('Audit log emitted', { eventType, actorType, sessionId });
    return result.rows[0];
  } catch (err) {
    // Audit log failures must not crash the caller, but MUST be logged loudly
    logger.error('CRITICAL: Failed to emit audit log', {
      eventType, actorType, sessionId, error: err.message,
    });
    throw err;
  }
}

module.exports = { emitAuditLog };
