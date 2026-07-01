/**
 * Security Middleware Stack
 *
 * Helmet (HTTP security headers), CORS, rate limiting,
 * request ID generation, and IP extraction.
 */
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// Helmet-like security headers (no external dependency)
// ---------------------------------------------------------------------------
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '0'); // Modern best practice: disable, rely on CSP
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  // Remove fingerprinting headers
  res.removeHeader('X-Powered-By');
  next();
}

// ---------------------------------------------------------------------------
// CORS middleware
// ---------------------------------------------------------------------------
function cors(options = {}) {
  const allowedOrigins = options.origins || [
    'https://sealproof.ai',
    'https://www.sealproof.ai',
    'https://notary.sealproof.ai',
    'https://admin.sealproof.ai',
  ];
  const allowedMethods = options.methods || 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS';
  const allowedHeaders = options.headers || 'Content-Type,Authorization,X-Request-ID,X-Tenant-ID';
  const maxAge = options.maxAge || '86400';

  return (req, res, next) => {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader('Access-Control-Allow-Methods', allowedMethods);
    res.setHeader('Access-Control-Allow-Headers', allowedHeaders);
    res.setHeader('Access-Control-Max-Age', maxAge);

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    next();
  };
}

// ---------------------------------------------------------------------------
// Request ID middleware
// ---------------------------------------------------------------------------
function requestId(req, res, next) {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

// ---------------------------------------------------------------------------
// Client IP extraction (behind nginx proxy)
// ---------------------------------------------------------------------------
function extractClientIp(req, res, next) {
  req.clientIp =
    req.headers['x-real-ip'] ||
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown';
  next();
}

// ---------------------------------------------------------------------------
// Request size limiter
// ---------------------------------------------------------------------------
function requestSizeLimiter(maxBytes = 10 * 1024 * 1024) { // 10MB default
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > maxBytes) {
      return res.status(413).json({
        error: 'PAYLOAD_TOO_LARGE',
        message: `Request body exceeds maximum size of ${Math.round(maxBytes / 1024 / 1024)}MB`,
      });
    }
    next();
  };
}

// ---------------------------------------------------------------------------
// Combined security stack
// ---------------------------------------------------------------------------
function securityStack(options = {}) {
  return [
    securityHeaders,
    cors(options.cors),
    requestId,
    extractClientIp,
    requestSizeLimiter(options.maxBodyBytes),
  ];
}

module.exports = {
  securityHeaders,
  cors,
  requestId,
  extractClientIp,
  requestSizeLimiter,
  securityStack,
};
