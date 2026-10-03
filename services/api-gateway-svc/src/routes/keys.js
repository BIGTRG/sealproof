/**
 * API Key Management
 *
 * POST /v1/keys           Create new API key pair
 * POST /v1/keys/rotate    Rotate API secret
 * GET  /v1/keys/:id       Get key info (no secret)
 * POST /v1/keys/:id/status  Set status (active | pending_payment | suspended)
 *
 * All routes require X-SealProof-Admin-Token (see middleware/adminAuth.js).
 * New keys start as pending_payment and cannot call the API until activated
 * (hmacAuth only accepts status = 'active').
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
      const initialStatus = req.body.activate === true ? 'active' : 'pending_payment';
      const apiKey = generateApiKey();
      const apiSecret = generateApiSecret();

      // Legacy NOT NULL columns (business_name, primary_contact_*, api_key_hash,
      // pricing) are filled from the v2 fields so the insert satisfies both schemas.
      const contactName = req.body.contact_name || partner_name;
      const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
      const pricing = { starter: [0, 2500], growth: [29900, 1500], enterprise: [0, 0] }[subscription_tier || 'starter'] || [0, 2500];
      const result = await db.query(
        `INSERT INTO api_partners (id, partner_name, contact_email, api_key, api_secret, subscription_tier, status,
                                  business_name, primary_contact_email, primary_contact_name, api_key_hash,
                                  monthly_subscription_cents, per_session_cents)
         VALUES ($1, $2, $3, $4, $5, $6, $11, $2, $3, $7, $8, $9, $10)
         RETURNING id, partner_name, api_key, subscription_tier, status, created_at`,
        [uuid(), partner_name, contact_email || '', apiKey, apiSecret, subscription_tier || 'starter', contactName, apiKeyHash, pricing[0], pricing[1], initialStatus]
      );

      await audit.emitAuditLog({ eventType: 'api.key_created', actorType: 'admin', payload: { partner_name, tier: subscription_tier, status: initialStatus } });

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
        `UPDATE api_partners SET api_secret = $1
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

// POST /v1/keys/:id/status — activate after payment, or suspend
const ALLOWED_STATUS = ['active', 'pending_payment', 'suspended'];
router.post('/:id/status', async (req, res, next) => {
  try {
    const status = req.body && req.body.status;
    if (!ALLOWED_STATUS.includes(status)) {
      return res.status(400).json({ error: { message: `status must be one of ${ALLOWED_STATUS.join(', ')}` } });
    }
    const result = await db.query(
      `UPDATE api_partners SET status = $1, is_active = ($1 = 'active') WHERE id = $2
       RETURNING id, partner_name, subscription_tier, status`,
      [status, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: { message: 'Partner not found' } });
    await audit.emitAuditLog({ eventType: 'api.key_status_changed', actorType: 'admin', payload: { partner: result.rows[0].partner_name, status } });
    res.json({ data: result.rows[0] });
  } catch (err) { next(err); }
});

module.exports = router;
