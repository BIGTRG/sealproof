/**
 * SealProof — Shared Configuration
 * Loads environment variables with sensible defaults for development.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const config = {
  env: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  // Database
  db: {
    url: process.env.DATABASE_URL || 'postgresql://sealproof_app:changeme@localhost:5432/sealproof',
    readonlyUrl: process.env.DATABASE_URL_READONLY || null,
    pool: {
      min: parseInt(process.env.DB_POOL_MIN || '2', 10),
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
    },
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Service ports
  ports: {
    commission: parseInt(process.env.COMMISSION_SVC_PORT || '4001', 10),
    roster: parseInt(process.env.ROSTER_SVC_PORT || '4002', 10),
    orchestrator: parseInt(process.env.ORCHESTRATOR_SVC_PORT || '4003', 10),
    kyc: parseInt(process.env.KYC_SVC_PORT || '4004', 10),
    livekit: parseInt(process.env.LIVEKIT_SVC_PORT || '4005', 10),
    esign: parseInt(process.env.ESIGN_SVC_PORT || '4006', 10),
    journal: parseInt(process.env.JOURNAL_SVC_PORT || '4007', 10),
    recording: parseInt(process.env.RECORDING_SVC_PORT || '4008', 10),
    seal: parseInt(process.env.SEAL_SVC_PORT || '4009', 10),
    payment: parseInt(process.env.PAYMENT_SVC_PORT || '4010', 10),
    notification: parseInt(process.env.NOTIFICATION_SVC_PORT || '4011', 10),
    auditExport: parseInt(process.env.AUDIT_EXPORT_SVC_PORT || '4012', 10),
    apiGateway: parseInt(process.env.API_GATEWAY_SVC_PORT || '4013', 10),
    webhook: parseInt(process.env.WEBHOOK_SVC_PORT || '4014', 10),
    tenant: parseInt(process.env.TENANT_SVC_PORT || '4015', 10),
  },

  // Notary presence
  presence: {
    ttlSeconds: parseInt(process.env.PRESENCE_TTL || '90', 10),
    heartbeatInterval: parseInt(process.env.PRESENCE_HEARTBEAT || '30', 10),
  },

  // Session queue
  queue: {
    maxWaitMinutes: parseInt(process.env.QUEUE_MAX_WAIT || '15', 10),
    rushMaxWaitMinutes: parseInt(process.env.QUEUE_RUSH_MAX_WAIT || '5', 10),
  },

  // Persona KYC
  persona: {
    apiKey: process.env.PERSONA_API_KEY || '',
    templateId: process.env.PERSONA_TEMPLATE_ID || '',
    baseUrl: process.env.PERSONA_BASE_URL || 'https://withpersona.com/api/v1',
    webhookSecret: process.env.PERSONA_WEBHOOK_SECRET || '',
  },

  // LiveKit
  livekit: {
    wsUrl: process.env.LIVEKIT_WS_URL || 'wss://livekit.trgtechlink.com',
    apiKey: process.env.LIVEKIT_API_KEY || '',
    apiSecret: process.env.LIVEKIT_API_SECRET || '',
  },

  // TRG E-Sign
  trgEsign: {
    baseUrl: process.env.TRG_ESIGN_BASE_URL || 'https://esign.trgtechlink.com/api/v1',
    apiKey: process.env.TRG_ESIGN_API_KEY || '',
  },

  // AWS (for recordings + document storage)
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    recordingBucket: process.env.AWS_RECORDING_BUCKET || 'sealproof-recordings',
    documentBucket: process.env.AWS_DOCUMENT_BUCKET || 'sealproof-documents',
    kmsKeyId: process.env.AWS_KMS_KEY_ID || '',
    // S3-compatible endpoint override (self-hosted MinIO). Empty = real AWS.
    endpoint: process.env.S3_ENDPOINT || '',
    // Local KMS master key (hex, 32 bytes). Set = envelope encryption without AWS KMS.
    kmsMasterKey: process.env.KMS_MASTER_KEY || '',
  },

  // Timestamp Authority (RFC 3161)
  tsa: {
    url: process.env.TSA_URL || 'https://freetsa.org/tsr',
  },

  // TRG Pay
  trgPay: {
    baseUrl: process.env.TRG_PAY_BASE_URL || 'https://api.trgpay.com/v1',
    apiKey: process.env.TRG_PAY_API_KEY || '',
  },

  // Twilio
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    fromNumber: process.env.TWILIO_FROM_NUMBER || '',
  },

  // SendGrid
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: parseInt(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'notifications@sealproof.ai',
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || 'noreply@sealproof.ai',
  },

  // Base URL for callbacks
  baseUrl: process.env.BASE_URL || 'http://localhost:4006',
};

module.exports = config;
