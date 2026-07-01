-- =============================================================================
-- SealProof — Initial Seed Data
-- =============================================================================
-- Run after migrations. Seeds pricing config, default tenant, and system user.
-- =============================================================================

-- -------------------------------------------------------------------------
-- 1. Pricing Configuration (per master build prompt §14.3 + §6)
-- -------------------------------------------------------------------------
INSERT INTO pricing_config (id, key, value_cents, value_text, effective_from, notes)
VALUES
  -- B2C session pricing
  (gen_random_uuid(), 'b2c_standard_price', 2500, NULL, NOW(), 'B2C standard notarization session — $25'),
  (gen_random_uuid(), 'b2c_rush_price', 4500, NULL, NOW(), 'B2C rush notarization session — $45'),

  -- Notary payout rates
  (gen_random_uuid(), 'notary_payout_standard', 1200, NULL, NOW(), 'Notary payout per standard session — $12'),
  (gen_random_uuid(), 'notary_payout_rush', 2000, NULL, NOW(), 'Notary payout per rush session — $20'),

  -- B2B subscription tiers
  (gen_random_uuid(), 'b2b_starter_monthly', 49900, NULL, NOW(), 'B2B Starter tier — $499/mo, up to 50 sessions'),
  (gen_random_uuid(), 'b2b_starter_per_session', 2000, NULL, NOW(), 'B2B Starter per-session fee — $20'),
  (gen_random_uuid(), 'b2b_starter_quota', 50, NULL, NOW(), 'B2B Starter monthly session quota'),

  (gen_random_uuid(), 'b2b_growth_monthly', 149900, NULL, NOW(), 'B2B Growth tier — $1,499/mo, up to 200 sessions'),
  (gen_random_uuid(), 'b2b_growth_per_session', 1800, NULL, NOW(), 'B2B Growth per-session fee — $18'),
  (gen_random_uuid(), 'b2b_growth_quota', 200, NULL, NOW(), 'B2B Growth monthly session quota'),

  (gen_random_uuid(), 'b2b_scale_monthly', 499900, NULL, NOW(), 'B2B Scale tier — $4,999/mo, unlimited sessions'),
  (gen_random_uuid(), 'b2b_scale_per_session', 1500, NULL, NOW(), 'B2B Scale per-session fee — $15'),
  (gen_random_uuid(), 'b2b_scale_quota', NULL, 'unlimited', NOW(), 'B2B Scale monthly session quota'),

  -- Platform settings
  (gen_random_uuid(), 'platform_commission_pct', 40, NULL, NOW(), 'Platform commission percentage of session fee'),
  (gen_random_uuid(), 'rush_queue_priority_weight', 3, NULL, NOW(), 'Rush sessions get 3x priority in queue'),
  (gen_random_uuid(), 'max_concurrent_sessions_per_notary', 1, NULL, NOW(), 'Notaries handle one session at a time'),
  (gen_random_uuid(), 'session_timeout_minutes', 30, NULL, NOW(), 'Auto-cancel if session not started within 30 min of queue'),
  (gen_random_uuid(), 'recording_retention_years', 10, NULL, NOW(), 'Recording retention per NCGS Chapter 10B'),
  (gen_random_uuid(), 'journal_retention_years', 10, NULL, NOW(), 'Journal retention per NCGS 10B-118'),
  (gen_random_uuid(), 'kyc_document_purge_days', 90, NULL, NOW(), 'Purge KYC identity docs from active systems after 90 days')
ON CONFLICT (key) DO NOTHING;


-- -------------------------------------------------------------------------
-- 2. Default Tenant (SealProof — primary brand)
-- -------------------------------------------------------------------------
INSERT INTO tenants (id, name, slug, status, branding, legal_entity, created_at)
VALUES (
  gen_random_uuid(),
  'SealProof',
  'sealproof',
  'active',
  '{
    "primaryColor": "#052e16",
    "secondaryColor": "#16a34a",
    "logoUrl": null,
    "faviconUrl": null,
    "footerText": "SealProof -- Remote Online Notarization"
  }'::jsonb,
  'SealProof LLC',
  NOW()
)
ON CONFLICT DO NOTHING;

-- Default tenant domain
INSERT INTO tenant_domains (id, tenant_id, domain, is_primary, created_at)
SELECT
  gen_random_uuid(),
  t.id,
  'sealproof.ai',
  true,
  NOW()
FROM tenants t WHERE t.slug = 'sealproof'
ON CONFLICT DO NOTHING;


-- -------------------------------------------------------------------------
-- 3. System User (for automated actions in audit_log)
-- -------------------------------------------------------------------------
INSERT INTO users (id, clerk_id, email, full_name, role, created_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'system',
  'system@sealproof.ai',
  'SealProof System',
  'admin',
  NOW()
)
ON CONFLICT DO NOTHING;


-- -------------------------------------------------------------------------
-- 4. Initial Audit Log Entry
-- -------------------------------------------------------------------------
INSERT INTO audit_log (id, event_type, actor_type, actor_id, payload, occurred_at)
VALUES (
  gen_random_uuid(),
  'system.initialized',
  'system',
  '00000000-0000-0000-0000-000000000001',
  '{"message": "SealProof platform initialized with seed data"}'::jsonb,
  NOW()
);
