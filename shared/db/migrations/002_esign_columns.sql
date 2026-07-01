-- 002_esign_columns.sql
-- Add e-sign tracking columns to session_documents (Stage 2)

ALTER TABLE session_documents ADD COLUMN IF NOT EXISTS esign_request_id TEXT;
ALTER TABLE session_documents ADD COLUMN IF NOT EXISTS esign_status TEXT DEFAULT 'not_started';
ALTER TABLE session_documents ADD COLUMN IF NOT EXISTS signed_document_url TEXT;
ALTER TABLE session_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_session_documents_esign ON session_documents (esign_request_id) WHERE esign_request_id IS NOT NULL;

-- Track this migration
INSERT INTO _migrations (name) VALUES ('002_esign_columns')
ON CONFLICT (name) DO NOTHING;
