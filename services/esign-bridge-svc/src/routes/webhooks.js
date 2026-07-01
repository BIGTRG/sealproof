/**
 * E-Sign Webhook Handler
 *
 * POST /signatures/:documentId/webhook — TRG e-sign completion callback.
 * Updates document signature status and notifies session orchestrator.
 */
const router = require('express').Router();
const { audit, logger, db } = require('@sealproof/shared');

router.post('/:documentId/webhook', async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { status, signed_document_url, signature_request_id, completed_at, error } = req.body;

    logger.info('E-sign webhook received', { documentId, status, signature_request_id });

    // Find the document
    const doc = await db.query(
      'SELECT * FROM session_documents WHERE id = $1', [documentId]
    );
    if (!doc.rows[0]) {
      logger.warn('E-sign webhook for unknown document', { documentId });
      return res.status(200).json({ ok: true });
    }

    // Update document status
    const updateFields = ['esign_status = $1', 'updated_at = NOW()'];
    const updateValues = [status];
    let idx = 2;

    if (signed_document_url) {
      updateFields.push(`signed_document_url = $${idx++}`);
      updateValues.push(signed_document_url);
    }

    updateValues.push(documentId);
    await db.query(
      `UPDATE session_documents SET ${updateFields.join(', ')} WHERE id = $${idx}`,
      updateValues
    );

    await audit.emitAuditLog({
      eventType: `esign.${status}`,
      actorType: 'system',
      sessionId: doc.rows[0].session_id,
      payload: {
        document_id: documentId,
        signature_request_id,
        status,
        signed_document_url,
        error,
      },
    });

    // Check if all documents in the session are signed
    if (status === 'completed' || status === 'signed') {
      const allDocs = await db.query(
        `SELECT
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE esign_status IN ('completed', 'signed')) AS signed
         FROM session_documents
         WHERE session_id = $1 AND esign_request_id IS NOT NULL`,
        [doc.rows[0].session_id]
      );
      const row = allDocs.rows[0];
      if (parseInt(row.total) > 0 && parseInt(row.signed) === parseInt(row.total)) {
        logger.info('All documents signed for session', { sessionId: doc.rows[0].session_id });
        // The session orchestrator will handle the transition to 'completed'
        // This webhook just ensures the document status is up-to-date
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('E-sign webhook processing error', { error: err.message });
    res.status(200).json({ ok: true, error: 'Processing failed but acknowledged' });
  }
});

module.exports = router;
