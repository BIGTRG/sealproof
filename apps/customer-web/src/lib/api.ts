/**
 * SealProof — API Client (customer app)
 *
 * All calls go through the Next.js proxy at /api/{service}/... which forwards
 * the remainder of the path verbatim to the service. The session workflow API
 * (session-orchestrator, /sessions/...) is the single entry point for the
 * notarization flow; tenant, state-compliance and livekit are called directly.
 */

import type {
  Session,
  NewSessionData,
  VaultDocument,
  CustomerProfile,
  TenantBranding,
  ApiResponse,
  KbaQuestion,
  SessionDocument,
} from '@/types';

const PROXY = '/api';
const WORKFLOW = `${PROXY}/sessions/sessions`;
const TENANT_SVC = `${PROXY}/tenant/api`;
const LIVEKIT_SVC = `${PROXY}/livekit/rooms`;
const STATE_SVC = `${PROXY}/compliance/api`;

const CUSTOMER_KEY = 'sp_customer_id';

let tenantId: string | null = null;

export function setTenantId(id: string) {
  tenantId = id;
}

export function getCustomerId(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(CUSTOMER_KEY);
}

export function setCustomerId(id: string) {
  if (typeof window !== 'undefined') window.localStorage.setItem(CUSTOMER_KEY, id);
}

async function request<T>(url: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  try {
    const res = await fetch(url, { ...options, headers, credentials: 'include' });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = json?.error;
      return { error: (typeof err === 'string' ? err : err?.message) || `Request failed (${res.status})` };
    }
    // Services wrap payloads as { data: ... }; unwrap one level.
    return { data: (json && typeof json === 'object' && 'data' in json ? json.data : json) as T };
  } catch (err: any) {
    return { error: err.message || 'Network error' };
  }
}

// ─── Tenant / Branding ──────────────────────────────────────────────────────

export async function resolveTenant(domain: string): Promise<ApiResponse<{ tenant: TenantBranding & { id?: string } }>> {
  return request(`${TENANT_SVC}/resolve/domain/${encodeURIComponent(domain)}`);
}

// ─── State Compliance ───────────────────────────────────────────────────────

export async function getStateRules(stateCode: string): Promise<ApiResponse<any>> {
  return request(`${STATE_SVC}/state-rules/${stateCode}`);
}

// ─── Session mapping ────────────────────────────────────────────────────────

function mapDocument(d: any): SessionDocument & { id: string; status?: string; sealedUrl?: string; signedUrl?: string } {
  return {
    id: d.id,
    file: null,
    fileName: d.document_name,
    fileSize: d.size_bytes || 0,
    pageCount: d.page_count || 1,
    documentType: d.document_type,
    description: '',
    uploadProgress: 100,
    uploadedUrl: d.upload_url,
    status: d.esign_status === 'signed' || d.status === 'signed' ? (d.sealed_document_url ? 'sealed' : 'signed') : 'uploaded',
    sealedUrl: d.sealed_document_url || undefined,
    signedUrl: d.signed_document_url || undefined,
  };
}

export function mapSession(s: any): Session {
  return {
    id: s.id,
    status: s.status,
    documentType: s.document_type,
    description: s.description || '',
    serviceLevel: s.ron_session_type === 'rush' ? 'rush' : 'standard',
    signerCount: s.signer_count || 1,
    signers: (s.signers || []).map((x: any) => ({
      id: x.id,
      name: x.full_legal_name,
      email: x.email,
      phone: x.phone || '',
      isPrimary: x.signer_role === 'primary',
      kycStatus: x.kyc_result === 'passed' ? 'verified' : x.kyc_result === 'failed' ? 'failed' : 'pending',
      signedAt: x.signed_at || null,
    })),
    documents: (s.documents || []).map(mapDocument),
    notaryName: s.notary_name || undefined,
    createdAt: s.created_at,
    completedAt: s.completed_at || undefined,
    totalPriceCents: s.customer_paid_cents || 0,
    livekitRoomName: s.livekit_room_id || undefined,
  } as Session;
}

// ─── Sessions (workflow) ────────────────────────────────────────────────────

