/**
 * Shift Routes
 *
 * POST   /shifts                  Create a shift
 * DELETE /shifts/:id              Cancel a shift
 * POST   /shifts/:id/check-in    Clock in
 * POST   /shifts/:id/check-out   Clock out
 * GET    /shifts/notary/:notaryId List shifts for a notary
 */
const router = require('express').Router();
const { validate, audit, logger, db } = require('@sealproof/shared');
const Shift = require('../models/shift');
const Presence = require('../models/presence');

// ---------------------------------------------------------------------------
// POST /shifts — Create a shift
// ---------------------------------------------------------------------------
router.post('/',
  validate({
    body: {
      notary_id:   { required: true, type: 'string' },
      shift_start: { required: true, type: 'string' },
      shift_end:   { required: true, type: 'string' },
    },
  }),
  async (req, res, next) => {
    try {
      const shift = await Shift.create(req.body);

      await audit.emitAuditLog({
        eventType: 'shift.created',
        actorType: 'notary',
        actorId: req.body.notary_id,
        notaryId: req.body.notary_id,
        payload: { shift_id: shift.id, shift_start: shift.shift_start, shift_end: shift.shift_end },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      logger.info('Shift created', { shiftId: shift.id, notaryId: shift.notary_id });
      res.status(201).json({ data: shift });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// DELETE /shifts/:id — Cancel a shift
// ---------------------------------------------------------------------------
router.delete('/:id', async (req, res, next) => {
  try {
    const shift = await Shift.cancel(req.params.id);
    if (!shift) {
      return res.status(404).json({ error: { message: 'Shift not found' } });
    }

    await audit.emitAuditLog({
      eventType: 'shift.cancelled',
      actorType: 'notary',
      actorId: shift.notary_id,
      notaryId: shift.notary_id,
      payload: { shift_id: shift.id },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info('Shift cancelled', { shiftId: shift.id });
    res.json({ data: shift });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /shifts/:id/check-in — Notary clocks in
// ---------------------------------------------------------------------------
router.post('/:id/check-in', async (req, res, next) => {
  try {
    const shift = await Shift.checkIn(req.params.id);
    if (!shift) {
      return res.status(404).json({ error: { message: 'Shift not found' } });
    }

    // Set Redis presence
    await Presence.setPresence(shift.notary_id, {
      shiftId: shift.id,
      status: 'available',
    });

    await audit.emitAuditLog({
      eventType: 'shift.checked_in',
      actorType: 'notary',
      actorId: shift.notary_id,
      notaryId: shift.notary_id,
      payload: { shift_id: shift.id, checked_in_at: shift.checked_in_at },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info('Notary checked in', { shiftId: shift.id, notaryId: shift.notary_id });
    res.json({ data: shift });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /shifts/:id/check-out — Notary clocks out
// ---------------------------------------------------------------------------
router.post('/:id/check-out', async (req, res, next) => {
  try {
    const shift = await Shift.checkOut(req.params.id);
    if (!shift) {
      return res.status(404).json({ error: { message: 'Shift not found' } });
    }

    // Remove Redis presence
    await Presence.removePresence(shift.notary_id);

    await audit.emitAuditLog({
      eventType: 'shift.checked_out',
      actorType: 'notary',
      actorId: shift.notary_id,
      notaryId: shift.notary_id,
      payload: { shift_id: shift.id, checked_out_at: shift.checked_out_at, sessions_handled: shift.sessions_handled },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info('Notary checked out', { shiftId: shift.id, notaryId: shift.notary_id });
    res.json({ data: shift });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /shifts/notary/:notaryId — List shifts for a notary

// ---------------------------------------------------------------------------
// GET /shifts/mine — Shifts for the current notary
// TODO: resolve from Clerk-authenticated user; demo fallback until prod auth.
// ---------------------------------------------------------------------------
router.get('/mine', async (req, res, next) => {
  try {
    const n = await db.query(
      'SELECT id FROM notaries WHERE is_active = true ORDER BY created_at ASC LIMIT 1'
    );
    if (!n.rows[0]) return res.json([]);
    const r = await db.query(
      'SELECT * FROM notary_shifts WHERE notary_id = $1 ORDER BY shift_start DESC LIMIT 20',
      [n.rows[0].id]
    );
    res.json(r.rows.map((s) => ({
      id: s.id,
      startTime: s.shift_start,
      endTime: s.shift_end,
      status: s.status,
      sessionsHandled: s.sessions_handled,
      checkedInAt: s.checked_in_at,
    })));
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
router.get('/notary/:notaryId', async (req, res, next) => {
  try {
    const shifts = await Shift.listByNotary(req.params.notaryId, {
      status: req.query.status,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : 0,
    });
    res.json({ data: shifts, count: shifts.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
