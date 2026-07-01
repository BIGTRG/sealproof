/**
 * HMAC-SHA256 Authentication Tests
 *
 * Tests the API gateway's request signing and verification
 * used by B2B partners (§14.1).
 */
const crypto = require('crypto');

// HMAC signing logic (mirrors api-gateway-svc/src/middleware/hmacAuth.js)
function signRequest(secret, timestamp, method, path, body) {
  const payload = `${timestamp}${method}${path}${body || ''}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifyRequest(secret, headers, method, path, body) {
  const timestamp = headers['x-timestamp'];
  const signature = headers['x-signature'];
  const apiKey = headers['x-api-key'];

  if (!timestamp || !signature || !apiKey) {
    return { valid: false, error: 'MISSING_AUTH_HEADERS' };
  }

  // Check timestamp freshness (within 5 minutes)
  const now = Math.floor(Date.now() / 1000);
  const reqTime = parseInt(timestamp, 10);
  if (Math.abs(now - reqTime) > 300) {
    return { valid: false, error: 'TIMESTAMP_EXPIRED' };
  }

  const expectedSignature = signRequest(secret, timestamp, method, path, body);
  const valid = crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );

  return valid
    ? { valid: true, apiKey }
    : { valid: false, error: 'INVALID_SIGNATURE' };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('HMAC-SHA256 Authentication', () => {
  const secret = 'test-partner-secret-key-abc123';
  const apiKey = 'pk_test_partner_001';

  describe('signRequest', () => {
    test('should produce a 64-character hex string', () => {
      const sig = signRequest(secret, '1700000000', 'POST', '/v1/sessions', '{"test":true}');
      expect(sig).toMatch(/^[0-9a-f]{64}$/);
    });

    test('should be deterministic', () => {
      const sig1 = signRequest(secret, '1700000000', 'GET', '/v1/sessions', '');
      const sig2 = signRequest(secret, '1700000000', 'GET', '/v1/sessions', '');
      expect(sig1).toBe(sig2);
    });

    test('should differ with different timestamps', () => {
      const sig1 = signRequest(secret, '1700000000', 'GET', '/v1/sessions', '');
      const sig2 = signRequest(secret, '1700000001', 'GET', '/v1/sessions', '');
      expect(sig1).not.toBe(sig2);
    });

    test('should differ with different methods', () => {
      const sig1 = signRequest(secret, '1700000000', 'GET', '/v1/sessions', '');
      const sig2 = signRequest(secret, '1700000000', 'POST', '/v1/sessions', '');
      expect(sig1).not.toBe(sig2);
    });

    test('should differ with different bodies', () => {
      const sig1 = signRequest(secret, '1700000000', 'POST', '/v1/sessions', '{"a":1}');
      const sig2 = signRequest(secret, '1700000000', 'POST', '/v1/sessions', '{"a":2}');
      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifyRequest', () => {
    test('should verify a valid signature', () => {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const body = '{"document_type":"poa"}';
      const signature = signRequest(secret, timestamp, 'POST', '/v1/sessions', body);

      const result = verifyRequest(
        secret,
        { 'x-timestamp': timestamp, 'x-signature': signature, 'x-api-key': apiKey },
        'POST',
        '/v1/sessions',
        body
      );

      expect(result.valid).toBe(true);
      expect(result.apiKey).toBe(apiKey);
    });

    test('should reject missing headers', () => {
      const result = verifyRequest(secret, {}, 'GET', '/v1/sessions', '');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('MISSING_AUTH_HEADERS');
    });

    test('should reject expired timestamps', () => {
      const oldTimestamp = String(Math.floor(Date.now() / 1000) - 600); // 10 minutes ago
      const signature = signRequest(secret, oldTimestamp, 'GET', '/v1/sessions', '');

      const result = verifyRequest(
        secret,
        { 'x-timestamp': oldTimestamp, 'x-signature': signature, 'x-api-key': apiKey },
        'GET',
        '/v1/sessions',
        ''
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('TIMESTAMP_EXPIRED');
    });

    test('should reject tampered signatures', () => {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = signRequest(secret, timestamp, 'GET', '/v1/sessions', '');
      const tampered = signature.slice(0, -4) + 'ffff';

      const result = verifyRequest(
        secret,
        { 'x-timestamp': timestamp, 'x-signature': tampered, 'x-api-key': apiKey },
        'GET',
        '/v1/sessions',
        ''
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_SIGNATURE');
    });

    test('should reject wrong secret', () => {
      const timestamp = String(Math.floor(Date.now() / 1000));
      const signature = signRequest('wrong-secret', timestamp, 'GET', '/v1/sessions', '');

      const result = verifyRequest(
        secret,
        { 'x-timestamp': timestamp, 'x-signature': signature, 'x-api-key': apiKey },
        'GET',
        '/v1/sessions',
        ''
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('INVALID_SIGNATURE');
    });
  });
});
