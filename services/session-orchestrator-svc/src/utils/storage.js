/**
 * Document storage (S3-compatible: MinIO in production).
 * Uploaded signer documents live in the documents bucket, keyed by session.
 */
const { S3Client, PutObjectCommand, GetObjectCommand, CreateBucketCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
const { config, logger } = require('@sealproof/shared');

const s3 = new S3Client({
  region: config.aws.region,
  ...(config.aws.endpoint ? { endpoint: config.aws.endpoint, forcePathStyle: true } : {}),
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

const BUCKET = config.aws.documentBucket;
let bucketChecked = false;

async function ensureBucket() {
  if (bucketChecked) return;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
  } catch (err) {
    if (err.$metadata?.httpStatusCode === 404 || err.name === 'NotFound') {
      await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
      logger.info('Created documents bucket', { bucket: BUCKET });
    } else {
      throw err;
    }
  }
  bucketChecked = true;
}

/**
 * Store a document. Returns the object key (stored in session_documents.upload_url).
 */
async function putDocument({ sessionId, documentId, filename, body, contentType }) {
  await ensureBucket();
  const safeName = String(filename || 'document.pdf').replace(/[^A-Za-z0-9._-]/g, '_');
  const key = `sessions/${sessionId}/${documentId}/${safeName}`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType || 'application/octet-stream',
    Metadata: { 'session-id': sessionId, 'document-id': documentId },
  }));
  return `s3://${BUCKET}/${key}`;
}

/**
 * Fetch a stored document as a stream + metadata.
 */
async function getDocument(uploadUrl) {
  const key = uploadUrl.replace(`s3://${BUCKET}/`, '');
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return { stream: res.Body, contentType: res.ContentType, contentLength: res.ContentLength };
}

module.exports = { putDocument, getDocument, BUCKET };
