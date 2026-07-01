/**
 * Persona Webhook Handler
 *
 * POST /kyc/webhooks/persona — Receives Persona webhook events.
 * Updates signer KYC result and auto-transitions session if all signers pass.
 */
const router = require('express').Router();
const { audit, logger, db } = require('@sealproof/shared');
const persona = require('../utils/persona');
const KycSession = require('../models/kycSession');

router.post('/persona', async (req, res, next) => {
  try {
    // Verify webhook signature
    const signature = req.headers['persona-signature'] || req.headers['x-persona-signature'];
    const rawBody = typeof req.body === 'string' ? req.body : req.body.toString('utf-8');

    if (!persona.verifyWebhookSignature(rawBody, signature)) {
      logger.warn('Persona webhook signature verification failed');
      return res.status(401).json({ error: { message: 'Invalid signature' } });
    }

    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
    const eventType = event.data?.attributes?.name;
    const inquiry = event.data?.attributes?.payload?.data;

    if (!inquiry) {
      logger.warn('Persona webhook missing inquiry data', { eventType });
      return res.status(200).json({ ok: true }); // ACK to prevent retries
    }

    const inquiryId = inquiry.id;
    const referenceId = inquiry.attributes?.['reference-id'];
    const personaStatus = inquiry.attributes?.status;
    const kycResult = persona.mapPersonaStatus(personaStatus);

    logger.info('Persona webhook received', { eventType, inquiryId, personaStatus, kycResult });

    // Find the signer by inquiry reference or inquiry ID
    let signer = referenceId
      ? await KycSession.findByInquiryReference(referenceId)
      : await KycSession.findByInquiryId(inquiryId);

    if (!signer) {
      logger.warn('Persona webhook — signer not found', { inquiryId, referenceId });
      return res.status(200).json({ ok: true }); // ACK anyway
    }

    // Update signer KYC result
    await KycSession.updateKycResult({
      signerId: signer.id,
      inquiryId,
      result: kycResult,
    });

    await audit.emitAuditLog({
      eventType: `kyc.${kycResult}`,
      actorType: 'system',
      sessionId: signer.session_id,
      customerId: signer.customer_id,
      payload: { signer_id: signer.id, inquiry_id: inquiryId, persona_status: personaStatus, kyc_result: kycResult },
    });

    // If KYC passed, check if all signers are done
    if (kycResult === 'passed') {
      const signerStatus = await KycSession.allSignersPassed(signer.session_id);
      if (signerStatus.allPassed) {
        await db.query(
          `UPDATE notarization_sessions
           SET status = 'kyc_complete', kyc_completed_at = NOW(), kyc_result = 'passed', updated_at = NOW()
           WHERE id = $1 AND status = 'kyc_pending'`,
          [signer.session_id]
        );
        logger.info('All signers passed KYC via webhook — session advanced to kyc_complete', {
          sessionId: signer.session_id,
        });
      }
    }

    // If KYC failed, mark session as failed
    if (kycResult === 'failed') {
      await db.query(
        `UPDATE notarization_sessions
         SET status = 'failed', kyc_result = 'failed',
             kyc_failure_reason = $2, session_ended_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND status = 'kyc_pending'`,
        [signer.session_id, `Signer ${signer.id} failed identity verification`]
      );
      logger.info('KYC failed — session marked as failed', { sessionId: signer.session_id });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('Persona webhook processing error', { error: err.message });
    // Still ACK to prevent infinite retries
    res.status(200).json({ ok: true, error: 'Processing failed but acknowledged' });
  }
});

module.exports = router;
