/**
 * Socket.IO Event Manager
 *
 * Centralized real-time event layer for SealProof.
 * Manages rooms, broadcasts, and event routing between services.
 *
 * Rooms:
 *   - admin:live-ops       — admin console live operations dashboard
 *   - notary:roster        — notary roster updates
 *   - notary:{id}          — individual notary events
 *   - session:{id}         — session participants (customer + notary)
 *   - customer:{id}        — individual customer events
 *   - tenant:{id}          — tenant-scoped broadcasts
 */
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');

let io = null;

// ---------------------------------------------------------------------------
// Initialize Socket.IO server
// ---------------------------------------------------------------------------
function initSocketServer(httpServer, options = {}) {
  const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

  io = new Server(httpServer, {
    cors: {
      origin: options.origins || [
        'https://sealproof.ai',
        'https://notary.sealproof.ai',
        'https://admin.sealproof.ai',
      ],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // Redis adapter for multi-instance support (PM2 cluster mode)
  if (process.env.NODE_ENV === 'production') {
    const pubClient = new Redis(redisUrl);
    const subClient = pubClient.duplicate();
    io.adapter(createAdapter(pubClient, subClient));
  }

  // Connection handling
  io.on('connection', (socket) => {
    const { role, userId, tenantId } = socket.handshake.auth;

    // Auto-join rooms based on role
    if (role === 'admin') {
      socket.join('admin:live-ops');
      socket.join('notary:roster');
      if (tenantId) socket.join(`tenant:${tenantId}`);
    }

    if (role === 'notary' && userId) {
      socket.join(`notary:${userId}`);
      socket.join('notary:roster');
    }

    if (role === 'customer' && userId) {
      socket.join(`customer:${userId}`);
    }

    // Join session room on request
    socket.on('join:session', (sessionId) => {
      socket.join(`session:${sessionId}`);
    });

    socket.on('leave:session', (sessionId) => {
      socket.leave(`session:${sessionId}`);
    });

    // Notary heartbeat (presence)
    socket.on('notary:heartbeat', (data) => {
      emitToRoom('admin:live-ops', 'notary:presence', {
        notaryId: userId,
        status: data.status,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on('disconnect', () => {
      if (role === 'notary') {
        emitToRoom('admin:live-ops', 'notary:offline', {
          notaryId: userId,
          timestamp: new Date().toISOString(),
        });
      }
    });
  });

  return io;
}

// ---------------------------------------------------------------------------
// Event emission helpers
// ---------------------------------------------------------------------------

/** Emit to a specific room */
function emitToRoom(room, event, data) {
  if (!io) return;
  io.to(room).emit(event, { ...data, _ts: new Date().toISOString() });
}

/** Emit to admin live-ops dashboard */
function emitToAdmins(event, data) {
  emitToRoom('admin:live-ops', event, data);
}

/** Emit to a specific notary */
function emitToNotary(notaryId, event, data) {
  emitToRoom(`notary:${notaryId}`, event, data);
}

/** Emit to a specific customer */
function emitToCustomer(customerId, event, data) {
  emitToRoom(`customer:${customerId}`, event, data);
}

/** Emit to all participants in a session */
function emitToSession(sessionId, event, data) {
  emitToRoom(`session:${sessionId}`, event, data);
}

/** Emit to notary roster room */
function emitRosterUpdate(data) {
  emitToRoom('notary:roster', 'roster:update', data);
}

// ---------------------------------------------------------------------------
// Pre-defined business events
// ---------------------------------------------------------------------------

const SessionEvents = {
  /** New session created and entering queue */
  sessionQueued(session) {
    emitToAdmins('session:queued', {
      sessionId: session.id,
      customerName: session.customerName,
      documentType: session.document_type,
      serviceLevel: session.ron_session_type,
      queuedAt: session.queued_at,
    });
  },

  /** Session matched to notary */
  sessionMatched(session) {
    emitToAdmins('session:matched', {
      sessionId: session.id,
      notaryId: session.notary_id,
      matchedAt: session.matched_to_notary_at,
    });
    emitToNotary(session.notary_id, 'session:assigned', {
      sessionId: session.id,
      customerName: session.customerName,
      documentType: session.document_type,
    });
    emitToCustomer(session.customer_id, 'session:notary-assigned', {
      sessionId: session.id,
      notaryName: session.notaryName,
    });
  },

  /** Session started (LiveKit room active) */
  sessionStarted(session) {
    emitToAdmins('session:started', {
      sessionId: session.id,
      notaryId: session.notary_id,
      startedAt: session.session_started_at,
    });
    emitToSession(session.id, 'session:live', {
      livekitRoomId: session.livekit_room_id,
    });
  },

  /** Session completed */
  sessionCompleted(session) {
    emitToAdmins('session:completed', {
      sessionId: session.id,
      notaryId: session.notary_id,
      duration: session.session_duration_seconds,
      completedAt: session.completed_at,
    });
    emitToNotary(session.notary_id, 'session:done', {
      sessionId: session.id,
    });
    emitToCustomer(session.customer_id, 'session:complete', {
      sessionId: session.id,
      documentsReady: true,
    });
  },
};

const NotaryEvents = {
  /** Notary checked in to shift */
  checkedIn(notary, shift) {
    emitRosterUpdate({
      type: 'check_in',
      notaryId: notary.id,
      notaryName: notary.display_name,
      shiftId: shift.id,
      checkedInAt: shift.checked_in_at,
    });
  },

  /** Notary checked out of shift */
  checkedOut(notary, shift) {
    emitRosterUpdate({
      type: 'check_out',
      notaryId: notary.id,
      notaryName: notary.display_name,
      shiftId: shift.id,
      checkedOutAt: shift.checked_out_at,
      sessionsHandled: shift.sessions_handled,
    });
  },

  /** Notary application approved */
  approved(notary) {
    emitToAdmins('notary:approved', {
      notaryId: notary.id,
      notaryName: notary.display_name,
    });
  },
};

const QueueEvents = {
  /** Queue depth changed */
  depthChanged(depth) {
    emitToAdmins('queue:depth', {
      standard: depth.standard,
      rush: depth.rush,
      total: depth.total,
    });
  },
};

// ---------------------------------------------------------------------------
// Get the Socket.IO instance (for direct access)
// ---------------------------------------------------------------------------
function getIO() {
  return io;
}

module.exports = {
  initSocketServer,
  getIO,
  emitToRoom,
  emitToAdmins,
  emitToNotary,
  emitToCustomer,
  emitToSession,
  emitRosterUpdate,
  SessionEvents,
  NotaryEvents,
  QueueEvents,
};
