-- Saved AI budget analyses from the Budget Advisor module.

CREATE TABLE IF NOT EXISTS budget_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  analysis_period_start DATE NOT NULL,
  analysis_period_end DATE NOT NULL,
  analysis_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_analyses_user_created
  ON budget_analyses(user_id, created_at DESC);

ALTER TABLE budget_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own budget analyses" ON budget_analyses;
CREATE POLICY "Users can view their own budget analyses"
  ON budget_analyses FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own budget analyses" ON budget_analyses;
CREATE POLICY "Users can insert their own budget analyses"
  ON budget_analyses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own budget analyses" ON budget_analyses;
CREATE POLICY "Users can delete their own budget analyses"
  ON budget_analyses FOR DELETE
  USING (auth.uid() = user_id);
