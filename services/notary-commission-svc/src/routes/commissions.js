/**
 * Multi-State Commission Routes
 *
 * POST   /notaries/:notaryId/commissions              Add a state commission
 * GET    /notaries/:notaryId/commissions              List all commissions for a notary
 * GET    /notaries/:notaryId/commissions/:id          Get a specific commission
 * PATCH  /notaries/:notaryId/commissions/:id          Update commission details
 * POST   /notaries/:notaryId/commissions/:id/approve  Approve a commission
 * POST   /notaries/:notaryId/commissions/:id/suspend  Suspend a commission
 * GET    /commissions/by-state/:stateCode             Active notaries in a state
 * GET    /commissions/by-state                        Count per state
 * GET    /commissions/expiring                        Expiring credentials
 */
const router = require('express').Router();
const { validate, audit, logger } = require('@sealproof/shared');
const NotaryCommission = require('../models/notaryCommission');
const Notary = require('../models/notary');

// ---------------------------------------------------------------------------
// POST /notaries/:notaryId/commissions — Add a commission
// ---------------------------------------------------------------------------
router.post('/notaries/:notaryId/commissions',
  validate({
    body: {
      state_code:            { required: true, type: 'string' },
      commission_number:     { required: true, type: 'string' },
      commission_expires_at: { required: true, type: 'string' },
    },
  }),
  async (req, res, next) => {
    try {
      const notary = await Notary.findById(req.params.notaryId);
      if (!notary) {
        return res.status(404).json({ error: { message: 'Notary not found' } });
      }

      const commission = await NotaryCommission.create({
        ...req.body,
        notary_id: req.params.notaryId,
      });

      await audit.emitAuditLog({
        eventType: 'commission.created',
        actorType: req.body._actor_type || 'notary',
        notaryId: req.params.notaryId,
        payload: {
          commission_id: commission.id,
          state_code: commission.state_code,
          commission_number: commission.commission_number,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      logger.info('Commission added', {
        notaryId: req.params.notaryId,
        stateCode: commission.state_code,
        commissionId: commission.id,
      });
      res.status(201).json({ data: commission });
    } catch (err) {
      if (err.code === '23505') {
        err.status = 409;
        err.message = 'This notary already has a commission with this number in this state';
      }
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /notaries/:notaryId/commissions — List all for a notary
// ---------------------------------------------------------------------------
router.get('/notaries/:notaryId/commissions', async (req, res, next) => {
  try {
    const commissions = await NotaryCommission.getByNotary(req.params.notaryId);
    res.json({ data: commissions, count: commissions.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /notaries/:notaryId/commissions/:id — Get specific
// ---------------------------------------------------------------------------
router.get('/notaries/:notaryId/commissions/:id', async (req, res, next) => {
  try {
    const commission = await NotaryCommission.findById(req.params.id);
    if (!commission || commission.notary_id !== req.params.notaryId) {
      return res.status(404).json({ error: { message: 'Commission not found' } });
    }
    res.json({ data: commission });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /notaries/:notaryId/commissions/:id — Update details
// ---------------------------------------------------------------------------
router.patch('/notaries/:notaryId/commissions/:id', async (req, res, next) => {
  try {
    const existing = await NotaryCommission.findById(req.params.id);
    if (!existing || existing.notary_id !== req.params.notaryId) {
      return res.status(404).json({ error: { message: 'Commission not found' } });
    }

    const commission = await NotaryCommission.update(req.params.id, req.body);

    await audit.emitAuditLog({
      eventType: 'commission.updated',
      actorType: req.body._actor_type || 'admin',
      notaryId: req.params.notaryId,
      payload: {
        commission_id: commission.id,
        state_code: commission.state_code,
        updated_fields: Object.keys(req.body).filter(k => !k.startsWith('_')),
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ data: commission });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /notaries/:notaryId/commissions/:id/approve
// ---------------------------------------------------------------------------
router.post('/notaries/:notaryId/commissions/:id/approve', async (req, res, next) => {
  try {
    const existing = await NotaryCommission.findById(req.params.id);
    if (!existing || existing.notary_id !== req.params.notaryId) {
      return res.status(404).json({ error: { message: 'Commission not found' } });
    }
    if (existing.status === 'approved') {
      return res.status(409).json({ error: { message: 'Commission is already approved' } });
    }

    const commission = await NotaryCommission.setStatus(
      req.params.id, 'approved', req.body._actor_id || null
    );

    await audit.emitAuditLog({
      eventType: 'commission.approved',
      actorType: 'admin',
      actorId: req.body._actor_id || null,
      notaryId: req.params.notaryId,
      payload: {
        commission_id: commission.id,
        state_code: commission.state_code,
        previous_status: existing.status,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info('Commission approved', {
      commissionId: commission.id,
      stateCode: commission.state_code,
    });
    res.json({ data: commission });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /notaries/:notaryId/commissions/:id/suspend
// ---------------------------------------------------------------------------
router.post('/notaries/:notaryId/commissions/:id/suspend', async (req, res, next) => {
  try {
    const existing = await NotaryCommission.findById(req.params.id);
    if (!existing || existing.notary_id !== req.params.notaryId) {
      return res.status(404).json({ error: { message: 'Commission not found' } });
    }

    const commission = await NotaryCommission.setStatus(req.params.id, 'suspended');

    await audit.emitAuditLog({
      eventType: 'commission.suspended',
      actorType: 'admin',
      notaryId: req.params.notaryId,
      payload: {
        commission_id: commission.id,
        state_code: commission.state_code,
        reason: req.body.reason || null,
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.json({ data: commission });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /commissions/by-state/:stateCode — Active notaries in a state
// ---------------------------------------------------------------------------
router.get('/commissions/by-state/:stateCode', async (req, res, next) => {
  try {
    const commissions = await NotaryCommission.getActiveByState(req.params.stateCode);
    res.json({ data: commissions, count: commissions.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /commissions/by-state — Count per state
// ---------------------------------------------------------------------------
router.get('/commissions/by-state', async (req, res, next) => {
  try {
    const counts = await NotaryCommission.countByState();
    res.json({ data: counts });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /commissions/expiring — Expiring credentials (multi-state)
// ---------------------------------------------------------------------------
router.get('/commissions/expiring', async (req, res, next) => {
  try {
    const days = parseInt(req.query.days || '30', 10);
    const commissions = await NotaryCommission.findExpiring(days);
    res.json({ data: commissions, count: commissions.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
