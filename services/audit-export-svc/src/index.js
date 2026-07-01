/**
 * audit-export-svc — Compliance Packet Generation
 * Port 4012
 *
 * Generates compliance packets for NC SoS audits,
 * per-notary self-audit reports, and subpoena response packets.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config, requestLogger, errorHandler, logger } = require('@sealproof/shared');

const exportRoutes = require('./routes/exports');
const healthRoutes = require('./routes/health');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/exports', exportRoutes);

app.use(errorHandler);

const PORT = config.ports.auditExport;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`audit-export-svc listening on port ${PORT}`);
  });
}

module.exports = app;
