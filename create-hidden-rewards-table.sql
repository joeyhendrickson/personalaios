-- Create hidden_rewards table to track which rewards users have hidden from their view
CREATE TABLE IF NOT EXISTS hidden_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, reward_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_hidden_rewards_user_id ON hidden_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_hidden_rewards_reward_id ON hidden_rewards(reward_id);

-- Enable Row Level Security
ALTER TABLE hidden_rewards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own hidden rewards
CREATE POLICY "Users can view their own hidden rewards"
  ON hidden_rewards FOR SELECT
  USING (auth.uid() = user_id);

-- Users can hide rewards (insert)
CREATE POLICY "Users can hide rewards"
  ON hidden_rewards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unhide their rewards (delete)
CREATE POLICY "Users can unhide rewards"
  ON hidden_rewards FOR DELETE
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON hidden_rewards TO authenticated;
GRANT ALL ON hidden_rewards TO service_role;

