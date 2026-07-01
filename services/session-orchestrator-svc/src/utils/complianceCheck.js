/**
 * Compliance Check — Pre-session state rule validation
 *
 * Called during session creation to validate that the session can proceed
 * under the notary's commissioning state's RON rules.
 * Reads from state_ron_rules table directly to avoid inter-service HTTP calls.
 */
const { db, logger } = require('@sealproof/shared');

/**
 * Validate a session against state rules.
 *
 * @param {object} params
 * @param {string} params.stateCode     Notary's state or governing state
 * @param {string} params.documentType  Document type being notarized
 * @returns {object} { valid, errors, warnings, kbaRequired, requirements }
 */
async function validateSessionCompliance({ stateCode, documentType }) {
  // Default response if state rules aren't seeded yet
  const defaultResult = {
    valid: true,
    errors: [],
    warnings: [],
    kbaRequired: false,
    requirements: {
      recording_required: true,
      recording_retention_years: 10,
      journal_retention_years: 10,
    },
  };

  if (!stateCode) return defaultResult;

  try {
    const result = await db.query(
      'SELECT * FROM state_ron_rules WHERE state_code = $1',
      [stateCode.toUpperCase()]
    );

    if (!result.rows[0]) {
      logger.warn('No state RON rules found, using defaults', { stateCode });
      return defaultResult;
    }

    const rules = result.rows[0];
    const errors = [];
    const warnings = [];

    if (!rules.ron_authorized) {
      errors.push(`RON is not authorized in ${rules.state_name}`);
    }

    if (rules.platform_approval_required && rules.platform_approval_status !== 'approved') {
      errors.push(`SealProof not approved in ${rules.state_name} (status: ${rules.platform_approval_status})`);
    }

    const restricted = rules.restricted_doc_types || [];
    if (documentType && restricted.includes(documentType)) {
      errors.push(`${documentType} documents cannot be notarized via RON in ${rules.state_name}`);
    }

    if (rules.authorization_type === 'limited') {
      warnings.push(`${rules.state_name} has limited RON authorization — review restrictions`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      kbaRequired: rules.kba_required,
      requirements: {
        kba_required: rules.kba_required,
        kba_min_questions: rules.kba_min_questions,
        kba_min_correct: rules.kba_min_correct,
        credential_analysis_required: rules.credential_analysis_required,
        recording_required: rules.recording_required,
        recording_retention_years: rules.recording_retention_years,
        journal_retention_years: rules.journal_retention_years,
        max_notary_fee_cents: rules.max_notary_fee_cents,
        seal_state_header: rules.seal_state_header,
        seal_statute_reference: rules.seal_statute_reference,
      },
    };
  } catch (err) {
    // If table doesn't exist yet, return defaults
    logger.warn('State compliance check failed, using defaults', { error: err.message });
    return defaultResult;
  }
}

module.exports = { validateSessionCompliance };
