/**
 * state-compliance-svc — Multi-State RON Compliance Engine
 * Port: 4016
 *
 * Manages per-state RON rules, validates sessions against state requirements,
 * tracks platform registrations, and provides compliance data to all other services.
 */
const express = require('express');
const { config, logger, requestLogger, errorHandler } = require('@sealproof/shared');

const rulesRouter         = require('./routes/rules');
const validationRouter    = require('./routes/validation');
const registrationsRouter = require('./routes/registrations');
const healthRouter        = require('./routes/health');

const app = express();
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRouter);
app.use('/api/state-rules', rulesRouter);
app.use('/api/compliance', validationRouter);
app.use('/api/registrations', registrationsRouter);

app.use(errorHandler);

const PORT = process.env.STATE_COMPLIANCE_SVC_PORT || 4016;
app.listen(PORT, () => {
  logger.info(`state-compliance-svc listening on :${PORT}`);
});
