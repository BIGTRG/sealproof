/**
 * Notary Commission Routes
 * 
 * POST   /notaries                        Create notary (admin or self-application)
 * GET    /notaries                        List notaries (admin)
 * GET    /notaries/:id                    Get notary profile
 * PATCH  /notaries/:id                    Update notary profile
 * POST   /notaries/:id/credentials/verify Trigger SoS verification
 * POST   /notaries/:id/approve            Admin approval after verification
 * POST   /notaries/:id/suspend            Admin suspension
 * POST   /notaries/:id/offboard           Admin offboarding
 * GET    /notaries/expiring-credentials   Notaries with credentials expiring in 30d
 */
const router = require('express').Router();
const { validate, audit, logger, db } = require('@sealproof/shared');
const Notary = require('../models/notary');

// ---------------------------------------------------------------------------
// GET /notaries/expiring-credentials
// Must be before /:id to avoid route collision
// ---------------------------------------------------------------------------
router.get('/expiring-credentials', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days || '30', 10);
    const notaries = await Notary.findExpiringCredentials(days);
    res.json({ data: notaries, count: notaries.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /notaries — Create notary
// ---------------------------------------------------------------------------
router.post('/',
  validate({
    body: {
      user_id:               { required: true, type: 'string' },
      full_legal_name:       { required: true, type: 'string' },
      display_name:          { required: true, type: 'string' },
      commission_number:     { required: true, type: 'string' },
      commission_expires_at: { required: true, type: 'string' },
      electronic_notary_id:  { required: true, type: 'string' },
      ren_authorization_id:  { required: true, type: 'string' },
      per_session_cents:     { required: true, type: 'number' },
    },
  }),
  async (req, res, next) => {
    try {
      const notary = await Notary.create(req.body);

      await audit.emitAuditLog({
        eventType: 'notary.created',
        actorType: req.body._actor_type || 'system',
        actorId: req.body._actor_id || null,
        notaryId: notary.id,
        payload: {
          commission_number: notary.commission_number,
          state: notary.state,
          status: notary.status,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      logger.info('Notary created', { notaryId: notary.id, status: notary.status });
      res.status(201).json({ data: notary });
    } catch (err) {
      if (err.code === '23505') {
        // Unique violation — duplicate user_id
        err.status = 409;
        err.message = 'A notary record already exists for this user';
      }
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /notaries — List notaries
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const { status, state, is_active, limit, offset } = req.query;
    const notaries = await Notary.list({
      status,
      state,
      isActive: is_active !== undefined ? is_active === 'true' : undefined,
      limit: limit ? parseInt(limit, 10) : 50,
      offset: offset ? parseInt(offset, 10) : 0,
    });
    res.json({ data: notaries, count: notaries.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /notaries/:id — Get notary by ID

// ---------------------------------------------------------------------------
// GET /notaries/me — Current notary profile with dashboard aggregates
// TODO: resolve from Clerk-authenticated user; demo fallback until prod auth.
// Must be before /:id to avoid route collision
// ---------------------------------------------------------------------------
router.get('/me', async (req, res, next) => {
  try {
    const n = await db.query(
      'SELECT * FROM notaries WHERE is_active = true ORDER BY created_at ASC LIMIT 1'
    );
    if (!n.rows[0]) return res.status(404).json({ error: { message: 'Notary not found' } });
    const notary = n.rows[0];
    const agg = await db.query(
      `SELECT
        COUNT(*) FILTER (WHERE completed_at::date = CURRENT_DATE) AS today_n,
        COUNT(*) FILTER (WHERE completed_at >= date_trunc('week', now())) AS week_n,
        COALESCE(SUM(notary_payout_cents) FILTER (WHERE completed_at::date = CURRENT_DATE), 0) AS today_c
       FROM notarization_sessions WHERE notary_id = $1 AND status = 'completed'`,
      [notary.id]
    );
    const a = agg.rows[0];
    res.json({
      id: notary.id,
      fullName: notary.full_legal_name,
      state: notary.state,
      commissionNumber: notary.commission_number,
      commissionExpiresAt: notary.commission_expires_at,
      eandoProvider: notary.eando_provider,
      status: notary.status,
      sessionsToday: Number(a.today_n),
      sessionsThisWeek: Number(a.week_n),
      earningsToday: a.today_c / 100,
    });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const notary = await Notary.findById(req.params.id);
    if (!notary) {
      return res.status(404).json({ error: { message: 'Notary not found' } });
    }
    res.json({ data: notary });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /notaries/:id — Update notary profile
// ---------------------------------------------------------------------------
router.patch('/:id', async (req, res, next) => {
  try {
    const existing = await Notary.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: { message: 'Notary not found' } });
    }

    const notary = await Notary.update(req.params.id, req.body);

    await audit.emitAuditLog({
      eventType: 'notary.updated',
      actorType: req.body._actor_type || 'admin',
      actorId: req.body._actor_id || null,
      notaryId: notary.id,
      payload: { updated_fields: Object.keys(req.body).filter(k => !k.startsWith('_')) },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ data: notary });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /notaries/:id/credentials/verify — Trigger SoS verification
// ---------------------------------------------------------------------------
router.post('/:id/credentials/verify', async (req, res, next) => {
  try {
    const notary = await Notary.findById(req.params.id);
    if (!notary) {
      return res.status(404).json({ error: { message: 'Notary not found' } });
    }

    // In production this would call NC SoS API or flag for manual verification.
    // For Stage 1 we record the verification request and mark it pending.
    await audit.emitAuditLog({
      eventType: 'notary.credentials.verification_requested',
      actorType: 'admin',
      actorId: req.body._actor_id || null,
      notaryId: notary.id,
      payload: {
        commission_number: notary.commission_number,
        electronic_notary_id: notary.electronic_notary_id,
        ren_authorization_id: notary.ren_authorization_id,
        method: 'manual', // will become 'sos_api' when NC SoS API is available
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info('Credential verification requested', { notaryId: notary.id });
    res.json({
      data: {
        notary_id: notary.id,
        verification_status: 'pending_manual_review',
        message: 'Credential verification request submitted. Manual review required until NC SoS API integration is available.',
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /notaries/:id/approve — Admin approval
// ---------------------------------------------------------------------------
router.post('/:id/approve', async (req, res, next) => {
  try {
    const existing = await Notary.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: { message: 'Notary not found' } });
    }
    if (existing.status === 'approved') {
      return res.status(409).json({ error: { message: 'Notary is already approved' } });
    }
    if (existing.status === 'offboarded') {
      return res.status(409).json({ error: { message: 'Cannot approve an offboarded notary' } });
    }

    const notary = await Notary.setStatus(req.params.id, 'approved');

    await audit.emitAuditLog({
      eventType: 'notary.approved',
      actorType: 'admin',
      actorId: req.body._actor_id || null,
      notaryId: notary.id,
      payload: { previous_status: existing.status },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info('Notary approved', { notaryId: notary.id });
    res.json({ data: notary });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /notaries/:id/suspend — Admin suspension
// ---------------------------------------------------------------------------
router.post('/:id/suspend', async (req, res, next) => {
  try {
    const existing = await Notary.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: { message: 'Notary not found' } });
    }
    if (existing.status === 'offboarded') {
      return res.status(409).json({ error: { message: 'Cannot suspend an offboarded notary' } });
    }

    const notary = await Notary.setStatus(req.params.id, 'suspended');

    await audit.emitAuditLog({
      eventType: 'notary.suspended',
      actorType: 'admin',
      actorId: req.body._actor_id || null,
      notaryId: notary.id,
      payload: { previous_status: existing.status, reason: req.body.reason || null },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info('Notary suspended', { notaryId: notary.id, reason: req.body.reason });
    res.json({ data: notary });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /notaries/:id/offboard — Admin offboarding
// ---------------------------------------------------------------------------
router.post('/:id/offboard', async (req, res, next) => {
  try {
    const existing = await Notary.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: { message: 'Notary not found' } });
    }

    const notary = await Notary.setStatus(req.params.id, 'offboarded');

    await audit.emitAuditLog({
      eventType: 'notary.offboarded',
      actorType: 'admin',
      actorId: req.body._actor_id || null,
      notaryId: notary.id,
      payload: { previous_status: existing.status, reason: req.body.reason || null },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info('Notary offboarded', { notaryId: notary.id });
    res.json({ data: notary });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
