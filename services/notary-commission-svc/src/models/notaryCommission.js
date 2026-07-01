/**
 * Notary Commission Model (Multi-State)
 *
 * Manages commissions across multiple states for a single notary.
 * A notary can hold RON commissions in multiple states simultaneously.
 * Each commission has its own credentials, bond, E&O, and status.
 */
const { db } = require('@sealproof/shared');

const VALID_STATUSES = ['pending_review', 'approved', 'suspended', 'expired', 'revoked'];
const VALID_COMMISSION_TYPES = ['traditional', 'electronic', 'remote_online'];

/**
 * Add a commission for a notary in a specific state.
 */
async function create(data) {
  const result = await db.query(
    `INSERT INTO notary_commissions (
      notary_id, state_code, commission_number, commission_type,
      commission_issued_at, commission_expires_at,
      electronic_notary_id, ren_authorization_id,
      surety_bond_provider, surety_bond_number, surety_bond_amount_cents, surety_bond_expires_at,
      eando_provider, eando_policy_number, eando_coverage_cents, eando_expires_at,
      commission_cert_url, bond_cert_url, eando_cert_url
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
    RETURNING *`,
    [
      data.notary_id, data.state_code.toUpperCase(),
      data.commission_number, data.commission_type || 'remote_online',
      data.commission_issued_at || null, data.commission_expires_at,
      data.electronic_notary_id || null, data.ren_authorization_id || null,
      data.surety_bond_provider || null, data.surety_bond_number || null,
      data.surety_bond_amount_cents || null, data.surety_bond_expires_at || null,
      data.eando_provider || null, data.eando_policy_number || null,
      data.eando_coverage_cents || null, data.eando_expires_at || null,
      data.commission_cert_url || null, data.bond_cert_url || null,
      data.eando_cert_url || null,
    ]
  );
  return result.rows[0];
}

/**
 * Get all commissions for a notary.
 */
async function getByNotary(notaryId) {
  const result = await db.query(
    `SELECT nc.*, sr.state_name, sr.ron_authorized, sr.platform_approval_status
     FROM notary_commissions nc
     LEFT JOIN state_ron_rules sr ON sr.state_code = nc.state_code
     WHERE nc.notary_id = $1
     ORDER BY nc.state_code ASC`,
    [notaryId]
  );
  return result.rows;
}

/**
 * Get a specific commission by ID.
 */
async function findById(id) {
  const result = await db.query(
    `SELECT nc.*, sr.state_name, sr.ron_authorized, sr.platform_approval_status
     FROM notary_commissions nc
     LEFT JOIN state_ron_rules sr ON sr.state_code = nc.state_code
     WHERE nc.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

/**
 * Get a notary's commission in a specific state.
 */
async function getByNotaryAndState(notaryId, stateCode) {
  const result = await db.query(
    `SELECT nc.*, sr.state_name, sr.ron_authorized, sr.platform_approval_status
     FROM notary_commissions nc
     LEFT JOIN state_ron_rules sr ON sr.state_code = nc.state_code
     WHERE nc.notary_id = $1 AND nc.state_code = $2 AND nc.status = 'approved'
     ORDER BY nc.commission_expires_at DESC
     LIMIT 1`,
    [notaryId, stateCode.toUpperCase()]
  );
  return result.rows[0] || null;
}

/**
 * Update commission status.
 */
async function setStatus(id, newStatus, verifiedBy = null) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw Object.assign(new Error(`Invalid commission status: ${newStatus}`), { status: 400 });
  }

  const isActive = newStatus === 'approved';

  const result = await db.query(
    `UPDATE notary_commissions
     SET status = $1, is_active = $2,
         verified_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE verified_at END,
         verified_by = CASE WHEN $3 IS NOT NULL THEN $3::uuid ELSE verified_by END,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [newStatus, isActive, verifiedBy, id]
  );
  return result.rows[0] || null;
}

/**
 * Update commission details.
 */
async function update(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  const allowedFields = [
    'commission_number', 'commission_type',
    'commission_issued_at', 'commission_expires_at',
    'electronic_notary_id', 'ren_authorization_id',
    'surety_bond_provider', 'surety_bond_number', 'surety_bond_amount_cents', 'surety_bond_expires_at',
    'eando_provider', 'eando_policy_number', 'eando_coverage_cents', 'eando_expires_at',
    'commission_cert_url', 'bond_cert_url', 'eando_cert_url',
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${idx}`);
      values.push(data[field]);
      idx++;
    }
  }

  if (fields.length === 0) return findById(id);

  fields.push('updated_at = NOW()');
  values.push(id);

  const result = await db.query(
    `UPDATE notary_commissions SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

/**
 * Get all active commissions across all notaries for a specific state.
 */
async function getActiveByState(stateCode) {
  const result = await db.query(
    `SELECT nc.*, n.full_legal_name, n.display_name
     FROM notary_commissions nc
     JOIN notaries n ON n.id = nc.notary_id
     WHERE nc.state_code = $1 AND nc.is_active = true AND nc.commission_expires_at > NOW()
     ORDER BY n.full_legal_name ASC`,
    [stateCode.toUpperCase()]
  );
  return result.rows;
}

/**
 * Find commissions expiring within N days.
 */
async function findExpiring(days = 30) {
  const result = await db.query(
    `SELECT nc.*, n.full_legal_name, n.display_name, sr.state_name
     FROM notary_commissions nc
     JOIN notaries n ON n.id = nc.notary_id
     LEFT JOIN state_ron_rules sr ON sr.state_code = nc.state_code
     WHERE nc.is_active = true
       AND (
         nc.commission_expires_at <= CURRENT_DATE + $1 * INTERVAL '1 day'
         OR nc.surety_bond_expires_at <= CURRENT_DATE + $1 * INTERVAL '1 day'
         OR nc.eando_expires_at <= CURRENT_DATE + $1 * INTERVAL '1 day'
       )
     ORDER BY LEAST(
       nc.commission_expires_at,
       COALESCE(nc.surety_bond_expires_at, '9999-12-31'::date),
       COALESCE(nc.eando_expires_at, '9999-12-31'::date)
     ) ASC`,
    [days]
  );
  return result.rows;
}

/**
 * Count active commissions per state.
 */
async function countByState() {
  const result = await db.query(
    `SELECT nc.state_code, sr.state_name, COUNT(*) as notary_count
     FROM notary_commissions nc
     LEFT JOIN state_ron_rules sr ON sr.state_code = nc.state_code
     WHERE nc.is_active = true AND nc.commission_expires_at > NOW()
     GROUP BY nc.state_code, sr.state_name
     ORDER BY nc.state_code`
  );
  return result.rows;
}

module.exports = {
  create, getByNotary, findById, getByNotaryAndState,
  setStatus, update, getActiveByState, findExpiring, countByState,
};
