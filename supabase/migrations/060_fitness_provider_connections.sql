-- Wearable / health provider OAuth connections (Google Health API; sources Fitbit/Google device data).
-- Tokens are encrypted at the application layer before insert.

CREATE TABLE IF NOT EXISTS fitness_provider_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  provider TEXT NOT NULL DEFAULT 'google_health',

  -- Encrypted OAuth tokens (AES-256-GCM via src/lib/crypto.ts).
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  scope TEXT,

  provider_user_id TEXT,
  connected_email TEXT,

  -- Per-metric opt-in for what we provision into fitness_biometrics.
  import_sleep BOOLEAN NOT NULL DEFAULT TRUE,
  import_resting_heart_rate BOOLEAN NOT NULL DEFAULT TRUE,
  import_steps BOOLEAN NOT NULL DEFAULT TRUE,

  -- 'connected' | 'needs_reauth'
  status TEXT NOT NULL DEFAULT 'connected',
  last_synced_at TIMESTAMPTZ,
  last_sync_error TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_fitness_provider_connections_user
  ON fitness_provider_connections(user_id);

ALTER TABLE fitness_provider_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own provider connections"
  ON fitness_provider_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own provider connections"
  ON fitness_provider_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own provider connections"
  ON fitness_provider_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own provider connections"
  ON fitness_provider_connections FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_fitness_provider_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fitness_provider_connections_updated_at ON fitness_provider_connections;
CREATE TRIGGER trg_fitness_provider_connections_updated_at
  BEFORE UPDATE ON fitness_provider_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_fitness_provider_connections_updated_at();

-- Track which source filled a biometrics row so the UI can label auto vs manual.
ALTER TABLE fitness_biometrics
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';

-- Daily steps from connected wearables (no existing home in fitness_biometrics).
ALTER TABLE fitness_biometrics
  ADD COLUMN IF NOT EXISTS steps INT;
