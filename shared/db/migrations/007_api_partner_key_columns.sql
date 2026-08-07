-- 007: Compat columns for gateway key management + HMAC auth (code expected
-- api_key/api_secret/status/partner_name which 001 never created).
ALTER TABLE api_partners ADD COLUMN IF NOT EXISTS partner_name TEXT;
ALTER TABLE api_partners ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE api_partners ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;
ALTER TABLE api_partners ADD COLUMN IF NOT EXISTS api_secret TEXT;
ALTER TABLE api_partners ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'starter';
ALTER TABLE api_partners ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE api_partners ALTER COLUMN business_name SET DEFAULT '';
ALTER TABLE api_partners ALTER COLUMN primary_contact_email SET DEFAULT '';
ALTER TABLE api_partners ALTER COLUMN primary_contact_name SET DEFAULT '';
ALTER TABLE api_partners ALTER COLUMN api_key_hash SET DEFAULT '';
ALTER TABLE api_partners ALTER COLUMN monthly_subscription_cents SET DEFAULT 0;
ALTER TABLE api_partners ALTER COLUMN per_session_cents SET DEFAULT 0;
