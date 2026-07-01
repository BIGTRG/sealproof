/**
 * Notary Model — Database operations for the notaries table.
 */
const { db } = require('@sealproof/shared');

const VALID_STATUSES = ['pending_credential_review', 'approved', 'suspended', 'offboarded'];

/**
 * Create a new notary record (self-application or admin-created).
 */
async function create(data) {
  const result = await db.query(
    `INSERT INTO notaries
      (user_id, full_legal_name, display_name, state,
       commission_number, commission_expires_at,
       electronic_notary_id, ren_authorization_id,
       surety_bond_provider, surety_bond_number, surety_bond_expires_at,
       eando_provider, eando_policy_number, eando_coverage_amount, eando_expires_at,
       digital_signature_cert, digital_seal_image_url,
       bio, languages, per_session_cents, hourly_retainer_cents)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
     RETURNING *`,
    [
      data.user_id, data.full_legal_name, data.display_name, data.state || 'NC',
      data.commission_number, data.commission_expires_at,
      data.electronic_notary_id, data.ren_authorization_id,
      data.surety_bond_provider || null, data.surety_bond_number || null,
      data.surety_bond_expires_at || null,
      data.eando_provider || null, data.eando_policy_number || null,
      data.eando_coverage_amount || null, data.eando_expires_at || null,
      data.digital_signature_cert || null, data.digital_seal_image_url || null,
      data.bio || null, data.languages || ['en'],
      data.per_session_cents, data.hourly_retainer_cents || null,
    ]
  );
  return result.rows[0];
}

/**
 * Find notary by ID.
 */
async function findById(id) {
  const result = await db.query('SELECT * FROM notaries WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Find notary by user_id (Clerk user).
 */
async function findByUserId(userId) {
  const result = await db.query('SELECT * FROM notaries WHERE user_id = $1', [userId]);
  return result.rows[0] || null;
}

/**
 * Update a notary record. Only non-null fields are updated.
 */
async function update(id, data) {
  const fields = [];
  const values = [];
  let idx = 1;

  const allowedFields = [
    'full_legal_name', 'display_name', 'state',
    'commission_number', 'commission_expires_at',
    'electronic_notary_id', 'ren_authorization_id',
    'surety_bond_provider', 'surety_bond_number', 'surety_bond_expires_at',
    'eando_provider', 'eando_policy_number', 'eando_coverage_amount', 'eando_expires_at',
    'digital_signature_cert', 'digital_seal_image_url',
    'bio', 'languages', 'per_session_cents', 'hourly_retainer_cents',
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = $${idx}`);
      values.push(data[field]);
      idx++;
    }
  }

  if (fields.length === 0) return findById(id);

  fields.push(`updated_at = NOW()`);
  values.push(id);

  const result = await db.query(
    `UPDATE notaries SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0] || null;
}

/**
 * Transition notary status (with validation).
 */
async function setStatus(id, newStatus) {
  if (!VALID_STATUSES.includes(newStatus)) {
    throw Object.assign(new Error(`Invalid notary status: ${newStatus}`), { status: 400 });
  }

  const isActive = newStatus === 'approved';

  const result = await db.query(
    `UPDATE notaries SET status = $1, is_active = $2, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [newStatus, isActive, id]
  );
  return result.rows[0] || null;
}

/**
 * List notaries with optional filters.
 */
async function list({ status, state, isActive, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (status) {
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }
  if (state) {
    conditions.push(`state = $${idx++}`);
    values.push(state);
  }
  if (isActive !== undefined) {
    conditions.push(`is_active = $${idx++}`);
    values.push(isActive);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  values.push(limit, offset);

  const result = await db.query(
    `SELECT * FROM notaries ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    values
  );
  return result.rows;
}

/**
 * Get notaries with credentials expiring within N days.
 */
async function findExpiringCredentials(days = 30) {
  const result = await db.query(
    `SELECT *, 
       LEAST(
         commission_expires_at,
         COALESCE(surety_bond_expires_at, '9999-12-31'::date),
         COALESCE(eando_expires_at, '9999-12-31'::date)
       ) AS earliest_expiry
     FROM notaries
     WHERE is_active = true
       AND (
         commission_expires_at <= CURRENT_DATE + $1 * INTERVAL '1 day'
         OR surety_bond_expires_at <= CURRENT_DATE + $1 * INTERVAL '1 day'
         OR eando_expires_at <= CURRENT_DATE + $1 * INTERVAL '1 day'
       )
     ORDER BY earliest_expiry ASC`,
    [days]
  );
  return result.rows;
}

module.exports = { create, findById, findByUserId, update, setStatus, list, findExpiringCredentials };
