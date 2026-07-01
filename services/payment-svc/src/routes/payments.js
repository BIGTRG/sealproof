/**
 * Payment Routes
 *
 * POST /payments/authorize           Auth hold at session creation
 * POST /payments/capture             Capture on completion
 * POST /payments/refund              Refund for failed session
 * POST /payments/payout              Notary payout
 * GET  /payments/session/:sessionId  Payment history for a session
 * GET  /payments/reconciliation      Financial reconciliation report
 */
const router = require('express').Router();
const { validate, audit, logger, db } = require('@sealproof/shared');
const trgPay = require('../utils/trgPay');

// POST /payments/authorize
router.post('/authorize',
  validate({ body: { session_id: { required: true }, customer_id: { required: true }, amount_cents: { required: true } } }),
  async (req, res, next) => {
    try {
      const { session_id, customer_id, amount_cents, description } = req.body;
      const result = await trgPay.createAuthHold({ customerId: customer_id, amountCents: amount_cents, sessionId: session_id, description });

      await db.query(
        `INSERT INTO payment_transactions (session_id, customer_id, type, status, amount_cents, external_id)
         VALUES ($1, $2, 'authorization', $3, $4, $5)`,
        [session_id, customer_id, result.status, amount_cents, result.authorizationId]
      );

      await audit.emitAuditLog({ eventType: 'payment.authorized', actorType: 'customer', actorId: customer_id, sessionId: session_id, payload: { amount_cents, auth_id: result.authorizationId } });
      res.status(201).json({ data: result });
    } catch (err) { next(err); }
  }
);

// POST /payments/capture
router.post('/capture',
  validate({ body: { authorization_id: { required: true }, session_id: { required: true } } }),
  async (req, res, next) => {
    try {
      const { authorization_id, session_id, amount_cents } = req.body;
      const result = await trgPay.capturePayment(authorization_id, { amountCents: amount_cents });

      await db.query(
        `INSERT INTO payment_transactions (session_id, type, status, amount_cents, external_id)
         VALUES ($1, 'capture', $2, $3, $4)`,
        [session_id, result.status, result.amountCents, result.paymentId]
      );

      await audit.emitAuditLog({ eventType: 'payment.captured', actorType: 'system', sessionId: session_id, payload: result });
      res.json({ data: result });
    } catch (err) { next(err); }
  }
);

// POST /payments/refund
router.post('/refund',
  validate({ body: { payment_id: { required: true }, session_id: { required: true } } }),
  async (req, res, next) => {
    try {
      const { payment_id, session_id, amount_cents, reason } = req.body;
      const result = await trgPay.refund(payment_id, { amountCents: amount_cents, reason });

      await db.query(
        `INSERT INTO payment_transactions (session_id, type, status, amount_cents, external_id)
         VALUES ($1, 'refund', $2, $3, $4)`,
        [session_id, result.status, amount_cents || 0, result.refundId]
      );

      await audit.emitAuditLog({ eventType: 'payment.refunded', actorType: 'admin', sessionId: session_id, payload: result });
      res.json({ data: result });
    } catch (err) { next(err); }
  }
);

// POST /payments/payout
router.post('/payout',
  validate({ body: { notary_id: { required: true }, session_id: { required: true }, amount_cents: { required: true } } }),
  async (req, res, next) => {
    try {
      const { notary_id, session_id, amount_cents } = req.body;
      const result = await trgPay.payoutNotary({ notaryId: notary_id, amountCents: amount_cents, sessionId: session_id });

      await db.query(
        `INSERT INTO payment_transactions (session_id, notary_id, type, status, amount_cents, external_id)
         VALUES ($1, $2, 'payout', $3, $4, $5)`,
        [session_id, notary_id, result.status, amount_cents, result.payoutId]
      );

      await audit.emitAuditLog({ eventType: 'payment.payout', actorType: 'system', notaryId: notary_id, sessionId: session_id, payload: result });
      res.json({ data: result });
    } catch (err) { next(err); }
  }
);

// GET /payments/session/:sessionId
router.get('/session/:sessionId', async (req, res, next) => {
  try {
    const txns = await db.query(
      'SELECT * FROM payment_transactions WHERE session_id = $1 ORDER BY created_at', [req.params.sessionId]
    );
    res.json({ data: txns.rows, count: txns.rows.length });
  } catch (err) { next(err); }
});

// GET /payments/reconciliation
router.get('/reconciliation', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const result = await db.query(
      `SELECT type,
              COUNT(*) AS count,
              SUM(amount_cents) AS total_cents
       FROM payment_transactions
       WHERE created_at BETWEEN $1 AND $2
       GROUP BY type`,
      [from || '1970-01-01', to || '2099-12-31']
    );
    res.json({ data: result.rows, period: { from, to } });
  } catch (err) { next(err); }
});

module.exports = router;
