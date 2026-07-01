/**
 * State Rules Routes
 *
 * GET    /api/state-rules               List all state RON rules
 * GET    /api/state-rules/summary       Aggregate stats
 * GET    /api/state-rules/:stateCode    Get rules for a specific state
 * PUT    /api/state-rules/:stateCode    Create or update rules for a state
 */
const router = require('express').Router();
const { validate, audit, logger } = require('@sealproof/shared');
const StateRules = require('../models/stateRules');

// ---------------------------------------------------------------------------
// GET /api/state-rules — List all state rules
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const { authorized, platform_approval_required, kba_required } = req.query;
    const rules = await StateRules.list({
      authorized: authorized !== undefined ? authorized === 'true' : undefined,
      platformApprovalRequired: platform_approval_required !== undefined ? platform_approval_required === 'true' : undefined,
      kbaRequired: kba_required !== undefined ? kba_required === 'true' : undefined,
    });
    res.json({ data: rules, count: rules.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/state-rules/summary — Aggregate stats
// ---------------------------------------------------------------------------
router.get('/summary', async (req, res, next) => {
  try {
    const summary = await StateRules.getSummary();
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/state-rules/:stateCode — Get rules for a specific state
// ---------------------------------------------------------------------------
router.get('/:stateCode', async (req, res, next) => {
  try {
    const rules = await StateRules.getByState(req.params.stateCode);
    if (!rules) {
      return res.status(404).json({ error: { message: `No rules found for state: ${req.params.stateCode}` } });
    }
    res.json({ data: rules });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PUT /api/state-rules/:stateCode — Create or update rules
// ---------------------------------------------------------------------------
router.put('/:stateCode',
  validate({
    body: {
      state_name: { required: true, type: 'string' },
      ron_authorized: { required: true, type: 'boolean' },
    },
  }),
  async (req, res, next) => {
    try {
      const data = { ...req.body, state_code: req.params.stateCode.toUpperCase() };
      const rules = await StateRules.upsert(data);

      await audit.emitAuditLog({
        eventType: 'state_rules.updated',
        actorType: 'admin',
        payload: { state_code: rules.state_code, state_name: rules.state_name },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      logger.info('State RON rules updated', { stateCode: rules.state_code });
      res.json({ data: rules });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
