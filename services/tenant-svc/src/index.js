/**
 * tenant-svc — Entry Point
 * White-label tenant management, branding resolution, and tenant CRUD.
 * Port: 4015
 */
const express = require('express');
const { config, logger, requestLogger, errorHandler } = require('@sealproof/shared');

const tenantsRouter = require('./routes/tenants');
const resolveRouter = require('./routes/resolve');
const healthRouter  = require('./routes/health');

const app = express();
app.use(express.json());
app.use(requestLogger);

app.use('/health', healthRouter);
app.use('/api/tenants', tenantsRouter);
app.use('/api/resolve', resolveRouter);

app.use(errorHandler);

const PORT = process.env.TENANT_SVC_PORT || 4015;
app.listen(PORT, () => {
  logger.info(`tenant-svc listening on :${PORT}`);
});
