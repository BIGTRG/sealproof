/**
 * KBA Session Model
 *
 * Tracks KBA verification attempts per signer per session.
 * Most states allow 2 attempts before failing permanently.
 */
const { db } = require('@sealproof/shared');

/**
 * Create a new KBA session record.
 */
async function create(data) {
  const result = await db.query(
    `INSERT INTO kba_sessions
      (session_id, signer_id, provider, provider_session_id,
       questions_presented, questions_required, max_attempts, attempt_number, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      data.sessionId, data.signerId, data.provider || 'idology',
      data.providerSessionId,
      data.questionsPresented || 5, data.questionsRequired || 4,
      data.maxAttempts || 2, data.attemptNumber || 1,
      data.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
    ]
  );
  return result.rows[0];
}

/**
 * Get the latest KBA session for a signer in a session.
 */
async function getLatest(sessionId, signerId) {
  const result = await db.query(
    `SELECT * FROM kba_sessions
     WHERE session_id = $1 AND signer_id = $2
     ORDER BY attempt_number DESC
     LIMIT 1`,
    [sessionId, signerId]
  );
  return result.rows[0] || null;
}

/**
 * Get all KBA attempts for a signer.
 */
async function getAttempts(sessionId, signerId) {
  const result = await db.query(
    `SELECT * FROM kba_sessions
     WHERE session_id = $1 AND signer_id = $2
     ORDER BY attempt_number ASC`,
    [sessionId, signerId]
  );
  return result.rows;
}

/**
 * Update KBA result after answers are submitted.
 */
async function updateResult(id, data) {
  const result = await db.query(
    `UPDATE kba_sessions SET
      status = $1,
      questions_correct = $2,
      completed_at = NOW(),
      failure_reason = $3,
      raw_response = $4,
      updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [
      data.status, data.questionsCorrect,
      data.failureReason || null,
      data.rawResponse ? JSON.stringify(data.rawResponse) : null,
      id,
    ]
  );
  return result.rows[0];
}

/**
 * Check if all signers in a session have passed KBA.
 */
async function allSignersPassed(sessionId) {
  // Get all signers for this session
  const signers = await db.query(
    'SELECT id FROM session_signers WHERE session_id = $1',
    [sessionId]
  );

  if (signers.rows.length === 0) return { allPassed: false, total: 0, passed: 0 };

  // For each signer, check if they have a passing KBA
  let passedCount = 0;
  for (const signer of signers.rows) {
    const kba = await db.query(
      `SELECT status FROM kba_sessions
       WHERE session_id = $1 AND signer_id = $2 AND status = 'passed'
       LIMIT 1`,
      [sessionId, signer.id]
    );
    if (kba.rows.length > 0) passedCount++;
  }

  return {
    allPassed: passedCount === signers.rows.length,
    total: signers.rows.length,
    passed: passedCount,
  };
}

/**
 * Check if a signer has exhausted their KBA attempts.
 */
async function isMaxAttemptsReached(sessionId, signerId) {
  const result = await db.query(
    `SELECT COUNT(*) as attempts, MAX(max_attempts) as max_allowed
     FROM kba_sessions
     WHERE session_id = $1 AND signer_id = $2`,
    [sessionId, signerId]
  );
  const { attempts, max_allowed } = result.rows[0];
  return parseInt(attempts) >= parseInt(max_allowed || 2);
}

module.exports = { create, getLatest, getAttempts, updateResult, allSignersPassed, isMaxAttemptsReached };
