/**
 * Platform Registration Routes
 *
 * GET    /api/registrations              List all platform registrations
 * GET    /api/registrations/summary      Summary stats
 * GET    /api/registrations/:stateCode   Get registration for a state
 * PUT    /api/registrations/:stateCode   Update registration status
 */
const router = require('express').Router();
const { validate, audit, logger } = require('@sealproof/shared');
const PlatformRegistration = require('../models/platformRegistration');

// ---------------------------------------------------------------------------
// GET /api/registrations
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    const registrations = await PlatformRegistration.list({ status });
    res.json({ data: registrations, count: registrations.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/registrations/summary
// ---------------------------------------------------------------------------
router.get('/summary', async (req, res, next) => {
  try {
    const summary = await PlatformRegistration.getSummary();
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/registrations/:stateCode
// ---------------------------------------------------------------------------
router.get('/:stateCode', async (req, res, next) => {
  try {
    const reg = await PlatformRegistration.getByState(req.params.stateCode);
    if (!reg) {
      return res.status(404).json({ error: { message: `No registration found for state: ${req.params.stateCode}` } });
    }
    res.json({ data: reg });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/registrations/:stateCode
// ---------------------------------------------------------------------------
router.put('/:stateCode',
  validate({
    body: {
      status: { required: true, type: 'string' },
    },
  }),
  async (req, res, next) => {
    try {
      const validStatuses = ['not_required', 'not_applied', 'application_submitted', 'under_review', 'approved', 'denied', 'expired'];
      if (!validStatuses.includes(req.body.status)) {
        return res.status(400).json({ error: { message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` } });
      }

      const data = { ...req.body, state_code: req.params.stateCode.toUpperCase() };
      const reg = await PlatformRegistration.upsert(data);

      await audit.emitAuditLog({
        eventType: 'platform_registration.updated',
        actorType: 'admin',
        payload: { state_code: reg.state_code, status: reg.status },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      logger.info('Platform registration updated', { stateCode: reg.state_code, status: reg.status });
      res.json({ data: reg });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
