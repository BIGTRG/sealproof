/**
 * Recording Encryption — AWS KMS + AES-256-GCM
 *
 * Per §5.2.8:
 *   1. Generate per-session AES-256 DEK via KMS GenerateDataKey
 *   2. Encrypt recording with plaintext DEK
 *   3. Store encrypted DEK (CiphertextBlob) alongside recording
 *   4. Upload encrypted recording to S3 with Object Lock
 *   5. Discard plaintext DEK + local copies
 *
 * Retrieval:
 *   1. Download encrypted recording + encrypted DEK from S3
 *   2. Decrypt DEK via KMS Decrypt
 *   3. Decrypt recording with plaintext DEK
 */
const crypto = require('crypto');
const { KMSClient, GenerateDataKeyCommand, DecryptCommand } = require('@aws-sdk/client-kms');
const { config, logger } = require('@sealproof/shared');

const kms = new KMSClient({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

const KMS_KEY_ID = config.aws.kmsKeyId;
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Generate a per-session data encryption key via KMS.
 * Returns { plaintextKey (Buffer), encryptedKey (Buffer) }
 */
async function generateDataKey(sessionId) {
  const command = new GenerateDataKeyCommand({
    KeyId: KMS_KEY_ID,
    KeySpec: 'AES_256',
    EncryptionContext: {
      session_id: sessionId,
      platform: 'sealproof',
    },
  });

  const response = await kms.send(command);
  return {
    plaintextKey: Buffer.from(response.Plaintext),
    encryptedKey: Buffer.from(response.CiphertextBlob),
    keyId: response.KeyId,
  };
}

/**
 * Decrypt an encrypted DEK via KMS.
 */
async function decryptDataKey(encryptedKey, sessionId) {
  const command = new DecryptCommand({
    CiphertextBlob: encryptedKey,
    EncryptionContext: {
      session_id: sessionId,
      platform: 'sealproof',
    },
  });

  const response = await kms.send(command);
  return Buffer.from(response.Plaintext);
}

/**
 * Encrypt recording data with AES-256-GCM.
 * Returns { encrypted (Buffer), iv (Buffer), authTag (Buffer) }
 */
function encryptRecording(data, plaintextKey) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, plaintextKey, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return { encrypted, iv, authTag };
}

/**
 * Decrypt recording data with AES-256-GCM.
 */
function decryptRecording(encryptedData, plaintextKey, iv, authTag) {
  const decipher = crypto.createDecipheriv(ALGORITHM, plaintextKey, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encryptedData), decipher.final()]);
}

/**
 * Package encrypted recording into a single buffer with metadata header.
 * Format: [4-byte IV length][IV][4-byte authTag length][authTag][4-byte encryptedKey length][encryptedKey][encrypted data]
 */
function packageEncryptedRecording({ encrypted, iv, authTag, encryptedKey }) {
  const ivLen = Buffer.alloc(4);
  ivLen.writeUInt32BE(iv.length);

  const tagLen = Buffer.alloc(4);
  tagLen.writeUInt32BE(authTag.length);

  const keyLen = Buffer.alloc(4);
  keyLen.writeUInt32BE(encryptedKey.length);

  return Buffer.concat([ivLen, iv, tagLen, authTag, keyLen, encryptedKey, encrypted]);
}

/**
 * Unpackage encrypted recording from the stored format.
 */
function unpackageEncryptedRecording(data) {
  let offset = 0;

  const ivLen = data.readUInt32BE(offset); offset += 4;
  const iv = data.subarray(offset, offset + ivLen); offset += ivLen;

  const tagLen = data.readUInt32BE(offset); offset += 4;
  const authTag = data.subarray(offset, offset + tagLen); offset += tagLen;

  const keyLen = data.readUInt32BE(offset); offset += 4;
  const encryptedKey = data.subarray(offset, offset + keyLen); offset += keyLen;

  const encrypted = data.subarray(offset);

  return { iv, authTag, encryptedKey, encrypted };
}

module.exports = {
  generateDataKey, decryptDataKey,
  encryptRecording, decryptRecording,
  packageEncryptedRecording, unpackageEncryptedRecording,
};
