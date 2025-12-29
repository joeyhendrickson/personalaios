-- Create dream_catcher_sessions table to store saved Dream Catcher sessions
CREATE TABLE IF NOT EXISTS dream_catcher_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_data JSONB NOT NULL,
  completed_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_dream_catcher_sessions_user_id ON dream_catcher_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_dream_catcher_sessions_completed_at ON dream_catcher_sessions(completed_at DESC);

-- Enable RLS
ALTER TABLE dream_catcher_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own dream catcher sessions"
  ON dream_catcher_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dream catcher sessions"
  ON dream_catcher_sessions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dream catcher sessions"
  ON dream_catcher_sessions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_dream_catcher_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_dream_catcher_sessions_updated_at
  BEFORE UPDATE ON dream_catcher_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_dream_catcher_sessions_updated_at();

