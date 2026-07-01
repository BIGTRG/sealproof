/**
 * SealProof — Express Error Handler Middleware
 */
const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const status = err.status || err.statusCode || 500;
  const message = status === 500 ? 'Internal server error' : err.message;

  logger.error('Request error', {
    method: req.method,
    path: req.path,
    status,
    error: err.message,
    stack: status === 500 ? err.stack : undefined,
  });

  res.status(status).json({
    error: {
      message,
      code: err.code || 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}

module.exports = errorHandler;
