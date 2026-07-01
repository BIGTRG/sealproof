/**
 * Platform Registration Model
 *
 * Tracks SealProof's platform approval status in each state that requires it.
 */
const { db } = require('@sealproof/shared');

async function getByState(stateCode) {
  const result = await db.query(
    'SELECT * FROM platform_registrations WHERE state_code = $1',
    [stateCode.toUpperCase()]
  );
  return result.rows[0] || null;
}

async function list({ status } = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (status) {
    conditions.push(`status = $${idx++}`);
    values.push(status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(
    `SELECT pr.*, sr.state_name, sr.approval_authority, sr.approval_application_url
     FROM platform_registrations pr
     LEFT JOIN state_ron_rules sr ON sr.state_code = pr.state_code
     ${where}
     ORDER BY sr.state_name ASC`,
    values
  );
  return result.rows;
}

async function upsert(data) {
  const result = await db.query(
    `INSERT INTO platform_registrations (
      state_code, status, applied_at, approved_at, expires_at, renewal_due_at,
      application_fee_cents, annual_fee_cents, application_url,
      authority_name, authority_contact, registration_number, notes
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
    ON CONFLICT (state_code) DO UPDATE SET
      status = EXCLUDED.status,
      applied_at = EXCLUDED.applied_at,
      approved_at = EXCLUDED.approved_at,
      expires_at = EXCLUDED.expires_at,
      renewal_due_at = EXCLUDED.renewal_due_at,
      application_fee_cents = EXCLUDED.application_fee_cents,
      annual_fee_cents = EXCLUDED.annual_fee_cents,
      application_url = EXCLUDED.application_url,
      authority_name = EXCLUDED.authority_name,
      authority_contact = EXCLUDED.authority_contact,
      registration_number = EXCLUDED.registration_number,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING *`,
    [
      data.state_code, data.status || 'not_applied',
      data.applied_at || null, data.approved_at || null,
      data.expires_at || null, data.renewal_due_at || null,
      data.application_fee_cents || null, data.annual_fee_cents || null,
      data.application_url || null, data.authority_name || null,
      data.authority_contact || null, data.registration_number || null,
      data.notes || null,
    ]
  );
  return result.rows[0];
}

async function getSummary() {
  const result = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'approved')                AS approved,
      COUNT(*) FILTER (WHERE status = 'application_submitted')   AS submitted,
      COUNT(*) FILTER (WHERE status = 'under_review')            AS under_review,
      COUNT(*) FILTER (WHERE status = 'not_applied')             AS not_applied,
      COUNT(*) FILTER (WHERE status = 'not_required')            AS not_required,
      COUNT(*) FILTER (WHERE status = 'denied')                  AS denied,
      COUNT(*) FILTER (WHERE status = 'expired')                 AS expired,
      COUNT(*)                                                    AS total
    FROM platform_registrations
  `);
  return result.rows[0];
}

module.exports = { getByState, list, upsert, getSummary };
