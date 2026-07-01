/**
 * KYC Routes
 *
 * POST   /kyc/sessions                    Start KYC for a signer
 * GET    /kyc/sessions/:signerId          Get KYC status for a signer
 * POST   /kyc/sessions/:signerId/manual-review   Admin marks manual review outcome
 */
const router = require('express').Router();
const { validate, audit, logger, db } = require('@sealproof/shared');
const persona = require('../utils/persona');
const KycSession = require('../models/kycSession');

// ---------------------------------------------------------------------------
// POST /kyc/sessions — Start KYC verification for a signer
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
      const { session_id, signer_id, signer_name, signer_email } = req.body;

      // Verify the session exists and is in kyc_pending
      const session = await db.query(
        'SELECT * FROM notarization_sessions WHERE id = $1', [session_id]
      );
      if (!session.rows[0]) {
        return res.status(404).json({ error: { message: 'Session not found' } });
      }
      if (!['created', 'kyc_pending'].includes(session.rows[0].status)) {
        return res.status(409).json({
          error: { message: `Cannot start KYC: session status is ${session.rows[0].status}` },
        });
      }

      // If session is still 'created', transition to kyc_pending
      if (session.rows[0].status === 'created') {
        await db.query(
          `UPDATE notarization_sessions
           SET status = 'kyc_pending', kyc_started_at = NOW(), kyc_provider = 'persona', updated_at = NOW()
           WHERE id = $1`,
          [session_id]
        );
      }

      // Create Persona inquiry
      const inquiry = await persona.createInquiry({
        signerId: signer_id,
        sessionId: session_id,
        signerName: signer_name,
        signerEmail: signer_email,
      });

      // Record in DB
      await KycSession.createKycRecord({
        sessionId: session_id,
        signerId: signer_id,
        provider: 'persona',
        inquiryId: inquiry.inquiryId,
      });

      await audit.emitAuditLog({
        eventType: 'kyc.started',
        actorType: 'customer',
        actorId: session.rows[0].customer_id,
        sessionId: session_id,
        payload: {
          signer_id,
          provider: 'persona',
          inquiry_id: inquiry.inquiryId,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      logger.info('KYC started', { sessionId: session_id, signerId: signer_id, inquiryId: inquiry.inquiryId });

      res.status(201).json({
        data: {
          inquiry_id: inquiry.inquiryId,
          session_url: inquiry.sessionUrl,
          status: 'pending',
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /kyc/sessions/:signerId — Get KYC status for a signer
// ---------------------------------------------------------------------------
router.get('/sessions/:signerId', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, session_id, signer_name, kyc_session_id, kyc_result FROM session_signers WHERE id = $1',
      [req.params.signerId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: { message: 'Signer not found' } });
    }
    res.json({ data: result.rows[0] });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /kyc/sessions/:signerId/manual-review — Admin marks outcome
// ---------------------------------------------------------------------------
router.post('/sessions/:signerId/manual-review',
  validate({
    body: {
      result: { required: true, type: 'string' }, // 'passed' or 'failed'
    },
  }),
  async (req, res, next) => {
    try {
      const { result: kycResult, reason } = req.body;
      if (!['passed', 'failed'].includes(kycResult)) {
        return res.status(400).json({ error: { message: 'Result must be passed or failed' } });
      }

      const signer = await db.query(
        'SELECT * FROM session_signers WHERE id = $1', [req.params.signerId]
      );
      if (!signer.rows[0]) {
        return res.status(404).json({ error: { message: 'Signer not found' } });
      }

      await KycSession.updateKycResult({
        signerId: req.params.signerId,
        inquiryId: signer.rows[0].kyc_session_id,
        result: kycResult,
        failureReason: reason,
      });

      // Check if all signers have passed — if so, transition session
      const signerStatus = await KycSession.allSignersPassed(signer.rows[0].session_id);
      if (signerStatus.allPassed) {
        await db.query(
          `UPDATE notarization_sessions
           SET status = 'kyc_complete', kyc_completed_at = NOW(), kyc_result = 'passed', updated_at = NOW()
           WHERE id = $1 AND status = 'kyc_pending'`,
          [signer.rows[0].session_id]
        );
        logger.info('All signers passed KYC — session advanced to kyc_complete', {
          sessionId: signer.rows[0].session_id,
        });
      }

      await audit.emitAuditLog({
        eventType: 'kyc.manual_review',
        actorType: 'admin',
        sessionId: signer.rows[0].session_id,
        payload: { signer_id: req.params.signerId, result: kycResult, reason },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({ data: { signer_id: req.params.signerId, kyc_result: kycResult, all_passed: signerStatus.allPassed } });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
