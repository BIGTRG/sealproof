-- 004_payments_api_webhooks.sql
-- Tables for payment-svc, api-gateway-svc, webhook-svc (Stages 4-6)

-- Payment transactions
CREATE TABLE IF NOT EXISTS payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES notarization_sessions(id),
  customer_id UUID,
  notary_id UUID,
  type TEXT NOT NULL CHECK (type IN ('authorization', 'capture', 'refund', 'payout')),
  status TEXT NOT NULL DEFAULT 'pending',
  amount_cents INTEGER NOT NULL DEFAULT 0,
  external_id TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_txn_session ON payment_transactions (session_id);
CREATE INDEX IF NOT EXISTS idx_payment_txn_external ON payment_transactions (external_id);

-- API usage tracking
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID REFERENCES api_partners(id),
  endpoint TEXT NOT NULL,
  session_id UUID,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_partner ON api_usage (partner_id, created_at);

-- Webhook deliveries
CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id TEXT NOT NULL,
  callback_url TEXT NOT NULL,
  event TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempt INTEGER NOT NULL DEFAULT 1,
  response_code INTEGER,
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_id ON webhook_deliveries (webhook_id);

-- Add columns to sessions for API + recording support
ALTER TABLE notarization_sessions ADD COLUMN IF NOT EXISTS api_partner_id UUID REFERENCES api_partners(id);
ALTER TABLE notarization_sessions ADD COLUMN IF NOT EXISTS api_callback_url TEXT;
ALTER TABLE notarization_sessions ADD COLUMN IF NOT EXISTS recording_url TEXT;
ALTER TABLE notarization_sessions ADD COLUMN IF NOT EXISTS recording_encryption_key_id TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_api_partner ON notarization_sessions (api_partner_id) WHERE api_partner_id IS NOT NULL;

-- Add updated_at to subscriptions if missing
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS amount_cents INTEGER;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS external_subscription_id TEXT;

-- Track migration
INSERT INTO _migrations (name) VALUES ('004_payments_api_webhooks')
ON CONFLICT (name) DO NOTHING;
