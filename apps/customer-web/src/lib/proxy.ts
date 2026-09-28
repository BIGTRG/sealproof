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

  const headers: Record<string, string> = {};

  // Preserve the caller's content type (JSON, multipart uploads, ...)
  const contentType = request.headers.get('Content-Type');
  if (contentType) headers['Content-Type'] = contentType;

  // Forward auth and tenant headers
  const authHeader = request.headers.get('Authorization');
  if (authHeader) headers['Authorization'] = authHeader;

  const tenantHeader = request.headers.get('X-Tenant-ID');
  if (tenantHeader) headers['X-Tenant-ID'] = tenantHeader;

  const requestId = request.headers.get('X-Request-ID');
  if (requestId) headers['X-Request-ID'] = requestId;

  const forwardedFor = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip');
  if (forwardedFor) headers['X-Forwarded-For'] = forwardedFor;
  const ua = request.headers.get('user-agent');
  if (ua) headers['User-Agent'] = ua;

  try {
    // Binary-safe body passthrough (multipart uploads must not be re-encoded as text)
    const body = ['GET', 'HEAD'].includes(request.method)
      ? undefined
      : Buffer.from(await request.arrayBuffer());

    const res = await fetch(url, {
      method: request.method,
      headers,
      body,
      // @ts-ignore - Node fetch needs duplex for streamed bodies
      duplex: 'half',
    });

    const outHeaders: Record<string, string> = {
      'Content-Type': res.headers.get('Content-Type') || 'application/json',
    };
    const disposition = res.headers.get('Content-Disposition');
    if (disposition) outHeaders['Content-Disposition'] = disposition;
    const length = res.headers.get('Content-Length');
    if (length) outHeaders['Content-Length'] = length;

    // Stream the upstream response (PDF downloads, large JSON) without buffering to text
    return new Response(res.body, { status: res.status, headers: outHeaders });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Service unavailable', detail: err.message }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
