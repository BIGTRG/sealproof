/**
 * Session Validator
 *
 * Validates a session against state-specific RON rules before it can proceed.
 * Called by session-orchestrator-svc and customer-web during session creation.
 */
const StateRules = require('../models/stateRules');
const { logger } = require('@sealproof/shared');

/**
 * Validate whether a session can proceed under the given state's RON rules.
 *
 * @param {object} params
 * @param {string} params.stateCode       Notary's commissioning state
 * @param {string} params.documentType    e.g. 'deed', 'will', 'poa'
 * @param {string} params.signerLocation  e.g. 'US', 'US_MILITARY', 'FOREIGN'
 * @returns {object} { valid, errors[], warnings[], requirements }
 */
async function validateSession({ stateCode, documentType, signerLocation }) {
  const rules = await StateRules.getByState(stateCode);

  if (!rules) {
    return {
      valid: false,
      errors: [`No RON rules configured for state: ${stateCode}`],
      warnings: [],
      requirements: {},
    };
  }

  const errors = [];
  const warnings = [];

  // 1. Check if RON is authorized in this state
  if (!rules.ron_authorized) {
    errors.push(`Remote Online Notarization is not authorized in ${rules.state_name} (${stateCode})`);
  }

  // 2. Check platform approval
  if (rules.platform_approval_required && rules.platform_approval_status !== 'approved') {
    errors.push(
      `SealProof is not yet approved as a technology platform in ${rules.state_name}. ` +
      `Current status: ${rules.platform_approval_status}`
    );
  }

  // 3. Check document type restrictions
  const restricted = rules.restricted_doc_types || [];
  if (documentType && restricted.includes(documentType)) {
    errors.push(
      `${formatDocType(documentType)} documents cannot be notarized remotely in ${rules.state_name}. ` +
      (rules.doc_type_notes || '')
    );
  }

  // 4. Check signer location
  if (signerLocation && rules.signer_location_restriction) {
    const locationValid = checkSignerLocation(signerLocation, rules.signer_location_restriction);
    if (!locationValid) {
      errors.push(
        `${rules.state_name} does not allow RON for signers located ${signerLocation}. ` +
        `Restriction: ${rules.signer_location_restriction}. ` +
        (rules.signer_location_notes || '')
      );
    }
  }

  // 5. Build requirements object (tells the session what identity proofing steps are needed)
  const requirements = {
    kba_required: rules.kba_required,
    credential_analysis_required: rules.credential_analysis_required,
    kba_min_questions: rules.kba_min_questions,
    kba_min_correct: rules.kba_min_correct,
    recording_required: rules.recording_required,
    recording_retention_years: rules.recording_retention_years,
    journal_retention_years: rules.journal_retention_years,
    max_notary_fee_cents: rules.max_notary_fee_cents,
    seal_state_header: rules.seal_state_header,
    seal_state_label: rules.seal_state_label,
    seal_statute_reference: rules.seal_statute_reference,
    seal_fields_required: rules.seal_fields_required,
    governing_statute: rules.governing_statute,
  };

  // Warnings (non-blocking)
  if (rules.authorization_type === 'limited') {
    warnings.push(
      `${rules.state_name} has limited RON authorization. ${rules.special_requirements || 'Review restrictions before proceeding.'}`
    );
  }

  if (rules.platform_renewal_date) {
    const renewalDate = new Date(rules.platform_renewal_date);
    const daysUntilRenewal = Math.ceil((renewalDate - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilRenewal <= 60 && daysUntilRenewal > 0) {
      warnings.push(`Platform registration in ${rules.state_name} expires in ${daysUntilRenewal} days. Renew before ${renewalDate.toLocaleDateString()}.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    requirements,
    state: {
      code: rules.state_code,
      name: rules.state_name,
      authorization_type: rules.authorization_type,
    },
  };
}

/**
 * Check if a document type is allowed for RON in a given state.
 */
async function isDocTypeAllowed(stateCode, documentType) {
  const rules = await StateRules.getByState(stateCode);
  if (!rules) return false;
  if (!rules.ron_authorized) return false;

  const restricted = rules.restricted_doc_types || [];
  if (restricted.includes(documentType)) return false;

  if (rules.allowed_doc_types && rules.allowed_doc_types.length > 0) {
    return rules.allowed_doc_types.includes(documentType);
  }

  return true;
}

/**
 * Get all states where a specific document type can be RON'd.
 */
async function getStatesForDocType(documentType) {
  const allRules = await StateRules.list({ authorized: true });
  return allRules.filter(r => {
    const restricted = r.restricted_doc_types || [];
    if (restricted.includes(documentType)) return false;
    if (r.allowed_doc_types && r.allowed_doc_types.length > 0) {
      return r.allowed_doc_types.includes(documentType);
    }
    return true;
  }).map(r => ({ state_code: r.state_code, state_name: r.state_name }));
}

function checkSignerLocation(location, restriction) {
  switch (restriction) {
    case 'any':
      return true;
    case 'us_only':
      return ['US', 'US_MILITARY'].includes(location);
    case 'us_and_military':
      return ['US', 'US_MILITARY', 'US_EMBASSY'].includes(location);
    case 'in_state_only':
      return location === 'IN_STATE';
    default:
      return true;
  }
}

function formatDocType(type) {
  const map = {
    will: 'Will / Testament',
    healthcare_directive: 'Healthcare Directive / Living Will',
    poa: 'Power of Attorney',
    deed: 'Deed / Real Property',
    trust: 'Trust',
    mortgage: 'Mortgage / Deed of Trust',
    affidavit: 'Affidavit',
  };
  return map[type] || type;
}

module.exports = { validateSession, isDocTypeAllowed, getStatesForDocType };
