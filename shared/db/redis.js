/**
 * SealProof — Redis Client
 * Used for presence tracking, session queues, and caching.
 */
const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

const redis = new Redis(config.redis.url, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
  lazyConnect: true,
});

redis.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

redis.on('connect', () => {
  logger.debug('Redis connected');
});

/**
 * Connect to Redis (call once at service startup).
 */
async function connectRedis() {
  if (redis.status === 'ready') return;
  await redis.connect();
}

module.exports = { redis, connectRedis };
