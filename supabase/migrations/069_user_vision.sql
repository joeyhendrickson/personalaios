-- User vision statement (from Dream Catcher, editable by the user).
-- One row per user. goals_signature captures the goals state the vision was
-- last aligned to, so the app can recommend an AI update when goals change.

CREATE TABLE IF NOT EXISTS user_vision (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vision_statement TEXT NOT NULL DEFAULT '',
  goals_signature TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_vision ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own vision" ON user_vision;
CREATE POLICY "Users can view their own vision"
  ON user_vision FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own vision" ON user_vision;
CREATE POLICY "Users can insert their own vision"
  ON user_vision FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own vision" ON user_vision;
CREATE POLICY "Users can update their own vision"
  ON user_vision FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own vision" ON user_vision;
CREATE POLICY "Users can delete their own vision"
  ON user_vision FOR DELETE
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_user_vision_updated_at ON user_vision;
CREATE TRIGGER update_user_vision_updated_at
  BEFORE UPDATE ON user_vision
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
