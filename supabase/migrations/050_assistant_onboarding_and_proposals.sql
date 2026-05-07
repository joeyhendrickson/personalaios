-- Assistant onboarding + confirmable action proposals.
-- Keeps all writes behind explicit user confirmation.

CREATE TABLE IF NOT EXISTS assistant_onboarding_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed', 'skipped')),
  step INTEGER NOT NULL DEFAULT 0,
  responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE assistant_onboarding_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own onboarding" ON assistant_onboarding_state
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own onboarding" ON assistant_onboarding_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own onboarding" ON assistant_onboarding_state
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own onboarding" ON assistant_onboarding_state
  FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS assistant_action_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('create_goal')),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'committed', 'cancelled', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '2 hours'),
  committed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_assistant_action_proposals_user_status
  ON assistant_action_proposals (user_id, status, created_at DESC);

ALTER TABLE assistant_action_proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own proposals" ON assistant_action_proposals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own proposals" ON assistant_action_proposals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own proposals" ON assistant_action_proposals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own proposals" ON assistant_action_proposals
  FOR DELETE USING (auth.uid() = user_id);

