/**
 * KBA Routes
 *
 * POST   /api/kba/sessions                    Start KBA for a signer
 * POST   /api/kba/sessions/:id/answers        Submit answers
 * GET    /api/kba/sessions/:sessionId/signer/:signerId   Get KBA status
 * GET    /api/kba/sessions/:sessionId/status   Check if all signers passed KBA
 */
const router = require('express').Router();
const { validate, audit, logger, db } = require('@sealproof/shared');
const idology = require('../utils/idology');
const KbaSession = require('../models/kbaSession');

// ---------------------------------------------------------------------------
// POST /api/kba/sessions — Start KBA verification for a signer
// ---------------------------------------------------------------------------
router.post('/sessions',
  validate({
    body: {
      session_id: { required: true, type: 'string' },
      signer_id:  { required: true, type: 'string' },
    },
  }),
  async (req, res, next) => {
    try {
      const { session_id, signer_id, signer_info } = req.body;

      // Check if max attempts reached
      const maxReached = await KbaSession.isMaxAttemptsReached(session_id, signer_id);
      if (maxReached) {
        return res.status(409).json({
          error: { message: 'Maximum KBA attempts reached for this signer. Identity verification failed.' },
        });
      }

      // Get current attempt number
      const existing = await KbaSession.getAttempts(session_id, signer_id);
      const attemptNumber = existing.length + 1;

      // Start IDology KBA session
      const kbaResult = await idology.startSession({
        firstName: signer_info?.first_name || '',
        lastName: signer_info?.last_name || '',
        address: signer_info?.address || '',
        city: signer_info?.city || '',
        state: signer_info?.state || '',
        zip: signer_info?.zip || '',
        ssn4: signer_info?.ssn4 || '',
        dob: signer_info?.dob || '',
      });

      // Record in DB
      const kbaRecord = await KbaSession.create({
        sessionId: session_id,
        signerId: signer_id,
        provider: 'idology',
        providerSessionId: kbaResult.sessionId,
        questionsPresented: kbaResult.questionCount,
        questionsRequired: req.body.min_correct || 4,
        attemptNumber,
        expiresAt: kbaResult.expiresAt,
      });

      await audit.emitAuditLog({
        eventType: 'kba.started',
        actorType: 'customer',
        sessionId: session_id,
        payload: {
          signer_id,
          provider: 'idology',
          attempt: attemptNumber,
          question_count: kbaResult.questionCount,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      logger.info('KBA session started', {
        sessionId: session_id,
        signerId: signer_id,
        attempt: attemptNumber,
        questionCount: kbaResult.questionCount,
      });

      res.status(201).json({
        data: {
          kba_session_id: kbaRecord.id,
          questions: kbaResult.questions,
          attempt: attemptNumber,
          max_attempts: kbaRecord.max_attempts,
          expires_at: kbaResult.expiresAt,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /api/kba/sessions/:id/answers — Submit KBA answers
// ---------------------------------------------------------------------------
router.post('/sessions/:id/answers',
  validate({
    body: {
      answers: { required: true, type: 'object' },  // array of { questionId, answerId }
    },
  }),
  async (req, res, next) => {
    try {
      const kbaRecord = await KbaSession.getLatest(null, null);
      // Actually get by ID
      const kbaResult = await db.query('SELECT * FROM kba_sessions WHERE id = $1', [req.params.id]);
      const kba = kbaResult.rows[0];

      if (!kba) {
        return res.status(404).json({ error: { message: 'KBA session not found' } });
      }

      if (kba.status !== 'pending') {
        return res.status(409).json({
          error: { message: `KBA session already ${kba.status}` },
        });
      }

      // Check expiry
      if (kba.expires_at && new Date(kba.expires_at) < new Date()) {
        await KbaSession.updateResult(kba.id, {
          status: 'expired',
          questionsCorrect: 0,
          failureReason: 'KBA session expired before answers were submitted',
        });
        return res.status(410).json({
          error: { message: 'KBA session expired. Please start a new verification.' },
        });
      }

      // Submit answers to IDology
      const { answers } = req.body;
      const result = await idology.submitAnswers(
        kba.provider_session_id,
        answers,
        kba.questions_required
      );

      // Update record
      const status = result.passed ? 'passed' : 'failed';
      await KbaSession.updateResult(kba.id, {
        status,
        questionsCorrect: result.correctCount,
        failureReason: result.passed ? null : `Answered ${result.correctCount}/${result.totalQuestions} correctly (${kba.questions_required} required)`,
        rawResponse: result.details,
      });

      // If passed, check if all signers in session have now passed KBA
      let allPassed = false;
      if (result.passed) {
        const signerStatus = await KbaSession.allSignersPassed(kba.session_id);
        allPassed = signerStatus.allPassed;

        if (allPassed) {
          // Update session KBA status
          await db.query(
            `UPDATE notarization_sessions
             SET kba_status = 'passed', kba_completed_at = NOW(), updated_at = NOW()
             WHERE id = $1`,
            [kba.session_id]
          );
          logger.info('All signers passed KBA', { sessionId: kba.session_id });
        }
      }

      // Check if max attempts exhausted on failure
      let canRetry = false;
      if (!result.passed) {
        const maxReached = await KbaSession.isMaxAttemptsReached(kba.session_id, kba.signer_id);
        canRetry = !maxReached;

        if (maxReached) {
          await db.query(
            `UPDATE notarization_sessions
             SET kba_status = 'failed', updated_at = NOW()
             WHERE id = $1`,
            [kba.session_id]
          );
          logger.warn('KBA max attempts reached — signer failed', {
            sessionId: kba.session_id,
            signerId: kba.signer_id,
          });
        }
      }

      await audit.emitAuditLog({
        eventType: result.passed ? 'kba.passed' : 'kba.failed',
        actorType: 'customer',
        sessionId: kba.session_id,
        payload: {
          signer_id: kba.signer_id,
          correct: result.correctCount,
          total: result.totalQuestions,
          required: kba.questions_required,
          attempt: kba.attempt_number,
          can_retry: canRetry,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        data: {
          passed: result.passed,
          correct: result.correctCount,
          total: result.totalQuestions,
          required: kba.questions_required,
          all_signers_passed: allPassed,
          can_retry: canRetry,
          attempt: kba.attempt_number,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /api/kba/sessions/:sessionId/signer/:signerId — Status for one signer
// ---------------------------------------------------------------------------
router.get('/sessions/:sessionId/signer/:signerId', async (req, res, next) => {
  try {
    const attempts = await KbaSession.getAttempts(req.params.sessionId, req.params.signerId);
    const latest = attempts.length > 0 ? attempts[attempts.length - 1] : null;

    res.json({
      data: {
        status: latest?.status || 'not_started',
        attempts: attempts.length,
        max_attempts: latest?.max_attempts || 2,
        latest_attempt: latest ? {
          id: latest.id,
          status: latest.status,
          questions_correct: latest.questions_correct,
          questions_required: latest.questions_required,
          completed_at: latest.completed_at,
        } : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/kba/sessions/:sessionId/status — All signers KBA status
// ---------------------------------------------------------------------------
router.get('/sessions/:sessionId/status', async (req, res, next) => {
  try {
    const result = await KbaSession.allSignersPassed(req.params.sessionId);
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
