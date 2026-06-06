-- Stable per-day key for Google Health sync upserts (avoids timezone window mismatches).

ALTER TABLE fitness_biometrics
  ADD COLUMN IF NOT EXISTS sync_date DATE;

-- Dedupe any existing google_health rows for the same day before adding the constraint.
DELETE FROM fitness_biometrics a
USING fitness_biometrics b
WHERE a.id < b.id
  AND a.user_id = b.user_id
  AND a.source = 'google_health'
  AND b.source = 'google_health'
  AND a.sync_date IS NOT NULL
  AND b.sync_date IS NOT NULL
  AND a.sync_date = b.sync_date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fitness_biometrics_user_sync_source_key'
  ) THEN
    ALTER TABLE fitness_biometrics
      ADD CONSTRAINT fitness_biometrics_user_sync_source_key
      UNIQUE (user_id, sync_date, source);
  END IF;
END $$;
