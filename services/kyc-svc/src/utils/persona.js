/**
 * Persona API Client
 *
 * Wraps Persona's inquiry API for identity verification.
 * Docs: https://docs.withpersona.com/reference
 */
const axios = require('axios');
const crypto = require('crypto');
const { config, logger } = require('@sealproof/shared');

const personaClient = axios.create({
  baseURL: config.persona.baseUrl,
  headers: {
    'Authorization': `Bearer ${config.persona.apiKey}`,
    'Persona-Version': '2023-01-05',
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

/**
 * Create a Persona inquiry for a signer.
 * Returns the inquiry ID and URL for the signer to complete.
 */
async function createInquiry({ signerId, sessionId, signerName, signerEmail }) {
  try {
    const response = await personaClient.post('/inquiries', {
      data: {
        attributes: {
          'inquiry-template-id': config.persona.templateId,
          'reference-id': `${sessionId}:${signerId}`,
          'note': `RON Session ${sessionId}`,
          fields: {
            'name-first': { type: 'string', value: signerName?.split(' ')[0] || '' },
            'name-last': { type: 'string', value: signerName?.split(' ').slice(1).join(' ') || '' },
            'email-address': { type: 'string', value: signerEmail || '' },
          },
        },
      },
    });

    const inquiry = response.data.data;
    return {
      inquiryId: inquiry.id,
      status: inquiry.attributes.status,
      referenceId: inquiry.attributes['reference-id'],
      sessionUrl: `https://withpersona.com/verify?inquiry-id=${inquiry.id}`,
    };
  } catch (err) {
    logger.error('Persona inquiry creation failed', {
      error: err.response?.data || err.message,
      sessionId,
      signerId,
    });
    throw Object.assign(
      new Error(`Persona API error: ${err.response?.data?.errors?.[0]?.title || err.message}`),
      { status: 502 }
    );
  }
}

/**
 * Get inquiry status from Persona.
 */
async function getInquiry(inquiryId) {
  try {
    const response = await personaClient.get(`/inquiries/${inquiryId}`);
    const inquiry = response.data.data;
    return {
      inquiryId: inquiry.id,
      status: inquiry.attributes.status,
      referenceId: inquiry.attributes['reference-id'],
      completedAt: inquiry.attributes['completed-at'],
      failedAt: inquiry.attributes['failed-at'],
    };
  } catch (err) {
    logger.error('Persona inquiry fetch failed', { error: err.message, inquiryId });
    throw Object.assign(
      new Error(`Persona API error: ${err.message}`),
      { status: 502 }
    );
  }
}

/**
 * Verify Persona webhook signature.
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  if (!config.persona.webhookSecret) {
    logger.warn('Persona webhook secret not configured; skipping verification');
    return true;
  }
  const hmac = crypto.createHmac('sha256', config.persona.webhookSecret);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader || ''));
}

/**
 * Map Persona inquiry status to our KYC result.
 */
function mapPersonaStatus(personaStatus) {
  switch (personaStatus) {
    case 'completed':
    case 'approved':
      return 'passed';
    case 'failed':
    case 'declined':
      return 'failed';
    case 'needs_review':
    case 'pending':
      return 'manual_review';
    default:
      return 'pending';
  }
}

module.exports = { createInquiry, getInquiry, verifyWebhookSignature, mapPersonaStatus };
