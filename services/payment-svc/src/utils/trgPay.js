/**
 * TRG Pay API Client
 *
 * Wraps TRGPay.com for:
 *   - Authorization holds at session creation
 *   - Capture on session completion
 *   - Notary payouts
 *   - Refunds for failed sessions
 *   - Subscription billing
 */
const axios = require('axios');
const { config, logger } = require('@sealproof/shared');

const client = axios.create({
  baseURL: config.trgPay.baseUrl,
  headers: { 'Authorization': `Bearer ${config.trgPay.apiKey}`, 'Content-Type': 'application/json' },
  timeout: 15000,
});

/** Create an authorization hold on customer's payment method. */
async function createAuthHold({ customerId, amountCents, sessionId, description }) {
  try {
    const res = await client.post('/authorizations', {
      customer_id: customerId,
      amount_cents: amountCents,
      currency: 'usd',
      description: description || `Notarization session ${sessionId}`,
      metadata: { session_id: sessionId, platform: 'sealproof' },
    });
    return { authorizationId: res.data.id, status: res.data.status };
  } catch (err) {
    logger.error('TRG Pay auth hold failed', { error: err.response?.data || err.message });
    throw Object.assign(new Error(`Payment auth failed: ${err.response?.data?.message || err.message}`), { status: 502 });
  }
}

/** Capture a previously authorized payment. */
async function capturePayment(authorizationId, { amountCents } = {}) {
  try {
    const body = {};
    if (amountCents) body.amount_cents = amountCents;
    const res = await client.post(`/authorizations/${authorizationId}/capture`, body);
    return { paymentId: res.data.id, status: res.data.status, amountCents: res.data.amount_cents };
  } catch (err) {
    logger.error('TRG Pay capture failed', { error: err.message, authorizationId });
    throw Object.assign(new Error(`Payment capture failed: ${err.message}`), { status: 502 });
  }
}

/** Issue a refund. */
async function refund(paymentId, { amountCents, reason } = {}) {
  try {
    const res = await client.post(`/payments/${paymentId}/refund`, {
      amount_cents: amountCents,
      reason: reason || 'session_failed',
    });
    return { refundId: res.data.id, status: res.data.status };
  } catch (err) {
    logger.error('TRG Pay refund failed', { error: err.message, paymentId });
    throw Object.assign(new Error(`Refund failed: ${err.message}`), { status: 502 });
  }
}

/** Pay out a notary for a completed session. */
async function payoutNotary({ notaryId, amountCents, sessionId }) {
  try {
    const res = await client.post('/payouts', {
      recipient_id: notaryId,
      amount_cents: amountCents,
      currency: 'usd',
      description: `Notarization payout — session ${sessionId}`,
      metadata: { session_id: sessionId, platform: 'sealproof' },
    });
    return { payoutId: res.data.id, status: res.data.status };
  } catch (err) {
    logger.error('TRG Pay payout failed', { error: err.message, notaryId });
    throw Object.assign(new Error(`Payout failed: ${err.message}`), { status: 502 });
  }
}

/** Create a subscription for an API partner. */
async function createSubscription({ partnerId, planId, amountCents }) {
  try {
    const res = await client.post('/subscriptions', {
      customer_id: partnerId,
      plan_id: planId,
      amount_cents: amountCents,
      currency: 'usd',
      metadata: { platform: 'sealproof' },
    });
    return { subscriptionId: res.data.id, status: res.data.status };
  } catch (err) {
    logger.error('TRG Pay subscription failed', { error: err.message, partnerId });
    throw Object.assign(new Error(`Subscription failed: ${err.message}`), { status: 502 });
  }
}

module.exports = { createAuthHold, capturePayment, refund, payoutNotary, createSubscription };
