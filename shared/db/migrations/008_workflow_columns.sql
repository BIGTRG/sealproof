-- 008: columns needed by the session workflow layer
BEGIN;
ALTER TABLE session_signers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE notarization_sessions ADD COLUMN IF NOT EXISTS description TEXT;
COMMIT;
