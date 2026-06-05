-- Migration: Weekly leaderboard gold-star trophies
-- Records the #1 weekly-points performer for each completed week (one winner per week).
-- The leaderboard itself is computed on demand from points_ledger via a service-role
-- API route, so no cross-user read policy is added to points_ledger here.

CREATE TABLE IF NOT EXISTS weekly_leader_trophies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_leader_trophies_user
  ON weekly_leader_trophies (user_id, week_start DESC);

ALTER TABLE weekly_leader_trophies ENABLE ROW LEVEL SECURITY;

-- Users can read trophy rows (only contains user_id + week + points, no PII).
-- Writes happen exclusively through the service-role API route.
DROP POLICY IF EXISTS "weekly_leader_trophies_select" ON weekly_leader_trophies;
CREATE POLICY "weekly_leader_trophies_select"
  ON weekly_leader_trophies FOR SELECT TO authenticated
  USING (true);
