/**
 * Export Routes — NC SoS audit packets, self-audit, subpoena response
 *
 * POST /exports/audit-packet         Generate full SoS audit packet (ZIP)
 * POST /exports/self-audit           Notary self-audit report
 * POST /exports/subpoena             Subpoena response packet
 */
const router = require('express').Router();
const archiver = require('archiver');
const { validate, audit, logger, db } = require('@sealproof/shared');
const axios = require('axios');
const { config } = require('@sealproof/shared');

// POST /exports/audit-packet — Full SoS audit packet
router.post('/audit-packet',
  validate({ body: { notary_id: { required: true } } }),
  async (req, res, next) => {
    try {
      const { notary_id, from, to } = req.body;

      // Gather journal entries from journal-svc
      const journalUrl = `http://localhost:${config.ports.journal}/journal/audit-export?notary_id=${notary_id}${from ? `&from=${from}` : ''}${to ? `&to=${to}` : ''}`;
      const journalRes = await axios.get(journalUrl);
      const journalData = journalRes.data;

      // Gather audit log entries
      const auditEntries = await db.query(
        `SELECT * FROM audit_log
         WHERE notary_id = $1
           AND ($2::timestamp IS NULL OR created_at >= $2)
           AND ($3::timestamp IS NULL OR created_at <= $3)
         ORDER BY created_at`,
        [notary_id, from || null, to || null]
      );

      // Gather sessions
      const sessions = await db.query(
        `SELECT * FROM notarization_sessions
         WHERE notary_id = $1
           AND ($2::timestamp IS NULL OR created_at >= $2)
           AND ($3::timestamp IS NULL OR created_at <= $3)
         ORDER BY created_at`,
        [notary_id, from || null, to || null]
      );

      // Build ZIP archive
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="audit-packet-${notary_id}-${Date.now()}.zip"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);

      archive.append(JSON.stringify(journalData, null, 2), { name: 'journal/journal_entries.json' });
      archive.append(JSON.stringify({ verification: journalData.chain_verification }, null, 2), { name: 'journal/chain_verification.json' });
      archive.append(JSON.stringify(auditEntries.rows, null, 2), { name: 'audit_log/audit_entries.json' });
      archive.append(JSON.stringify(sessions.rows, null, 2), { name: 'sessions/session_records.json' });

      // Manifest
      archive.append(JSON.stringify({
        generated_at: new Date().toISOString(),
        notary_id,
        date_range: { from, to },
        contents: {
          journal_entries: journalData.count,
          audit_entries: auditEntries.rows.length,
          sessions: sessions.rows.length,
          chain_valid: journalData.chain_verification?.valid,
        },
      }, null, 2), { name: 'MANIFEST.json' });

      await archive.finalize();

      await audit.emitAuditLog({
        eventType: 'export.audit_packet',
        actorType: req.body._actor_type || 'admin',
        notaryId: notary_id,
        payload: { from, to, journal_count: journalData.count, session_count: sessions.rows.length },
      });
    } catch (err) { next(err); }
  }
);

// POST /exports/self-audit — Notary self-audit report (JSON)
router.post('/self-audit',
  validate({ body: { notary_id: { required: true } } }),
  async (req, res, next) => {
    try {
      const { notary_id } = req.body;

      const journalRes = await axios.get(`http://localhost:${config.ports.journal}/journal/notary/${notary_id}/verify`);
      const sessionCount = await db.query(
        "SELECT COUNT(*) FROM notarization_sessions WHERE notary_id = $1", [notary_id]
      );
      const completedCount = await db.query(
        "SELECT COUNT(*) FROM notarization_sessions WHERE notary_id = $1 AND status = 'completed'", [notary_id]
      );

      const report = {
        notary_id,
        generated_at: new Date().toISOString(),
        chain_verification: journalRes.data.data,
        total_sessions: parseInt(sessionCount.rows[0].count),
        completed_sessions: parseInt(completedCount.rows[0].count),
      };

      await audit.emitAuditLog({ eventType: 'export.self_audit', actorType: 'notary', actorId: notary_id, notaryId: notary_id, payload: report });
      res.json({ data: report });
    } catch (err) { next(err); }
  }
);

// POST /exports/subpoena — Subpoena response packet
router.post('/subpoena',
  validate({ body: { session_id: { required: true }, requesting_authority: { required: true } } }),
  async (req, res, next) => {
    try {
      const { session_id, requesting_authority } = req.body;

      const session = await db.query('SELECT * FROM notarization_sessions WHERE id = $1', [session_id]);
      const docs = await db.query('SELECT * FROM session_documents WHERE session_id = $1', [session_id]);
      const journal = await db.query('SELECT * FROM notary_journal_entries WHERE session_id = $1', [session_id]);
      const auditLog = await db.query('SELECT * FROM audit_log WHERE session_id = $1 ORDER BY created_at', [session_id]);

      const packet = {
        generated_at: new Date().toISOString(),
        requesting_authority,
        session: session.rows[0],
        documents: docs.rows,
        journal_entries: journal.rows,
        audit_trail: auditLog.rows,
        chain_of_custody_note: 'All recordings are encrypted with per-session KMS keys and stored in S3 with 10-year Object Lock. Contact admin for decrypted recording access.',
      };

      await audit.emitAuditLog({
        eventType: 'export.subpoena',
        actorType: 'admin',
        sessionId: session_id,
        payload: { requesting_authority, document_count: docs.rows.length },
      });

      res.json({ data: packet });
    } catch (err) { next(err); }
  }
);

module.exports = router;
