/**
 * api-gateway-svc — B2B Public API + Auth + Rate Limiting
 * Port 4013
 *
 * External-facing API for B2B partners. HMAC request signing,
 * API key management, rate limiting per partner, and proxying
 * to internal microservices.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config, requestLogger, errorHandler, logger } = require('@sealproof/shared');

const apiRoutes = require('./routes/api');
const keyRoutes = require('./routes/keys');
const healthRoutes = require('./routes/health');
const { hmacAuth } = require('./middleware/hmacAuth');
const { rateLimiter } = require('./middleware/rateLimiter');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/v1/keys', keyRoutes);
app.use('/v1', hmacAuth, rateLimiter, apiRoutes);

app.use(errorHandler);

const PORT = config.ports.apiGateway;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`api-gateway-svc listening on port ${PORT}`);
  });
}

module.exports = app;
