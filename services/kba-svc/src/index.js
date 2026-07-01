/**
 * kba-svc — Knowledge-Based Authentication
 * Port: 4017
 *
 * Integrates with IDology (primary) for KBA identity proofing.
 * Required by most RON states in addition to Persona credential analysis.
 * Signer must answer 4/5 questions from credit/public records.
 */
const express = require('express');
const { config, logger, requestLogger, errorHandler } = require('@sealproof/shared');

const kbaRouter    = require('./routes/kba');
const healthRouter = require('./routes/health');

const app = express();
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRouter);
app.use('/api/kba', kbaRouter);

app.use(errorHandler);

const PORT = process.env.KBA_SVC_PORT || 4017;
app.listen(PORT, () => {
  logger.info(`kba-svc listening on :${PORT}`);
});
