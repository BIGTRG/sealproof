/**
 * SealProof — Structured Logger (Winston)
 */
const { createLogger, format, transports } = require('winston');
const config = require('../config');

const logger = createLogger({
  level: config.logLevel,
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.errors({ stack: true }),
    config.env === 'production'
      ? format.json()
      : format.combine(format.colorize(), format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        }))
  ),
  transports: [new transports.Console()],
  defaultMeta: { service: process.env.SERVICE_NAME || 'sealproof' },
});

module.exports = logger;
