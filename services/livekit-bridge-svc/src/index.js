/**
 * livekit-bridge-svc — LiveKit Video Room Management
 * Port 4005
 *
 * Creates rooms per session, issues participant tokens,
 * manages recording lifecycle, cleans up post-session.
 * Wraps existing TRG LiveKit infrastructure.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config, requestLogger, errorHandler, logger } = require('@sealproof/shared');

const roomRoutes = require('./routes/rooms');
const healthRoutes = require('./routes/health');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/rooms', roomRoutes);

app.use(errorHandler);

const PORT = config.ports.livekit;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`livekit-bridge-svc listening on port ${PORT}`);
  });
}

module.exports = app;
