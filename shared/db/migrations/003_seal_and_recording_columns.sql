-- 003_seal_and_recording_columns.sql
-- Add seal + TSA tracking columns to session_documents (Stage 3)

ALTER TABLE session_documents ADD COLUMN IF NOT EXISTS sealed_document_url TEXT;
ALTER TABLE session_documents ADD COLUMN IF NOT EXISTS seal_hash TEXT;
ALTER TABLE session_documents ADD COLUMN IF NOT EXISTS tsa_timestamp TEXT;

CREATE INDEX IF NOT EXISTS idx_session_documents_seal ON session_documents (seal_hash) WHERE seal_hash IS NOT NULL;

-- Track this migration
INSERT INTO _migrations (name) VALUES ('003_seal_and_recording_columns')
ON CONFLICT (name) DO NOTHING;