export async function createSession(data: NewSessionData & { stateOfAct?: string }): Promise<ApiResponse<{ session: Session; customerId: string }>> {
  const res = await request<any>(`${WORKFLOW}/intake`, {
    method: 'POST',
    body: JSON.stringify({
      document_type: data.documentType,
      description: data.description,
      service_level: data.serviceLevel,
      state_of_act: data.stateOfAct || 'NC',
      signers: data.signers.map((s) => ({ name: s.name, email: s.email, phone: s.phone, is_primary: s.isPrimary })),
    }),
  });
  if (res.error) return { error: res.error };
  setCustomerId(res.data.customer_id);
  return { data: { session: mapSession({ ...res.data.session, signers: res.data.signers }), customerId: res.data.customer_id } };
}

export async function setServiceLevel(sessionId: string, level: 'standard' | 'rush'): Promise<ApiResponse<Session>> {
  const res = await request<any>(`${WORKFLOW}/${sessionId}/service-level`, { method: 'POST', body: JSON.stringify({ service_level: level }) });
  return res.error ? { error: res.error } : { data: mapSession(res.data) };
}

export async function getSession(sessionId: string): Promise<ApiResponse<{ session: Session }>> {
  const res = await request<any>(`${WORKFLOW}/${sessionId}`);
  return res.error ? { error: res.error } : { data: { session: mapSession(res.data) } };
}

export async function listSessions(): Promise<ApiResponse<{ sessions: Session[] }>> {
  const cid = getCustomerId();
  if (!cid) return { data: { sessions: [] } };
  const res = await request<any>(`${WORKFLOW}?customer_id=${encodeURIComponent(cid)}&limit=100`);
  return res.error ? { error: res.error } : { data: { sessions: (res.data || []).map(mapSession) } };
}

export async function cancelSession(sessionId: string): Promise<ApiResponse<{ session: Session }>> {
  const res = await request<any>(`${WORKFLOW}/${sessionId}/cancel`, { method: 'POST', body: JSON.stringify({ reason: 'Cancelled by customer' }) });
  return res.error ? { error: res.error } : { data: { session: mapSession(res.data) } };
}

// ─── Document Upload ────────────────────────────────────────────────────────

