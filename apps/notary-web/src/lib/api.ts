/**
 * Notary Portal API Client
 * Talks to backend microservices: commission-svc, roster-svc,
 * session-orchestrator-svc, journal-svc, seal-applicator-svc,
 * recording-svc, payment-svc, livekit-bridge-svc, esign-bridge-svc
 */

// All requests go through the Next.js API proxy at /api/[service]/...
const PROXY = '/api';
const API = `${PROXY}/sessions`;
const COMMISSION = `${PROXY}/notary`;
const ROSTER = `${PROXY}/roster`;
const JOURNAL = `${PROXY}/journal`;
const SEAL = `${PROXY}/seal`;
const PAYMENT = `${PROXY}/payments`;

let tenantId: string | null = null;
export function setTenantId(id: string) { tenantId = id; }

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(tenantId ? { 'X-Tenant-ID': tenantId } : {}),
      ...init?.headers,
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = body.error;
    throw new Error((typeof err === 'string' ? err : err?.message) || `API error ${res.status}`);
  }
  return res.json();
}

export const resolveTenant = (domain: string) =>
  request<{ tenant: any }>(`${PROXY}/tenant/api/resolve/domain/${encodeURIComponent(domain)}`);

/* ─── Notary Commission / Profile ───────────────────────── */

export const getMyProfile = () =>
  request<any>(`${COMMISSION}/notaries/me`);

export const applyAsNotary = (data: any) =>
  request<any>(`${COMMISSION}/notaries`, { method: 'POST', body: JSON.stringify(data) });

