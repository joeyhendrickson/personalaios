-- Advisor cross-module context cache layers
ALTER TABLE user_context_cache
  ADD COLUMN IF NOT EXISTS module_context_summary_json JSONB,
  ADD COLUMN IF NOT EXISTS cross_module_insights_json JSONB;
