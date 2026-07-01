/**
 * @sealproof/shared — Entry point
 * Re-exports all shared modules for clean imports.
 */
module.exports = {
  config: require('./config'),
  db: require('./db/pool'),
  pool: require('./db/pool'),
  redis: require('./db/redis'),
  logger: require('./utils/logger'),
  audit: require('./utils/audit'),
  errorHandler: require('./middleware/errorHandler'),
  requestLogger: require('./middleware/requestLogger'),
  validate: require('./middleware/validate'),
  tenantResolver: require('./middleware/tenantResolver'),
  security: require('./middleware/security'),
  metrics: require('./middleware/metrics'),
  socketManager: require('./events/socketManager'),
};
