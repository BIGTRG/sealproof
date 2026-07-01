/**
 * Rate Limiter Tests
 *
 * Tests the per-partner rate limiting logic used by api-gateway-svc (§14.1).
 */

// In-memory rate limiter (mirrors api-gateway-svc/src/middleware/rateLimiter.js)
class RateLimiter {
  constructor({ windowMs = 60000, maxRequests = 100 } = {}) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.windows = new Map(); // key -> { count, resetAt }
  }

  check(key) {
    const now = Date.now();
    let window = this.windows.get(key);

    if (!window || now >= window.resetAt) {
      window = { count: 0, resetAt: now + this.windowMs };
      this.windows.set(key, window);
    }

    window.count++;

    if (window.count > this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.ceil((window.resetAt - now) / 1000),
      };
    }

    return {
      allowed: true,
      remaining: this.maxRequests - window.count,
      retryAfter: 0,
    };
  }

  reset(key) {
    this.windows.delete(key);
  }
}

// Tier-based limits from §14.3
const TIER_LIMITS = {
  starter: { windowMs: 60000, maxRequests: 30 },
  growth: { windowMs: 60000, maxRequests: 100 },
  scale: { windowMs: 60000, maxRequests: 500 },
  enterprise: { windowMs: 60000, maxRequests: 1000 },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Rate Limiter', () => {
  test('should allow requests within limit', () => {
    const limiter = new RateLimiter({ maxRequests: 5 });
    for (let i = 0; i < 5; i++) {
      const result = limiter.check('partner-1');
      expect(result.allowed).toBe(true);
    }
  });

  test('should block requests exceeding limit', () => {
    const limiter = new RateLimiter({ maxRequests: 3 });
    limiter.check('partner-1');
    limiter.check('partner-1');
    limiter.check('partner-1');
    const result = limiter.check('partner-1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  test('should track remaining requests', () => {
    const limiter = new RateLimiter({ maxRequests: 5 });
    expect(limiter.check('p1').remaining).toBe(4);
    expect(limiter.check('p1').remaining).toBe(3);
    expect(limiter.check('p1').remaining).toBe(2);
  });

  test('should isolate keys (per-partner)', () => {
    const limiter = new RateLimiter({ maxRequests: 2 });
    limiter.check('partner-a');
    limiter.check('partner-a');
    const resultA = limiter.check('partner-a');
    expect(resultA.allowed).toBe(false);

    // Partner B should be unaffected
    const resultB = limiter.check('partner-b');
    expect(resultB.allowed).toBe(true);
  });

  test('should reset after window expires', () => {
    const limiter = new RateLimiter({ windowMs: 100, maxRequests: 1 });
    limiter.check('p1');
    expect(limiter.check('p1').allowed).toBe(false);

    // Manually expire the window
    const window = limiter.windows.get('p1');
    window.resetAt = Date.now() - 1;

    expect(limiter.check('p1').allowed).toBe(true);
  });

  test('should support manual reset', () => {
    const limiter = new RateLimiter({ maxRequests: 1 });
    limiter.check('p1');
    expect(limiter.check('p1').allowed).toBe(false);
    limiter.reset('p1');
    expect(limiter.check('p1').allowed).toBe(true);
  });

  describe('Tier limits', () => {
    test('starter tier: 30 req/min', () => {
      const limiter = new RateLimiter(TIER_LIMITS.starter);
      for (let i = 0; i < 30; i++) {
        expect(limiter.check('starter').allowed).toBe(true);
      }
      expect(limiter.check('starter').allowed).toBe(false);
    });

    test('enterprise tier: 1000 req/min', () => {
      const limiter = new RateLimiter(TIER_LIMITS.enterprise);
      for (let i = 0; i < 1000; i++) {
        limiter.check('enterprise');
      }
      expect(limiter.check('enterprise').allowed).toBe(false);
    });
  });
});
