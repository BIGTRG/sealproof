/**
 * Seal Routes (Multi-State Aware)
 *
 * POST  /seals/:sessionId/apply       Apply seal to session documents
 * GET   /seals/:sessionId/status      Check seal status
 * POST  /seals/:sessionId/verify      Verify seal integrity
 *
 * Updated: Seal now reads state rules from state_ron_rules table
 * to apply the correct state header, label, and statute reference.
 */
const router = require('express').Router();
const { validate, audit, logger, db } = require('@sealproof/shared');
const { applySeal, computeDocumentHash } = require('../utils/sealGenerator');
const { requestTimestamp } = require('../utils/tsa');
const {
  S3Client, GetObjectCommand, PutObjectCommand
} = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const { config } = require('@sealproof/shared');

const s3 = new S3Client({
  region: config.aws.region,
  ...(config.aws.endpoint ? { endpoint: config.aws.endpoint, forcePathStyle: true } : {}),
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

/**
 * Load state rules for seal generation.
 * Falls back gracefully if state-compliance-svc hasn't seeded the state yet.
 */
async function loadStateRules(stateCode) {
  try {
    const result = await db.query(
      'SELECT seal_state_header, seal_state_label, seal_statute_reference, seal_fields_required FROM state_ron_rules WHERE state_code = $1',
      [stateCode || 'NC']
    );
    return result.rows[0] || null;
  } catch {
    // Table may not exist yet; fall back to defaults
    return null;
  }
}

// ---------------------------------------------------------------------------
// POST /seals/:sessionId/apply — Apply seal to all session documents
// ---------------------------------------------------------------------------
router.post('/:sessionId/apply', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Get session, notary info, and commission (multi-state aware)
    const session = await db.query(
      `SELECT ns.*, n.full_legal_name, n.commission_number,
              n.commission_expires_at AS commission_expiry,
              ns.notary_state, ns.governing_state_code
       FROM notarization_sessions ns
       JOIN notaries n ON n.id = ns.notary_id
       WHERE ns.id = $1`,
      [sessionId]
    );
    if (!session.rows[0]) {
      return res.status(404).json({ error: { message: 'Session not found' } });
    }

    const sess = session.rows[0];
    if (!['completed', 'in_session'].includes(sess.status)) {
      return res.status(409).json({
        error: { message: `Cannot seal: session status is ${sess.status}` },
      });
    }

    // Determine governing state (session-specific or notary default)
    const stateCode = sess.governing_state_code || sess.notary_state || 'NC';

    // If the notary has a multi-state commission, try to use it
    let commissionNumber = sess.commission_number;
    let commissionExpiry = sess.commission_expiry;
    try {
      const commission = await db.query(
        `SELECT commission_number, commission_expires_at
         FROM notary_commissions
         WHERE notary_id = $1 AND state_code = $2 AND is_active = true
         ORDER BY commission_expires_at DESC LIMIT 1`,
        [sess.notary_id, stateCode]
      );
      if (commission.rows[0]) {
        commissionNumber = commission.rows[0].commission_number;
        commissionExpiry = commission.rows[0].commission_expires_at;
      }
    } catch {
      // notary_commissions table may not exist yet; use default
    }

    // Load state rules for seal formatting
    const stateRules = await loadStateRules(stateCode);

    // Get all signed documents for this session
    const docs = await db.query(
      `SELECT * FROM session_documents
       WHERE session_id = $1 AND esign_status IN ('completed', 'signed')`,
      [sessionId]
    );

    if (docs.rows.length === 0) {
      return res.status(409).json({ error: { message: 'No signed documents found to seal' } });
    }

    // Get signers
    const signers = await db.query(
      'SELECT signer_name FROM session_signers WHERE session_id = $1', [sessionId]
    );
    const signerNames = signers.rows.map((s) => s.signer_name).join(', ');

    const sealedDocs = [];

    for (const doc of docs.rows) {
      // Download the signed document from S3
      let pdfBuffer;
      if (doc.signed_document_url && doc.signed_document_url.startsWith('s3://')) {
        const s3Path = doc.signed_document_url.replace('s3://', '');
        const slashIdx = s3Path.indexOf('/');
        const bucket = s3Path.substring(0, slashIdx);
        const key = s3Path.substring(slashIdx + 1);
        const s3Response = await s3.send(new GetObjectCommand({ Bucket: bucket || config.aws.documentBucket, Key: key }));
        const chunks = [];
        for await (const chunk of s3Response.Body) chunks.push(chunk);
        pdfBuffer = Buffer.concat(chunks);
      } else {
        logger.warn('Document URL is not S3, skipping seal', { documentId: doc.id });
        continue;
      }

      // Apply seal with state-aware configuration
      const sealData = {
        notaryName: sess.full_legal_name,
        commissionNumber,
        commissionExpiry,
        notarizationDate: sess.session_started_at || new Date().toISOString(),
        actType: doc.document_type || 'acknowledgment',
        signerName: signerNames,
        sessionId,
        stateCode,
        county: sess.county || null,
        idMethod: sess.kba_required ? 'Credential Analysis + KBA' : 'Credential Analysis',
      };

      const sealedPdf = await applySeal(pdfBuffer, sealData, stateRules);

      // Request TSA timestamp
      const docHash = crypto.createHash('sha256').update(sealedPdf);
      const tsaResult = await requestTimestamp(docHash.digest());

      // Upload sealed document to S3
      const sealedKey = `sealed/${sessionId}/${doc.id}-sealed.pdf`;
      await s3.send(new PutObjectCommand({
        Bucket: config.aws.documentBucket,
        Key: sealedKey,
        Body: sealedPdf,
        ContentType: 'application/pdf',
        Metadata: {
          'session-id': sessionId,
          'document-id': doc.id,
          'state-code': stateCode,
          'seal-hash': computeDocumentHash(pdfBuffer, sealData),
          'tsa-timestamp': tsaResult.timestamp,
          'tsa-provider': tsaResult.tsaUrl,
        },
      }));

      // Update document record
      await db.query(
        `UPDATE session_documents
         SET sealed_document_url = $1, seal_hash = $2,
             tsa_timestamp = $3, updated_at = NOW()
         WHERE id = $4`,
        [
          `s3://${config.aws.documentBucket}/${sealedKey}`,
          computeDocumentHash(pdfBuffer, sealData),
          tsaResult.timestamp,
          doc.id,
        ]
      );

      sealedDocs.push({
        document_id: doc.id,
        sealed_url: `s3://${config.aws.documentBucket}/${sealedKey}`,
        seal_hash: computeDocumentHash(pdfBuffer, sealData),
        tsa_timestamp: tsaResult.timestamp,
        state_code: stateCode,
      });
    }

    await audit.emitAuditLog({
      eventType: 'seal.applied',
      actorType: 'system',
      sessionId,
      notaryId: sess.notary_id,
      payload: {
        documents_sealed: sealedDocs.length,
        notary_name: sess.full_legal_name,
        commission_number: commissionNumber,
        state_code: stateCode,
        statute_reference: stateRules?.seal_statute_reference || 'NCGS 10B-72',
      },
    });

    logger.info('Seals applied to session documents', {
      sessionId,
      stateCode,
      documentsSealed: sealedDocs.length,
    });

    res.json({ data: { session_id: sessionId, state_code: stateCode, sealed_documents: sealedDocs } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /seals/:sessionId/verify — Verify seal integrity
// ---------------------------------------------------------------------------
router.post('/:sessionId/verify', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    const docs = await db.query(
      `SELECT id, seal_hash, sealed_document_url, tsa_timestamp
       FROM session_documents
       WHERE session_id = $1 AND seal_hash IS NOT NULL`,
      [sessionId]
    );

    if (docs.rows.length === 0) {
      return res.json({ data: { session_id: sessionId, verified: false, reason: 'No sealed documents found' } });
    }

    await audit.emitAuditLog({
      eventType: 'seal.verified',
      actorType: req.body._actor_type || 'admin',
      actorId: req.body._actor_id || null,
      sessionId,
      payload: { documents_checked: docs.rows.length },
    });

    res.json({
      data: {
        session_id: sessionId,
        documents: docs.rows,
        total_sealed: docs.rows.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /seals/:sessionId/status — Check seal status
// ---------------------------------------------------------------------------
router.get('/:sessionId/status', async (req, res, next) => {
  try {
    const docs = await db.query(
      `SELECT id, esign_status, seal_hash, tsa_timestamp
       FROM session_documents WHERE session_id = $1`,
      [req.params.sessionId]
    );

    const sealed = docs.rows.filter((d) => d.seal_hash);
    const unsigned = docs.rows.filter((d) => !d.esign_status || d.esign_status === 'not_started');

    res.json({
      data: {
        session_id: req.params.sessionId,
        total_documents: docs.rows.length,
        sealed: sealed.length,
        unsigned: unsigned.length,
        all_sealed: docs.rows.length > 0 && sealed.length === docs.rows.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
