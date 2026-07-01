/**
 * Encryption Tests
 *
 * Tests the AES-256-GCM encryption/decryption used by recording-svc
 * to encrypt session recordings before S3 upload (§13.3).
 */
const crypto = require('crypto');

// Encryption logic (mirrors recording-svc/src/utils/encryption.js)
function encrypt(plainBuffer, key) {
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag(); // 128-bit authentication tag

  // Format: [IV (12 bytes)] [Auth Tag (16 bytes)] [Ciphertext]
  return Buffer.concat([iv, authTag, encrypted]);
}

function decrypt(encryptedBuffer, key) {
  const iv = encryptedBuffer.subarray(0, 12);
  const authTag = encryptedBuffer.subarray(12, 28);
  const ciphertext = encryptedBuffer.subarray(28);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AES-256-GCM Encryption', () => {
  const key = crypto.randomBytes(32); // 256-bit key

  test('should encrypt and decrypt successfully', () => {
    const plaintext = Buffer.from('This is a test recording payload');
    const encrypted = encrypt(plaintext, key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted.toString()).toBe(plaintext.toString());
  });

  test('encrypted output should be larger than plaintext', () => {
    const plaintext = Buffer.from('short');
    const encrypted = encrypt(plaintext, key);
    // 12 (IV) + 16 (auth tag) + ciphertext length
    expect(encrypted.length).toBe(12 + 16 + plaintext.length);
  });

  test('should produce different ciphertexts for same plaintext (random IV)', () => {
    const plaintext = Buffer.from('same data');
    const enc1 = encrypt(plaintext, key);
    const enc2 = encrypt(plaintext, key);
    expect(enc1.equals(enc2)).toBe(false);
  });

  test('should fail decryption with wrong key', () => {
    const plaintext = Buffer.from('secret data');
    const encrypted = encrypt(plaintext, key);
    const wrongKey = crypto.randomBytes(32);
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  test('should fail decryption with tampered ciphertext', () => {
    const plaintext = Buffer.from('tamper test');
    const encrypted = encrypt(plaintext, key);
    // Flip a byte in the ciphertext
    encrypted[30] = encrypted[30] ^ 0xff;
    expect(() => decrypt(encrypted, key)).toThrow();
  });

  test('should fail decryption with tampered auth tag', () => {
    const plaintext = Buffer.from('auth tag test');
    const encrypted = encrypt(plaintext, key);
    // Flip a byte in the auth tag
    encrypted[15] = encrypted[15] ^ 0xff;
    expect(() => decrypt(encrypted, key)).toThrow();
  });

  test('should handle empty plaintext', () => {
    const plaintext = Buffer.from('');
    const encrypted = encrypt(plaintext, key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted.length).toBe(0);
  });

  test('should handle large payloads (1MB)', () => {
    const plaintext = crypto.randomBytes(1024 * 1024); // 1MB
    const encrypted = encrypt(plaintext, key);
    const decrypted = decrypt(encrypted, key);
    expect(decrypted.equals(plaintext)).toBe(true);
  });
});
