/**
 * session-orchestrator-svc — Entry Point
 * Session lifecycle state machine, customer-to-notary matching,
 * queue management, and session timeout handling.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config, requestLogger, errorHandler, logger } = require('@sealproof/shared');

const sessionRoutes = require('./routes/sessions');
const workflowRoutes = require('./routes/workflow');
const healthRoutes = require('./routes/health');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/sessions', workflowRoutes); // BFF workflow (intake, docs, kyc, kba, payment, notary actions)
app.use('/sessions', sessionRoutes);

app.use(errorHandler);

const PORT = config.ports.orchestrator;

if (require.main === module) {
  const { connectRedis } = require('@sealproof/shared').redis;
  connectRedis().then(() => {
    app.listen(PORT, () => {
      logger.info(`session-orchestrator-svc listening on port ${PORT}`);
    });
  });
}

module.exports = app;
