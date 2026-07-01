/**
 * Room Routes — LiveKit room lifecycle for notarization sessions.
 *
 * POST   /rooms/:sessionId                Create room
 * POST   /rooms/:sessionId/tokens         Generate participant token
 * POST   /rooms/:sessionId/start-recording   Start recording
 * POST   /rooms/:sessionId/stop-recording    Stop recording
 * DELETE /rooms/:sessionId                Destroy room
 * GET    /rooms/:sessionId/participants   List participants
 */
const router = require('express').Router();
const { validate, audit, logger, db } = require('@sealproof/shared');
const livekit = require('../utils/livekit');

// ---------------------------------------------------------------------------
// POST /rooms/:sessionId — Create a LiveKit room for a session
// ---------------------------------------------------------------------------
router.post('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists and is in a valid state for room creation
    const session = await db.query(
      'SELECT * FROM notarization_sessions WHERE id = $1', [sessionId]
    );
    if (!session.rows[0]) {
      return res.status(404).json({ error: { message: 'Session not found' } });
    }
    if (!['matched_to_notary', 'in_session'].includes(session.rows[0].status)) {
      return res.status(409).json({
        error: { message: `Cannot create room: session status is ${session.rows[0].status}` },
      });
    }

    const room = await livekit.createRoom(sessionId, {
      maxParticipants: (session.rows[0].signer_count || 1) + 3, // signers + customer + notary + buffer
    });

    // Store room ID on the session
    await db.query(
      `UPDATE notarization_sessions SET livekit_room_id = $1, updated_at = NOW() WHERE id = $2`,
      [livekit.roomName(sessionId), sessionId]
    );

    await audit.emitAuditLog({
      eventType: 'livekit.room_created',
      actorType: 'system',
      sessionId,
      payload: { room_name: livekit.roomName(sessionId) },
    });

    logger.info('Room created for session', { sessionId });
    res.status(201).json({ data: { room_name: livekit.roomName(sessionId), session_id: sessionId } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /rooms/:sessionId/tokens — Generate participant token
// ---------------------------------------------------------------------------
router.post('/:sessionId/tokens',
  validate({
    body: {
      identity: { required: true, type: 'string' },
      name:     { required: true, type: 'string' },
      role:     { required: true, type: 'string' },
    },
  }),
  async (req, res, next) => {
    try {
      const { sessionId } = req.params;
      const { identity, name, role } = req.body;

      if (!['customer', 'notary', 'signer', 'witness'].includes(role)) {
        return res.status(400).json({ error: { message: 'Role must be customer, notary, signer, or witness' } });
      }

      const token = await livekit.generateToken(sessionId, { identity, name, role });

      await audit.emitAuditLog({
        eventType: 'livekit.token_issued',
        actorType: role,
        actorId: identity,
        sessionId,
        payload: { participant_name: name, role },
      });

      res.json({ data: { token, room_name: livekit.roomName(sessionId), role } });
    } catch (err) {
      next(err);
    }
  }
);

// ---------------------------------------------------------------------------
// POST /rooms/:sessionId/start-recording — Start recording (notary action)
// ---------------------------------------------------------------------------
router.post('/:sessionId/start-recording', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const result = await livekit.startRecording(sessionId);

    // Store egress ID for later stop
    await db.query(
      `UPDATE notarization_sessions
       SET recording_url = $1, updated_at = NOW()
       WHERE id = $2`,
      [`egress:${result.egressId}`, sessionId] // temp placeholder until recording completes
    );

    await audit.emitAuditLog({
      eventType: 'livekit.recording_started',
      actorType: 'notary',
      actorId: req.body.notary_id,
      sessionId,
      payload: { egress_id: result.egressId },
    });

    logger.info('Recording started', { sessionId, egressId: result.egressId });
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /rooms/:sessionId/stop-recording — Stop recording
// ---------------------------------------------------------------------------
router.post('/:sessionId/stop-recording', async (req, res, next) => {
  try {
    const { sessionId } = req.params;

    // Get egress ID from session
    const session = await db.query(
      'SELECT recording_url FROM notarization_sessions WHERE id = $1', [sessionId]
    );
    const recordingUrl = session.rows[0]?.recording_url;
    if (!recordingUrl || !recordingUrl.startsWith('egress:')) {
      return res.status(409).json({ error: { message: 'No active recording found for this session' } });
    }

    const egressId = recordingUrl.replace('egress:', '');
    const result = await livekit.stopRecording(egressId);

    await audit.emitAuditLog({
      eventType: 'livekit.recording_stopped',
      actorType: 'notary',
      actorId: req.body.notary_id,
      sessionId,
      payload: { egress_id: egressId },
    });

    logger.info('Recording stopped', { sessionId, egressId });
    res.json({ data: { egress_id: egressId, status: 'stopped' } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// DELETE /rooms/:sessionId — Destroy room after session completion
// ---------------------------------------------------------------------------
router.delete('/:sessionId', async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    await livekit.destroyRoom(sessionId);

    await audit.emitAuditLog({
      eventType: 'livekit.room_destroyed',
      actorType: 'system',
      sessionId,
    });

    res.json({ data: { session_id: sessionId, room_destroyed: true } });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /rooms/:sessionId/participants — List participants
// ---------------------------------------------------------------------------
router.get('/:sessionId/participants', async (req, res, next) => {
  try {
    const participants = await livekit.listParticipants(req.params.sessionId);
    res.json({ data: participants, count: participants.length });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
