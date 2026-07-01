-- ============================================================================
-- SealProof — State RON Rules Seed Data (46 states + DC)
--
-- Sources: NNA, Notarize.com, state statutes (as of June 2026)
-- States with RON NOT authorized: GA, MS (paper-remote-only: AL, CT)
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Tier 1: Comprehensive RON Statutes (early adopters, detailed rules)
-- ---------------------------------------------------------------------------

INSERT INTO state_ron_rules (
  state_code, state_name, ron_authorized, authorization_type, effective_date,
  governing_statute, kba_required, credential_analysis_required,
  personal_knowledge_allowed, credible_witness_allowed,
  kba_min_questions, kba_min_correct,
  journal_retention_years, recording_required, recording_retention_years,
  recording_must_include_kba,
  seal_state_header, seal_state_label, seal_statute_reference,
  max_notary_fee_cents,
  restricted_doc_types, doc_type_notes,
  platform_approval_required, platform_approval_status,
  approval_authority, approval_authority_url,
  notary_must_be_in_state, signer_location_restriction,
  special_requirements
) VALUES
-- Virginia (first RON state, 2012)
('VA', 'Virginia', true, 'comprehensive', '2012-07-01',
 'VA Code § 47.1-2', true, true, true, true, 5, 4,
 5, true, 5, false,
 'COMMONWEALTH OF VIRGINIA', 'REMOTE ELECTRONIC NOTARY PUBLIC', 'VA Code § 47.1-2',
 2500,
 '[]'::jsonb, NULL,
 true, 'not_applied',
 'Virginia Secretary of the Commonwealth', 'https://www.commonwealth.virginia.gov/official-documents/notary-commissions/',
 true, 'any',
 'Virginia requires RON providers to register with the Secretary of the Commonwealth'),

-- Texas (2018)
('TX', 'Texas', true, 'comprehensive', '2018-01-01',
 'TX Gov. Code § 406.101', true, true, true, true, 5, 4,
 5, true, 10, false,
 'STATE OF TEXAS', 'REMOTE ONLINE NOTARY PUBLIC', 'TX Gov. Code § 406.101',
 2500,
 '[]'::jsonb, NULL,
 true, 'not_applied',
 'Texas Secretary of State', 'https://www.sos.state.tx.us/statdoc/notarypublic.shtml',
 true, 'any',
 'Texas requires SoS approval for RON technology platforms; credential analysis must be SoS-approved'),

-- Florida (2020)
('FL', 'Florida', true, 'comprehensive', '2020-01-01',
 'FL Stat. § 117.265', true, true, true, true, 5, 4,
 5, true, 5, false,
 'STATE OF FLORIDA', 'REMOTE ONLINE NOTARY PUBLIC', 'FL Stat. § 117.265',
 2500,
 '[]'::jsonb, 'Florida allows RON for virtually all document types',
 false, 'not_required',
 'Florida Department of State', 'https://dos.myflorida.com/sunbiz/other-services/notary-public/',
 true, 'any',
 NULL),

-- Nevada (2019)
('NV', 'Nevada', true, 'comprehensive', '2019-07-01',
 'NRS 240.198', true, true, true, true, 5, 4,
 7, true, 7, false,
 'STATE OF NEVADA', 'REMOTE ELECTRONIC NOTARY PUBLIC', 'NRS 240.198',
 2500,
 '[]'::jsonb, NULL,
 true, 'not_applied',
 'Nevada Secretary of State', 'https://www.nvsos.gov/sos/licensing/notary',
 true, 'any',
 'Nevada requires RON providers to be registered with the Secretary of State'),

-- North Carolina (2024)
('NC', 'North Carolina', true, 'comprehensive', '2024-07-01',
 'NCGS Chapter 10B', true, true, true, true, 5, 4,
 10, true, 10, false,
 'STATE OF NORTH CAROLINA', 'REMOTE ELECTRONIC NOTARY PUBLIC', 'NCGS 10B-72',
 2500,
 '[]'::jsonb, 'Signer must be in US or on US military base/embassy per NCGS 10B-134.9',
 false, 'not_required',
 'NC Secretary of State', 'https://www.sosnc.gov/divisions/notary',
 true, 'us_and_military',
 'Hash-chained immutable journal per NCGS 10B-118'),

