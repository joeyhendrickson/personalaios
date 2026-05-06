-- Saved grocery receipt analyses (module: grocery-optimizer)
-- The app stores analysis JSON for users to revisit past runs.

CREATE TABLE IF NOT EXISTS grocery_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  zip_code TEXT NOT NULL,
  total_spending DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_savings DECIMAL(10, 2) NOT NULL DEFAULT 0,
  recommended_store TEXT,
  analysis_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE grocery_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own grocery analyses" ON grocery_analyses
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own grocery analyses" ON grocery_analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own grocery analyses" ON grocery_analyses
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_grocery_analyses_user_id ON grocery_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_analyses_created_at ON grocery_analyses(created_at);

