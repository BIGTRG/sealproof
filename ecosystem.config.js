/**
 * PM2 Ecosystem Config — SealProof (Stages 1–2)
 *
 * Start all services:  pm2 start ecosystem.config.js
 * Stop all:            pm2 stop all
 * Logs:                pm2 logs
 */
module.exports = {
  apps: [
    // ── Stage 1 ──
    {
      name: 'sealproof-commission-svc',
      script: 'services/notary-commission-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'notary-commission-svc' },
    },
    {
      name: 'sealproof-roster-svc',
      script: 'services/notary-roster-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'notary-roster-svc' },
    },
    {
      name: 'sealproof-orchestrator-svc',
      script: 'services/session-orchestrator-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'session-orchestrator-svc' },
    },
    // ── Stage 2 ──
    {
      name: 'sealproof-kyc-svc',
      script: 'services/kyc-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'kyc-svc' },
    },
    {
      name: 'sealproof-livekit-svc',
      script: 'services/livekit-bridge-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'livekit-bridge-svc' },
    },
    {
      name: 'sealproof-esign-svc',
      script: 'services/esign-bridge-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'esign-bridge-svc' },
    },
    // ── Stage 3 ──
    {
      name: 'sealproof-journal-svc',
      script: 'services/journal-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'journal-svc' },
    },
    {
      name: 'sealproof-recording-svc',
      script: 'services/recording-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'recording-svc' },
    },
    {
      name: 'sealproof-seal-svc',
      script: 'services/seal-applicator-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'seal-applicator-svc' },
    },
    // ── Stage 4–6 ──
    {
      name: 'sealproof-payment-svc',
      script: 'services/payment-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'payment-svc' },
    },
    {
      name: 'sealproof-notification-svc',
      script: 'services/notification-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'notification-svc' },
    },
    {
      name: 'sealproof-audit-export-svc',
      script: 'services/audit-export-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'audit-export-svc' },
    },
    {
      name: 'sealproof-api-gateway-svc',
      script: 'services/api-gateway-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'api-gateway-svc' },
    },
    {
      name: 'sealproof-webhook-svc',
      script: 'services/webhook-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'webhook-svc' },
    },
    // ── White-Label ──
    {
      name: 'sealproof-tenant-svc',
      script: 'services/tenant-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'tenant-svc' },
    },
    // ── Multi-State Compliance ──
    {
      name: 'sealproof-state-compliance-svc',
      script: 'services/state-compliance-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'state-compliance-svc' },
    },
    {
      name: 'sealproof-kba-svc',
      script: 'services/kba-svc/src/index.js',
      instances: 1,
      env: { NODE_ENV: 'development', SERVICE_NAME: 'kba-svc' },
    },
  ],
};