-- Ohio (2020)
('OH', 'Ohio', true, 'comprehensive', '2020-09-14',
 'ORC § 147.63', true, true, true, true, 5, 4,
 5, true, 5, false,
 'STATE OF OHIO', 'REMOTE ONLINE NOTARY PUBLIC', 'ORC § 147.63',
 NULL,
 '[]'::jsonb, NULL,
 true, 'not_applied',
 'Ohio Secretary of State', 'https://www.ohiosos.gov/notary/',
 true, 'any',
 NULL),

-- Indiana (2019)
('IN', 'Indiana', true, 'comprehensive', '2019-07-01',
 'IC 33-42', true, true, true, true, 5, 4,
 5, true, 5, false,
 'STATE OF INDIANA', 'REMOTE ONLINE NOTARY PUBLIC', 'IC 33-42',
 NULL,
 '[]'::jsonb, NULL,
 true, 'not_applied',
 'Indiana Secretary of State', 'https://www.in.gov/sos/notary/',
 true, 'any',
 NULL),

-- Michigan (2019)
('MI', 'Michigan', true, 'comprehensive', '2019-01-01',
 'MCL 55.286c', true, true, true, true, 5, 4,
 5, true, 5, false,
 'STATE OF MICHIGAN', 'REMOTE ONLINE NOTARY PUBLIC', 'MCL 55.286c',
 NULL,
 '[]'::jsonb, NULL,
 false, 'not_required',
 'Michigan Department of State', 'https://www.michigan.gov/sos/notary',
 true, 'any',
 'Credible witness must personally know both notary and signer in Michigan'),

-- Kentucky (2020)
('KY', 'Kentucky', true, 'comprehensive', '2020-06-29',
 'KRS 423.380', true, true, true, true, 5, 4,
 10, true, 10, false,
 'COMMONWEALTH OF KENTUCKY', 'REMOTE ONLINE NOTARY PUBLIC', 'KRS 423.380',
 NULL,
 '[]'::jsonb, NULL,
 true, 'not_applied',
 'Kentucky Secretary of State', 'https://www.sos.ky.gov/bus/notary/',
 true, 'any',
 NULL),

-- Minnesota (2019)
('MN', 'Minnesota', true, 'comprehensive', '2019-10-01',
 'MN Stat. § 358.645', true, true, true, true, 5, 4,
 10, true, 10, false,
 'STATE OF MINNESOTA', 'REMOTE ONLINE NOTARY PUBLIC', 'MN Stat. § 358.645',
 NULL,
 '["will"]'::jsonb, 'Minnesota excludes wills from RON',
 true, 'not_applied',
 'Minnesota Secretary of State', 'https://www.sos.state.mn.us/notary/',
 true, 'any',
 NULL),

-- Arizona (2020)
('AZ', 'Arizona', true, 'comprehensive', '2020-01-01',
 'ARS § 41-371', true, true, true, true, 5, 4,
 5, true, 5, false,
 'STATE OF ARIZONA', 'REMOTE ONLINE NOTARY PUBLIC', 'ARS § 41-371',
 NULL,
 '[]'::jsonb, NULL,
 false, 'not_required',
 'Arizona Secretary of State', 'https://azsos.gov/business-services/notary',
 true, 'any',
 NULL),

-- Colorado (2020)
('CO', 'Colorado', true, 'comprehensive', '2020-07-01',
 'CRS § 24-21-502', true, true, true, true, 5, 4,
 5, true, 5, false,
 'STATE OF COLORADO', 'REMOTE ONLINE NOTARY PUBLIC', 'CRS § 24-21-502',
 NULL,
 '[]'::jsonb, NULL,
 true, 'not_applied',
 'Colorado Secretary of State', 'https://www.sos.state.co.us/pubs/notary/',
 true, 'any',
 NULL),

-- Idaho (2020)
('ID', 'Idaho', true, 'comprehensive', '2020-07-01',
 'IC § 51-119', true, true, true, true, 5, 4,
 5, true, 5, false,
 'STATE OF IDAHO', 'REMOTE ONLINE NOTARY PUBLIC', 'IC § 51-119',
 NULL,
 '[]'::jsonb, NULL,
 true, 'not_applied',
 'Idaho Secretary of State', 'https://sos.idaho.gov/notary/',
 true, 'any',
 NULL),

