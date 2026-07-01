/**
 * KYC Session Model
 *
 * Tracks KYC verification attempts per signer.
 * Uses session_signers table for signer-level KYC status,
 * and notarization_sessions for session-level KYC state.
 */
const { db } = require('@sealproof/shared');

/**
 * Record a KYC session start for a signer.
 */
async function createKycRecord({ sessionId, signerId, provider, inquiryId }) {
  const result = await db.query(
    `UPDATE session_signers
     SET kyc_session_id = $1, kyc_result = 'pending', updated_at = NOW()
     WHERE session_id = $2 AND id = $3
     RETURNING *`,
    [inquiryId, sessionId, signerId]
  );
  return result.rows[0] || null;
}

/**
 * Update KYC result for a signer.
 */
async function updateKycResult({ signerId, inquiryId, result: kycResult, failureReason }) {
  const res = await db.query(
    `UPDATE session_signers
     SET kyc_result = $1, kyc_session_id = $2, updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [kycResult, inquiryId, signerId]
  );
  return res.rows[0] || null;
}

/**
 * Find signer by inquiry reference ID (format: sessionId:signerId).
 */
async function findByInquiryReference(referenceId) {
  const [sessionId, signerId] = referenceId.split(':');
  if (!sessionId || !signerId) return null;

  const result = await db.query(
    `SELECT ss.*, ns.status AS session_status, ns.customer_id
     FROM session_signers ss
     JOIN notarization_sessions ns ON ns.id = ss.session_id
     WHERE ss.session_id = $1 AND ss.id = $2`,
    [sessionId, signerId]
  );
  return result.rows[0] || null;
}

/**
 * Find signer by KYC inquiry ID.
 */
async function findByInquiryId(inquiryId) {
  const result = await db.query(
    `SELECT ss.*, ns.status AS session_status, ns.customer_id
     FROM session_signers ss
     JOIN notarization_sessions ns ON ns.id = ss.session_id
     WHERE ss.kyc_session_id = $1`,
    [inquiryId]
  );
  return result.rows[0] || null;
}

/**
 * Check if all signers in a session have passed KYC.
 */
async function allSignersPassed(sessionId) {
  const result = await db.query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE kyc_result = 'passed') AS passed,
       COUNT(*) FILTER (WHERE kyc_result = 'failed') AS failed
     FROM session_signers
     WHERE session_id = $1`,
    [sessionId]
  );
  const row = result.rows[0];
  return {
    total: parseInt(row.total),
    passed: parseInt(row.passed),
    failed: parseInt(row.failed),
    allPassed: parseInt(row.total) > 0 && parseInt(row.passed) === parseInt(row.total),
    anyFailed: parseInt(row.failed) > 0,
  };
}

module.exports = { createKycRecord, updateKycResult, findByInquiryReference, findByInquiryId, allSignersPassed };
