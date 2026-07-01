/**
 * Public API v1 Routes — B2B Partner Endpoints
 *
 * All routes here require HMAC authentication (via middleware).
 * They proxy to internal microservices.
 *
 * POST /v1/sessions                Create a notarization session
 * GET  /v1/sessions/:id            Get session status
 * GET  /v1/sessions/:id/documents  Get session documents
 * POST /v1/sessions/:id/cancel     Cancel a session
 * GET  /v1/usage                   Partner usage stats
 */
const router = require('express').Router();
const axios = require('axios');
const { audit, logger, db, config } = require('@sealproof/shared');

const ORCHESTRATOR = `http://localhost:${config.ports.orchestrator}`;

// POST /v1/sessions — Create session via API
router.post('/sessions', async (req, res, next) => {
  try {
    const { document_type, signers, priority, callback_url } = req.body;

    // Create session via orchestrator
    const orchRes = await axios.post(`${ORCHESTRATOR}/sessions`, {
      document_type,
      signers,
      priority: priority || 'standard',
      source: 'api',
      api_partner_id: req.partner.id,
    });

    // Store callback URL for webhook delivery
    if (callback_url) {
      await db.query(
        `UPDATE notarization_sessions SET api_callback_url = $1 WHERE id = $2`,
        [callback_url, orchRes.data.data.id]
      );
    }

    // Track API usage
    await db.query(
      `INSERT INTO api_usage (partner_id, endpoint, session_id) VALUES ($1, $2, $3)`,
      [req.partner.id, 'POST /v1/sessions', orchRes.data.data.id]
    );

    await audit.emitAuditLog({
      eventType: 'api.session_created',
      actorType: 'api_partner',
      actorId: req.partner.id,
      sessionId: orchRes.data.data.id,
      payload: { partner: req.partner.partner_name },
    });

    res.status(201).json(orchRes.data);
  } catch (err) { next(err); }
});

// GET /v1/sessions/:id — Get session status
router.get('/sessions/:id', async (req, res, next) => {
  try {
    const session = await db.query(
      `SELECT id, status, priority, document_type, created_at, session_started_at, session_ended_at
       FROM notarization_sessions WHERE id = $1 AND api_partner_id = $2`,
      [req.params.id, req.partner.id]
    );
    if (!session.rows[0]) return res.status(404).json({ error: { message: 'Session not found' } });

    await db.query('INSERT INTO api_usage (partner_id, endpoint) VALUES ($1, $2)', [req.partner.id, 'GET /v1/sessions/:id']);
    res.json({ data: session.rows[0] });
  } catch (err) { next(err); }
});

// GET /v1/sessions/:id/documents
router.get('/sessions/:id/documents', async (req, res, next) => {
  try {
    const docs = await db.query(
      `SELECT sd.id, sd.document_type, sd.original_filename, sd.esign_status, sd.seal_hash
       FROM session_documents sd
       JOIN notarization_sessions ns ON ns.id = sd.session_id
       WHERE sd.session_id = $1 AND ns.api_partner_id = $2`,
      [req.params.id, req.partner.id]
    );
    res.json({ data: docs.rows, count: docs.rows.length });
  } catch (err) { next(err); }
});

// POST /v1/sessions/:id/cancel
router.post('/sessions/:id/cancel', async (req, res, next) => {
  try {
    const orchRes = await axios.post(`${ORCHESTRATOR}/sessions/${req.params.id}/transition`, {
      to: 'failed',
      reason: 'Cancelled by API partner',
    });
    res.json(orchRes.data);
  } catch (err) { next(err); }
});

// GET /v1/usage — Partner usage stats
router.get('/usage', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const usage = await db.query(
      `SELECT endpoint, COUNT(*) AS calls,
              DATE_TRUNC('day', created_at) AS day
       FROM api_usage
       WHERE partner_id = $1
         AND created_at BETWEEN $2 AND $3
       GROUP BY endpoint, day
       ORDER BY day DESC`,
      [req.partner.id, from || '1970-01-01', to || '2099-12-31']
    );

    const sessions = await db.query(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'completed') AS completed
       FROM notarization_sessions WHERE api_partner_id = $1`,
      [req.partner.id]
    );

    res.json({ data: { api_calls: usage.rows, sessions: sessions.rows[0] } });
  } catch (err) { next(err); }
});

module.exports = router;
