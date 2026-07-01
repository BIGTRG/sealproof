-- ============================================================================
-- SealProof — Initial Schema Migration
-- Sprint 1 / Stage 1: Core platform foundation
-- ============================================================================
-- All tables per §4 of the Master Build Prompt.
-- Invariants:
--   - No UPDATE/DELETE on notary_journal_entries or audit_log
--   - Forward-only session status transitions (enforced by trigger)
--   - Every state change emits audit_log entry (application-level)
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Extension: uuid-ossp for UUID generation
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1. users  (Clerk-managed auth; we store minimal reference data)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_id        TEXT UNIQUE NOT NULL,
  email           TEXT NOT NULL,
  full_name       TEXT NOT NULL,
  role            TEXT NOT NULL DEFAULT 'customer',
  -- role: customer | notary | admin | api_partner
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_clerk ON users(clerk_id);
CREATE INDEX idx_users_role  ON users(role);

-- ---------------------------------------------------------------------------
-- 2. notaries  (supply side)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notaries (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                     UUID REFERENCES users(id) UNIQUE NOT NULL,
  full_legal_name             TEXT NOT NULL,
  display_name                TEXT NOT NULL,
  state                       CHAR(2) NOT NULL DEFAULT 'NC',
  commission_number           TEXT NOT NULL,
  commission_expires_at       DATE NOT NULL,
  electronic_notary_id        TEXT NOT NULL,
  ren_authorization_id        TEXT NOT NULL,
  surety_bond_provider        TEXT,
  surety_bond_number          TEXT,
  surety_bond_expires_at      DATE,
  eando_provider              TEXT,
  eando_policy_number         TEXT,
  eando_coverage_amount       INTEGER,
  eando_expires_at            DATE,
  digital_signature_cert      TEXT,
  digital_seal_image_url      TEXT,
  bio                         TEXT,
  languages                   TEXT[] DEFAULT ARRAY['en'],
  is_active                   BOOLEAN NOT NULL DEFAULT FALSE,
  status                      TEXT NOT NULL DEFAULT 'pending_credential_review',
  -- status: pending_credential_review | approved | suspended | offboarded
  hourly_retainer_cents       INTEGER,
  per_session_cents           INTEGER NOT NULL,
  created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notaries_active_state ON notaries(is_active, state);
CREATE INDEX idx_notaries_status       ON notaries(status);

-- ---------------------------------------------------------------------------
-- 3. notary_shifts  (when each notary is available)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notary_shifts (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notary_id           UUID REFERENCES notaries(id) NOT NULL,
  shift_start         TIMESTAMP NOT NULL,
  shift_end           TIMESTAMP NOT NULL,
  status              TEXT NOT NULL DEFAULT 'scheduled',
  -- scheduled | active | completed | cancelled | no_show
  checked_in_at       TIMESTAMP,
  checked_out_at      TIMESTAMP,
  sessions_handled    INTEGER DEFAULT 0,
  retainer_paid_cents INTEGER DEFAULT 0,
  bonus_earned_cents  INTEGER DEFAULT 0,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_shifts_active ON notary_shifts(shift_start, shift_end, status);
CREATE INDEX idx_shifts_notary ON notary_shifts(notary_id, shift_start);

-- ---------------------------------------------------------------------------
-- 4. api_partners  (B2B customers using the API)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS api_partners (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name               TEXT NOT NULL,
  ein                         TEXT,
  primary_contact_email       TEXT NOT NULL,
  primary_contact_name        TEXT NOT NULL,
  api_key_hash                TEXT NOT NULL,
  webhook_url                 TEXT,
  monthly_subscription_cents  INTEGER NOT NULL,
  per_session_cents           INTEGER NOT NULL,
  is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
  subscription_started_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at                  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_partners_active ON api_partners(is_active);

-- ---------------------------------------------------------------------------
-- 5. customers  (demand side)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID REFERENCES users(id) UNIQUE NOT NULL,
  full_legal_name TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  customer_type   TEXT NOT NULL,
  -- individual | business | api_partner
  business_name   TEXT,
  api_partner_id  UUID REFERENCES api_partners(id),
  created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 6. notarization_sessions  (the unit of work)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notarization_sessions (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id                 UUID REFERENCES customers(id) NOT NULL,
  notary_id                   UUID REFERENCES notaries(id),
  shift_id                    UUID REFERENCES notary_shifts(id),
  api_partner_id              UUID REFERENCES api_partners(id),

  document_type               TEXT NOT NULL,
  -- deed | poa | will | trust | affidavit | mortgage | other
  document_count              INTEGER NOT NULL DEFAULT 1,
  signer_count                INTEGER NOT NULL DEFAULT 1,
  state_of_act                CHAR(2) NOT NULL DEFAULT 'NC',

  -- Status flow
  status                      TEXT NOT NULL DEFAULT 'created',
  -- created | kyc_pending | kyc_complete | queued | matched_to_notary
  -- | in_session | completed | rejected | failed

  -- Timestamps for each transition
  created_at                  TIMESTAMP NOT NULL DEFAULT NOW(),
  kyc_started_at              TIMESTAMP,
  kyc_completed_at            TIMESTAMP,
  queued_at                   TIMESTAMP,
  matched_to_notary_at        TIMESTAMP,
  session_started_at          TIMESTAMP,
  session_ended_at            TIMESTAMP,
  completed_at                TIMESTAMP,

  -- Identity verification
  kyc_provider                TEXT,
  kyc_session_id              TEXT,
  kyc_result                  TEXT,
  kyc_failure_reason          TEXT,

  -- Session metadata
  livekit_room_id             TEXT,
  recording_url               TEXT,
  recording_encryption_key_id TEXT,
  session_duration_seconds    INTEGER,

  -- Financial
  customer_paid_cents         INTEGER,
  notary_payout_cents         INTEGER,
  platform_revenue_cents      INTEGER,
  payment_transaction_id      TEXT,

  -- Compliance
  ron_session_type            TEXT NOT NULL DEFAULT 'standard',
  -- standard | rush
  rejected_reason             TEXT,

  updated_at                  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_status   ON notarization_sessions(status);
CREATE INDEX idx_sessions_customer ON notarization_sessions(customer_id, created_at DESC);
CREATE INDEX idx_sessions_notary   ON notarization_sessions(notary_id, session_started_at DESC);
CREATE INDEX idx_sessions_partner  ON notarization_sessions(api_partner_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 7. session_documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_documents (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id      UUID REFERENCES notarization_sessions(id) ON DELETE CASCADE NOT NULL,
  document_name   TEXT NOT NULL,
  document_type   TEXT NOT NULL,
  upload_url      TEXT NOT NULL,
  signed_url      TEXT,
  notarized_url   TEXT,
  tsa_timestamp   TIMESTAMP,
  tsa_signature   TEXT,
  page_count      INTEGER NOT NULL,
  signer_ids      UUID[] NOT NULL,
  status          TEXT NOT NULL DEFAULT 'uploaded',
  -- uploaded | signed | notarized | sealed | delivered
  created_at      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_docs_session ON session_documents(session_id);

-- ---------------------------------------------------------------------------
-- 8. session_signers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS session_signers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id          UUID REFERENCES notarization_sessions(id) ON DELETE CASCADE NOT NULL,
  full_legal_name     TEXT NOT NULL,
  email               TEXT NOT NULL,
  phone               TEXT,
  signer_role         TEXT NOT NULL,
  -- primary | co_signer | witness

  -- KYC per signer
  kyc_session_id      TEXT,
  kyc_result          TEXT,
  id_type             TEXT,
  id_number_hash      TEXT,
  id_state            TEXT,
  id_country          TEXT DEFAULT 'US',

  -- Signature capture
  signature_image_url TEXT,
  signature_metadata  JSONB,
  signed_at           TIMESTAMP,

  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_signers_session ON session_signers(session_id);

-- ---------------------------------------------------------------------------
-- 9. notary_journal_entries  (LEGALLY MANDATED — IMMUTABLE)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notary_journal_entries (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notary_id               UUID REFERENCES notaries(id) NOT NULL,
  session_id              UUID REFERENCES notarization_sessions(id) NOT NULL,
  entry_sequence_number   INTEGER NOT NULL,
  entry_timestamp         TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Required NC RON journal fields per NCGS 10B-118
  signer_name             TEXT NOT NULL,
  signer_address          TEXT NOT NULL,
  document_description    TEXT NOT NULL,
  document_date           DATE NOT NULL,
  notarial_act_type       TEXT NOT NULL,
  -- acknowledgment | jurat | verification_of_proof | other
  fee_charged_cents       INTEGER NOT NULL,
  id_verification_method  TEXT NOT NULL,
  -- knowledge | credible_witness | identity_proofing

  -- Tamper detection (hash chain)
  prev_entry_hash         TEXT,
  entry_hash              TEXT NOT NULL,

  -- Metadata
  recording_reference     TEXT,

  created_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_journal_seq     ON notary_journal_entries(notary_id, entry_sequence_number);
CREATE INDEX        idx_journal_session ON notary_journal_entries(session_id);

-- ---------------------------------------------------------------------------
-- 10. audit_log  (every meaningful event — IMMUTABLE)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type    TEXT NOT NULL,
  actor_type    TEXT NOT NULL,
  -- customer | notary | admin | system | api_partner
  actor_id      UUID,
  session_id    UUID REFERENCES notarization_sessions(id),
  notary_id     UUID REFERENCES notaries(id),
  customer_id   UUID REFERENCES customers(id),
  payload       JSONB NOT NULL,
  ip_address    INET,
  user_agent    TEXT,
  occurred_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_session ON audit_log(session_id, occurred_at);
CREATE INDEX idx_audit_actor   ON audit_log(actor_type, actor_id, occurred_at);
CREATE INDEX idx_audit_event   ON audit_log(event_type, occurred_at);

-- ---------------------------------------------------------------------------
-- 11. subscriptions  (B2B partners + business customers)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS subscriptions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_type          TEXT NOT NULL,
  -- api_partner | customer_business
  subject_id            UUID NOT NULL,
  tier                  TEXT NOT NULL,
  mrr_cents             INTEGER NOT NULL,
  per_session_cents     INTEGER NOT NULL,
  monthly_session_quota INTEGER,
  started_at            TIMESTAMP NOT NULL,
  ends_at               TIMESTAMP,
  status                TEXT NOT NULL DEFAULT 'active',
  payment_method_id     TEXT,
  created_at            TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- 12. pricing_config  (admin-controlled)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pricing_config (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key                 TEXT UNIQUE NOT NULL,
  value_cents         INTEGER,
  value_text          TEXT,
  effective_from      TIMESTAMP NOT NULL DEFAULT NOW(),
  effective_until     TIMESTAMP,
  changed_by_admin_id UUID REFERENCES users(id),
  notes               TEXT,
  created_at          TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TRIGGERS: Forward-only session status transitions
-- ============================================================================
CREATE OR REPLACE FUNCTION enforce_session_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions JSONB := '{
    "created":            ["kyc_pending", "rejected", "failed"],
    "kyc_pending":        ["kyc_complete", "rejected", "failed"],
    "kyc_complete":       ["queued", "rejected", "failed"],
    "queued":             ["matched_to_notary", "rejected", "failed"],
    "matched_to_notary":  ["in_session", "rejected", "failed"],
    "in_session":         ["completed", "rejected", "failed"]
  }'::JSONB;
  allowed JSONB;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Terminal states: no transitions out
  IF OLD.status IN ('completed', 'rejected', 'failed') THEN
    RAISE EXCEPTION 'Cannot transition from terminal status: %', OLD.status;
  END IF;

  allowed := valid_transitions -> OLD.status;
  IF allowed IS NULL OR NOT (allowed ? NEW.status) THEN
    RAISE EXCEPTION 'Invalid session status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_session_status_transition
  BEFORE UPDATE OF status ON notarization_sessions
  FOR EACH ROW
  EXECUTE FUNCTION enforce_session_status_transition();

-- ============================================================================
-- TRIGGERS: Immutability guards on journal + audit tables
-- ============================================================================
CREATE OR REPLACE FUNCTION prevent_update_or_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'UPDATE and DELETE are not permitted on %', TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_journal_immutable_update
  BEFORE UPDATE ON notary_journal_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();

CREATE TRIGGER trg_journal_immutable_delete
  BEFORE DELETE ON notary_journal_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();

CREATE TRIGGER trg_audit_immutable_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();

CREATE TRIGGER trg_audit_immutable_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_update_or_delete();

-- ============================================================================
-- SEED: Default pricing configuration
-- ============================================================================
INSERT INTO pricing_config (key, value_cents, value_text, notes) VALUES
  ('b2c_standard_price', 2500, NULL, 'B2C standard session price ($25.00)'),
  ('b2c_rush_price', 4500, NULL, 'B2C rush session price ($45.00)'),
  ('b2b_title_standard', 1800, NULL, 'B2B title company standard ($18.00)'),
  ('b2b_title_rush', 3500, NULL, 'B2B title company rush ($35.00)'),
  ('b2b_law_standard', 2000, NULL, 'B2B law firm standard ($20.00)'),
  ('b2b_law_rush', 3800, NULL, 'B2B law firm rush ($38.00)'),
  ('api_high_vol_standard', 1500, NULL, 'API high-volume standard ($15.00)'),
  ('api_high_vol_rush', 3000, NULL, 'API high-volume rush ($30.00)'),
  ('legal_platform_standard', 1200, NULL, 'Legal Platform LLC internal ($12.00)'),
  ('legal_platform_rush', 2500, NULL, 'Legal Platform LLC internal rush ($25.00)'),
  ('notary_payout_default', 800, NULL, 'Default notary payout per session ($8.00)'),
  ('notary_payout_b2b', 1000, NULL, 'B2B notary payout per session ($10.00)'),
  ('notary_payout_api', 1200, NULL, 'API partner notary payout ($12.00)')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- Migration tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS _migrations (
  id          SERIAL PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,
  applied_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO _migrations (name) VALUES ('001_initial_schema')
ON CONFLICT (name) DO NOTHING;

COMMIT;
