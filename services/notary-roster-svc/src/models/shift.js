/**
 * Shift Model — Database operations for notary_shifts.
 */
const { db } = require('@sealproof/shared');

const VALID_STATUSES = ['scheduled', 'active', 'completed', 'cancelled', 'no_show'];

/**
 * Create a new shift for a notary.
 */
async function create({ notary_id, shift_start, shift_end }) {
  // Validate no overlapping shifts for this notary
  const overlap = await db.query(
    `SELECT id FROM notary_shifts
     WHERE notary_id = $1
       AND status IN ('scheduled', 'active')
       AND shift_start < $3
       AND shift_end > $2`,
    [notary_id, shift_start, shift_end]
  );

  if (overlap.rows.length > 0) {
    const err = new Error('Shift overlaps with an existing scheduled or active shift');
    err.status = 409;
    throw err;
  }

  const result = await db.query(
    `INSERT INTO notary_shifts (notary_id, shift_start, shift_end)
     VALUES ($1, $2, $3) RETURNING *`,
    [notary_id, shift_start, shift_end]
  );
  return result.rows[0];
}

/**
 * Find shift by ID.
 */
async function findById(id) {
  const result = await db.query('SELECT * FROM notary_shifts WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Cancel a shift (with notice rules: cannot cancel if shift already active).
 */
async function cancel(id) {
  const shift = await findById(id);
  if (!shift) return null;

  if (shift.status === 'active') {
    const err = new Error('Cannot cancel an active shift. Check out first.');
    err.status = 409;
    throw err;
  }
  if (shift.status !== 'scheduled') {
    const err = new Error(`Cannot cancel a shift with status: ${shift.status}`);
    err.status = 409;
    throw err;
  }

  const result = await db.query(
    `UPDATE notary_shifts SET status = 'cancelled' WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
}

/**
 * Check in to a shift (notary clocks in).
 */
async function checkIn(id) {
  const shift = await findById(id);
  if (!shift) return null;

  if (shift.status !== 'scheduled') {
    const err = new Error(`Cannot check in: shift status is ${shift.status}`);
    err.status = 409;
    throw err;
  }

  const result = await db.query(
    `UPDATE notary_shifts
     SET status = 'active', checked_in_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
}

/**
 * Check out of a shift (notary clocks out).
 */
async function checkOut(id) {
  const shift = await findById(id);
  if (!shift) return null;

  if (shift.status !== 'active') {
    const err = new Error(`Cannot check out: shift status is ${shift.status}`);
    err.status = 409;
    throw err;
  }

  const result = await db.query(
    `UPDATE notary_shifts
     SET status = 'completed', checked_out_at = NOW()
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
}

/**
 * Increment sessions_handled counter.
 */
async function incrementSessionCount(id) {
  const result = await db.query(
    `UPDATE notary_shifts
     SET sessions_handled = sessions_handled + 1
     WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0];
}

/**
 * Get shifts for a notary.
 */
async function listByNotary(notaryId, { status, limit = 50, offset = 0 } = {}) {
  const conditions = ['notary_id = $1'];
  const values = [notaryId];
  let idx = 2;

  if (status) {
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }

  values.push(limit, offset);
  const result = await db.query(
    `SELECT * FROM notary_shifts
     WHERE ${conditions.join(' AND ')}
     ORDER BY shift_start DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    values
  );
  return result.rows;
}

/**
 * Get currently active shifts (for roster/coverage).
 */
async function getActiveShifts(state) {
  const result = await db.query(
    `SELECT ns.*, n.full_legal_name, n.display_name, n.languages, n.state
     FROM notary_shifts ns
     JOIN notaries n ON n.id = ns.notary_id
     WHERE ns.status = 'active'
       AND n.is_active = true
       ${state ? 'AND n.state = $1' : ''}
     ORDER BY ns.checked_in_at ASC`,
    state ? [state] : []
  );
  return result.rows;
}

module.exports = {
  create, findById, cancel, checkIn, checkOut,
  incrementSessionCount, listByNotary, getActiveShifts,
};
