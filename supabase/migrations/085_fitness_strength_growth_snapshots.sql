-- Cached strength growth chart snapshots (Track Growth feature).
-- Stores the stat series used for each chart so users can reopen past charts
-- without recreating identical views when no new stats have been logged.

CREATE TABLE IF NOT EXISTS fitness_strength_growth_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stats_fingerprint TEXT NOT NULL,
  chart_data JSONB NOT NULL,
  exercise_count INTEGER NOT NULL DEFAULT 0,
  stat_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fitness_strength_growth_snapshots_user_created
  ON fitness_strength_growth_snapshots(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_fitness_strength_growth_snapshots_user_fingerprint
  ON fitness_strength_growth_snapshots(user_id, stats_fingerprint);

ALTER TABLE fitness_strength_growth_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own strength growth snapshots"
  ON fitness_strength_growth_snapshots;
CREATE POLICY "Users can view their own strength growth snapshots"
  ON fitness_strength_growth_snapshots FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own strength growth snapshots"
  ON fitness_strength_growth_snapshots;
CREATE POLICY "Users can insert their own strength growth snapshots"
  ON fitness_strength_growth_snapshots FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own strength growth snapshots"
  ON fitness_strength_growth_snapshots;
CREATE POLICY "Users can delete their own strength growth snapshots"
  ON fitness_strength_growth_snapshots FOR DELETE
  USING (auth.uid() = user_id);
