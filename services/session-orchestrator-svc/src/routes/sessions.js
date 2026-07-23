/**
 * Session Routes
 *
 * POST   /sessions              Create session (customer or API partner)
 * GET    /sessions               List sessions (admin)
 * GET    /sessions/queue         View queue (admin)
 * GET    /sessions/:id           Get session detail
 * PATCH  /sessions/:id/state     Transition state (validated)
 * POST   /sessions/:id/cancel    Cancel (reject) a session
 * POST   /sessions/:id/match     Trigger matching for a queued session
 */
const router = require('express').Router();
const { validate, audit, logger, db } = require('@sealproof/shared');
const Session = require('../models/session');
const { findBestNotary } = require('../utils/matcher');

// ---------------------------------------------------------------------------
// POST /sessions — Create a new notarization session
// ---------------------------------------------------------------------------
router.post('/',
  validate({
    body: {
      customer_id:    { required: true, type: 'string' },
      document_type:  { required: true, type: 'string' },
    },
  }),
  async (req, res, next) => {
    try {
      const session = await Session.create(req.body);

      await audit.emitAuditLog({
        eventType: 'session.created',
        actorType: req.body.api_partner_id ? 'api_partner' : 'customer',
        actorId: req.body.customer_id,
        sessionId: session.id,
        customerId: req.body.customer_id,
        payload: {
          document_type: session.document_type,
          signer_count: session.signer_count,
          ron_session_type: session.ron_session_type,
          state_of_act: session.state_of_act,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      logger.info('Session created', { sessionId: session.id, status: session.status });
      res.status(201).json({ data: session });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /sessions/queue — View session queue (admin)
// ---------------------------------------------------------------------------
router.get('/queue', async (req, res, next) => {
  try {
    const queue = await Session.getQueue({
      state: req.query.state,
      sessionType: req.query.session_type,
    });
    res.json({
      data: queue.map((s) => ({
        ...s,
        documentType: s.document_type,
        signerCount: s.signer_count,
        serviceLevel: s.ron_session_type,
        queuedAt: s.queued_at,
      })),
      count: queue.length,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /sessions — List sessions
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const sessions = await Session.list({
      status: req.query.status,
      customerId: req.query.customer_id,
      notaryId: req.query.notary_id,
      apiPartnerId: req.query.api_partner_id,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : 0,
    });
    res.json({ data: sessions, count: sessions.length });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /sessions/:id — Get session detail
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: { message: 'Session not found' } });
    }

    // Enrich with documents and signers
    const [docs, signers] = await Promise.all([
      db.query('SELECT * FROM session_documents WHERE session_id = $1', [session.id]),
      db.query('SELECT * FROM session_signers WHERE session_id = $1', [session.id]),
    ]);

    res.json({
      data: {
        ...session,
        documents: docs.rows,
        signers: signers.rows,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// PATCH /sessions/:id/state — Transition session state
// ---------------------------------------------------------------------------
router.patch('/:id/state',
  validate({
    body: {
      status: { required: true, type: 'string' },
    },
  }),
  async (req, res, next) => {
    try {
      const { status: newStatus, ...metadata } = req.body;

      const session = await Session.transitionStatus(req.params.id, newStatus, metadata);
      if (!session) {
        return res.status(404).json({ error: { message: 'Session not found' } });
      }

      await audit.emitAuditLog({
        eventType: `session.${newStatus}`,
        actorType: metadata._actor_type || 'system',
        actorId: metadata._actor_id || null,
        sessionId: session.id,
        notaryId: session.notary_id,
        customerId: session.customer_id,
        payload: {
          previous_status: req.body._previous_status,
          new_status: newStatus,
          metadata: Object.keys(metadata).filter(k => !k.startsWith('_')),
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      logger.info('Session state transitioned', { sessionId: session.id, newStatus });
      res.json({ data: session });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /sessions/:id/cancel — Cancel a session
// ---------------------------------------------------------------------------
router.post('/:id/cancel', async (req, res, next) => {
  try {
    const existing = await Session.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: { message: 'Session not found' } });
    }

    // Can only cancel non-terminal sessions
    if (['completed', 'rejected', 'failed'].includes(existing.status)) {
      return res.status(409).json({
        error: { message: `Cannot cancel session in status: ${existing.status}` },
      });
    }

    const session = await Session.transitionStatus(req.params.id, 'rejected', {
      rejected_reason: req.body.reason || 'Cancelled by user',
    });

    await audit.emitAuditLog({
      eventType: 'session.cancelled',
      actorType: req.body._actor_type || 'customer',
      actorId: req.body._actor_id || null,
      sessionId: session.id,
      customerId: session.customer_id,
      payload: { previous_status: existing.status, reason: req.body.reason || 'Cancelled by user' },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info('Session cancelled', { sessionId: session.id });
    res.json({ data: session });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /sessions/:id/match — Trigger matching for a queued session
// ---------------------------------------------------------------------------
router.post('/:id/match', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: { message: 'Session not found' } });
    }
    if (session.status !== 'queued') {
      return res.status(409).json({
        error: { message: `Session must be in queued status to match. Current: ${session.status}` },
      });
    }

    // Run matching algorithm
    const notary = await findBestNotary({
      state: session.state_of_act,
      language: req.body.language || null,
    });

    if (!notary) {
      return res.json({
        data: session,
        matched: false,
        message: 'No available notary found. Session remains in queue.',
      });
    }

    // Get the notary's active shift
    const shiftResult = await db.query(
      `SELECT id FROM notary_shifts
       WHERE notary_id = $1 AND status = 'active'
       ORDER BY checked_in_at DESC LIMIT 1`,
      [notary.id]
    );
    const shiftId = shiftResult.rows[0]?.id || null;

    // Transition to matched_to_notary
    const updated = await Session.transitionStatus(session.id, 'matched_to_notary', {
      notary_id: notary.id,
      shift_id: shiftId,
    });

    // Increment the shift's session counter
    if (shiftId) {
      await db.query(
        `UPDATE notary_shifts SET sessions_handled = sessions_handled + 1 WHERE id = $1`,
        [shiftId]
      );
    }

    await audit.emitAuditLog({
      eventType: 'session.matched_to_notary',
      actorType: 'system',
      sessionId: updated.id,
      notaryId: notary.id,
      customerId: session.customer_id,
      payload: {
        notary_name: notary.display_name,
        shift_id: shiftId,
        matching_criteria: { state: session.state_of_act },
      },
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    logger.info('Session matched to notary', {
      sessionId: updated.id,
      notaryId: notary.id,
      notaryName: notary.display_name,
    });

    res.json({
      data: updated,
      matched: true,
      notary: {
        id: notary.id,
        display_name: notary.display_name,
        languages: notary.languages,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
