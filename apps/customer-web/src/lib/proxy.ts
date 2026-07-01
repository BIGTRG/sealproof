/**
 * SealProof API Proxy — routes frontend requests to backend microservices.
 * Keeps backend ports unexposed; handles auth token forwarding.
 */

const SERVICE_MAP: Record<string, string> = {
  sessions:    process.env.SESSION_ORCHESTRATOR_URL || 'http://localhost:4003',
  kyc:         process.env.KYC_SVC_URL             || 'http://localhost:4004',
  livekit:     process.env.LIVEKIT_BRIDGE_URL       || 'http://localhost:4005',
  esign:       process.env.ESIGN_BRIDGE_URL         || 'http://localhost:4006',
  kba:         process.env.KBA_SVC_URL              || 'http://localhost:4017',
  payments:    process.env.PAYMENT_SVC_URL           || 'http://localhost:4010',
  journal:     process.env.JOURNAL_SVC_URL           || 'http://localhost:4007',
  recording:   process.env.RECORDING_SVC_URL         || 'http://localhost:4008',
  seal:        process.env.SEAL_SVC_URL              || 'http://localhost:4009',
  notary:      process.env.NOTARY_COMMISSION_URL     || 'http://localhost:4001',
  roster:      process.env.NOTARY_ROSTER_URL         || 'http://localhost:4002',
  notification:process.env.NOTIFICATION_SVC_URL      || 'http://localhost:4011',
  audit:       process.env.AUDIT_EXPORT_URL          || 'http://localhost:4012',
  gateway:     process.env.API_GATEWAY_URL           || 'http://localhost:4013',
  webhook:     process.env.WEBHOOK_SVC_URL           || 'http://localhost:4014',
  tenant:      process.env.TENANT_SVC_URL            || 'http://localhost:4015',
  compliance:  process.env.STATE_COMPLIANCE_URL      || 'http://localhost:4016',
};

export function getServiceUrl(service: string): string {
  return SERVICE_MAP[service] || SERVICE_MAP.sessions;
}

export async function proxyRequest(
  service: string,
  path: string,
  request: Request,
): Promise<Response> {
  const baseUrl = getServiceUrl(service);
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Forward auth and tenant headers
  const authHeader = request.headers.get('Authorization');
  if (authHeader) headers['Authorization'] = authHeader;

  const tenantHeader = request.headers.get('X-Tenant-ID');
  if (tenantHeader) headers['X-Tenant-ID'] = tenantHeader;

  const requestId = request.headers.get('X-Request-ID');
  if (requestId) headers['X-Request-ID'] = requestId;

  try {
    const body = ['GET', 'HEAD'].includes(request.method)
      ? undefined
      : await request.text();

    const res = await fetch(url, {
      method: request.method,
      headers,
      body,
    });

    const data = await res.text();

    return new Response(data, {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') || 'application/json' },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Service unavailable', detail: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
