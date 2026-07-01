/**
 * Payment Webhook Handler — TRG Pay callbacks
 * POST /payments/webhooks/trgpay
 */
const router = require('express').Router();
const { audit, logger, db } = require('@sealproof/shared');

router.post('/webhooks/trgpay', async (req, res) => {
  try {
    const { event, data } = req.body;
    logger.info('TRG Pay webhook', { event, transactionId: data?.id });

    if (event === 'payment.completed' || event === 'payout.completed') {
      await db.query(
        "UPDATE payment_transactions SET status = 'completed' WHERE external_id = $1",
        [data.id]
      );
    } else if (event === 'payment.failed') {
      await db.query(
        "UPDATE payment_transactions SET status = 'failed' WHERE external_id = $1",
        [data.id]
      );
    }

    await audit.emitAuditLog({ eventType: `payment.webhook.${event}`, actorType: 'system', payload: data });
    res.json({ ok: true });
  } catch (err) {
    logger.error('Payment webhook error', { error: err.message });
    res.json({ ok: true });
  }
});

module.exports = router;
