/**
 * payment-svc — TRG Pay Integration
 * Port 4010
 *
 * Handles customer charges, notary payouts, API partner
 * subscription billing, refunds, and financial reconciliation.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config, requestLogger, errorHandler, logger } = require('@sealproof/shared');

const paymentRoutes = require('./routes/payments');
const subscriptionRoutes = require('./routes/subscriptions');
const webhookRoutes = require('./routes/webhooks');
const healthRoutes = require('./routes/health');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/payments', paymentRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/payments', webhookRoutes);

app.use(errorHandler);

const PORT = config.ports.payment;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`payment-svc listening on port ${PORT}`);
  });
}

module.exports = app;
