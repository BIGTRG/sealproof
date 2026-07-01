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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }
  return res.json();
}

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

export const createShift = (data: { startTime: string; endTime: string }) =>
  request<any>(`${ROSTER}/shifts`, { method: 'POST', body: JSON.stringify(data) });

export const checkIn = (shiftId: string) =>
  request<any>(`${ROSTER}/shifts/${shiftId}/check-in`, { method: 'POST' });

export const checkOut = (shiftId: string) =>
  request<any>(`${ROSTER}/shifts/${shiftId}/check-out`, { method: 'POST' });

export const sendHeartbeat = () =>
  request<any>(`${ROSTER}/presence/heartbeat`, { method: 'POST' });

export const getCoverageMap = () =>
  request<any>(`${ROSTER}/coverage`);

/* ─── Session Queue ──────────────────────────────────────── */

export const getSessionQueue = () =>
  request<any>(`${API}/sessions/queue`);

export const claimSession = (sessionId: string) =>
  request<any>(`${API}/sessions/${sessionId}/match`, {
    method: 'POST',
    body: JSON.stringify({ notaryId: 'self' }),
  });

export const getSession = (sessionId: string) =>
  request<any>(`${API}/sessions/${sessionId}`);

export const advanceSession = (sessionId: string, status: string) =>
  request<any>(`${API}/sessions/${sessionId}/advance`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });

export const completeSession = (sessionId: string) =>
  request<any>(`${API}/sessions/${sessionId}/advance`, {
    method: 'POST',
    body: JSON.stringify({ status: 'completed' }),
  });

/* ─── LiveKit ────────────────────────────────────────────── */

export const getLivekitToken = (sessionId: string) =>
  request<{ token: string }>(`http://localhost:4005/rooms/${sessionId}/token`, {
    method: 'POST',
    body: JSON.stringify({ role: 'notary' }),
  });

/* ─── E-Sign ─────────────────────────────────────────────── */

export const sendForSignature = (sessionId: string, documentId: string) =>
  request<any>(`http://localhost:4006/esign/send`, {
    method: 'POST',
    body: JSON.stringify({ sessionId, documentId }),
  });

export const getEsignStatus = (sessionId: string) =>
  request<any>(`http://localhost:4006/esign/status/${sessionId}`);

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

export const applySeal = (sessionId: string, documentId: string, sealData: any) =>
  request<any>(`${SEAL}/seal/apply`, {
    method: 'POST',
    body: JSON.stringify({ sessionId, documentId, ...sealData }),
  });

export const verifySeal = (documentId: string) =>
  request<any>(`${SEAL}/seal/verify/${documentId}`);

/* ─── Earnings / Payments ────────────────────────────────── */

export const getMyEarnings = () =>
  request<any>(`${PAYMENT}/payouts/mine`);

export const getEarningsSummary = () =>
  request<any>(`${PAYMENT}/payouts/summary`);
