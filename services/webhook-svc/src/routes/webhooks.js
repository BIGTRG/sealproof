/**
 * Webhook Routes
 *
 * POST /webhooks/dispatch            Dispatch a webhook event to partners
 * GET  /webhooks/deliveries/:id      Get delivery history for a webhook
 */
const router = require('express').Router();
const crypto = require('crypto');
const { validate, audit, logger, db } = require('@sealproof/shared');
const { deliverWebhook } = require('../utils/delivery');

// POST /webhooks/dispatch — Called internally when session events occur
router.post('/dispatch',
  validate({ body: { event: { required: true }, session_id: { required: true } } }),
  async (req, res, next) => {
    try {
      const { event, session_id, payload } = req.body;
      const webhookId = crypto.randomUUID();

      // Look up the session's API partner callback URL
      const session = await db.query(
        `SELECT ns.api_callback_url, ns.api_partner_id, ap.api_secret
         FROM notarization_sessions ns
         LEFT JOIN api_partners ap ON ap.id = ns.api_partner_id
         WHERE ns.id = $1`,
        [session_id]
      );

      const sess = session.rows[0];
      if (!sess?.api_callback_url) {
        return res.json({ data: { status: 'skipped', reason: 'no_callback_url' } });
      }

      // Dispatch asynchronously (respond immediately, deliver in background)
      res.json({ data: { webhook_id: webhookId, status: 'dispatched' } });

      // Fire and forget
      deliverWebhook({
        callbackUrl: sess.api_callback_url,
        partnerSecret: sess.api_secret || 'no-secret',
        event,
        payload: { session_id, ...payload },
        webhookId,
      }).then((result) => {
        audit.emitAuditLog({
          eventType: `webhook.${result.status}`,
          actorType: 'system',
          sessionId: session_id,
          payload: { webhook_id: webhookId, event, attempts: result.attempts },
        });
      });
    } catch (err) { next(err); }
  }
);

// GET /webhooks/deliveries/:webhookId
router.get('/deliveries/:webhookId', async (req, res, next) => {
  try {
    const deliveries = await db.query(
      'SELECT * FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY attempt',
      [req.params.webhookId]
    );
    res.json({ data: deliveries.rows, count: deliveries.rows.length });
  } catch (err) { next(err); }
});

module.exports = router;
