/**
 * webhook-svc — Outbound Webhook Delivery
 * Port 4014
 *
 * Delivers session lifecycle events to B2B partner
 * callback URLs with retry logic and delivery tracking.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config, requestLogger, errorHandler, logger } = require('@sealproof/shared');

const webhookRoutes = require('./routes/webhooks');
const healthRoutes = require('./routes/health');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/webhooks', webhookRoutes);

app.use(errorHandler);

const PORT = config.ports.webhook;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`webhook-svc listening on port ${PORT}`);
  });
}

module.exports = app;
