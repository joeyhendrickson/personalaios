-- Lifestacks Calendar: Google Calendar OAuth connection + AI scheduling preferences.
-- Tokens are encrypted at the application layer (src/lib/crypto.ts) before insert.

CREATE TABLE IF NOT EXISTS calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google_calendar',

  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,
  connected_email TEXT,

  -- 'connected' | 'needs_reauth'
  status TEXT NOT NULL DEFAULT 'connected',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_calendar_connections_user ON calendar_connections(user_id);

ALTER TABLE calendar_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own calendar connection" ON calendar_connections;
CREATE POLICY "Users can view their own calendar connection"
  ON calendar_connections FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own calendar connection" ON calendar_connections;
CREATE POLICY "Users can insert their own calendar connection"
  ON calendar_connections FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own calendar connection" ON calendar_connections;
CREATE POLICY "Users can update their own calendar connection"
  ON calendar_connections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own calendar connection" ON calendar_connections;
CREATE POLICY "Users can delete their own calendar connection"
  ON calendar_connections FOR DELETE USING (auth.uid() = user_id);

-- When during the day/week the AI is allowed to suggest Lifestacks items.
CREATE TABLE IF NOT EXISTS calendar_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  start_hour INT NOT NULL DEFAULT 5 CHECK (start_hour >= 0 AND start_hour <= 24),
  end_hour INT NOT NULL DEFAULT 24 CHECK (end_hour >= 0 AND end_hour <= 24),
  days TEXT[] NOT NULL DEFAULT ARRAY['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE calendar_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own calendar preferences" ON calendar_preferences;
CREATE POLICY "Users can view their own calendar preferences"
  ON calendar_preferences FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own calendar preferences" ON calendar_preferences;
CREATE POLICY "Users can insert their own calendar preferences"
  ON calendar_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own calendar preferences" ON calendar_preferences;
CREATE POLICY "Users can update their own calendar preferences"
  ON calendar_preferences FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_calendar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calendar_connections_updated_at ON calendar_connections;
CREATE TRIGGER trg_calendar_connections_updated_at
  BEFORE UPDATE ON calendar_connections
  FOR EACH ROW EXECUTE FUNCTION update_calendar_updated_at();

DROP TRIGGER IF EXISTS trg_calendar_preferences_updated_at ON calendar_preferences;
CREATE TRIGGER trg_calendar_preferences_updated_at
  BEFORE UPDATE ON calendar_preferences
  FOR EACH ROW EXECUTE FUNCTION update_calendar_updated_at();
