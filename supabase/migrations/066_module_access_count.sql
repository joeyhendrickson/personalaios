-- Track how frequently a user opens each life hack so the Life Hacks list can be
-- ordered with the most-used modules first.

ALTER TABLE installed_modules
  ADD COLUMN IF NOT EXISTS access_count INTEGER NOT NULL DEFAULT 0;

-- Atomic increment of a user's open count for a module. Runs as the calling user
-- (SECURITY INVOKER) so RLS still scopes the update to their own rows.
CREATE OR REPLACE FUNCTION increment_module_access(p_module_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  UPDATE installed_modules
  SET access_count = COALESCE(access_count, 0) + 1,
      last_accessed = NOW(),
      is_active = TRUE
  WHERE user_id = auth.uid()
    AND module_id = p_module_id;
END;
$$;

-- Helps ordering installed modules by usage.
CREATE INDEX IF NOT EXISTS idx_installed_modules_access_count
  ON installed_modules(user_id, access_count DESC);
