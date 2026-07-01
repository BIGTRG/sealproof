/**
 * notary-roster-svc — Entry Point
 * Manages notary shift scheduling, real-time presence tracking (Redis),
 * and next-available notary lookup.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config, requestLogger, errorHandler, logger } = require('@sealproof/shared');

const shiftRoutes = require('./routes/shifts');
const rosterRoutes = require('./routes/roster');
const presenceRoutes = require('./routes/presence');
const healthRoutes = require('./routes/health');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/shifts', shiftRoutes);
app.use('/roster', rosterRoutes);
app.use('/presence', presenceRoutes);

app.use(errorHandler);

const PORT = config.ports.roster;

if (require.main === module) {
  const { connectRedis } = require('@sealproof/shared').redis;
  connectRedis().then(() => {
    app.listen(PORT, () => {
      logger.info(`notary-roster-svc listening on port ${PORT}`);
    });
  });
}

module.exports = app;
