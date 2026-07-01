/**
 * Per-Partner Rate Limiting
 *
 * Limits based on subscription tier:
 *   - starter:    100 req/min
 *   - business:   500 req/min
 *   - enterprise: 2000 req/min
 */
const rateLimit = require('express-rate-limit');
const { redis } = require('@sealproof/shared');

const TIER_LIMITS = {
  starter: 100,
  business: 500,
  enterprise: 2000,
  default: 50,
};

function rateLimiter(req, res, next) {
  const tier = req.partner?.subscription_tier || 'default';
  const limit = TIER_LIMITS[tier] || TIER_LIMITS.default;

  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: limit,
    keyGenerator: (req) => req.partner?.id || req.ip,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { message: `Rate limit exceeded (${limit} req/min for ${tier} tier)` } },
  });

  return limiter(req, res, next);
}

module.exports = { rateLimiter };
