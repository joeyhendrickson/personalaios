-- Create user integrations table for storing OAuth tokens
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  integration_type VARCHAR(50) NOT NULL, -- google_photos, google_calendar, etc.
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_type ON user_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_user_integrations_active ON user_integrations(is_active);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_user_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_user_integrations_updated_at ON user_integrations;
CREATE TRIGGER trigger_update_user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_user_integrations_updated_at();

-- Row Level Security (RLS) policies
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Users can view their own integrations
DROP POLICY IF EXISTS "Users can view their own integrations" ON user_integrations;
CREATE POLICY "Users can view their own integrations" ON user_integrations
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own integrations
DROP POLICY IF EXISTS "Users can insert their own integrations" ON user_integrations;
CREATE POLICY "Users can insert their own integrations" ON user_integrations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own integrations
DROP POLICY IF EXISTS "Users can update their own integrations" ON user_integrations;
CREATE POLICY "Users can update their own integrations" ON user_integrations
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own integrations
DROP POLICY IF EXISTS "Users can delete their own integrations" ON user_integrations;
CREATE POLICY "Users can delete their own integrations" ON user_integrations
  FOR DELETE USING (auth.uid() = user_id);
