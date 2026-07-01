/**
 * HMAC Request Signing Authentication
 *
 * Partners sign requests with their secret key:
 *   signature = HMAC-SHA256(secret, timestamp + method + path + body)
 *
 * Headers:
 *   X-SealProof-Key:       API key
 *   X-SealProof-Timestamp: Unix timestamp (within 5-min window)
 *   X-SealProof-Signature: HMAC-SHA256 hex digest
 */
const crypto = require('crypto');
const { db, logger } = require('@sealproof/shared');

const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000; // 5 minutes

async function hmacAuth(req, res, next) {
  const apiKey = req.get('X-SealProof-Key');
  const timestamp = req.get('X-SealProof-Timestamp');
  const signature = req.get('X-SealProof-Signature');

  if (!apiKey || !timestamp || !signature) {
    return res.status(401).json({ error: { message: 'Missing authentication headers', required: ['X-SealProof-Key', 'X-SealProof-Timestamp', 'X-SealProof-Signature'] } });
  }

  // Clock skew check
  const requestTime = parseInt(timestamp, 10) * 1000;
  if (Math.abs(Date.now() - requestTime) > MAX_CLOCK_SKEW_MS) {
    return res.status(401).json({ error: { message: 'Request timestamp too far from server time' } });
  }

  // Look up partner
  const partner = await db.query(
    "SELECT * FROM api_partners WHERE api_key = $1 AND status = 'active'",
    [apiKey]
  );
  if (!partner.rows[0]) {
    return res.status(401).json({ error: { message: 'Invalid API key' } });
  }

  // Verify HMAC
  const body = JSON.stringify(req.body || {});
  const payload = `${timestamp}${req.method}${req.originalUrl}${body}`;
  const expected = crypto.createHmac('sha256', partner.rows[0].api_secret).update(payload).digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) {
    logger.warn('HMAC verification failed', { apiKey, path: req.originalUrl });
    return res.status(401).json({ error: { message: 'Invalid signature' } });
  }

  // Attach partner to request
  req.partner = partner.rows[0];
  next();
}

module.exports = { hmacAuth };
