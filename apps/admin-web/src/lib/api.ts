/**
 * Admin API client — communicates with all 17 backend services
 * via the Next.js API proxy at /api/[service]/...
 *
 * Route mapping:
 *   /api/sessions/...   → session-orchestrator-svc (port 4003)
 *   /api/notary/...     → notary-commission-svc    (port 4001)
 *   /api/roster/...     → notary-roster-svc        (port 4002)
 *   /api/kyc/...        → kyc-svc                  (port 4004)
 *   /api/livekit/...    → livekit-bridge-svc       (port 4005)
 *   /api/esign/...      → esign-bridge-svc         (port 4006)
 *   /api/journal/...    → journal-svc              (port 4007)
 *   /api/recording/...  → recording-svc            (port 4008)
 *   /api/seal/...       → seal-applicator-svc      (port 4009)
 *   /api/payments/...   → payment-svc              (port 4010)
 *   /api/notification/...→ notification-svc         (port 4011)
 *   /api/audit/...      → audit-export-svc         (port 4012)
 *   /api/gateway/...    → api-gateway-svc          (port 4013)
 *   /api/webhook/...    → webhook-svc              (port 4014)
 *   /api/tenant/...     → tenant-svc               (port 4015)
 *   /api/compliance/... → state-compliance-svc     (port 4016)
 *   /api/kba/...        → kba-svc                  (port 4017)
 */

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    ...opts,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

/* ─── Live Operations ─────────────────────────────────── */
export const getActiveSessions = () => request('/api/sessions/sessions?status=in_progress');
export const getSessionQueue = () => request('/api/sessions/sessions/queue');
export const getNotaryRoster = () => request('/api/roster/roster/active');
export const getCoverageMap = () => request('/api/roster/roster/coverage');
export const cancelSession = (id: string, reason: string) =>
  request(`/api/sessions/sessions/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });

/* ─── Notary Management ───────────────────────────────── */
export const getNotaries = (status?: string) =>
  request(`/api/notary/notaries${status ? `?status=${status}` : ''}`);
export const getNotaryById = (id: string) => request(`/api/notary/notaries/${id}`);
export const approveNotary = (id: string) =>
  request(`/api/notary/notaries/${id}/approve`, { method: 'POST' });
export const suspendNotary = (id: string, reason: string) =>
  request(`/api/notary/notaries/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason }) });
export const reinstateNotary = (id: string) =>
  request(`/api/notary/notaries/${id}/reinstate`, { method: 'POST' });

/* ─── Customer Management ─────────────────────────────── */
export const getCustomers = (type?: string) =>
  request(`/api/sessions/customers${type ? `?type=${type}` : ''}`);
export const getApiPartners = () => request('/api/gateway/partners');
export const getPartnerById = (id: string) => request(`/api/gateway/partners/${id}`);
export const suspendPartner = (id: string) =>
  request(`/api/gateway/partners/${id}/suspend`, { method: 'POST' });

/* ─── Pricing ─────────────────────────────────────────── */
export const getPricingConfig = () => request('/api/payments/pricing');
export const updatePricing = (key: string, valueCents: number, reason: string) =>
  request(`/api/payments/pricing/${key}`, { method: 'PUT', body: JSON.stringify({ valueCents, reason }) });
export const getPricingHistory = (key?: string) =>
  request(`/api/payments/pricing/history${key ? `?key=${key}` : ''}`);

/* ─── Compliance ──────────────────────────────────────── */
export const getJournalChainStatuses = () => request('/api/journal/chain-status');
export const verifyJournalChain = (notaryId: string) =>
  request(`/api/journal/verify/${notaryId}`, { method: 'POST' });
export const getSessionAnomalies = () => request('/api/compliance/anomalies');
export const exportAuditPacket = (sessionId: string) =>
  request(`/api/audit/nc-sos/${sessionId}`);
export const exportSubpoenaPacket = (sessionId: string, caseNumber: string) =>
  request(`/api/audit/subpoena/${sessionId}`, { method: 'POST', body: JSON.stringify({ caseNumber }) });

/* ─── Financial ───────────────────────────────────────── */
export const getRevenueMetrics = (period?: string) =>
  request(`/api/payments/revenue${period ? `?period=${period}` : ''}`);
export const getDailyRevenue = (from: string, to: string) =>
  request(`/api/payments/daily?from=${from}&to=${to}`);
export const getRefunds = () => request('/api/payments/refunds');
export const processRefund = (transactionId: string, reason: string) =>
  request(`/api/payments/${transactionId}/refund`, { method: 'POST', body: JSON.stringify({ reason }) });

/* ─── Analytics ───────────────────────────────────────── */
export const getSessionVolume = (from: string, to: string) =>
  request(`/api/sessions/analytics/volume?from=${from}&to=${to}`);
export const getNotaryUtilization = () => request('/api/roster/analytics/utilization');
export const getConversionFunnel = () => request('/api/sessions/analytics/funnel');

/* ─── Tenant (White-Label) ────────────────────────────── */
export const getTenants = () => request('/api/tenant/tenants');
export const getTenantById = (id: string) => request(`/api/tenant/tenants/${id}`);
export const createTenant = (data: Record<string, unknown>) =>
  request('/api/tenant/tenants', { method: 'POST', body: JSON.stringify(data) });
export const updateTenant = (id: string, data: Record<string, unknown>) =>
  request(`/api/tenant/tenants/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const suspendTenant = (id: string) =>
  request(`/api/tenant/tenants/${id}/suspend`, { method: 'POST' });
export const activateTenant = (id: string) =>
  request(`/api/tenant/tenants/${id}/activate`, { method: 'POST' });

/* ─── Audit Log ───────────────────────────────────────── */
export const getAuditLog = (filters?: Record<string, string>) => {
  const params = filters ? '?' + new URLSearchParams(filters).toString() : '';
  return request(`/api/audit/log${params}`);
};
