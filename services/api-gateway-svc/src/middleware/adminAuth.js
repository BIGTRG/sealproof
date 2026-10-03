/**
 * adminAuth — gates SealProof key management (/v1/keys).
 * Requires header X-SealProof-Admin-Token matching SEALPROOF_ADMIN_TOKEN in .env.
 * Fails closed if the env var is missing.
 */
const crypto = require('crypto');

function adminAuth(req, res, next) {
  const expected = process.env.SEALPROOF_ADMIN_TOKEN || '';
  if (!expected) {
    return res.status(503).json({ error: { message: 'Key management is disabled (admin token not configured)' } });
  }
  const given = String(req.get('X-SealProof-Admin-Token') || '');
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: { message: 'Admin authentication required' } });
  }
  return next();
}

module.exports = { adminAuth };
