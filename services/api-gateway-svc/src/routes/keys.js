/**
 * API Key Management
 *
 * POST /v1/keys           Create new API key pair
 * POST /v1/keys/rotate    Rotate API secret
 * GET  /v1/keys/:id       Get key info (no secret)
 */
const router = require('express').Router();
const crypto = require('crypto');
const { v4: uuid } = require('uuid');
const { validate, audit, logger, db } = require('@sealproof/shared');

function generateApiKey() {
  return `rhn_${crypto.randomBytes(24).toString('hex')}`;
}

function generateApiSecret() {
  return `rhn_sec_${crypto.randomBytes(32).toString('hex')}`;
}

// POST /v1/keys — Create new key pair (admin only)
router.post('/',
  validate({ body: { partner_name: { required: true } } }),
  async (req, res, next) => {
    try {
      const { partner_name, contact_email, subscription_tier } = req.body;
      const apiKey = generateApiKey();
      const apiSecret = generateApiSecret();

      const result = await db.query(
        `INSERT INTO api_partners (id, partner_name, contact_email, api_key, api_secret, subscription_tier, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING id, partner_name, api_key, subscription_tier, status, created_at`,
        [uuid(), partner_name, contact_email, apiKey, apiSecret, subscription_tier || 'starter']
      );

      await audit.emitAuditLog({ eventType: 'api.key_created', actorType: 'admin', payload: { partner_name, tier: subscription_tier } });

      // Return secret ONCE — will never be shown again
      res.status(201).json({
        data: {
          ...result.rows[0],
          api_secret: apiSecret,
          warning: 'Save the api_secret now. It will not be shown again.',
        },
      });
    } catch (err) { next(err); }
  }
);

// POST /v1/keys/rotate
router.post('/rotate',
  validate({ body: { api_key: { required: true } } }),
  async (req, res, next) => {
    try {
      const newSecret = generateApiSecret();
      const result = await db.query(
        `UPDATE api_partners SET api_secret = $1, updated_at = NOW()
         WHERE api_key = $2 AND status = 'active' RETURNING id, partner_name, api_key`,
        [newSecret, req.body.api_key]
      );
      if (!result.rows[0]) return res.status(404).json({ error: { message: 'API key not found' } });

      await audit.emitAuditLog({ eventType: 'api.key_rotated', actorType: 'admin', payload: { partner: result.rows[0].partner_name } });
      res.json({ data: { ...result.rows[0], new_api_secret: newSecret, warning: 'Save the new secret now.' } });
    } catch (err) { next(err); }
  }
);

router.get('/:id', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT id, partner_name, api_key, subscription_tier, status, created_at FROM api_partners WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: { message: 'Partner not found' } });
    res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
