-- ============================================================================
-- SealProof — White-Label / Multi-Tenant Migration
-- Adds tenant configuration for white-label deployments
-- ============================================================================
-- SealProof is the default tenant. Other companies can run the platform
-- under their own brand, domain, logo, and color scheme.
-- Every customer-facing surface reads from tenant config instead of
-- hardcoded brand values.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. tenants — Each white-label partner gets a tenant record
-- ---------------------------------------------------------------------------
CREATE TABLE tenants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            VARCHAR(64)  NOT NULL UNIQUE,           -- url-safe identifier e.g. "sealproof", "acme-notary"
  company_name    VARCHAR(255) NOT NULL,                   -- display name e.g. "SealProof"
  domain          VARCHAR(255) NOT NULL UNIQUE,            -- primary domain e.g. "sealproof.ai"
  
  -- Branding
  logo_url        TEXT,                                    -- full URL to logo image
  favicon_url     TEXT,                                    -- full URL to favicon
  primary_color   VARCHAR(7)   DEFAULT '#1a1a2e',         -- hex color for buttons, headers
  secondary_color VARCHAR(7)   DEFAULT '#16213e',         -- hex color for accents
  accent_color    VARCHAR(7)   DEFAULT '#0f3460',         -- hex color for highlights
  
  -- Contact & Legal
  support_email   VARCHAR(255),                            -- e.g. support@sealproof.ai
  support_phone   VARCHAR(32),
  legal_entity    VARCHAR(255),                            -- e.g. "SealProof LLC"
  terms_url       TEXT,                                    -- link to terms of service
  privacy_url     TEXT,                                    -- link to privacy policy
  
  -- Subdomains (null = use main domain with path routing)
  notary_domain   VARCHAR(255),                            -- e.g. notary.sealproof.ai
  admin_domain    VARCHAR(255),                            -- e.g. admin.sealproof.ai
  api_domain      VARCHAR(255),                            -- e.g. api.sealproof.ai
  
  -- Email Branding
  email_from_name VARCHAR(255) DEFAULT 'SealProof',
  email_from_addr VARCHAR(255),                            -- noreply@sealproof.ai
  email_header_logo TEXT,                                  -- logo for email templates
  
  -- Pricing overrides (null = use platform defaults)
  b2c_standard_price_cents  INTEGER,                       -- default 2500 ($25)
  b2c_rush_price_cents      INTEGER,                       -- default 4500 ($45)
  notary_payout_cents       INTEGER,                       -- per-session payout
  
  -- Feature flags
  enable_b2c       BOOLEAN DEFAULT TRUE,
  enable_b2b       BOOLEAN DEFAULT TRUE,
  enable_api       BOOLEAN DEFAULT TRUE,
  enable_rush      BOOLEAN DEFAULT TRUE,
  
  -- Status
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','suspended','onboarding')),
  
  -- Metadata
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_domain ON tenants(domain);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ---------------------------------------------------------------------------
-- 2. tenant_api_config — Integration credentials per tenant
-- ---------------------------------------------------------------------------
CREATE TABLE tenant_api_config (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Each tenant can have their own integration keys
  -- Stored encrypted at rest (application-level KMS)
  clerk_secret_key_enc     TEXT,
  clerk_publishable_key    TEXT,
  sendgrid_api_key_enc     TEXT,
  twilio_sid_enc           TEXT,
  twilio_auth_token_enc    TEXT,
  twilio_phone             VARCHAR(32),
  stripe_key_enc           TEXT,       -- if tenant uses Stripe instead of TRG Pay
  
  -- Persona KYC (tenant may use platform default or own account)
  persona_api_key_enc      TEXT,
  persona_template_id      VARCHAR(128),
  
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_tenant_api_config UNIQUE(tenant_id)
);

-- ---------------------------------------------------------------------------
-- 3. tenant_domains — Additional custom domains per tenant
-- ---------------------------------------------------------------------------
CREATE TABLE tenant_domains (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  domain          VARCHAR(255) NOT NULL UNIQUE,
  domain_type     VARCHAR(20) NOT NULL CHECK (domain_type IN ('customer','notary','admin','api')),
  ssl_provisioned BOOLEAN DEFAULT FALSE,
  verified        BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenant_domains_domain ON tenant_domains(domain);

-- ---------------------------------------------------------------------------
-- 4. Add tenant_id to existing tables
-- ---------------------------------------------------------------------------

-- Users belong to a tenant
ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id);
CREATE INDEX idx_users_tenant ON users(tenant_id);

-- Notaries can serve multiple tenants, but primary tenant is tracked
ALTER TABLE notaries ADD COLUMN tenant_id UUID REFERENCES tenants(id);
CREATE INDEX idx_notaries_tenant ON notaries(tenant_id);

-- Sessions always belong to one tenant
ALTER TABLE notarization_sessions ADD COLUMN tenant_id UUID REFERENCES tenants(id);
CREATE INDEX idx_sessions_tenant ON notarization_sessions(tenant_id);

-- Customers scoped to tenant
ALTER TABLE customers ADD COLUMN tenant_id UUID REFERENCES tenants(id);
CREATE INDEX idx_customers_tenant ON customers(tenant_id);

-- API partners scoped to tenant
ALTER TABLE api_partners ADD COLUMN tenant_id UUID REFERENCES tenants(id);
CREATE INDEX idx_api_partners_tenant ON api_partners(tenant_id);

-- Subscriptions scoped to tenant
ALTER TABLE subscriptions ADD COLUMN tenant_id UUID REFERENCES tenants(id);
CREATE INDEX idx_subscriptions_tenant ON subscriptions(tenant_id);

-- Payment transactions scoped to tenant
ALTER TABLE payment_transactions ADD COLUMN tenant_id UUID REFERENCES tenants(id);
CREATE INDEX idx_payment_transactions_tenant ON payment_transactions(tenant_id);

-- ---------------------------------------------------------------------------
-- 5. Seed SealProof as the default tenant
-- ---------------------------------------------------------------------------
INSERT INTO tenants (
  slug, company_name, domain,
  support_email, legal_entity,
  notary_domain, admin_domain, api_domain,
  email_from_name, email_from_addr,
  primary_color, secondary_color, accent_color,
  b2c_standard_price_cents, b2c_rush_price_cents,
  status
) VALUES (
  'sealproof', 'SealProof', 'sealproof.ai',
  'support@sealproof.ai', 'SealProof LLC',
  'notary.sealproof.ai', 'admin.sealproof.ai', 'api.sealproof.ai',
  'SealProof', 'noreply@sealproof.ai',
  '#1a1a2e', '#16213e', '#0f3460',
  2500, 4500,
  'active'
);

-- Set existing records to the SealProof tenant
-- (Run after seed; uses subquery since UUID is generated)
UPDATE users SET tenant_id = (SELECT id FROM tenants WHERE slug = 'sealproof') WHERE tenant_id IS NULL;
UPDATE notaries SET tenant_id = (SELECT id FROM tenants WHERE slug = 'sealproof') WHERE tenant_id IS NULL;
UPDATE notarization_sessions SET tenant_id = (SELECT id FROM tenants WHERE slug = 'sealproof') WHERE tenant_id IS NULL;
UPDATE customers SET tenant_id = (SELECT id FROM tenants WHERE slug = 'sealproof') WHERE tenant_id IS NULL;
UPDATE api_partners SET tenant_id = (SELECT id FROM tenants WHERE slug = 'sealproof') WHERE tenant_id IS NULL;

COMMIT;
