/**
 * TRG E-Sign API Client
 *
 * Wraps the existing TRG e-sign service for document
 * signature capture during notarization sessions.
 */
const axios = require('axios');
const { config, logger } = require('@sealproof/shared');

const esignClient = axios.create({
  baseURL: config.trgEsign.baseUrl,
  headers: {
    'Authorization': `Bearer ${config.trgEsign.apiKey}`,
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

/**
 * Create a signature request for a document in a session.
 *
 * @param {object} params
 * @param {string} params.sessionId      Notarization session ID
 * @param {string} params.documentId     session_documents ID
 * @param {string} params.documentUrl    URL of the document to sign
 * @param {Array}  params.signers        Array of { name, email, role }
 * @param {string} params.notaryId       The notary who will witness
 * @returns {object} { signatureRequestId, signingUrl, status }
 */
async function createSignatureRequest({ sessionId, documentId, documentUrl, signers, notaryId }) {
  try {
    const response = await esignClient.post('/signature-requests', {
      document_url: documentUrl,
      document_id: documentId,
      session_id: sessionId,
      signers: signers.map((s) => ({
        name: s.name,
        email: s.email,
        role: s.role || 'signer',
        order: s.order || 1,
      })),
      notary_id: notaryId,
      callback_url: `${config.baseUrl}/signatures/${documentId}/webhook`,
      metadata: {
        platform: 'sealproof',
        session_id: sessionId,
      },
    });

    return {
      signatureRequestId: response.data.id || response.data.signature_request_id,
      signingUrl: response.data.signing_url,
      status: response.data.status || 'pending',
    };
  } catch (err) {
    logger.error('TRG e-sign request failed', {
      error: err.response?.data || err.message,
      sessionId,
      documentId,
    });
    throw Object.assign(
      new Error(`TRG e-sign API error: ${err.response?.data?.message || err.message}`),
      { status: 502 }
    );
  }
}

/**
 * Get signature request status.
 */
async function getSignatureStatus(signatureRequestId) {
  try {
    const response = await esignClient.get(`/signature-requests/${signatureRequestId}`);
    return {
      signatureRequestId,
      status: response.data.status,
      signedDocumentUrl: response.data.signed_document_url,
      completedAt: response.data.completed_at,
      signers: response.data.signers,
    };
  } catch (err) {
    logger.error('TRG e-sign status check failed', { error: err.message, signatureRequestId });
    throw Object.assign(
      new Error(`TRG e-sign API error: ${err.message}`),
      { status: 502 }
    );
  }
}

/**
 * Cancel a signature request.
 */
async function cancelSignatureRequest(signatureRequestId) {
  try {
    await esignClient.delete(`/signature-requests/${signatureRequestId}`);
    return true;
  } catch (err) {
    logger.warn('Failed to cancel e-sign request', { error: err.message, signatureRequestId });
    return false;
  }
}

module.exports = { createSignatureRequest, getSignatureStatus, cancelSignatureRequest };
