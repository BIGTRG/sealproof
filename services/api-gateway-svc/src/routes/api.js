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

// Resolve (or auto-provision) a customer record for an API-partner session.
// The B2B path has no interactive signup; sessions are keyed to the primary
// signer's email under the partner's account.
async function resolveApiCustomer(partner, signers) {
  const primary = (Array.isArray(signers) && signers[0]) || {};
  const email = String(primary.email || partner.contact_email || '').toLowerCase();
  const name = primary.name || partner.partner_name || 'API Signer';
  if (!email) throw Object.assign(new Error('signers[0].email is required'), { status: 400 });
  const existing = await db.query(
    'SELECT id FROM customers WHERE api_partner_id = $1 AND lower(email) = $2 LIMIT 1',
    [partner.id, email]
  );
  if (existing.rows[0]) return existing.rows[0].id;
  const clerkId = `api_${partner.id}_${email}`;
  const user = await db.query(
    `INSERT INTO users (clerk_id, email, full_name, role) VALUES ($1, $2, $3, 'customer')
     ON CONFLICT (clerk_id) DO UPDATE SET email = EXCLUDED.email RETURNING id`,
    [clerkId, email, name]
  );
  const cust = await db.query(
    `INSERT INTO customers (user_id, full_legal_name, email, customer_type, api_partner_id)
     VALUES ($1, $2, $3, 'individual', $4) RETURNING id`,
    [user.rows[0].id, name, email, partner.id]
  );
  return cust.rows[0].id;
}

// POST /v1/sessions — Create session via API
router.post('/sessions', async (req, res, next) => {
  try {
    const { document_type, signers, priority, callback_url } = req.body;

    // Create session via orchestrator
    const customerId = await resolveApiCustomer(req.partner, signers);
    const orchRes = await axios.post(`${ORCHESTRATOR}/sessions`, {
      customer_id: customerId,
      document_type,
      signers,
      signer_count: Array.isArray(signers) ? Math.max(signers.length, 1) : 1,
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
      `SELECT id, status, document_type, created_at, session_started_at, session_ended_at
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
    // Verify the session belongs to this partner before cancelling.
    const owned = await db.query(
      'SELECT id FROM notarization_sessions WHERE id = $1 AND api_partner_id = $2',
      [req.params.id, req.partner.id]
    );
    if (!owned.rows[0]) return res.status(404).json({ error: { message: 'Session not found' } });
    const orchRes = await axios.post(`${ORCHESTRATOR}/sessions/${req.params.id}/cancel`, {
      reason: req.body.reason || 'Cancelled by API partner',
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
