/**
 * SealProof — API Client
 * Handles all communication with backend microservices.
 * Every request includes the tenant context via X-Tenant-ID header.
 */

import type {
  Session,
  NewSessionData,
  VaultDocument,
  CustomerProfile,
  TenantBranding,
  ApiResponse,
  KbaQuestion,
} from '@/types';

// All requests go through the Next.js API proxy at /api/[service]/...
// This keeps backend ports unexposed and handles CORS automatically.
const PROXY = '/api';
const API_BASE = `${PROXY}/sessions`;
const TENANT_SVC = `${PROXY}/tenant`;
const KYC_SVC = `${PROXY}/kyc`;
const KBA_SVC = `${PROXY}/kba`;
const LIVEKIT_SVC = `${PROXY}/livekit`;
const PAYMENT_SVC = `${PROXY}/payments`;
const STATE_SVC = `${PROXY}/compliance`;

let tenantId: string | null = null;

export function setTenantId(id: string) {
  tenantId = id;
}

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }

  try {
    const res = await fetch(url, { ...options, headers, credentials: 'include' });
    const json = await res.json();

    if (!res.ok) {
      return { error: json.error || `Request failed (${res.status})` };
    }
    return { data: json };
  } catch (err: any) {
    return { error: err.message || 'Network error' };
  }
}

// ─── Tenant / Branding ──────────────────────────────────────────────────────

export async function resolveTenant(domain: string): Promise<ApiResponse<{ tenant: TenantBranding }>> {
  return request(`${TENANT_SVC}/api/resolve/domain/${encodeURIComponent(domain)}`);
}

// ─── State Compliance ───────────────────────────────────────────────────────

export async function getStateRules(stateCode: string): Promise<ApiResponse<any>> {
  return request(`${STATE_SVC}/api/rules/${stateCode}`);
}

export async function validateSession(sessionId: string, stateCode: string): Promise<ApiResponse<any>> {
  return request(`${STATE_SVC}/api/validation/validate-session`, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, state_code: stateCode }),
  });
}

export async function getDocTypesForState(stateCode: string): Promise<ApiResponse<{ allowed: string[]; restricted: string[] }>> {
  return request(`${STATE_SVC}/api/validation/doc-types/${stateCode}`);
}

// ─── Sessions ───────────────────────────────────────────────────────────────

export async function createSession(data: NewSessionData): Promise<ApiResponse<{ session: Session }>> {
  return request(`${API_BASE}/api/sessions`, {
    method: 'POST',
    body: JSON.stringify({
      document_type: data.documentType,
      description: data.description,
      signer_count: data.signerCount,
      signers: data.signers.map((s) => ({
        name: s.name,
        email: s.email,
        phone: s.phone,
        is_primary: s.isPrimary,
      })),
      service_level: data.serviceLevel,
    }),
  });
}

export async function getSession(sessionId: string): Promise<ApiResponse<{ session: Session }>> {
  return request(`${API_BASE}/api/sessions/${sessionId}`);
}

export async function listSessions(): Promise<ApiResponse<{ sessions: Session[] }>> {
  return request(`${API_BASE}/api/sessions`);
}

export async function cancelSession(sessionId: string): Promise<ApiResponse<{ session: Session }>> {
  return request(`${API_BASE}/api/sessions/${sessionId}/cancel`, { method: 'POST' });
}

// ─── Document Upload ────────────────────────────────────────────────────────

export async function uploadDocument(
  sessionId: string,
  file: File,
  documentType: string,
  onProgress?: (pct: number) => void
): Promise<ApiResponse<{ document: { id: string; uploadUrl: string } }>> {
  return new Promise((resolve) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/sessions/${sessionId}/documents`);

    if (tenantId) {
      xhr.setRequestHeader('X-Tenant-ID', tenantId);
    }

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      try {
        const json = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ data: json });
        } else {
          resolve({ error: json.error || 'Upload failed' });
        }
      } catch {
        resolve({ error: 'Upload failed' });
      }
    });

    xhr.addEventListener('error', () => resolve({ error: 'Network error during upload' }));
    xhr.send(formData);
  });
}

// ─── KYC (Persona Credential Analysis) ─────────────────────────────────────

export async function initiateKyc(sessionId: string): Promise<ApiResponse<{ inquiryId: string; inquiryUrl: string }>> {
  return request(`${KYC_SVC}/api/kyc/${sessionId}/initiate`, { method: 'POST' });
}

export async function getKycStatus(sessionId: string): Promise<ApiResponse<{ status: string }>> {
  return request(`${KYC_SVC}/api/kyc/${sessionId}/status`);
}

// ─── KBA (Knowledge-Based Authentication) ───────────────────────────────────

export async function startKba(sessionId: string, signerId: string): Promise<ApiResponse<{ kba_session_id: string; questions: KbaQuestion[] }>> {
  return request(`${KBA_SVC}/api/kba/${sessionId}/start`, {
    method: 'POST',
    body: JSON.stringify({ signer_id: signerId }),
  });
}

export async function submitKbaAnswers(sessionId: string, answers: Record<string, string>): Promise<ApiResponse<{ result: 'pass' | 'fail'; can_retry: boolean }>> {
  return request(`${KBA_SVC}/api/kba/${sessionId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

export async function getKbaStatus(sessionId: string, signerId: string): Promise<ApiResponse<{ status: string; attempts: number }>> {
  return request(`${KBA_SVC}/api/kba/${sessionId}/signer/${signerId}/status`);
}

// ─── LiveKit ────────────────────────────────────────────────────────────────

export async function getLivekitToken(sessionId: string): Promise<ApiResponse<{ token: string; roomName: string }>> {
  return request(`${LIVEKIT_SVC}/api/livekit/${sessionId}/token?role=customer`);
}

// ─── Payment ────────────────────────────────────────────────────────────────

export async function initiatePayment(sessionId: string, paymentMethodId: string): Promise<ApiResponse<{ transactionId: string }>> {
  return request(`${PAYMENT_SVC}/api/payments/${sessionId}/authorize`, {
    method: 'POST',
    body: JSON.stringify({ payment_method_id: paymentMethodId }),
  });
}

// ─── Document Vault ─────────────────────────────────────────────────────────

export async function listVaultDocuments(): Promise<ApiResponse<{ documents: VaultDocument[] }>> {
  return request(`${API_BASE}/api/documents/vault`);
}

export async function downloadDocument(documentId: string): Promise<string> {
  const res = await request<{ url: string }>(`${API_BASE}/api/documents/${documentId}/download`);
  return res.data?.url || '';
}

// ─── Customer Profile ───────────────────────────────────────────────────────

export async function getProfile(): Promise<ApiResponse<{ customer: CustomerProfile }>> {
  return request(`${API_BASE}/api/customers/me`);
}

export async function updateProfile(data: Partial<CustomerProfile>): Promise<ApiResponse<{ customer: CustomerProfile }>> {
  return request(`${API_BASE}/api/customers/me`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}