-- Tennessee (2020)
('TN', 'Tennessee', true, 'comprehensive', '2020-09-01',
 'TCA § 66-22-116', true, true, true, true, 5, 4,
 5, true, 5, false,
 'STATE OF TENNESSEE', 'REMOTE ONLINE NOTARY PUBLIC', 'TCA § 66-22-116',
 NULL,
 '[]'::jsonb, NULL,
 false, 'not_required',
 'Tennessee Secretary of State', 'https://sos.tn.gov/notary',
 true, 'any',
 NULL),

-- Wisconsin (2020)
('WI', 'Wisconsin', true, 'comprehensive', '2020-05-18',
 'WI Stat. § 140.145', true, true, true, true, 5, 4,
 7, true, 7, false,
 'STATE OF WISCONSIN', 'REMOTE ONLINE NOTARY PUBLIC', 'WI Stat. § 140.145',
 NULL,
 '[]'::jsonb, NULL,
 false, 'not_required',
 'Wisconsin Department of Financial Institutions', 'https://www.wdfi.org/notary/',
 true, 'any',
 NULL),

-- Iowa (2020)
('IA', 'Iowa', true, 'comprehensive', '2020-07-01',
 'IA Code § 9B.14A', true, true, true, true, 5, 4,
 5, true, 5, false,
 'STATE OF IOWA', 'REMOTE ONLINE NOTARY PUBLIC', 'IA Code § 9B.14A',
 NULL,
 '[]'::jsonb, NULL,
 false, 'not_required',
 'Iowa Secretary of State', 'https://sos.iowa.gov/notary/',
 true, 'any',
 NULL);

