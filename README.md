# SealProof

Remote Online Notarization (RON) SaaS platform. Connects customers needing notarized documents with NC-commissioned electronic notaries via secure audio/video sessions.

**Entity:** SealProof LLC (DE-formed, NC-qualified)
**Domain:** sealproof.ai
**Compliance:** NC General Statutes Chapter 10B, SOC 2 Type II readiness

---

## Architecture

```
sealproof.ai         → Customer Web App    (Next.js 14, port 3000)
notary.sealproof.ai  → Notary Portal       (Next.js 14, port 3001)
admin.sealproof.ai   → Admin Console       (Next.js 14, port 3002)
api.sealproof.ai     → Public API Gateway  (Express,    port 4013)

15 Backend Microservices (Express.js, ports 4001-4015)
PostgreSQL + Redis + PM2 + nginx + LiveKit + Socket.IO
```

### Backend Services

| Port | Service | Responsibility |
|------|---------|---------------|
| 4001 | notary-commission-svc | Notary onboarding, credentialing, commission verification |
| 4002 | notary-roster-svc | Shift scheduling, real-time presence, coverage |
| 4003 | session-orchestrator-svc | Session state machine, customer-notary matching, queuing |
| 4004 | kyc-svc | Persona KYC integration, identity verification |
| 4005 | livekit-bridge-svc | LiveKit room creation, tokens, recording control |
| 4006 | esign-bridge-svc | TRG e-Sign API integration for signature capture |
| 4007 | journal-svc | Immutable notary journal, SHA-256 hash chain |
| 4008 | recording-svc | Session recording encryption + S3 storage |
| 4009 | seal-applicator-svc | Digital seal + RFC 3161 TSA timestamp |
| 4010 | payment-svc | TRG Pay integration, charges, payouts, subscriptions |
| 4011 | notification-svc | Twilio SMS + SendGrid email |
| 4012 | audit-export-svc | NC SoS audit packets, subpoena response |
| 4013 | api-gateway-svc | B2B API, HMAC auth, rate limiting |
| 4014 | webhook-svc | Outbound webhook delivery with retries |
| 4015 | tenant-svc | White-label multi-tenant management |

### Frontend Apps

| App | Path | Pages |
|-----|------|-------|
| Customer Web | `apps/customer-web/` | Landing, auth, dashboard, sessions, documents, settings, 9-step session wizard |
| Notary Portal | `apps/notary-web/` | Auth, dashboard, shifts, journal, earnings, settings, 5-step onboarding, active session |
| Admin Console | `apps/admin-web/` | Overview, live ops, notary management, customers, pricing, compliance, financials, analytics, tenants, settings |

---

## Quick Start (Development)

```bash
# 1. Clone and install
git clone <repo-url> sealproof
cd sealproof
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your credentials

# 3. Initialize database
chmod +x deploy/scripts/init-db.sh
./deploy/scripts/init-db.sh

# 4. Start all services (development)
pm2 start ecosystem.config.js

# 5. Start frontend apps
cd apps/customer-web && npm run dev &
cd apps/notary-web && npm run dev &
cd apps/admin-web && npm run dev &
```

---

## Production Deployment

### Prerequisites
- Node.js 25.x
- PostgreSQL 16+ with uuid-ossp and pgcrypto extensions
- Redis 7+
- PM2 (globally installed)
- nginx
- certbot (Let's Encrypt)

### Step-by-step

```bash
# 1. Point DNS records (see deploy/dns-records.md)

# 2. Set up SSL certificates
chmod +x deploy/scripts/setup-ssl.sh
sudo ./deploy/scripts/setup-ssl.sh

# 3. Initialize database
chmod +x deploy/scripts/init-db.sh
./deploy/scripts/init-db.sh

# 4. Deploy (builds + starts everything)
chmod +x deploy/scripts/deploy.sh
./deploy/scripts/deploy.sh
```

### Docker (alternative)

```bash
# Copy and configure .env
cp .env.example .env

# Build and start
docker-compose -f deploy/docker/docker-compose.yml up -d
```

### Monitoring

- Prometheus metrics: each service exposes `/metrics`
- Alert rules: `deploy/monitoring/prometheus-rules.yml`
- Grafana dashboard: `deploy/monitoring/grafana-dashboard.json`

---

## API Documentation

OpenAPI 3.1 spec: `docs/api/openapi.yaml`

Public API base URL: `https://api.sealproof.ai/v1`

Authentication: HMAC-SHA256 request signing (see OpenAPI spec for details).

---

## Testing

```bash
# Run all unit tests
npx jest

# Run with coverage
npx jest --coverage

# Run specific test file
npx jest tests/unit/hashChain.test.js
```

---

## Environment Variables

See `.env.example` for the complete list. Key variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `CLERK_SECRET_KEY` | Clerk authentication |
| `PERSONA_API_KEY` | KYC provider |
| `LIVEKIT_API_KEY` | Video infrastructure |
| `TRG_PAY_API_KEY` | Payment processing |
| `TRG_ESIGN_API_KEY` | E-signature service |
| `AWS_ACCESS_KEY_ID` | S3 + KMS for recordings |
| `TWILIO_AUTH_TOKEN` | SMS notifications |
| `SENDGRID_API_KEY` | Email notifications |

---

## Compliance

- **Statute:** NC General Statutes Chapter 10B (NCGS 10B-115 through 10B-194)
- **Journal:** SHA-256 hash-chained, immutable, 10-year retention
- **Recordings:** AES-256-GCM encrypted, S3 Object Lock (GOVERNANCE mode, 10 years)
- **Seals:** RFC 3161 TSA timestamps on all notarized documents
- **Audit:** Every state change logged to immutable audit_log table
- **DB Security:** UPDATE/DELETE revoked on journal and audit tables for app role
- **SOC 2 Type II:** Readiness from day one

---

## White-Label

SealProof supports white-label tenants. Each tenant gets:
- Custom branding (logo, colors, favicon, email templates)
- Custom domain with SSL
- Per-tenant pricing overrides
- Isolated data (tenant-scoped users, sessions, journals)
- Feature flags
- Separate integration credentials (Clerk, Twilio, SendGrid, Persona)

Manage tenants via the Admin Console or tenant-svc API (port 4015).

---

Prepared by Sainte Robinson
