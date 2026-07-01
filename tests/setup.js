/**
 * SealProof — Jest Test Setup
 *
 * Configures test environment, mock database, and shared test utilities.
 */

// Set test environment variables before any imports
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test:test@localhost:5432/sealproof_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.PORT = '0'; // Random port for tests
process.env.LOG_LEVEL = 'silent';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.PERSONA_API_KEY = 'test-persona-key';
process.env.LIVEKIT_API_KEY = 'test-livekit-key';
process.env.LIVEKIT_API_SECRET = 'test-livekit-secret';
process.env.TRG_PAY_API_KEY = 'test-trgpay-key';
process.env.TRG_ESIGN_API_KEY = 'test-esign-key';
process.env.TWILIO_ACCOUNT_SID = 'test-twilio-sid';
process.env.TWILIO_AUTH_TOKEN = 'test-twilio-token';
process.env.SENDGRID_API_KEY = 'test-sendgrid-key';
process.env.AWS_ACCESS_KEY_ID = 'test-aws-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-aws-secret';
process.env.AWS_REGION = 'us-east-1';
process.env.KMS_KEY_ID = 'test-kms-key';

// Global test utilities
global.testUtils = {
  /**
   * Generate a test UUID
   */
  uuid: () => {
    const crypto = require('crypto');
    return crypto.randomUUID();
  },

  /**
   * Create a mock Express response
   */
  mockRes: () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
      end: jest.fn().mockReturnThis(),
      _status: null,
      _json: null,
    };
    res.status.mockImplementation((code) => {
      res._status = code;
      return res;
    });
    res.json.mockImplementation((data) => {
      res._json = data;
      return res;
    });
    return res;
  },

  /**
   * Create a mock Express request
   */
  mockReq: (overrides = {}) => ({
    params: {},
    query: {},
    body: {},
    headers: {},
    requestId: 'test-request-id',
    clientIp: '127.0.0.1',
    tenantId: null,
    ...overrides,
  }),

  /**
   * Create a test session object
   */
  mockSession: (overrides = {}) => ({
    id: global.testUtils.uuid(),
    customer_id: global.testUtils.uuid(),
    notary_id: null,
    document_type: 'poa',
    document_count: 1,
    signer_count: 1,
    status: 'created',
    ron_session_type: 'standard',
    state_of_act: 'NC',
    created_at: new Date().toISOString(),
    ...overrides,
  }),

  /**
   * Create a test notary object
   */
  mockNotary: (overrides = {}) => ({
    id: global.testUtils.uuid(),
    user_id: global.testUtils.uuid(),
    full_legal_name: 'Test Notary',
    display_name: 'T. Notary',
    state: 'NC',
    commission_number: 'NC-12345678',
    commission_expires_at: '2028-12-31',
    electronic_notary_id: 'EN-12345',
    ren_authorization_id: 'REN-12345',
    is_active: true,
    status: 'approved',
    per_session_cents: 1200,
    ...overrides,
  }),

  /**
   * Wait for a specified number of milliseconds
   */
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

// Clean up after all tests
afterAll(async () => {
  // Close any open handles
  await new Promise((resolve) => setTimeout(resolve, 100));
});