export const updateProfile = (id: string, data: any) =>
  request<any>(`${COMMISSION}/notaries/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const uploadCredential = async (notaryId: string, type: string, file: File) => {
  const formData = new FormData();
  formData.append('type', type);
  formData.append('file', file);
  const res = await fetch(`${COMMISSION}/notaries/${notaryId}/credentials`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Upload failed');
  return res.json();
};

/* ─── Shifts / Roster ────────────────────────────────────── */

export const getMyShifts = () =>
  request<any>(`${ROSTER}/shifts/mine`);

export const createShift = (data: { notaryId: string; startTime: string; endTime: string }) =>
  request<any>(`${ROSTER}/shifts`, {
    method: 'POST',
    body: JSON.stringify({ notary_id: data.notaryId, shift_start: data.startTime, shift_end: data.endTime }),
  }).then((r: any) => r?.data ?? r);

export const checkIn = (shiftId: string) =>
  request<any>(`${ROSTER}/shifts/${shiftId}/check-in`, { method: 'POST' });

export const checkOut = (shiftId: string) =>
  request<any>(`${ROSTER}/shifts/${shiftId}/check-out`, { method: 'POST' });

export const sendHeartbeat = (notaryId: string, shiftId?: string, status: 'available' | 'in_session' | 'break' = 'available') =>
  request<any>(`${ROSTER}/presence/heartbeat`, {
    method: 'POST',
    body: JSON.stringify({ notary_id: notaryId, shift_id: shiftId, status }),
  });

export const getCoverageMap = () =>
  request<any>(`${ROSTER}/coverage`);

/* ─── Session Queue ──────────────────────────────────────── */

export const getSessionQueue = () =>
  request<any>(`${API}/sessions/queue`).then((r: any) => r?.data ?? r);

export const getSession = (sessionId: string) =>
  request<any>(`${API}/sessions/${sessionId}`);

export const listMySessions = (notaryId: string, limit = 20) =>
  request<any>(`${API}/sessions?notary_id=${encodeURIComponent(notaryId)}&limit=${limit}`).then((r: any) => r?.data ?? r);

export const advanceSession = (sessionId: string, status: 'in_session' | 'completed' | 'failed') =>
  request<any>(`${API}/sessions/${sessionId}/advance`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  }).then((r: any) => r?.data ?? r);

export const completeSession = (sessionId: string) => advanceSession(sessionId, 'completed');

export const claimSession = (sessionId: string, notaryId: string) =>
  request<any>(`${API}/sessions/${sessionId}/claim`, {
    method: 'POST',
    body: JSON.stringify({ notary_id: notaryId }),
  }).then((r: any) => r?.data ?? r);

export const documentUrl = (sessionId: string, documentId: string, version: 'original' | 'signed' | 'sealed' = 'original') =>
  `${API}/sessions/${sessionId}/documents/${documentId}/download?version=${version}`;

export const getSessionJournal = (sessionId: string) =>
  request<any>(`${API}/sessions/${sessionId}/journal`).then((r: any) => r?.data ?? r);

/* ─── LiveKit ────────────────────────────────────────────── */

export const createLivekitRoom = (sessionId: string) =>
  request<any>(`${PROXY}/livekit/rooms/${sessionId}`, { method: 'POST', body: JSON.stringify({}) });

export const getLivekitToken = (sessionId: string, participant: { identity: string; name: string; role: string }) =>
  request<{ data: { token: string; room_name: string } }>(`${PROXY}/livekit/rooms/${sessionId}/tokens`, {
    method: 'POST',
    body: JSON.stringify(participant),
  });

export const startSessionRecording = (sessionId: string) =>
  request<any>(`${PROXY}/livekit/rooms/${sessionId}/start-recording`, { method: 'POST', body: JSON.stringify({}) });

export const stopSessionRecording = (sessionId: string) =>
  request<any>(`${PROXY}/livekit/rooms/${sessionId}/stop-recording`, { method: 'POST', body: JSON.stringify({}) });

/* ─── E-Sign ─────────────────────────────────────────────── */

export const sendForSignature = (sessionId: string, documentId: string) =>
  request<any>(`${PROXY}/esign/signatures`, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, document_id: documentId }),
  });

export const getEsignStatus = (sessionId: string) =>
  request<any>(`${PROXY}/esign/signatures/session/${sessionId}`);

/* ─── Journal ────────────────────────────────────────────── */

export const getMyJournal = (params?: { page?: number; limit?: number; search?: string }) => {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.search) qs.set('search', params.search);
  return request<any>(`${JOURNAL}/journal?${qs.toString()}`);
};

export const getJournalEntry = (entryId: string) =>
  request<any>(`${JOURNAL}/journal/${entryId}`);

export const verifyJournalChain = (notaryId: string) =>
  request<any>(`${JOURNAL}/journal/verify/${notaryId}`);

export const createJournalEntry = (data: any) =>
  request<any>(`${JOURNAL}/journal`, { method: 'POST', body: JSON.stringify(data) });

export const exportJournal = () =>
  request<any>(`${JOURNAL}/journal/export`);

/* ─── Seal ───────────────────────────────────────────────── */

export const applySeal = (sessionId: string, actType: string = 'acknowledgment') =>
  request<any>(`${API}/sessions/${sessionId}/seal`, {
    method: 'POST',
    body: JSON.stringify({ act_type: actType }),
  }).then((r: any) => r?.data ?? r);

export const verifySeal = (sessionId: string) =>
  request<any>(`${SEAL}/seals/${sessionId}/status`).then((r: any) => r?.data ?? r);

/* ─── Earnings / Payments ────────────────────────────────── */

export const getMyEarnings = () =>
  request<any>(`${PAYMENT}/payouts/summary`);

export const getEarningsSummary = () =>
  request<any>(`${PAYMENT}/payouts/summary`);

export const getPayoutHistory = () =>
  request<any[]>(`${PAYMENT}/payouts/mine`);

// Aliases used by dashboard and session pages
export const getMyActiveShift = () =>
  getMyShifts().then((s: any) =>
    Array.isArray(s) ? s.find((x: any) => x.status === "active" || x.checkedInAt) ?? null : s
  );
export const getQueuedSessions = getSessionQueue;
/** Start a shift: create (or reuse) today's shift, check in, and announce presence. */
export const startShift = async () => {
  const me: any = await getMyProfile().then((r: any) => r?.data ?? r);
  const shifts: any[] = await getMyShifts().then((r: any) => (Array.isArray(r) ? r : r?.data ?? []));
  let shift = shifts.find((x) => x.status === 'active');
  if (!shift) {
    shift = shifts.find((x) => x.status === 'scheduled');
    if (!shift) {
      shift = await createShift({
        notaryId: me.id,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
      });
    }
    await checkIn(shift.id);
  }
  await sendHeartbeat(me.id, shift.id, 'available').catch(() => undefined);
  return shift;
};
export const acceptSession = (sessionId: string) =>
  getMyProfile().then((me: any) => claimSession(sessionId, (me?.data ?? me)?.id));
export const getSessionById = getSession;
export const confirmJournalEntry = (sessionId: string, data: { notarial_act_type?: string; signer_address?: string } = {}) =>
  request<any>(`${API}/sessions/${sessionId}/journal`, {
    method: 'POST',
    body: JSON.stringify(data),
  }).then((r: any) => r?.data ?? r);
