/**
 * kyc-svc — KYC Identity Verification (Persona)
 * Port 4004
 *
 * Wraps Persona API for signer identity verification.
 * Triggers KYC flow, receives webhooks, stores outcomes.
 * Raw ID images purged after 90 days per NCGS 10B-118.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config, requestLogger, errorHandler, logger } = require('@sealproof/shared');

const kycRoutes = require('./routes/kyc');
const webhookRoutes = require('./routes/webhooks');
const healthRoutes = require('./routes/health');

const app = express();

app.use(helmet());
app.use(cors());
app.use('/kyc/webhooks', express.raw({ type: 'application/json' })); // raw body for webhook signature verification
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/kyc', kycRoutes);
app.use('/kyc/webhooks', webhookRoutes);

app.use(errorHandler);

const PORT = config.ports.kyc;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`kyc-svc listening on port ${PORT}`);
  });
}

module.exports = app;
