/**
 * Signature Routes
 *
 * POST  /signatures                  Initiate signature on a document
 * GET   /signatures/:documentId/status   Get signature status
 * POST  /signatures/:documentId/cancel   Cancel a signature request
 * GET   /signatures/session/:sessionId   List all signatures for a session
 */
const router = require('express').Router();
const { validate, audit, logger, db } = require('@sealproof/shared');
const trgEsign = require('../utils/trgEsign');

// ---------------------------------------------------------------------------
// POST /signatures — Initiate signature on a document
// ---------------------------------------------------------------------------
router.post('/',
  validate({
    body: {
      session_id:   { required: true, type: 'string' },
      document_id:  { required: true, type: 'string' },
      document_url: { required: true, type: 'string' },
      notary_id:    { required: true, type: 'string' },
    },
  }),
  async (req, res, next) => {
    try {
      const { session_id, document_id, document_url, notary_id, signers } = req.body;

      // Verify session is in_session
      const session = await db.query(
        'SELECT * FROM notarization_sessions WHERE id = $1', [session_id]
      );
      if (!session.rows[0]) {
        return res.status(404).json({ error: { message: 'Session not found' } });
      }
      if (session.rows[0].status !== 'in_session') {
        return res.status(409).json({
          error: { message: `Cannot sign documents: session status is ${session.rows[0].status}` },
        });
      }

      // Get signers from DB if not provided
      let signerList = signers;
      if (!signerList || signerList.length === 0) {
        const signerResult = await db.query(
          'SELECT id, signer_name, signer_email, role FROM session_signers WHERE session_id = $1',
          [session_id]
        );
        signerList = signerResult.rows.map((s) => ({
          name: s.signer_name,
          email: s.signer_email,
          role: s.role,
        }));
      }

      // Call TRG e-sign
      const result = await trgEsign.createSignatureRequest({
        sessionId: session_id,
        documentId: document_id,
        documentUrl: document_url,
        signers: signerList,
        notaryId: notary_id,
      });

      // Update document record with signature request ID
      await db.query(
        `UPDATE session_documents
         SET esign_request_id = $1, esign_status = 'pending', updated_at = NOW()
         WHERE id = $2`,
        [result.signatureRequestId, document_id]
      );

      await audit.emitAuditLog({
        eventType: 'esign.request_created',
        actorType: 'notary',
        actorId: notary_id,
        sessionId: session_id,
        notaryId: notary_id,
        payload: {
          document_id,
          signature_request_id: result.signatureRequestId,
          signer_count: signerList.length,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      logger.info('Signature request created', {
        sessionId: session_id,
        documentId: document_id,
        signatureRequestId: result.signatureRequestId,
      });

      res.status(201).json({ data: result });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /signatures/:documentId/status — Get signature status
// ---------------------------------------------------------------------------
router.get('/:documentId/status', async (req, res, next) => {
  try {
    const doc = await db.query(
      'SELECT * FROM session_documents WHERE id = $1', [req.params.documentId]
    );
    if (!doc.rows[0]) {
      return res.status(404).json({ error: { message: 'Document not found' } });
    }
    if (!doc.rows[0].esign_request_id) {
      return res.json({ data: { document_id: req.params.documentId, esign_status: 'not_started' } });
    }

    // Poll TRG e-sign for latest status
    const status = await trgEsign.getSignatureStatus(doc.rows[0].esign_request_id);

    // Update local record
    if (status.status !== doc.rows[0].esign_status) {
      await db.query(
        `UPDATE session_documents
         SET esign_status = $1, signed_document_url = $2, updated_at = NOW()
         WHERE id = $3`,
        [status.status, status.signedDocumentUrl || null, req.params.documentId]
      );
    }

    res.json({ data: { document_id: req.params.documentId, ...status } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /signatures/:documentId/cancel — Cancel a signature request
// ---------------------------------------------------------------------------
router.post('/:documentId/cancel', async (req, res, next) => {
  try {
    const doc = await db.query(
      'SELECT * FROM session_documents WHERE id = $1', [req.params.documentId]
    );
    if (!doc.rows[0] || !doc.rows[0].esign_request_id) {
      return res.status(404).json({ error: { message: 'No signature request found for this document' } });
    }

    await trgEsign.cancelSignatureRequest(doc.rows[0].esign_request_id);

    await db.query(
      `UPDATE session_documents SET esign_status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [req.params.documentId]
    );

    await audit.emitAuditLog({
      eventType: 'esign.request_cancelled',
      actorType: req.body._actor_type || 'system',
      sessionId: doc.rows[0].session_id,
      payload: { document_id: req.params.documentId, signature_request_id: doc.rows[0].esign_request_id },
    });

    res.json({ data: { document_id: req.params.documentId, esign_status: 'cancelled' } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /signatures/session/:sessionId — List all signatures for a session
// ---------------------------------------------------------------------------
router.get('/session/:sessionId', async (req, res, next) => {
  try {
    const docs = await db.query(
      `SELECT id, document_type, original_filename, esign_request_id, esign_status,
              signed_document_url, uploaded_at
       FROM session_documents WHERE session_id = $1
       ORDER BY uploaded_at`,
      [req.params.sessionId]
    );
    res.json({ data: docs.rows, count: docs.rows.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
