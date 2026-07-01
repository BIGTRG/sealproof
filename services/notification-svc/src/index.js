/**
 * notification-svc — Twilio + SendGrid Orchestration
 * Port 4011
 *
 * Centralized notification service for SMS (Twilio) and
 * email (SendGrid) across all session lifecycle events.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config, requestLogger, errorHandler, logger } = require('@sealproof/shared');

const notificationRoutes = require('./routes/notifications');
const healthRoutes = require('./routes/health');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/notifications', notificationRoutes);

app.use(errorHandler);

const PORT = config.ports.notification;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`notification-svc listening on port ${PORT}`);
  });
}

module.exports = app;
