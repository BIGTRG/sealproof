/**
 * journal-svc — Immutable Notary Journal (NCGS 10B-118)
 * Port 4007
 *
 * Hash-chained immutable journal entries. Every completed
 * notarization produces a journal entry with a SHA-256 hash
 * linking to the previous entry (per notary). 10-year retention.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config, requestLogger, errorHandler, logger } = require('@sealproof/shared');

const journalRoutes = require('./routes/journal');
const healthRoutes = require('./routes/health');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRoutes);
app.use('/journal', journalRoutes);

app.use(errorHandler);

const PORT = config.ports.journal;

if (require.main === module) {
  app.listen(PORT, () => {
    logger.info(`journal-svc listening on port ${PORT}`);
  });
}

module.exports = app;