-- ---------------------------------------------------------------------------
-- Tier 2: Basic RON Authorization with Rulemaking
-- ---------------------------------------------------------------------------
INSERT INTO state_ron_rules (
  state_code, state_name, ron_authorized, authorization_type, effective_date,
  governing_statute, kba_required, credential_analysis_required,
  personal_knowledge_allowed, credible_witness_allowed,
  kba_min_questions, kba_min_correct,
  journal_retention_years, recording_required, recording_retention_years,
  seal_state_header, seal_state_label, seal_statute_reference,
  max_notary_fee_cents, restricted_doc_types,
  platform_approval_required, platform_approval_status,
  approval_authority,
  notary_must_be_in_state, signer_location_restriction,
  special_requirements
) VALUES
('AK', 'Alaska', true, 'basic_rulemaking', '2021-01-01', 'AS 44.50.072', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF ALASKA', 'REMOTE ONLINE NOTARY PUBLIC', 'AS 44.50.072', NULL, '[]'::jsonb, false, 'not_required', 'Alaska Lieutenant Governor', true, 'any', NULL),
('AR', 'Arkansas', true, 'basic_rulemaking', '2020-07-01', 'ACA § 21-14-302', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF ARKANSAS', 'REMOTE ONLINE NOTARY PUBLIC', 'ACA § 21-14-302', NULL, '[]'::jsonb, true, 'not_applied', 'Arkansas Secretary of State', true, 'any', NULL),
('DE', 'Delaware', true, 'basic_rulemaking', '2021-01-01', '29 Del.C. § 4328', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF DELAWARE', 'REMOTE ONLINE NOTARY PUBLIC', '29 Del.C. § 4328', NULL, '[]'::jsonb, false, 'not_required', 'Delaware Secretary of State', true, 'any', NULL),
('HI', 'Hawaii', true, 'basic_rulemaking', '2021-07-01', 'HRS § 456-31', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF HAWAII', 'REMOTE ONLINE NOTARY PUBLIC', 'HRS § 456-31', NULL, '[]'::jsonb, false, 'not_required', 'Hawaii Attorney General', true, 'any', NULL),
('IL', 'Illinois', true, 'basic_rulemaking', '2022-01-01', '5 ILCS 312/6-110', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF ILLINOIS', 'REMOTE ONLINE NOTARY PUBLIC', '5 ILCS 312/6-110', NULL, '[]'::jsonb, true, 'not_applied', 'Illinois Secretary of State', true, 'any', NULL),
('KS', 'Kansas', true, 'basic_rulemaking', '2021-07-01', 'KSA § 53-601', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF KANSAS', 'REMOTE ONLINE NOTARY PUBLIC', 'KSA § 53-601', NULL, '[]'::jsonb, false, 'not_required', 'Kansas Secretary of State', true, 'any', NULL),
('LA', 'Louisiana', true, 'basic_rulemaking', '2022-01-01', 'RS 35:626', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF LOUISIANA', 'REMOTE ONLINE NOTARY PUBLIC', 'RS 35:626', NULL, '[]'::jsonb, false, 'not_required', 'Louisiana Secretary of State', true, 'any', 'Louisiana notarial law is unique; RON may have additional parish-level requirements'),
('ME', 'Maine', true, 'basic_rulemaking', '2023-01-01', '4 MRSA § 1015', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF MAINE', 'REMOTE ONLINE NOTARY PUBLIC', '4 MRSA § 1015', NULL, '[]'::jsonb, false, 'not_required', 'Maine Secretary of State', true, 'any', NULL),
('MD', 'Maryland', true, 'basic_rulemaking', '2020-10-01', 'MD State Gov. § 18-218', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF MARYLAND', 'REMOTE ONLINE NOTARY PUBLIC', 'MD SG § 18-218', NULL, '[]'::jsonb, false, 'not_required', 'Maryland Secretary of State', true, 'any', NULL),
('MA', 'Massachusetts', true, 'basic_rulemaking', '2023-07-01', 'MGL c.222 § 8', true, true, true, true, 5, 4, 5, true, 5, 'COMMONWEALTH OF MASSACHUSETTS', 'REMOTE ONLINE NOTARY PUBLIC', 'MGL c.222 § 8', NULL, '[]'::jsonb, false, 'not_required', 'Massachusetts Secretary of the Commonwealth', true, 'any', NULL),
('MO', 'Missouri', true, 'basic_rulemaking', '2020-08-28', 'RSMo § 486.1100', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF MISSOURI', 'REMOTE ONLINE NOTARY PUBLIC', 'RSMo § 486.1100', NULL, '[]'::jsonb, false, 'not_required', 'Missouri Secretary of State', true, 'any', NULL),
('MT', 'Montana', true, 'basic_rulemaking', '2021-10-01', 'MCA § 1-5-631', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF MONTANA', 'REMOTE ONLINE NOTARY PUBLIC', 'MCA § 1-5-631', NULL, '[]'::jsonb, false, 'not_required', 'Montana Secretary of State', true, 'any', NULL),
('NE', 'Nebraska', true, 'basic_rulemaking', '2020-07-01', 'Neb. Rev. Stat. § 64-401.04', true, true, true, true, 5, 4, 7, true, 7, 'STATE OF NEBRASKA', 'REMOTE ONLINE NOTARY PUBLIC', 'Neb. Rev. Stat. § 64-401.04', NULL, '[]'::jsonb, false, 'not_required', 'Nebraska Secretary of State', true, 'any', NULL),
('NH', 'New Hampshire', true, 'basic_rulemaking', '2021-01-01', 'RSA 456-B:14-a', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF NEW HAMPSHIRE', 'REMOTE ONLINE NOTARY PUBLIC', 'RSA 456-B:14-a', NULL, '[]'::jsonb, false, 'not_required', 'New Hampshire Secretary of State', true, 'any', NULL),
('NJ', 'New Jersey', true, 'basic_rulemaking', '2022-01-01', 'NJSA 46:14-10.4', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF NEW JERSEY', 'REMOTE ONLINE NOTARY PUBLIC', 'NJSA 46:14-10.4', NULL, '[]'::jsonb, false, 'not_required', 'NJ Department of the Treasury', true, 'any', NULL),
('NM', 'New Mexico', true, 'basic_rulemaking', '2021-07-01', 'NMSA § 14-14A-1', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF NEW MEXICO', 'REMOTE ONLINE NOTARY PUBLIC', 'NMSA § 14-14A-1', NULL, '[]'::jsonb, false, 'not_required', 'New Mexico Secretary of State', true, 'any', NULL),
('NY', 'New York', true, 'basic_rulemaking', '2023-01-01', 'NY Exec Law § 135-c', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF NEW YORK', 'REMOTE ONLINE NOTARY PUBLIC', 'NY Exec Law § 135-c', NULL, '["real_estate_closing"]'::jsonb, true, 'not_applied', 'New York Department of State', true, 'any', 'New York restricts RON for certain real estate closings'),
('ND', 'North Dakota', true, 'basic_rulemaking', '2020-07-01', 'NDCC § 44-06.1-13.3', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF NORTH DAKOTA', 'REMOTE ONLINE NOTARY PUBLIC', 'NDCC § 44-06.1-13.3', NULL, '[]'::jsonb, false, 'not_required', 'North Dakota Secretary of State', true, 'any', NULL),
('OK', 'Oklahoma', true, 'basic_rulemaking', '2020-11-01', '49 OS § 115', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF OKLAHOMA', 'REMOTE ONLINE NOTARY PUBLIC', '49 OS § 115', NULL, '[]'::jsonb, false, 'not_required', 'Oklahoma Secretary of State', true, 'any', NULL),
('OR', 'Oregon', true, 'basic_rulemaking', '2022-01-01', 'ORS 194.505', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF OREGON', 'REMOTE ONLINE NOTARY PUBLIC', 'ORS 194.505', NULL, '[]'::jsonb, false, 'not_required', 'Oregon Secretary of State', true, 'any', NULL),
('PA', 'Pennsylvania', true, 'basic_rulemaking', '2020-10-29', '57 Pa.C.S. § 329', true, true, true, true, 5, 4, 5, true, 5, 'COMMONWEALTH OF PENNSYLVANIA', 'REMOTE ONLINE NOTARY PUBLIC', '57 Pa.C.S. § 329', NULL, '[]'::jsonb, false, 'not_required', 'Pennsylvania Department of State', true, 'any', NULL),
('RI', 'Rhode Island', true, 'basic_rulemaking', '2022-01-01', 'RIGL § 42-30.2-8', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF RHODE ISLAND', 'REMOTE ONLINE NOTARY PUBLIC', 'RIGL § 42-30.2-8', NULL, '[]'::jsonb, false, 'not_required', 'Rhode Island Secretary of State', true, 'any', NULL),
('SC', 'South Carolina', true, 'basic_rulemaking', '2022-01-01', 'SC Code § 26-2-410', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF SOUTH CAROLINA', 'REMOTE ONLINE NOTARY PUBLIC', 'SC Code § 26-2-410', NULL, '[]'::jsonb, false, 'not_required', 'South Carolina Secretary of State', true, 'any', NULL),
('SD', 'South Dakota', true, 'basic_rulemaking', '2020-07-01', 'SDCL § 18-1-11.4', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF SOUTH DAKOTA', 'REMOTE ONLINE NOTARY PUBLIC', 'SDCL § 18-1-11.4', NULL, '[]'::jsonb, false, 'not_required', 'South Dakota Secretary of State', true, 'any', NULL),
('UT', 'Utah', true, 'basic_rulemaking', '2019-05-14', 'UCA § 46-1-2', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF UTAH', 'REMOTE ONLINE NOTARY PUBLIC', 'UCA § 46-1-2', NULL, '[]'::jsonb, false, 'not_required', 'Utah Lieutenant Governor', true, 'any', NULL),
('VT', 'Vermont', true, 'basic_rulemaking', '2022-07-01', '26 VSA § 5379', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF VERMONT', 'REMOTE ONLINE NOTARY PUBLIC', '26 VSA § 5379', NULL, '[]'::jsonb, false, 'not_required', 'Vermont Secretary of State', true, 'any', NULL),
('WA', 'Washington', true, 'basic_rulemaking', '2020-06-11', 'RCW 42.45.280', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF WASHINGTON', 'REMOTE ONLINE NOTARY PUBLIC', 'RCW 42.45.280', NULL, '[]'::jsonb, false, 'not_required', 'Washington Department of Licensing', true, 'any', NULL),
('WV', 'West Virginia', true, 'basic_rulemaking', '2021-01-01', 'WV Code § 39-4-37', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF WEST VIRGINIA', 'REMOTE ONLINE NOTARY PUBLIC', 'WV Code § 39-4-37', NULL, '[]'::jsonb, false, 'not_required', 'West Virginia Secretary of State', true, 'any', NULL),
('WY', 'Wyoming', true, 'basic_rulemaking', '2021-07-01', 'WS § 34-26-301', true, true, true, true, 5, 4, 5, true, 5, 'STATE OF WYOMING', 'REMOTE ONLINE NOTARY PUBLIC', 'WS § 34-26-301', NULL, '[]'::jsonb, false, 'not_required', 'Wyoming Secretary of State', true, 'any', NULL);

-- ---------------------------------------------------------------------------
-- Tier 3: Limited or Conditional Authorization
-- ---------------------------------------------------------------------------
INSERT INTO state_ron_rules (
  state_code, state_name, ron_authorized, authorization_type,
  governing_statute, kba_required, credential_analysis_required,
  personal_knowledge_allowed, credible_witness_allowed,
  kba_min_questions, kba_min_correct,
  journal_retention_years, recording_required, recording_retention_years,
  seal_state_header, seal_state_label, seal_statute_reference,
  restricted_doc_types, doc_type_notes,
  platform_approval_required, platform_approval_status,
  notary_must_be_in_state, signer_location_restriction,
  special_requirements
) VALUES
('DC', 'District of Columbia', true, 'limited', 'DC Code § 1-1231.19a', true, true, true, true, 5, 4, 5, true, 5,
 'DISTRICT OF COLUMBIA', 'REMOTE ONLINE NOTARY PUBLIC', 'DC Code § 1-1231.19a',
 '[]'::jsonb, NULL, false, 'not_required', true, 'any',
 'DC has limited RON authorization with specific requirements'),
('CA', 'California', true, 'limited', 'CA Gov. Code § 8231.1', true, true, false, false, 5, 4, 5, true, 5,
 'STATE OF CALIFORNIA', 'REMOTE ONLINE NOTARY PUBLIC', 'CA Gov. Code § 8231.1',
 '[]'::jsonb, 'California RON enacted but implementation may have additional requirements',
 false, 'not_required', true, 'any',
 'California RON law enacted 2024; personal knowledge not allowed for RON');

-- ---------------------------------------------------------------------------
-- States WITHOUT permanent RON authorization
-- ---------------------------------------------------------------------------
INSERT INTO state_ron_rules (
  state_code, state_name, ron_authorized, authorization_type,
  governing_statute, kba_required, credential_analysis_required,
  journal_retention_years, recording_required, recording_retention_years,
  seal_state_header, seal_state_label, seal_statute_reference,
  restricted_doc_types, platform_approval_required,
  notary_must_be_in_state, signer_location_restriction,
  special_requirements
) VALUES
('GA', 'Georgia', false, 'none', NULL, true, true, 5, true, 5,
 'STATE OF GEORGIA', 'NOTARY PUBLIC', NULL,
 '[]'::jsonb, false, true, 'any',
 'Georgia does NOT have permanent RON law. HB 289 pending. Temporary COVID authorization expired.'),
('MS', 'Mississippi', false, 'none', NULL, true, true, 5, true, 5,
 'STATE OF MISSISSIPPI', 'NOTARY PUBLIC', NULL,
 '[]'::jsonb, false, true, 'any',
 'Mississippi does NOT have RON authorization.'),
('AL', 'Alabama', false, 'none', 'AL Code § 36-20-73', false, false, 5, false, 5,
 'STATE OF ALABAMA', 'NOTARY PUBLIC', 'AL Code § 36-20-73',
 '[]'::jsonb, false, true, 'any',
 'Alabama allows remote notarization with PAPER documents only, not electronic. Not true RON.'),
('CT', 'Connecticut', false, 'none', 'CGS § 1-39d', false, false, 5, false, 5,
 'STATE OF CONNECTICUT', 'NOTARY PUBLIC', 'CGS § 1-39d',
 '[]'::jsonb, false, true, 'any',
 'Connecticut allows remote notarization with PAPER documents only, not electronic. Not true RON.');

-- ---------------------------------------------------------------------------
-- Seed platform_registrations for states that require approval
-- ---------------------------------------------------------------------------
INSERT INTO platform_registrations (state_code, status, authority_name, notes)
SELECT state_code, 'not_applied', approval_authority,
  'Application needed before SealProof notaries in this state can operate'
FROM state_ron_rules
WHERE platform_approval_required = true AND ron_authorized = true
ON CONFLICT (state_code) DO NOTHING;

-- Mark states that don't require approval
INSERT INTO platform_registrations (state_code, status, notes)
SELECT state_code, 'not_required', 'This state does not require platform registration'
FROM state_ron_rules
WHERE platform_approval_required = false AND ron_authorized = true
ON CONFLICT (state_code) DO NOTHING;

COMMIT;
