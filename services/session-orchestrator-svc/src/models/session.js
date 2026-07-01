/**
 * Session Model — Database operations for notarization_sessions.
 * Enforces the session state machine at the application level
 * (DB trigger provides additional safety net).
 */
const { db } = require('@sealproof/shared');

// ---------------------------------------------------------------------------
// State machine definition (§5.2.3)
// ---------------------------------------------------------------------------
const STATUS_TRANSITIONS = {
  created:            ['kyc_pending', 'rejected', 'failed'],
  kyc_pending:        ['kyc_complete', 'rejected', 'failed'],
  kyc_complete:       ['queued', 'rejected', 'failed'],
  queued:             ['matched_to_notary', 'rejected', 'failed'],
  matched_to_notary:  ['in_session', 'rejected', 'failed'],
  in_session:         ['completed', 'rejected', 'failed'],
  // Terminal states — no transitions out
  completed:          [],
  rejected:           [],
  failed:             [],
};

// Timestamp columns to set on each transition
const TRANSITION_TIMESTAMPS = {
  kyc_pending:       'kyc_started_at',
  kyc_complete:      'kyc_completed_at',
  queued:            'queued_at',
  matched_to_notary: 'matched_to_notary_at',
  in_session:        'session_started_at',
  completed:         'completed_at',
};

/**
 * Validate a state transition.
 */
function validateTransition(currentStatus, newStatus) {
  const allowed = STATUS_TRANSITIONS[currentStatus];
  if (!allowed) {
    throw Object.assign(
      new Error(`Cannot transition from terminal status: ${currentStatus}`),
      { status: 409 }
    );
  }
  if (!allowed.includes(newStatus)) {
    throw Object.assign(
      new Error(`Invalid transition: ${currentStatus} -> ${newStatus}`),
      { status: 409 }
    );
  }
}

/**
 * Create a new session.
 */
async function create(data) {
  const result = await db.query(
    `INSERT INTO notarization_sessions
      (customer_id, api_partner_id, document_type, document_count,
       signer_count, state_of_act, ron_session_type,
       customer_paid_cents)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      data.customer_id,
      data.api_partner_id || null,
      data.document_type,
      data.document_count || 1,
      data.signer_count || 1,
      data.state_of_act || 'NC',
      data.ron_session_type || 'standard',
      data.customer_paid_cents || null,
    ]
  );
  return result.rows[0];
}

/**
 * Find session by ID.
 */
async function findById(id) {
  const result = await db.query('SELECT * FROM notarization_sessions WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Transition session to a new status (validated).
 * Also sets the appropriate timestamp column and optional metadata.
 */
async function transitionStatus(id, newStatus, metadata = {}) {
  const session = await findById(id);
  if (!session) return null;

  validateTransition(session.status, newStatus);

  const setClauses = ['status = $1', 'updated_at = NOW()'];
  const values = [newStatus];
  let idx = 2;

  // Set transition timestamp
  const tsCol = TRANSITION_TIMESTAMPS[newStatus];
  if (tsCol) {
    setClauses.push(`${tsCol} = NOW()`);
  }

  // Set optional metadata (notary_id, shift_id, etc.)
  const metaFields = [
    'notary_id', 'shift_id', 'kyc_provider', 'kyc_session_id',
    'kyc_result', 'kyc_failure_reason', 'livekit_room_id',
    'recording_url', 'recording_encryption_key_id',
    'session_duration_seconds', 'customer_paid_cents',
    'notary_payout_cents', 'platform_revenue_cents',
    'payment_transaction_id', 'rejected_reason',
  ];

  for (const field of metaFields) {
    if (metadata[field] !== undefined) {
      setClauses.push(`${field} = $${idx}`);
      values.push(metadata[field]);
      idx++;
    }
  }

  // Also set session_ended_at for terminal states
  if (['completed', 'rejected', 'failed'].includes(newStatus)) {
    setClauses.push('session_ended_at = NOW()');
  }

  values.push(id);

  const result = await db.query(
    `UPDATE notarization_sessions SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
}

/**
 * Get session queue (sessions waiting for a notary).
 */
async function getQueue({ state, sessionType } = {}) {
  const conditions = ["status = 'queued'"];
  const values = [];
  let idx = 1;

  if (state) {
    conditions.push(`state_of_act = $${idx++}`);
    values.push(state);
  }
  if (sessionType) {
    conditions.push(`ron_session_type = $${idx++}`);
    values.push(sessionType);
  }

  const result = await db.query(
    `SELECT * FROM notarization_sessions
     WHERE ${conditions.join(' AND ')}
     ORDER BY
       CASE WHEN ron_session_type = 'rush' THEN 0 ELSE 1 END,
       queued_at ASC`,
    values
  );
  return result.rows;
}

/**
 * List sessions with filters.
 */
async function list({ status, customerId, notaryId, apiPartnerId, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (status)       { conditions.push(`status = $${idx++}`); values.push(status); }
  if (customerId)   { conditions.push(`customer_id = $${idx++}`); values.push(customerId); }
  if (notaryId)     { conditions.push(`notary_id = $${idx++}`); values.push(notaryId); }
  if (apiPartnerId) { conditions.push(`api_partner_id = $${idx++}`); values.push(apiPartnerId); }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  values.push(limit, offset);

  const result = await db.query(
    `SELECT * FROM notarization_sessions ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    values
  );
  return result.rows;
}

/**
 * Check if a notary currently has an active session.
 */
async function notaryHasActiveSession(notaryId) {
  const result = await db.query(
    `SELECT id FROM notarization_sessions
     WHERE notary_id = $1 AND status IN ('matched_to_notary', 'in_session')
     LIMIT 1`,
    [notaryId]
  );
  return result.rows.length > 0;
}

module.exports = {
  create, findById, transitionStatus, getQueue, list,
  notaryHasActiveSession, validateTransition,
  STATUS_TRANSITIONS,
};
