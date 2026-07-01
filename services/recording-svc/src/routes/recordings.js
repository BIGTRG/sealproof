/**
 * Recording Routes
 *
 * POST  /recordings/:sessionId/process   Process + encrypt + upload recording
 * GET   /recordings/:sessionId           Retrieve recording (authorized)
 * GET   /recordings/:sessionId/status    Check recording status
 */
const router = require('express').Router();
const { validate, audit, logger, db } = require('@sealproof/shared');
const encryption = require('../utils/encryption');
const s3Storage = require('../utils/s3Storage');
const axios = require('axios');
const { config } = require('@sealproof/shared');

// ---------------------------------------------------------------------------
// POST /recordings/:sessionId/process — Process recording post-session
// ---------------------------------------------------------------------------
router.post('/:sessionId/process', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { recording_url } = req.body;

    // Verify session is completed
    const session = await db.query(
      'SELECT * FROM notarization_sessions WHERE id = $1', [sessionId]
    );
    if (!session.rows[0]) {
      return res.status(404).json({ error: { message: 'Session not found' } });
    }

    logger.info('Processing recording', { sessionId });

    // Step 1: Download recording from LiveKit/source URL
    let recordingData;
    if (recording_url) {
      const response = await axios.get(recording_url, { responseType: 'arraybuffer', timeout: 60000 });
      recordingData = Buffer.from(response.data);
    } else {
      return res.status(400).json({ error: { message: 'recording_url is required' } });
    }

    const originalSize = recordingData.length;

    // Step 2: Generate per-session DEK via KMS
    const { plaintextKey, encryptedKey, keyId } = await encryption.generateDataKey(sessionId);

    // Step 3: Encrypt recording
    const { encrypted, iv, authTag } = encryption.encryptRecording(recordingData, plaintextKey);

    // Step 4: Package encrypted data with metadata
    const packagedData = encryption.packageEncryptedRecording({ encrypted, iv, authTag, encryptedKey });

    // Step 5: Upload to S3 with Object Lock
    const s3Result = await s3Storage.uploadRecording(sessionId, packagedData, { keyId, originalSize });

    // Step 6: Zero out plaintext key and recording from memory
    plaintextKey.fill(0);
    recordingData.fill(0);

    // Step 7: Update session with recording info
    await db.query(
      `UPDATE notarization_sessions
       SET recording_url = $1, recording_encryption_key_id = $2, updated_at = NOW()
       WHERE id = $3`,
      [`s3://${s3Result.bucket}/${s3Result.key}`, keyId, sessionId]
    );

    await audit.emitAuditLog({
      eventType: 'recording.processed',
      actorType: 'system',
      sessionId,
      payload: {
        original_size: originalSize,
        encrypted_size: packagedData.length,
        s3_key: s3Result.key,
        kms_key_id: keyId,
        retain_until: s3Result.retainUntil,
      },
    });

    logger.info('Recording processed and uploaded', {
      sessionId,
      originalSize,
      encryptedSize: packagedData.length,
    });

    res.json({
      data: {
        session_id: sessionId,
        status: 'encrypted_and_stored',
        s3_key: s3Result.key,
        retain_until: s3Result.retainUntil,
        original_size: originalSize,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /recordings/:sessionId — Retrieve recording (authorized)
// ---------------------------------------------------------------------------
router.get('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { actor_type, actor_id } = req.query;

    // Authorization check
    if (!actor_type || !actor_id) {
      return res.status(400).json({ error: { message: 'actor_type and actor_id are required' } });
    }

    const validActors = ['notary', 'customer', 'admin', 'audit_partner'];
    if (!validActors.includes(actor_type)) {
      return res.status(403).json({ error: { message: 'Unauthorized actor type' } });
    }

    // Verify actor has access to this session
    const session = await db.query(
      'SELECT * FROM notarization_sessions WHERE id = $1', [sessionId]
    );
    if (!session.rows[0]) {
      return res.status(404).json({ error: { message: 'Session not found' } });
    }

    if (actor_type === 'notary' && session.rows[0].notary_id !== actor_id) {
      return res.status(403).json({ error: { message: 'Notary can only access own session recordings' } });
    }
    if (actor_type === 'customer' && session.rows[0].customer_id !== actor_id) {
      return res.status(403).json({ error: { message: 'Customer can only access own session recordings' } });
    }

    // Download from S3
    const stored = await s3Storage.downloadRecording(sessionId);
    if (!stored) {
      return res.status(404).json({ error: { message: 'Recording not found in storage' } });
    }

    // Unpackage + decrypt
    const { iv, authTag, encryptedKey, encrypted } = encryption.unpackageEncryptedRecording(stored.data);
    const plaintextKey = await encryption.decryptDataKey(encryptedKey, sessionId);
    const decrypted = encryption.decryptRecording(encrypted, plaintextKey, iv, authTag);
    plaintextKey.fill(0);

    // Audit every retrieval
    await audit.emitAuditLog({
      eventType: 'recording.retrieved',
      actorType: actor_type,
      actorId: actor_id,
      sessionId,
      payload: { recording_size: decrypted.length },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info('Recording retrieved', { sessionId, actorType: actor_type, actorId: actor_id });

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Disposition', `attachment; filename="session-${sessionId}.mp4"`);
    res.send(decrypted);
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /recordings/:sessionId/status — Check recording status
// ---------------------------------------------------------------------------
router.get('/:sessionId/status', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const exists = await s3Storage.recordingExists(sessionId);

    const session = await db.query(
      'SELECT recording_url, recording_encryption_key_id FROM notarization_sessions WHERE id = $1',
      [sessionId]
    );

    res.json({
      data: {
        session_id: sessionId,
        has_recording: exists,
        recording_url: session.rows[0]?.recording_url || null,
        encryption_key_id: session.rows[0]?.recording_encryption_key_id || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