export async function uploadDocument(
  sessionId: string,
  file: File,
  documentType: string,
  onProgress?: (pct: number) => void
): Promise<ApiResponse<{ document: { id: string; uploadUrl: string; pageCount: number } }>> {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${WORKFLOW}/${sessionId}/documents`);
    if (tenantId) xhr.setRequestHeader('X-Tenant-ID', tenantId);
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener('load', () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          const d = json.data.document;
          resolve({ data: { document: { id: d.id, uploadUrl: d.upload_url, pageCount: d.page_count } } });
        } else {
          resolve({ error: json.error?.message || json.error || 'Upload failed' });
        }
      } catch {
        resolve({ error: 'Upload failed' });
      }
    });
    xhr.addEventListener('error', () => resolve({ error: 'Network error during upload' }));
    xhr.send(formData);
  });
}

export function documentDownloadUrl(sessionId: string, documentId: string, version: 'original' | 'signed' | 'sealed' = 'sealed') {
  return `${WORKFLOW}/${sessionId}/documents/${documentId}/download?version=${version}`;
}

// ─── Identity verification ─────────────────────────────────────────────────

export async function initiateKyc(sessionId: string): Promise<ApiResponse<{ status: string; mode: string; inquiry_url: string | null }>> {
  return request(`${WORKFLOW}/${sessionId}/kyc/initiate`, { method: 'POST', body: '{}' });
}

export async function getKycStatus(sessionId: string): Promise<ApiResponse<{ status: string; mode: string }>> {
  return request(`${WORKFLOW}/${sessionId}/kyc/status`);
}

// ─── KBA ────────────────────────────────────────────────────────────────────

export async function startKba(sessionId: string): Promise<ApiResponse<{ kba_session_id: string; mode: string; questions: KbaQuestion[]; attempt: number; max_attempts: number }>> {
  return request(`${WORKFLOW}/${sessionId}/kba/start`, { method: 'POST', body: '{}' });
}

export async function submitKbaAnswers(
  sessionId: string,
  kbaSessionId: string,
  answers: Record<string, string>
): Promise<ApiResponse<{ status: 'passed' | 'failed'; can_retry?: boolean; questions_correct?: number; questions_required?: number }>> {
  return request(`${WORKFLOW}/${sessionId}/kba/submit`, {
    method: 'POST',
    body: JSON.stringify({ kba_session_id: kbaSessionId, answers }),
  });
}

// ─── Payment ────────────────────────────────────────────────────────────────

export async function initiatePayment(sessionId: string, paymentMethodId: string): Promise<ApiResponse<{ payment: { authorizationId: string; status: string; mode?: string } | null; session: any; matched: boolean; notary?: { name: string } | null }>> {
  return request(`${WORKFLOW}/${sessionId}/payment/authorize`, {
    method: 'POST',
    body: JSON.stringify({ payment_method_id: paymentMethodId }),
  });
}

export async function matchNow(sessionId: string): Promise<ApiResponse<{ matched: boolean; session: any; notary?: { name: string } | null }>> {
  return request(`${WORKFLOW}/${sessionId}/match-now`, { method: 'POST', body: '{}' });
}

// ─── Live session: video + in-session signing ───────────────────────────────

export async function createLivekitRoom(sessionId: string): Promise<ApiResponse<any>> {
  return request(`${LIVEKIT_SVC}/${sessionId}`, { method: 'POST', body: '{}' });
}

export async function getLivekitToken(
  sessionId: string,
  participant: { identity: string; name: string; role: 'customer' | 'notary' | 'witness' }
): Promise<ApiResponse<{ token: string; room_name: string; ws_url?: string }>> {
  return request(`${LIVEKIT_SVC}/${sessionId}/tokens`, { method: 'POST', body: JSON.stringify(participant) });
}

export async function signDocument(
  sessionId: string,
  documentId: string,
  signature: { signaturePng?: string; typedName?: string; signerId?: string }
): Promise<ApiResponse<{ document_id: string; signed_document_url: string }>> {
  return request(`${WORKFLOW}/${sessionId}/documents/${documentId}/sign`, {
    method: 'POST',
    body: JSON.stringify({ signature_png: signature.signaturePng, typed_name: signature.typedName, signer_id: signature.signerId }),
  });
}

// ─── Document Vault ─────────────────────────────────────────────────────────

export async function listVaultDocuments(): Promise<ApiResponse<{ documents: VaultDocument[] }>> {
  const cid = getCustomerId();
  if (!cid) return { data: { documents: [] } };
  const res = await request<any>(`${WORKFLOW}/customers/${cid}/documents`);
  if (res.error) return { error: res.error };
  return {
    data: {
      documents: (res.data.documents || []).map((d: any) => ({
        id: d.id,
        sessionId: d.session_id,
        fileName: d.document_name,
        documentType: d.document_type,
        notarizedAt: d.completed_at || d.created_at,
        sealedUrl: d.sealed_document_url ? documentDownloadUrl(d.session_id, d.id, 'sealed') : documentDownloadUrl(d.session_id, d.id, d.signed_document_url ? 'signed' : 'original'),
        pageCount: d.page_count,
        signerNames: [],
        status: d.sealed_document_url ? 'sealed' : d.signed_document_url ? 'signed' : 'uploaded',
      })),
    },
  };
}

export async function downloadDocument(documentId: string, sessionId?: string): Promise<string> {
  if (!sessionId) return '';
  return documentDownloadUrl(sessionId, documentId, 'sealed');
}

// ─── Profile ────────────────────────────────────────────────────────────────

function mapProfile(c: any): CustomerProfile {
  const [firstName, ...rest] = String(c.full_legal_name || '').split(' ');
  return { id: c.id, clerkUserId: '', email: c.email, firstName, lastName: rest.join(' '), phone: c.phone || '', totalSessions: 0, createdAt: c.created_at } as CustomerProfile;
}

export async function getProfile(): Promise<ApiResponse<{ customer: CustomerProfile }>> {
  const cid = getCustomerId();
  if (!cid) return { error: 'No customer on this device yet. Start a session to create your profile.' };
  const res = await request<any>(`${WORKFLOW}/customers/${cid}`);
  return res.error ? { error: res.error } : { data: { customer: mapProfile(res.data.customer) } };
}

export async function updateProfile(data: Partial<CustomerProfile>): Promise<ApiResponse<{ customer: CustomerProfile }>> {
  const cid = getCustomerId();
  if (!cid) return { error: 'No customer on this device yet.' };
  const res = await request<any>(`${WORKFLOW}/customers/${cid}`, {
    method: 'PATCH',
    body: JSON.stringify({ full_legal_name: [data.firstName, data.lastName].filter(Boolean).join(' ') || undefined, phone: data.phone }),
  });
  return res.error ? { error: res.error } : { data: { customer: mapProfile(res.data.customer) } };
}
