/**
 * Presence Routes — Heartbeat and presence management.
 *
 * POST /presence/heartbeat     Notary sends heartbeat (every 30s)
 * GET  /presence/:notaryId     Get notary presence status
 * GET  /presence               Get all present notaries
 */
const router = require('express').Router();
const { validate, logger } = require('@sealproof/shared');
const Presence = require('../models/presence');

// ---------------------------------------------------------------------------
// POST /presence/heartbeat — Notary heartbeat (refreshes 90s TTL)
// ---------------------------------------------------------------------------
router.post('/heartbeat',
  validate({
    body: {
      notary_id: { required: true, type: 'string' },
      shift_id:  { required: true, type: 'string' },
    },
  }),
  async (req, res, next) => {
    try {
      const { notary_id, shift_id, status } = req.body;
      await Presence.setPresence(notary_id, {
        shiftId: shift_id,
        status: status || 'available',
      });
      res.json({ ok: true, ttl: 90 });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /presence/:notaryId — Get specific notary presence
// ---------------------------------------------------------------------------
router.get('/:notaryId', async (req, res, next) => {
  try {
    const presence = await Presence.getPresence(req.params.notaryId);
    if (!presence) {
      return res.json({ data: null, online: false });
    }
    res.json({ data: presence, online: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /presence — All present notaries
// ---------------------------------------------------------------------------
router.get('/', async (_req, res, next) => {
  try {
    const all = await Presence.getAllPresent();
    res.json({ data: all, count: all.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
