/**
 * Webhook Delivery Engine
 *
 * Signs payloads with HMAC-SHA256, delivers with exponential
 * backoff retries, and logs every attempt for auditing.
 */
const crypto = require('crypto');
const axios = require('axios');
const { logger, db } = require('@sealproof/shared');

const MAX_RETRIES = 5;
const RETRY_DELAYS = [1000, 5000, 30000, 120000, 600000]; // 1s, 5s, 30s, 2m, 10m

/**
 * Deliver a webhook to a partner's callback URL.
 */
async function deliverWebhook({ callbackUrl, partnerSecret, event, payload, webhookId }) {
  const body = JSON.stringify({ event, data: payload, timestamp: new Date().toISOString(), webhook_id: webhookId });
  const signature = crypto.createHmac('sha256', partnerSecret).update(body).digest('hex');

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.post(callbackUrl, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-SealProof-Signature': signature,
          'X-SealProof-Event': event,
          'X-SealProof-Webhook-ID': webhookId,
        },
        timeout: 10000,
      });

      // Log success
      await db.query(
        `INSERT INTO webhook_deliveries (webhook_id, callback_url, event, status, attempt, response_code)
         VALUES ($1, $2, $3, 'delivered', $4, $5)`,
        [webhookId, callbackUrl, event, attempt + 1, response.status]
      );

      logger.info('Webhook delivered', { webhookId, event, attempt: attempt + 1, status: response.status });
      return { status: 'delivered', attempts: attempt + 1 };
    } catch (err) {
      lastError = err;
      logger.warn('Webhook delivery failed', { webhookId, event, attempt: attempt + 1, error: err.message });

      // Log failed attempt
      await db.query(
        `INSERT INTO webhook_deliveries (webhook_id, callback_url, event, status, attempt, error_message)
         VALUES ($1, $2, $3, 'failed', $4, $5)`,
        [webhookId, callbackUrl, event, attempt + 1, err.message]
      ).catch(() => {}); // Don't fail on logging

      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      }
    }
  }

  logger.error('Webhook delivery exhausted retries', { webhookId, event, callbackUrl });
  return { status: 'failed', attempts: MAX_RETRIES + 1, error: lastError?.message };
}

module.exports = { deliverWebhook };
