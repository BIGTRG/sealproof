/**
 * recording-svc — Session Recording Management
 * Port 4008
 *
 * Handles recording download from LiveKit, per-session AES-256
 * encryption via AWS KMS, S3 upload with Object Lock (10-year),
 * and authorized retrieval with full audit trail.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config, requestLogger, errorHandler, logger } = require('@sealproof/shared');

const recordingRoutes = require('./routes/recordings');
const healthRoutes = require('./routes/health');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/recordings', recordingRoutes);

app.use(errorHandler);

const PORT = config.ports.recording;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`recording-svc listening on port ${PORT}`);
  });
}

module.exports = app;
