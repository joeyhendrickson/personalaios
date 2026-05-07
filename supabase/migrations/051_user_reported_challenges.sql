-- User-reported productivity challenges, logged by the assistant for admin review.

CREATE TABLE IF NOT EXISTS user_reported_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'productivity_advisor' CHECK (source IN ('productivity_advisor', 'manual')),
  context TEXT,
  message TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}'::text[],
  severity TEXT NOT NULL DEFAULT 'normal' CHECK (severity IN ('low', 'normal', 'high')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'resolved')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_reported_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own challenges" ON user_reported_challenges
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own challenges" ON user_reported_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin access is enforced via server routes (admin_users) rather than an RLS policy here.

CREATE INDEX IF NOT EXISTS idx_user_reported_challenges_user_created
  ON user_reported_challenges (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reported_challenges_status_created
  ON user_reported_challenges (status, created_at DESC);

