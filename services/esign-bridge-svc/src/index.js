/**
 * esign-bridge-svc — TRG E-Sign Integration
 * Port 4006
 *
 * Wraps TRG e-sign API for signature capture during
 * notarization sessions. Handles signature requests,
 * status polling, and completion webhooks.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config, requestLogger, errorHandler, logger } = require('@sealproof/shared');

const signatureRoutes = require('./routes/signatures');
const webhookRoutes = require('./routes/webhooks');
const healthRoutes = require('./routes/health');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/signatures', signatureRoutes);
app.use('/signatures', webhookRoutes);

app.use(errorHandler);

const PORT = config.ports.esign;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`esign-bridge-svc listening on port ${PORT}`);
  });
}

module.exports = app;
