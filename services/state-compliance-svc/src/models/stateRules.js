/**
 * State RON Rules Model
 *
 * CRUD operations for the state_ron_rules table.
 * Each state has a single record defining all RON compliance requirements.
 */
const { db } = require('@sealproof/shared');

/**
 * Get rules for a specific state.
 */
async function getByState(stateCode) {
  const result = await db.query(
    'SELECT * FROM state_ron_rules WHERE state_code = $1',
    [stateCode.toUpperCase()]
  );
  return result.rows[0] || null;
}

/**
 * List all state rules with optional filters.
 */
async function list({ authorized, platformApprovalRequired, kbaRequired } = {}) {
  const conditions = [];
  const values = [];
  let idx = 1;

  if (authorized !== undefined) {
    conditions.push(`ron_authorized = $${idx++}`);
    values.push(authorized);
  }
  if (platformApprovalRequired !== undefined) {
    conditions.push(`platform_approval_required = $${idx++}`);
    values.push(platformApprovalRequired);
  }
  if (kbaRequired !== undefined) {
    conditions.push(`kba_required = $${idx++}`);
    values.push(kbaRequired);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await db.query(
    `SELECT * FROM state_ron_rules ${where} ORDER BY state_name ASC`,
    values
  );
  return result.rows;
}

/**
 * Create or update (upsert) rules for a state.
 */
async function upsert(data) {
  const result = await db.query(
    `INSERT INTO state_ron_rules (
      state_code, state_name, ron_authorized, authorization_type, effective_date,
      governing_statute, kba_required, credential_analysis_required,
      personal_knowledge_allowed, credible_witness_allowed,
      kba_min_questions, kba_min_correct,
      journal_retention_years, journal_fields_required,
      recording_required, recording_retention_years, recording_must_include_kba,
      seal_fields_required, seal_state_label, seal_state_header, seal_statute_reference,
      max_notary_fee_cents, max_travel_fee_cents,
      restricted_doc_types, allowed_doc_types, doc_type_notes,
      platform_approval_required, platform_approval_status,
      platform_approval_date, platform_renewal_date,
      approval_authority, approval_authority_url, approval_application_url,
      notary_must_be_in_state, signer_location_restriction, signer_location_notes,
      accepts_out_of_state_ron, recognition_notes,
      special_requirements, last_reviewed_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
      $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,NOW()
    )
    ON CONFLICT (state_code) DO UPDATE SET
      state_name = EXCLUDED.state_name,
      ron_authorized = EXCLUDED.ron_authorized,
      authorization_type = EXCLUDED.authorization_type,
      effective_date = EXCLUDED.effective_date,
      governing_statute = EXCLUDED.governing_statute,
      kba_required = EXCLUDED.kba_required,
      credential_analysis_required = EXCLUDED.credential_analysis_required,
      personal_knowledge_allowed = EXCLUDED.personal_knowledge_allowed,
      credible_witness_allowed = EXCLUDED.credible_witness_allowed,
      kba_min_questions = EXCLUDED.kba_min_questions,
      kba_min_correct = EXCLUDED.kba_min_correct,
      journal_retention_years = EXCLUDED.journal_retention_years,
      journal_fields_required = EXCLUDED.journal_fields_required,
      recording_required = EXCLUDED.recording_required,
      recording_retention_years = EXCLUDED.recording_retention_years,
      recording_must_include_kba = EXCLUDED.recording_must_include_kba,
      seal_fields_required = EXCLUDED.seal_fields_required,
      seal_state_label = EXCLUDED.seal_state_label,
      seal_state_header = EXCLUDED.seal_state_header,
      seal_statute_reference = EXCLUDED.seal_statute_reference,
      max_notary_fee_cents = EXCLUDED.max_notary_fee_cents,
      max_travel_fee_cents = EXCLUDED.max_travel_fee_cents,
      restricted_doc_types = EXCLUDED.restricted_doc_types,
      allowed_doc_types = EXCLUDED.allowed_doc_types,
      doc_type_notes = EXCLUDED.doc_type_notes,
      platform_approval_required = EXCLUDED.platform_approval_required,
      platform_approval_status = EXCLUDED.platform_approval_status,
      platform_approval_date = EXCLUDED.platform_approval_date,
      platform_renewal_date = EXCLUDED.platform_renewal_date,
      approval_authority = EXCLUDED.approval_authority,
      approval_authority_url = EXCLUDED.approval_authority_url,
      approval_application_url = EXCLUDED.approval_application_url,
      notary_must_be_in_state = EXCLUDED.notary_must_be_in_state,
      signer_location_restriction = EXCLUDED.signer_location_restriction,
      signer_location_notes = EXCLUDED.signer_location_notes,
      accepts_out_of_state_ron = EXCLUDED.accepts_out_of_state_ron,
      recognition_notes = EXCLUDED.recognition_notes,
      special_requirements = EXCLUDED.special_requirements,
      last_reviewed_at = NOW(),
      updated_at = NOW()
    RETURNING *`,
    [
      data.state_code, data.state_name, data.ron_authorized, data.authorization_type,
      data.effective_date, data.governing_statute,
      data.kba_required, data.credential_analysis_required,
      data.personal_knowledge_allowed, data.credible_witness_allowed,
      data.kba_min_questions, data.kba_min_correct,
      data.journal_retention_years, JSON.stringify(data.journal_fields_required || []),
      data.recording_required, data.recording_retention_years, data.recording_must_include_kba,
      JSON.stringify(data.seal_fields_required || []), data.seal_state_label,
      data.seal_state_header, data.seal_statute_reference,
      data.max_notary_fee_cents, data.max_travel_fee_cents,
      JSON.stringify(data.restricted_doc_types || []),
      data.allowed_doc_types ? JSON.stringify(data.allowed_doc_types) : null,
      data.doc_type_notes,
      data.platform_approval_required, data.platform_approval_status,
      data.platform_approval_date, data.platform_renewal_date,
      data.approval_authority, data.approval_authority_url, data.approval_application_url,
      data.notary_must_be_in_state, data.signer_location_restriction, data.signer_location_notes,
      data.accepts_out_of_state_ron, data.recognition_notes,
      data.special_requirements,
    ]
  );
  return result.rows[0];
}

/**
 * Get summary stats (how many states authorized, how many approved, etc.).
 */
async function getSummary() {
  const result = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE ron_authorized = true)                            AS authorized_count,
      COUNT(*) FILTER (WHERE ron_authorized = false)                           AS not_authorized_count,
      COUNT(*) FILTER (WHERE platform_approval_required = true)                AS approval_required_count,
      COUNT(*) FILTER (WHERE platform_approval_status = 'approved')            AS platform_approved_count,
      COUNT(*) FILTER (WHERE platform_approval_required = true AND platform_approval_status != 'approved' AND platform_approval_status != 'not_required') AS platform_pending_count,
      COUNT(*) FILTER (WHERE kba_required = true)                              AS kba_required_count,
      COUNT(*) FILTER (WHERE recording_required = true)                        AS recording_required_count,
      COUNT(*)                                                                  AS total_states
    FROM state_ron_rules
  `);
  return result.rows[0];
}

module.exports = { getByState, list, upsert, getSummary };
