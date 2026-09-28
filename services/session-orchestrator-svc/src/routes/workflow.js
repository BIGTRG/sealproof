/**
 * Session workflow API (backend-for-frontend).
 *
 * The customer and notary apps talk to this router only. It owns the
 * end-to-end notarization flow and fans out to the specialised services
 * (kyc, kba, payment, seal, journal, webhook) over HTTP.
 *
 * Mounted at /sessions BEFORE the generic sessions router so that the
 * literal paths here win over /sessions/:id.
 */
const router = require('express').Router();
const crypto = require('crypto');
const axios = require('axios');
const { formidable } = require('formidable');
const fs = require('fs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
const { db, config, logger, audit, validate } = require('@sealproof/shared');
const Session = require('../models/session');
const { findBestNotary } = require('../utils/matcher');
const storage = require('../utils/storage');

const PORTS = config.ports;
const svc = (name) => `http://127.0.0.1:${PORTS[name]}`;
const KBA_URL = process.env.KBA_SVC_URL || 'http://127.0.0.1:4017';
const TENANT_URL = process.env.TENANT_SVC_URL || `http://127.0.0.1:${PORTS.tenant || 4015}`;

const http = axios.create({ timeout: 20000, validateStatus: () => true });

const PLATFORM_DEFAULTS = { standard: 2500, rush: 4500 };

function safeAudit(entry) {
  return audit.emitAuditLog(entry).catch((err) => logger.warn('audit failed', { error: err.message }));
}

function serviceError(res, label, r) {
  const msg = r.data?.error?.message || r.data?.error || r.data?.message || `${label} failed (${r.status})`;
  return res.status(r.status >= 400 ? r.status : 502).json({ error: { message: msg } });
}

// ---------------------------------------------------------------------------
// Tenant helpers
// ---------------------------------------------------------------------------
async function resolveTenant(req) {
  const id = req.get('X-Tenant-ID');
  if (id) {
    const r = await db.query('SELECT * FROM tenants WHERE id = $1 AND status = $2', [id, 'active']);
    if (r.rows[0]) return r.rows[0];
  }
  const r = await db.query("SELECT * FROM tenants WHERE slug = 'sealproof' LIMIT 1");
  return r.rows[0] || null;
}

function priceFor(tenant, serviceLevel) {
  if (serviceLevel === 'rush') return tenant?.b2c_rush_price_cents || PLATFORM_DEFAULTS.rush;
  return tenant?.b2c_standard_price_cents || PLATFORM_DEFAULTS.standard;
}

// ---------------------------------------------------------------------------
// POST /sessions/intake — customer wizard creates the session
// ---------------------------------------------------------------------------
router.post('/intake',
  validate({
    body: {
      document_type: { required: true, type: 'string' },
      signers:       { required: true, type: 'object' },
    },
  }),
  async (req, res, next) => {
    try {
      const tenant = await resolveTenant(req);
      const { document_type, description, signers, service_level, state_of_act } = req.body;
      const primary = signers.find((s) => s.is_primary) || signers[0];
      if (!primary?.email || !primary?.name) {
        return res.status(400).json({ error: { message: 'Primary signer needs a name and email' } });
      }

      const email = primary.email.trim().toLowerCase();
      const serviceLevel = service_level === 'rush' ? 'rush' : 'standard';

      // Upsert guest user + customer for this tenant (Clerk id attaches later at sign-in)
      const guestId = `guest_${crypto.createHash('sha256').update(`${tenant?.id || 'platform'}:${email}`).digest('hex').slice(0, 24)}`;
      const userRow = await db.query(
        `INSERT INTO users (clerk_id, email, full_name, role, tenant_id)
         VALUES ($1, $2, $3, 'customer', $4)
         ON CONFLICT (clerk_id) DO UPDATE SET full_name = EXCLUDED.full_name, updated_at = NOW()
         RETURNING id`,
        [guestId, email, primary.name.trim(), tenant?.id || null]
      );
      const userId = userRow.rows[0].id;
      const custRow = await db.query(
        `INSERT INTO customers (user_id, full_legal_name, email, phone, customer_type, tenant_id)
         VALUES ($1, $2, $3, $4, 'individual', $5)
         ON CONFLICT (user_id) DO UPDATE SET full_legal_name = EXCLUDED.full_legal_name, phone = COALESCE(EXCLUDED.phone, customers.phone), updated_at = NOW()
         RETURNING id`,
        [userId, primary.name.trim(), email, primary.phone || null, tenant?.id || null]
      );
      const customerId = custRow.rows[0].id;

      const sessionRow = await db.query(
        `INSERT INTO notarization_sessions
           (customer_id, document_type, document_count, signer_count, state_of_act,
            ron_session_type, customer_paid_cents, tenant_id, description)
         VALUES ($1, $2, 0, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [customerId, document_type, signers.length, (state_of_act || 'NC').toUpperCase(),
         serviceLevel, priceFor(tenant, serviceLevel), tenant?.id || null, description || null]
      );
      const session = sessionRow.rows[0];

      const signerRows = [];
      for (const s of signers) {
        const r = await db.query(
          `INSERT INTO session_signers (session_id, full_legal_name, email, phone, signer_role)
           VALUES ($1, $2, $3, $4, $5) RETURNING *`,
          [session.id, s.name.trim(), (s.email || '').trim().toLowerCase(), s.phone || null,
           s.is_primary || s === primary ? 'primary' : 'co-signer']
        );
        signerRows.push(r.rows[0]);
      }

      await safeAudit({
        eventType: 'session.created', actorType: 'customer', actorId: customerId,
        sessionId: session.id, customerId,
        payload: { document_type, signer_count: signers.length, service_level: serviceLevel, description: description || null, tenant: tenant?.slug },
        ipAddress: req.ip, userAgent: req.get('user-agent'),
      });
      dispatchWebhook('session.created', session).catch(() => undefined);

      res.status(201).json({ data: { session, signers: signerRows, customer_id: customerId, tenant: tenant?.slug || null } });
    } catch (err) { next(err); }
  }
);

// ---------------------------------------------------------------------------
// POST /sessions/:id/service-level — change standard/rush before payment
// ---------------------------------------------------------------------------
router.post('/:id/service-level', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    if (session.payment_transaction_id) {
      return res.status(409).json({ error: { message: 'Service level is locked after payment' } });
    }
    const tenant = await resolveTenant(req);
    const level = req.body.service_level === 'rush' ? 'rush' : 'standard';
    const r = await db.query(
      `UPDATE notarization_sessions SET ron_session_type = $1, customer_paid_cents = $2, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [level, priceFor(tenant, level), session.id]
    );
    res.json({ data: r.rows[0] });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// POST /sessions/:id/documents — multipart upload of a signer document
// ---------------------------------------------------------------------------
router.post('/:id/documents', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    if (!['created', 'kyc_pending', 'kyc_complete'].includes(session.status)) {
      return res.status(409).json({ error: { message: `Documents are locked once the session is ${session.status}` } });
    }

    const form = formidable({ maxFileSize: 25 * 1024 * 1024, keepExtensions: true });
    const [fields, files] = await form.parse(req);
    const fileEntry = files.file?.[0] || files.document?.[0];
    if (!fileEntry) return res.status(400).json({ error: { message: 'No file uploaded (field "file")' } });

    const buffer = await fs.promises.readFile(fileEntry.filepath);
    fs.promises.unlink(fileEntry.filepath).catch(() => undefined);

    let pageCount = 1;
    if ((fileEntry.mimetype || '').includes('pdf') || /\.pdf$/i.test(fileEntry.originalFilename || '')) {
      try { pageCount = (await PDFDocument.load(buffer, { ignoreEncryption: true })).getPageCount(); } catch { pageCount = 1; }
    }

    const documentId = crypto.randomUUID();
    const uploadUrl = await storage.putDocument({
      sessionId: session.id, documentId,
      filename: fileEntry.originalFilename, body: buffer, contentType: fileEntry.mimetype,
    });

    const signerIds = (await db.query('SELECT id FROM session_signers WHERE session_id = $1', [session.id])).rows.map((r) => r.id);
    const docType = fields.document_type?.[0] || session.document_type;
    const doc = await db.query(
      `INSERT INTO session_documents (id, session_id, document_name, document_type, upload_url, page_count, signer_ids, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'uploaded') RETURNING *`,
      [documentId, session.id, fileEntry.originalFilename || 'document.pdf', docType, uploadUrl, pageCount, signerIds]
    );
    await db.query(
      `UPDATE notarization_sessions SET document_count = (SELECT COUNT(*) FROM session_documents WHERE session_id = $1), updated_at = NOW() WHERE id = $1`,
      [session.id]
    );

    await safeAudit({
      eventType: 'document.uploaded', actorType: 'customer', actorId: session.customer_id,
      sessionId: session.id, customerId: session.customer_id,
      payload: { document_id: documentId, name: fileEntry.originalFilename, pages: pageCount, bytes: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex') },
      ipAddress: req.ip, userAgent: req.get('user-agent'),
    });

    res.status(201).json({ data: { document: { ...doc.rows[0], size_bytes: buffer.length } } });
  } catch (err) { next(err); }
});

// GET /sessions/:id/documents/:docId/download — stream the stored file
router.get('/:id/documents/:docId/download', async (req, res, next) => {
  try {
    const r = await db.query('SELECT * FROM session_documents WHERE id = $1 AND session_id = $2', [req.params.docId, req.params.id]);
    const doc = r.rows[0];
    if (!doc) return res.status(404).json({ error: { message: 'Document not found' } });
    const v = req.query.version;
    const which = (v === 'sealed' && doc.sealed_document_url) ? doc.sealed_document_url
      : (v === 'signed' && doc.signed_document_url) ? doc.signed_document_url
      : (v === 'notarized' && doc.notarized_url) ? doc.notarized_url
      : doc.upload_url;
    const obj = await storage.getDocument(which);
    res.setHeader('Content-Type', obj.contentType || 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${doc.document_name.replace(/"/g, '')}"`);
    obj.stream.pipe(res);
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// POST /sessions/:id/documents/:docId/sign — in-session electronic signature
// The signer signs on-platform while the notary watches on video (RON). The
// signature (drawn PNG data-URL or typed name) is stamped on the document and
// the signed copy is stored; the seal service then works from the signed copy.
// ---------------------------------------------------------------------------
router.post('/:id/documents/:docId/sign', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    if (!['in_session', 'matched_to_notary'].includes(session.status)) {
      return res.status(409).json({ error: { message: `Documents can only be signed during the live session (status: ${session.status})` } });
    }
    const doc = (await db.query('SELECT * FROM session_documents WHERE id = $1 AND session_id = $2', [req.params.docId, session.id])).rows[0];
    if (!doc) return res.status(404).json({ error: { message: 'Document not found' } });

    const { signer_id, signature_png, typed_name } = req.body || {};
    const signer = signer_id
      ? (await db.query('SELECT * FROM session_signers WHERE id = $1 AND session_id = $2', [signer_id, session.id])).rows[0]
      : (await db.query(`SELECT * FROM session_signers WHERE session_id = $1 ORDER BY (signer_role = 'primary') DESC LIMIT 1`, [session.id])).rows[0];
    if (!signer) return res.status(404).json({ error: { message: 'Signer not found' } });
    if (!signature_png && !typed_name) return res.status(400).json({ error: { message: 'signature_png (data URL) or typed_name is required' } });

    // Load the current best version (signed copy if a co-signer already signed)
    const source = doc.signed_document_url || doc.upload_url;
    const obj = await storage.getDocument(source);
    const chunks = [];
    for await (const c of obj.stream) chunks.push(c);
    const pdf = await PDFDocument.load(Buffer.concat(chunks), { ignoreEncryption: true });
    const pages = pdf.getPages();
    const page = pages[pages.length - 1];
    const { width } = page.getSize();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const italic = await pdf.embedFont(StandardFonts.HelveticaOblique);

    // Signature block: stacked per signer from the bottom-left
    const signedBefore = (await db.query('SELECT COUNT(*)::int AS n FROM session_signers WHERE session_id = $1 AND signed_at IS NOT NULL', [session.id])).rows[0].n;
    const blockH = 78;
    const y0 = 40 + signedBefore * (blockH + 10);
    const x0 = 48;
    page.drawRectangle({ x: x0 - 8, y: y0 - 8, width: width - 2 * (x0 - 8), height: blockH, borderColor: rgb(0.1, 0.1, 0.18), borderWidth: 0.75, color: rgb(0.985, 0.98, 0.97) });

    if (signature_png && /^data:image\/png;base64,/.test(signature_png)) {
      const png = await pdf.embedPng(Buffer.from(signature_png.split(',')[1], 'base64'));
      const scale = Math.min(200 / png.width, 44 / png.height);
      page.drawImage(png, { x: x0, y: y0 + 22, width: png.width * scale, height: png.height * scale });
    } else {
      page.drawText(typed_name || signer.full_legal_name, { x: x0, y: y0 + 34, size: 22, font: italic, color: rgb(0.05, 0.1, 0.3) });
    }
    const signedAt = new Date();
    page.drawLine({ start: { x: x0, y: y0 + 18 }, end: { x: x0 + 260, y: y0 + 18 }, thickness: 0.75, color: rgb(0.2, 0.2, 0.2) });
    page.drawText(`${signer.full_legal_name}  |  Signed ${signedAt.toISOString().replace('T', ' ').slice(0, 19)} UTC`, { x: x0, y: y0 + 6, size: 8.5, font, color: rgb(0.15, 0.15, 0.15) });
    page.drawText(`Electronically signed in remote online notarization session ${session.id}`, { x: x0, y: y0 - 4, size: 7, font, color: rgb(0.35, 0.35, 0.35) });
    page.drawText(`Notary present via audio-video  |  State of act: ${session.state_of_act}`, { x: x0 + 300, y: y0 + 6, size: 8.5, font, color: rgb(0.15, 0.15, 0.15) });

    const signedBytes = Buffer.from(await pdf.save());
    const signedUrl = await storage.putDocument({
      sessionId: session.id, documentId: `${doc.id}/signed`, filename: doc.document_name.replace(/(\.pdf)?$/i, '-signed.pdf'),
      body: signedBytes, contentType: 'application/pdf',
    });
    const signatureMeta = {
      method: signature_png ? 'drawn' : 'typed', signed_at: signedAt.toISOString(),
      ip: req.ip, user_agent: req.get('user-agent'), sha256: crypto.createHash('sha256').update(signedBytes).digest('hex'),
    };
    await db.query(
      `UPDATE session_documents SET signed_document_url = $1, signed_url = $1, esign_status = 'signed', status = 'signed', updated_at = NOW() WHERE id = $2`,
      [signedUrl, doc.id]
    );
    await db.query(
      `UPDATE session_signers SET signed_at = $1, signature_metadata = $2, signature_image_url = $3, updated_at = NOW() WHERE id = $4`,
      [signedAt, JSON.stringify(signatureMeta), signature_png ? 'inline' : null, signer.id]
    );
    await safeAudit({
      eventType: 'document.signed', actorType: 'customer', actorId: session.customer_id,
      sessionId: session.id, notaryId: session.notary_id, customerId: session.customer_id,
      payload: { document_id: doc.id, signer_id: signer.id, ...signatureMeta }, ipAddress: req.ip, userAgent: req.get('user-agent'),
    });
    dispatchWebhook('document.signed', session, { document_id: doc.id, signer_id: signer.id }).catch(() => undefined);
    res.json({ data: { document_id: doc.id, signer_id: signer.id, signed_document_url: signedUrl, sha256: signatureMeta.sha256 } });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Customer dashboard helpers
// ---------------------------------------------------------------------------
router.get('/customers/:customerId', async (req, res, next) => {
  try {
    const r = await db.query('SELECT id, full_legal_name, email, phone, customer_type, created_at FROM customers WHERE id = $1', [req.params.customerId]);
    if (!r.rows[0]) return res.status(404).json({ error: { message: 'Customer not found' } });
    res.json({ data: { customer: r.rows[0] } });
  } catch (err) { next(err); }
});

router.patch('/customers/:customerId', async (req, res, next) => {
  try {
    const { full_legal_name, phone } = req.body;
    const r = await db.query(
      `UPDATE customers SET full_legal_name = COALESCE($1, full_legal_name), phone = COALESCE($2, phone), updated_at = NOW() WHERE id = $3 RETURNING id, full_legal_name, email, phone, customer_type`,
      [full_legal_name || null, phone || null, req.params.customerId]
    );
    if (!r.rows[0]) return res.status(404).json({ error: { message: 'Customer not found' } });
    res.json({ data: { customer: r.rows[0] } });
  } catch (err) { next(err); }
});

router.get('/customers/:customerId/documents', async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT d.*, s.status AS session_status, s.completed_at
       FROM session_documents d JOIN notarization_sessions s ON s.id = d.session_id
       WHERE s.customer_id = $1 ORDER BY d.created_at DESC`,
      [req.params.customerId]
    );
    res.json({ data: { documents: r.rows } });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// KYC (identity verification) — proxied to kyc-svc for the primary signer
// ---------------------------------------------------------------------------
router.post('/:id/kyc/initiate', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    if (session.status === 'kyc_complete') {
      return res.json({ data: { status: 'passed', mode: session.kyc_provider || 'persona' } });
    }
    const signers = (await db.query('SELECT * FROM session_signers WHERE session_id = $1 ORDER BY created_at', [session.id])).rows;
    const results = [];
    for (const signer of signers) {
      if (signer.kyc_result === 'passed') { results.push({ signer_id: signer.id, status: 'passed' }); continue; }
      const r = await http.post(`${svc('kyc')}/kyc/sessions`, {
        session_id: session.id, signer_id: signer.id,
        signer_name: signer.full_legal_name, signer_email: signer.email,
      });
      if (r.status >= 400) return serviceError(res, 'Identity verification', r);
      results.push({ signer_id: signer.id, ...r.data.data });
    }
    const fresh = await Session.findById(session.id);
    res.json({ data: { signers: results, status: fresh.status === 'kyc_complete' ? 'passed' : 'pending', mode: results[0]?.mode || fresh.kyc_provider, inquiry_url: results[0]?.session_url || null } });
  } catch (err) { next(err); }
});

router.get('/:id/kyc/status', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    const signers = (await db.query('SELECT id, full_legal_name, kyc_result FROM session_signers WHERE session_id = $1', [session.id])).rows;
    const status = session.status === 'kyc_complete' || ['queued', 'matched_to_notary', 'in_session', 'completed'].includes(session.status)
      ? 'passed'
      : signers.some((s) => s.kyc_result === 'failed') ? 'failed' : 'pending';
    res.json({ data: { status, mode: session.kyc_provider, signers } });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// KBA (knowledge-based authentication) — proxied to kba-svc
// ---------------------------------------------------------------------------
router.post('/:id/kba/start', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    const signer = (await db.query(
      `SELECT * FROM session_signers WHERE session_id = $1 ORDER BY (signer_role = 'primary') DESC, created_at LIMIT 1`, [session.id]
    )).rows[0];
    if (!signer) return res.status(409).json({ error: { message: 'Session has no signers' } });
    const [first, ...rest] = signer.full_legal_name.split(' ');
    const r = await http.post(`${KBA_URL}/api/kba/sessions`, {
      session_id: session.id, signer_id: signer.id,
      signer_info: { first_name: first, last_name: rest.join(' '), ...(req.body.signer_info || {}) },
    });
    if (r.status >= 400) return serviceError(res, 'KBA', r);
    res.status(201).json({ data: { ...r.data.data, signer_id: signer.id } });
  } catch (err) { next(err); }
});

router.post('/:id/kba/submit', async (req, res, next) => {
  try {
    const { kba_session_id, answers } = req.body;
    if (!kba_session_id || !answers) return res.status(400).json({ error: { message: 'kba_session_id and answers are required' } });
    const list = Array.isArray(answers) ? answers : Object.entries(answers).map(([questionId, answerId]) => ({ questionId, answerId }));
    const r = await http.post(`${KBA_URL}/api/kba/sessions/${kba_session_id}/answers`, { answers: list });
    if (r.status >= 400) return serviceError(res, 'KBA', r);
    res.json({ data: r.data.data });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// POST /sessions/:id/payment/authorize — hold the fee, queue, and try to match
// ---------------------------------------------------------------------------
router.post('/:id/payment/authorize', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    if (!['kyc_complete', 'queued'].includes(session.status)) {
      return res.status(409).json({ error: { message: `Identity verification must be complete before payment (status: ${session.status})` } });
    }
    let current = session;
    let payment = null;
    if (!current.payment_transaction_id) {
      const r = await http.post(`${svc('payment')}/payments/authorize`, {
        session_id: session.id, customer_id: session.customer_id,
        amount_cents: session.customer_paid_cents || PLATFORM_DEFAULTS.standard,
        payment_method_id: req.body.payment_method_id || null,
        description: `Remote online notarization (${session.ron_session_type})`,
      });
      if (r.status >= 400) return serviceError(res, 'Payment', r);
      payment = r.data.data;
      await db.query('UPDATE notarization_sessions SET payment_transaction_id = $1, updated_at = NOW() WHERE id = $2', [payment.authorizationId, session.id]);
      if (current.status === 'kyc_complete') current = await Session.transitionStatus(session.id, 'queued', {});
      dispatchWebhook('payment.authorized', current, { amount_cents: session.customer_paid_cents, authorization_id: payment.authorizationId }).catch(() => undefined);
    }
    const match = await tryMatch(current, req);
    res.json({ data: { payment, session: match.session, matched: match.matched, notary: match.notary } });
  } catch (err) { next(err); }
});

async function tryMatch(session, req) {
  if (session.status !== 'queued') return { session, matched: false };
  const notary = await findBestNotary({ state: session.state_of_act, language: null });
  if (!notary) return { session, matched: false, notary: null };
  const shift = (await db.query(
    `SELECT id FROM notary_shifts WHERE notary_id = $1 AND status = 'active' ORDER BY checked_in_at DESC LIMIT 1`, [notary.id]
  )).rows[0];
  const updated = await Session.transitionStatus(session.id, 'matched_to_notary', { notary_id: notary.id, shift_id: shift?.id || null });
  if (shift) await db.query('UPDATE notary_shifts SET sessions_handled = sessions_handled + 1 WHERE id = $1', [shift.id]);
  await safeAudit({
    eventType: 'session.matched_to_notary', actorType: 'system', sessionId: session.id,
    notaryId: notary.id, customerId: session.customer_id, payload: { notary_id: notary.id, shift_id: shift?.id || null },
    ipAddress: req?.ip,
  });
  dispatchWebhook('session.matched_to_notary', updated, { notary_id: notary.id }).catch(() => undefined);
  return { session: updated, matched: true, notary: { id: notary.id, name: notary.full_legal_name, state: notary.state } };
}

// POST /sessions/:id/match-now — retry matching for a queued session (polled by StepQueue)
router.post('/:id/match-now', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    const match = await tryMatch(session, req);
    res.json({ data: match });
  } catch (err) { next(err); }
});

// POST /sessions/:id/claim { notary_id } — a notary on shift takes a queued session
router.post('/:id/claim', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    if (session.status !== 'queued') return res.status(409).json({ error: { message: `Session is ${session.status}, not queued` } });
    const notaryId = req.body.notary_id;
    if (!notaryId) return res.status(400).json({ error: { message: 'notary_id is required' } });
    const notary = (await db.query('SELECT * FROM notaries WHERE id = $1 AND is_active = true', [notaryId])).rows[0];
    if (!notary) return res.status(404).json({ error: { message: 'Notary not found or inactive' } });
    const busy = (await db.query(`SELECT 1 FROM notarization_sessions WHERE notary_id = $1 AND status IN ('matched_to_notary','in_session') LIMIT 1`, [notaryId])).rows[0];
    if (busy) return res.status(409).json({ error: { message: 'You already have an active session' } });
    const shift = (await db.query(`SELECT id FROM notary_shifts WHERE notary_id = $1 AND status = 'active' ORDER BY checked_in_at DESC LIMIT 1`, [notaryId])).rows[0];
    const updated = await Session.transitionStatus(session.id, 'matched_to_notary', { notary_id: notaryId, shift_id: shift?.id || null });
    if (shift) await db.query('UPDATE notary_shifts SET sessions_handled = sessions_handled + 1 WHERE id = $1', [shift.id]);
    await safeAudit({ eventType: 'session.matched_to_notary', actorType: 'notary', actorId: notaryId, sessionId: session.id, notaryId, customerId: session.customer_id, payload: { claimed: true }, ipAddress: req.ip });
    dispatchWebhook('session.matched_to_notary', updated, { notary_id: notaryId }).catch(() => undefined);
    res.json({ data: updated });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Notary-side actions
// ---------------------------------------------------------------------------
// POST /sessions/:id/advance { status } — matched_to_notary -> in_session -> completed
router.post('/:id/advance', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    const target = req.body.status;
    if (!['in_session', 'completed', 'failed'].includes(target)) {
      return res.status(400).json({ error: { message: 'status must be in_session, completed or failed' } });
    }
    if (session.status === target) return res.json({ data: session });

    const meta = {};
    if (target === 'completed') {
      const paid = session.customer_paid_cents || 0;
      const tenant = session.tenant_id ? (await db.query('SELECT notary_payout_cents FROM tenants WHERE id = $1', [session.tenant_id])).rows[0] : null;
      meta.notary_payout_cents = tenant?.notary_payout_cents || Math.round(paid * 0.4);
      meta.platform_revenue_cents = paid - meta.notary_payout_cents;
      if (session.session_started_at) meta.session_duration_seconds = Math.max(0, Math.round((Date.now() - new Date(session.session_started_at).getTime()) / 1000));
    }
    const updated = await Session.transitionStatus(session.id, target, meta);

    if (target === 'completed' && session.payment_transaction_id) {
      const r = await http.post(`${svc('payment')}/payments/capture`, {
        authorization_id: session.payment_transaction_id, session_id: session.id, amount_cents: session.customer_paid_cents,
      });
      if (r.status >= 400) logger.warn('Payment capture failed after completion', { sessionId: session.id, status: r.status, body: r.data });
      else dispatchWebhook('payment.captured', updated, { amount_cents: session.customer_paid_cents }).catch(() => undefined);
    }

    await safeAudit({
      eventType: `session.${target}`, actorType: 'notary', actorId: session.notary_id,
      sessionId: session.id, notaryId: session.notary_id, customerId: session.customer_id,
      payload: { previous_status: session.status }, ipAddress: req.ip, userAgent: req.get('user-agent'),
    });
    dispatchWebhook(`session.${target}`, updated).catch(() => undefined);
    res.json({ data: updated });
  } catch (err) { next(err); }
});

// POST /sessions/:id/seal — apply the notary seal to every document in the session
router.post('/:id/seal', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    const r = await http.post(`${svc('seal')}/seals/${session.id}/apply`, req.body || {});
    if (r.status >= 400) return serviceError(res, 'Seal', r);
    await safeAudit({ eventType: 'seal.applied', actorType: 'notary', actorId: session.notary_id, sessionId: session.id, notaryId: session.notary_id, payload: r.data.data || {}, ipAddress: req.ip });
    res.json({ data: r.data.data });
  } catch (err) { next(err); }
});

// POST /sessions/:id/journal — write the hash-chained journal entry
router.post('/:id/journal', async (req, res, next) => {
  try {
    const session = await Session.findById(req.params.id);
    if (!session) return res.status(404).json({ error: { message: 'Session not found' } });
    if (!session.notary_id) return res.status(409).json({ error: { message: 'No notary assigned' } });
    const signer = (await db.query(`SELECT * FROM session_signers WHERE session_id = $1 ORDER BY (signer_role = 'primary') DESC LIMIT 1`, [session.id])).rows[0];
    const docs = (await db.query('SELECT document_name FROM session_documents WHERE session_id = $1', [session.id])).rows;
    const body = {
      notary_id: session.notary_id,
      session_id: session.id,
      signer_name: signer?.full_legal_name || 'Unknown signer',
      document_description: docs.length ? docs.map((d) => d.document_name).join(', ') : session.document_type,
      notarial_act_type: req.body.notarial_act_type || 'acknowledgment',
      fee_charged_cents: session.customer_paid_cents || 0,
      id_verification_method: session.kyc_provider === 'sandbox' ? 'credential_analysis_sandbox' : 'credential_analysis_kba',
      ...req.body,
    };
    const r = await http.post(`${svc('journal')}/journal/entries`, body);
    if (r.status >= 400) return serviceError(res, 'Journal', r);
    res.status(201).json({ data: r.data.data });
  } catch (err) { next(err); }
});

// GET /sessions/:id/journal — entries for this session
router.get('/:id/journal', async (req, res, next) => {
  try {
    const r = await db.query('SELECT * FROM notary_journal_entries WHERE session_id = $1 ORDER BY created_at', [req.params.id]);
    res.json({ data: r.rows });
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
// Webhooks to API partners (fire-and-forget)
// ---------------------------------------------------------------------------
async function dispatchWebhook(event, session, extra = {}) {
  if (!session?.api_partner_id) return;
  await http.post(`${svc('webhook')}/webhooks/dispatch`, {
    event, session_id: session.id,
    payload: { session_id: session.id, status: session.status, document_type: session.document_type, ...extra },
  });
}

module.exports = router;
module.exports.dispatchWebhook = dispatchWebhook;
