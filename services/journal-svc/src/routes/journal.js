/**
 * Journal Routes
 *
 * POST  /journal/entries                  Create entry (called by orchestrator post-session)
 * GET   /journal/notary/:notaryId         Retrieve a notary's full journal
 * GET   /journal/notary/:notaryId/verify  Verify hash chain integrity
 * GET   /journal/audit-export             Export for SoS audit (date range)
 * GET   /journal/entries/:id              Get single entry
 */
const router = require('express').Router();
const { validate, audit, logger, db } = require('@sealproof/shared');
const JournalEntry = require('../models/journalEntry');
const { verifyChain } = require('../utils/hashChain');

// ---------------------------------------------------------------------------
// POST /journal/entries — Create a journal entry (post-session)
// ---------------------------------------------------------------------------
router.post('/entries',
  validate({
    body: {
      notary_id:          { required: true, type: 'string' },
      session_id:         { required: true, type: 'string' },
      signer_name:        { required: true, type: 'string' },
      document_description: { required: true, type: 'string' },
      notarial_act_type:  { required: true, type: 'string' },
    },
  }),
  async (req, res, next) => {
    try {
      const entry = await JournalEntry.create(req.body);

      await audit.emitAuditLog({
        eventType: 'journal.entry_created',
        actorType: 'system',
        notaryId: entry.notary_id,
        sessionId: entry.session_id,
        payload: {
          entry_id: entry.id,
          sequence_number: entry.entry_sequence_number,
          entry_hash: entry.entry_hash,
          act_type: entry.notarial_act_type,
        },
      });

      logger.info('Journal entry created', {
        notaryId: entry.notary_id,
        seq: entry.entry_sequence_number,
        hash: entry.entry_hash.substring(0, 16) + '...',
      });

      res.status(201).json({ data: entry });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// GET /journal/notary/:notaryId — Full journal for a notary

// ---------------------------------------------------------------------------
// GET /journal — Journal entries for the current notary (camelCase for UI)
// TODO: resolve from Clerk-authenticated user; demo fallback until prod auth.
// ---------------------------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT j.*, s.governing_state_code
       FROM notary_journal_entries j
       LEFT JOIN notarization_sessions s ON s.id = j.session_id
       ORDER BY j.entry_sequence_number DESC LIMIT 100`
    );
    res.json(r.rows.map((e) => ({
      id: e.id,
      sequenceNumber: e.entry_sequence_number,
      actDate: e.entry_timestamp,
      notarizationAct: e.notarial_act_type,
      signerName: e.signer_name,
      documentType: e.document_description,
      governingState: e.governing_state_code,
      entryHash: e.entry_hash,
    })));
  } catch (err) { next(err); }
});

// ---------------------------------------------------------------------------
router.get('/notary/:notaryId', async (req, res, next) => {
  try {
    const entries = await JournalEntry.getByNotary(req.params.notaryId, {
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 500,
      offset: req.query.offset ? parseInt(req.query.offset, 10) : 0,
    });
    const count = await JournalEntry.countByNotary(req.params.notaryId);

    res.json({ data: entries, count, total: count });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /journal/notary/:notaryId/verify — Verify hash chain integrity
// ---------------------------------------------------------------------------
router.get('/notary/:notaryId/verify', async (req, res, next) => {
  try {
    // Fetch all entries for the notary (ordered by sequence)
    const entries = await JournalEntry.getByNotary(req.params.notaryId, { limit: 100000 });
    const verification = verifyChain(entries);

    await audit.emitAuditLog({
      eventType: 'journal.chain_verified',
      actorType: req.query._actor_type || 'admin',
      actorId: req.query._actor_id || null,
      notaryId: req.params.notaryId,
      payload: verification,
    });

    logger.info('Hash chain verification', {
      notaryId: req.params.notaryId,
      valid: verification.valid,
      entriesChecked: verification.entries_checked,
    });

    res.json({
      data: {
        notary_id: req.params.notaryId,
        ...verification,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /journal/audit-export — Export for SoS audit
// ---------------------------------------------------------------------------
router.get('/audit-export', async (req, res, next) => {
  try {
    const { notary_id, from, to } = req.query;

    const entries = await JournalEntry.getForAudit({ notaryId: notary_id, from, to });

    // If notary_id is specified, also verify chain integrity
    let verification = null;
    if (notary_id) {
      const allEntries = await JournalEntry.getByNotary(notary_id, { limit: 100000 });
      verification = verifyChain(allEntries);
    }

    await audit.emitAuditLog({
      eventType: 'journal.audit_exported',
      actorType: 'admin',
      notaryId: notary_id || null,
      payload: { entry_count: entries.length, from, to, chain_valid: verification?.valid },
    });

    res.json({
      data: entries,
      count: entries.length,
      chain_verification: verification,
      export_timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /journal/entries/:id — Single entry
// ---------------------------------------------------------------------------
router.get('/entries/:id', async (req, res, next) => {
  try {
    const entry = await JournalEntry.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: { message: 'Journal entry not found' } });
    }
    res.json({ data: entry });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
