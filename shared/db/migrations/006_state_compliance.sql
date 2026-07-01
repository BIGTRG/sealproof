-- ============================================================================
-- SealProof — Multi-State Compliance Engine (Phases 1-4)
-- Adds state RON rules, KBA tracking, multi-state commission support,
-- and dynamic seal/document configuration.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. state_ron_rules — Per-state RON compliance configuration
-- ---------------------------------------------------------------------------
CREATE TABLE state_ron_rules (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_code                  CHAR(2)      NOT NULL UNIQUE,   -- 'NC', 'VA', 'TX', etc.
  state_name                  VARCHAR(64)  NOT NULL,

  -- Authorization status
  ron_authorized              BOOLEAN      NOT NULL DEFAULT false,
  authorization_type          VARCHAR(32)  NOT NULL DEFAULT 'none',  -- 'comprehensive', 'basic_rulemaking', 'limited', 'none', 'pending'
  effective_date              DATE,
  governing_statute           VARCHAR(255),                    -- e.g. 'NCGS Chapter 10B'

  -- Identity proofing requirements
  kba_required                BOOLEAN      NOT NULL DEFAULT true,
  credential_analysis_required BOOLEAN     NOT NULL DEFAULT true,
  personal_knowledge_allowed  BOOLEAN      NOT NULL DEFAULT true,
  credible_witness_allowed    BOOLEAN      NOT NULL DEFAULT true,
  kba_min_questions           INT          DEFAULT 5,
  kba_min_correct             INT          DEFAULT 4,

  -- Journal requirements
  journal_retention_years     INT          NOT NULL DEFAULT 5,
  journal_fields_required     JSONB        DEFAULT '["signer_name","document_description","notarial_act_type","date_time","id_verification_method","fee_charged"]'::jsonb,

  -- Recording requirements
  recording_required          BOOLEAN      NOT NULL DEFAULT true,
  recording_retention_years   INT          NOT NULL DEFAULT 5,
  recording_must_include_kba  BOOLEAN      DEFAULT false,     -- some states require KBA in recording

  -- Seal requirements
  seal_fields_required        JSONB        DEFAULT '["notary_name","commission_number","commission_expiry","state","notarial_act_type","date_time"]'::jsonb,
  seal_state_label            VARCHAR(128) DEFAULT 'REMOTE ELECTRONIC NOTARY PUBLIC',
  seal_state_header           VARCHAR(128),                    -- e.g. 'STATE OF NORTH CAROLINA', 'COMMONWEALTH OF VIRGINIA'
  seal_statute_reference      VARCHAR(128),                    -- e.g. 'NCGS 10B-72', 'VA Code § 47.1-2'

  -- Fee limits
  max_notary_fee_cents        INT,                             -- null = no statutory cap
  max_travel_fee_cents        INT,                             -- for hybrid in-person/remote

  -- Document type restrictions
  restricted_doc_types        JSONB        DEFAULT '[]'::jsonb,  -- e.g. ["will", "healthcare_directive"]
  allowed_doc_types           JSONB,                           -- null = all allowed (except restricted)
  doc_type_notes              TEXT,                            -- explanation of restrictions

  -- Technology provider rules
  platform_approval_required  BOOLEAN      NOT NULL DEFAULT false,
  platform_approval_status    VARCHAR(32)  DEFAULT 'not_required',  -- 'approved', 'pending', 'not_applied', 'not_required', 'denied'
  platform_approval_date      DATE,
  platform_renewal_date       DATE,
  approval_authority          VARCHAR(255),                    -- e.g. 'NC Secretary of State'
  approval_authority_url      TEXT,
  approval_application_url    TEXT,

  -- Notary location rules
  notary_must_be_in_state     BOOLEAN      NOT NULL DEFAULT true,
  signer_location_restriction VARCHAR(64)  DEFAULT 'us_only',  -- 'any', 'us_only', 'us_and_military', 'in_state_only'
  signer_location_notes       TEXT,

  -- Cross-state recognition
  accepts_out_of_state_ron    BOOLEAN      DEFAULT true,
  recognition_notes           TEXT,

  -- Additional notes
  special_requirements        TEXT,
  last_reviewed_at            TIMESTAMPTZ,

  created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_state_ron_rules_state ON state_ron_rules(state_code);
CREATE INDEX idx_state_ron_rules_authorized ON state_ron_rules(ron_authorized);

-- ---------------------------------------------------------------------------
-- 2. kba_sessions — Knowledge-Based Authentication tracking
-- ---------------------------------------------------------------------------
CREATE TABLE kba_sessions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id          UUID         NOT NULL REFERENCES notarization_sessions(id),
  signer_id           UUID         NOT NULL REFERENCES session_signers(id),
  provider            VARCHAR(32)  NOT NULL DEFAULT 'idology',  -- 'idology', 'lexisnexis'
  provider_session_id VARCHAR(255),

  -- KBA questions and answers
  questions_presented INT          DEFAULT 5,
  questions_correct   INT,
  questions_required  INT          DEFAULT 4,

  -- Result
  status              VARCHAR(32)  NOT NULL DEFAULT 'pending',  -- 'pending', 'passed', 'failed', 'expired', 'error'
  started_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ,
  expires_at          TIMESTAMPTZ,          -- KBA results typically expire in 24h
  failure_reason      TEXT,
  attempt_number      INT          DEFAULT 1,
  max_attempts        INT          DEFAULT 2,

  -- Audit
  raw_response        JSONB,               -- encrypted provider response for audit trail

  created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kba_sessions_session ON kba_sessions(session_id);
CREATE INDEX idx_kba_sessions_signer ON kba_sessions(signer_id);
CREATE INDEX idx_kba_sessions_status ON kba_sessions(status);

-- ---------------------------------------------------------------------------
-- 3. Extend notaries table for multi-state commission support
-- ---------------------------------------------------------------------------
-- The existing 'state' column holds the primary state. Add a dedicated
-- commission tracking table for notaries holding commissions in multiple states.
CREATE TABLE notary_commissions (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notary_id               UUID         NOT NULL REFERENCES notaries(id) ON DELETE CASCADE,
  state_code              CHAR(2)      NOT NULL,
  commission_number       VARCHAR(64)  NOT NULL,
  commission_type         VARCHAR(32)  DEFAULT 'remote_online',  -- 'traditional', 'electronic', 'remote_online'
  commission_issued_at    DATE,
  commission_expires_at   DATE         NOT NULL,
  electronic_notary_id    VARCHAR(64),
  ren_authorization_id    VARCHAR(64),

  -- Bond & insurance (state-specific)
  surety_bond_provider    VARCHAR(255),
  surety_bond_number      VARCHAR(64),
  surety_bond_amount_cents INT,
  surety_bond_expires_at  DATE,
  eando_provider          VARCHAR(255),
  eando_policy_number     VARCHAR(64),
  eando_coverage_cents    INT,
  eando_expires_at        DATE,

  -- Status
  status                  VARCHAR(32)  NOT NULL DEFAULT 'pending_review',
  is_active               BOOLEAN      DEFAULT false,
  verified_at             TIMESTAMPTZ,
  verified_by             UUID,

  -- Documents
  commission_cert_url     TEXT,
  bond_cert_url           TEXT,
  eando_cert_url          TEXT,

  created_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  UNIQUE(notary_id, state_code, commission_number)
);

CREATE INDEX idx_notary_commissions_notary ON notary_commissions(notary_id);
CREATE INDEX idx_notary_commissions_state ON notary_commissions(state_code);
CREATE INDEX idx_notary_commissions_status ON notary_commissions(status);
CREATE INDEX idx_notary_commissions_expiry ON notary_commissions(commission_expires_at);

-- ---------------------------------------------------------------------------
-- 4. Extend notarization_sessions for multi-state tracking
-- ---------------------------------------------------------------------------
ALTER TABLE notarization_sessions
  ADD COLUMN IF NOT EXISTS notary_state CHAR(2) DEFAULT 'NC',
  ADD COLUMN IF NOT EXISTS kba_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS kba_status VARCHAR(32),
  ADD COLUMN IF NOT EXISTS kba_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS governing_state_code CHAR(2),
  ADD COLUMN IF NOT EXISTS commission_id UUID;

-- ---------------------------------------------------------------------------
-- 5. Platform registration tracker
-- ---------------------------------------------------------------------------
CREATE TABLE platform_registrations (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_code            CHAR(2)      NOT NULL UNIQUE,
  status                VARCHAR(32)  NOT NULL DEFAULT 'not_applied',  -- 'not_required', 'not_applied', 'application_submitted', 'under_review', 'approved', 'denied', 'expired'
  applied_at            DATE,
  approved_at           DATE,
  expires_at            DATE,
  renewal_due_at        DATE,
  application_fee_cents INT,
  annual_fee_cents      INT,
  application_url       TEXT,
  authority_name        VARCHAR(255),
  authority_contact     TEXT,
  registration_number   VARCHAR(128),
  notes                 TEXT,
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMIT;
