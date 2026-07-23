/**
 * S3 Storage — Recording upload/download with Object Lock (Multi-State Aware)
 *
 * Recordings are stored with:
 *   - S3 Object Lock (GOVERNANCE mode, retention per state rules)
 *   - Server-side encryption (SSE-S3 as an additional layer)
 *   - Metadata: session_id, encryption_key_id, recorded_at, state_code
 *
 * Retention period is now driven by state_ron_rules.recording_retention_years
 * rather than hardcoded to 10 years. Falls back to 10 years if state rules
 * are not available.
 */
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { config, logger, db } = require('@sealproof/shared');

const s3 = new S3Client({
  region: config.aws.region,
  ...(config.aws.endpoint ? { endpoint: config.aws.endpoint, forcePathStyle: true } : {}),
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

const BUCKET = config.aws.recordingBucket;
const DEFAULT_RETENTION_YEARS = 10; // NC default; overridden by state rules

/**
 * Get recording retention years for a given state.
 */
async function getRetentionYears(stateCode) {
  if (!stateCode) return DEFAULT_RETENTION_YEARS;
  try {
    const result = await db.query(
      'SELECT recording_retention_years FROM state_ron_rules WHERE state_code = $1',
      [stateCode.toUpperCase()]
    );
    if (result.rows[0] && result.rows[0].recording_retention_years) {
      return result.rows[0].recording_retention_years;
    }
  } catch {
    // Table may not exist yet; fall back
  }
  return DEFAULT_RETENTION_YEARS;
}

/**
 * Upload encrypted recording to S3 with Object Lock.
 *
 * @param {string} sessionId
 * @param {Buffer} encryptedData
 * @param {object} metadata
 * @param {string} metadata.keyId - KMS key ID used for encryption
 * @param {number} metadata.originalSize - original file size before encryption
 * @param {string} metadata.stateCode - notary's state (determines retention)
 */
async function uploadRecording(sessionId, encryptedData, metadata = {}) {
  const key = `recordings/${sessionId}/session-recording.enc`;
  const retentionYears = await getRetentionYears(metadata.stateCode);
  const retainUntil = new Date();
  retainUntil.setFullYear(retainUntil.getFullYear() + retentionYears);

  try {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: encryptedData,
      ContentType: 'application/octet-stream',
      // SSE header only against real AWS; MinIO without KES rejects it.
      // Data is already AES-256-GCM encrypted at the application layer.
      ...(config.aws.endpoint ? {} : { ServerSideEncryption: 'AES256' }),
      ObjectLockMode: 'GOVERNANCE',
      ObjectLockRetainUntilDate: retainUntil,
      Metadata: {
        'session-id': sessionId,
        'encryption-key-id': metadata.keyId || '',
        'recorded-at': new Date().toISOString(),
        'original-size': String(metadata.originalSize || 0),
        'state-code': metadata.stateCode || 'NC',
        'retention-years': String(retentionYears),
      },
    }));

    logger.info('Recording uploaded to S3', {
      sessionId, key,
      stateCode: metadata.stateCode || 'NC',
      retentionYears,
      retainUntil: retainUntil.toISOString(),
    });
    return { bucket: BUCKET, key, retainUntil: retainUntil.toISOString(), retentionYears };
  } catch (err) {
    logger.error('S3 upload failed', { error: err.message, sessionId });
    throw Object.assign(new Error(`S3 upload failed: ${err.message}`), { status: 502 });
  }
}

/**
 * Download encrypted recording from S3.
 */
async function downloadRecording(sessionId) {
  const key = `recordings/${sessionId}/session-recording.enc`;
  try {
    const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const chunks = [];
    for await (const chunk of response.Body) {
      chunks.push(chunk);
    }
    return {
      data: Buffer.concat(chunks),
      metadata: response.Metadata,
    };
  } catch (err) {
    if (err.name === 'NoSuchKey') {
      return null;
    }
    logger.error('S3 download failed', { error: err.message, sessionId });
    throw Object.assign(new Error(`S3 download failed: ${err.message}`), { status: 502 });
  }
}

/**
 * Check if a recording exists.
 */
async function recordingExists(sessionId) {
  const key = `recordings/${sessionId}/session-recording.enc`;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

module.exports = { uploadRecording, downloadRecording, recordingExists };
