/**
 * notary-commission-svc — Entry Point
 * Handles notary onboarding, credentialing, commission verification,
 * surety/E&O tracking, and admin approval workflow.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config, requestLogger, errorHandler, logger } = require('@sealproof/shared');

const notaryRoutes      = require('./routes/notaries');
const commissionRoutes  = require('./routes/commissions');
const healthRoutes      = require('./routes/health');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

// Routes
app.use('/health', healthRoutes);
app.use('/notaries', notaryRoutes);
app.use('/', commissionRoutes);

// Error handler (must be last)
app.use(errorHandler);

const PORT = config.ports.commission;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`notary-commission-svc listening on port ${PORT}`);
  });
}

module.exports = app;
