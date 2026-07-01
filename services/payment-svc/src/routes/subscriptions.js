/**
 * Subscription Routes — API Partner billing
 *
 * POST /subscriptions               Create subscription
 * GET  /subscriptions/:partnerId    Get partner's subscription
 * POST /subscriptions/:id/cancel    Cancel subscription
 */
const router = require('express').Router();
const { validate, audit, logger, db } = require('@sealproof/shared');
const trgPay = require('../utils/trgPay');

router.post('/',
  validate({ body: { partner_id: { required: true }, plan_tier: { required: true } } }),
  async (req, res, next) => {
    try {
      const { partner_id, plan_tier } = req.body;

      // Look up pricing
      const pricing = await db.query(
        "SELECT * FROM pricing_config WHERE config_key = $1",
        [`api_${plan_tier}_monthly_cents`]
      );
      const amountCents = pricing.rows[0]?.config_value || 49900; // default $499

      const result = await trgPay.createSubscription({ partnerId: partner_id, planId: plan_tier, amountCents });

      await db.query(
        `INSERT INTO subscriptions (partner_id, plan_tier, status, external_subscription_id, amount_cents)
         VALUES ($1, $2, 'active', $3, $4)
         ON CONFLICT (partner_id) DO UPDATE SET plan_tier = $2, status = 'active', external_subscription_id = $3, amount_cents = $4`,
        [partner_id, plan_tier, result.subscriptionId, amountCents]
      );

      await audit.emitAuditLog({ eventType: 'subscription.created', actorType: 'partner', actorId: partner_id, payload: { plan_tier, amount_cents: amountCents } });
      res.status(201).json({ data: result });
    } catch (err) { next(err); }
  }
);

router.get('/:partnerId', async (req, res, next) => {
  try {
    const sub = await db.query('SELECT * FROM subscriptions WHERE partner_id = $1', [req.params.partnerId]);
    if (!sub.rows[0]) return res.status(404).json({ error: { message: 'No subscription found' } });
    res.json({ data: sub.rows[0] });
  } catch (err) { next(err); }
});

router.post('/:id/cancel', async (req, res, next) => {
  try {
    await db.query("UPDATE subscriptions SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [req.params.id]);
    await audit.emitAuditLog({ eventType: 'subscription.cancelled', actorType: 'admin', payload: { subscription_id: req.params.id } });
    res.json({ data: { id: req.params.id, status: 'cancelled' } });
  } catch (err) { next(err); }
});

module.exports = router;
