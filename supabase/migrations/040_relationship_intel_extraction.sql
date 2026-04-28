-- Structured extraction per interaction (topics, tone, commitments, etc.)
ALTER TABLE ri_interactions
  ADD COLUMN IF NOT EXISTS extraction JSONB NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN ri_interactions.extraction IS 'Grounded parse output: topics, tone, alignment quotes, commitments (verbatim from content only)';
