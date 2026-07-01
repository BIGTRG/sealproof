/**
 * Session State Machine Tests
 *
 * Tests the forward-only session status transitions defined in the
 * master build prompt (§4.2, §5.2.3).
 *
 * Valid transitions:
 *   created → kyc_pending → kyc_complete → queued → in_session → completed
 *   Any state → rejected (admin action)
 *   Any state → failed (system error)
 *   created/kyc_pending/kyc_complete/queued → cancelled (customer/admin/API)
 */

// Session state machine logic (mirrors session-orchestrator-svc)
const VALID_TRANSITIONS = {
  created: ['kyc_pending', 'cancelled', 'rejected', 'failed'],
  kyc_pending: ['kyc_complete', 'cancelled', 'rejected', 'failed'],
  kyc_complete: ['queued', 'cancelled', 'rejected', 'failed'],
  queued: ['in_session', 'cancelled', 'rejected', 'failed'],
  in_session: ['completed', 'rejected', 'failed'],
  completed: [],      // Terminal state
  rejected: [],       // Terminal state
  failed: [],         // Terminal state
  cancelled: [],      // Terminal state
};

function canTransition(from, to) {
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

function transition(session, newStatus) {
  if (!canTransition(session.status, newStatus)) {
    throw new Error(
      `Invalid transition: ${session.status} → ${newStatus}`
    );
  }
  return { ...session, status: newStatus, updated_at: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Session State Machine', () => {
  let session;

  beforeEach(() => {
    session = {
      id: 'test-session-001',
      status: 'created',
      updated_at: new Date().toISOString(),
    };
  });

  describe('Happy path', () => {
    test('should follow full lifecycle: created → completed', () => {
      session = transition(session, 'kyc_pending');
      expect(session.status).toBe('kyc_pending');

      session = transition(session, 'kyc_complete');
      expect(session.status).toBe('kyc_complete');

      session = transition(session, 'queued');
      expect(session.status).toBe('queued');

      session = transition(session, 'in_session');
      expect(session.status).toBe('in_session');

      session = transition(session, 'completed');
      expect(session.status).toBe('completed');
    });
  });

  describe('Cancellation', () => {
    test('should allow cancellation from created', () => {
      session = transition(session, 'cancelled');
      expect(session.status).toBe('cancelled');
    });

    test('should allow cancellation from kyc_pending', () => {
      session = transition(session, 'kyc_pending');
      session = transition(session, 'cancelled');
      expect(session.status).toBe('cancelled');
    });

    test('should allow cancellation from queued', () => {
      session.status = 'queued';
      session = transition(session, 'cancelled');
      expect(session.status).toBe('cancelled');
    });

    test('should NOT allow cancellation from in_session', () => {
      session.status = 'in_session';
      expect(() => transition(session, 'cancelled')).toThrow('Invalid transition');
    });

    test('should NOT allow cancellation from completed', () => {
      session.status = 'completed';
      expect(() => transition(session, 'cancelled')).toThrow('Invalid transition');
    });
  });

  describe('Terminal states', () => {
    test('completed is terminal — no further transitions', () => {
      session.status = 'completed';
      expect(() => transition(session, 'failed')).toThrow('Invalid transition');
      expect(() => transition(session, 'created')).toThrow('Invalid transition');
    });

    test('rejected is terminal', () => {
      session.status = 'rejected';
      expect(() => transition(session, 'queued')).toThrow('Invalid transition');
    });

    test('failed is terminal', () => {
      session.status = 'failed';
      expect(() => transition(session, 'created')).toThrow('Invalid transition');
    });

    test('cancelled is terminal', () => {
      session.status = 'cancelled';
      expect(() => transition(session, 'created')).toThrow('Invalid transition');
    });
  });

  describe('Invalid transitions', () => {
    test('should not allow backward transitions', () => {
      session.status = 'queued';
      expect(() => transition(session, 'created')).toThrow('Invalid transition');
      expect(() => transition(session, 'kyc_pending')).toThrow('Invalid transition');
    });

    test('should not allow skipping states', () => {
      session.status = 'created';
      expect(() => transition(session, 'queued')).toThrow('Invalid transition');
      expect(() => transition(session, 'in_session')).toThrow('Invalid transition');
      expect(() => transition(session, 'completed')).toThrow('Invalid transition');
    });
  });

  describe('Rejection (admin action)', () => {
    test('should allow rejection from any non-terminal state', () => {
      for (const state of ['created', 'kyc_pending', 'kyc_complete', 'queued', 'in_session']) {
        const s = { ...session, status: state };
        const result = transition(s, 'rejected');
        expect(result.status).toBe('rejected');
      }
    });
  });

  describe('Failure (system error)', () => {
    test('should allow failure from any non-terminal state', () => {
      for (const state of ['created', 'kyc_pending', 'kyc_complete', 'queued', 'in_session']) {
        const s = { ...session, status: state };
        const result = transition(s, 'failed');
        expect(result.status).toBe('failed');
      }
    });
  });

  describe('canTransition helper', () => {
    test('returns true for valid transitions', () => {
      expect(canTransition('created', 'kyc_pending')).toBe(true);
      expect(canTransition('queued', 'in_session')).toBe(true);
    });

    test('returns false for invalid transitions', () => {
      expect(canTransition('completed', 'created')).toBe(false);
      expect(canTransition('created', 'completed')).toBe(false);
    });

    test('returns false for unknown states', () => {
      expect(canTransition('unknown', 'created')).toBe(false);
    });
  });
});
