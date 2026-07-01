/**
 * seal-applicator-svc — Digital Notary Seal + Timestamp
 * Port 4009
 *
 * Applies tamper-evident digital seals to notarized documents
 * per NCGS 10B-72. Embeds notary info, commission details,
 * state seal graphic, and RFC 3161 timestamp from TSA.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config, requestLogger, errorHandler, logger } = require('@sealproof/shared');

const sealRoutes = require('./routes/seals');
const healthRoutes = require('./routes/health');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Large PDFs
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/seals', sealRoutes);

app.use(errorHandler);

const PORT = config.ports.seal;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`seal-applicator-svc listening on port ${PORT}`);
  });
}

module.exports = app;
