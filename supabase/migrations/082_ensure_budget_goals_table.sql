-- Create budget_goals if missing, then ensure Budget Advisor schema + RLS.
-- Safe to run when 081 failed with: relation "budget_goals" does not exist

CREATE TABLE IF NOT EXISTS budget_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  goal_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
  goal_category VARCHAR(50) NOT NULL DEFAULT 'budget_reduction',
  target_value DECIMAL(15, 2),
  target_unit VARCHAR(50) DEFAULT 'dollars',
  priority_level INTEGER DEFAULT 3,
  start_date DATE,
  target_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  is_added_to_dashboard BOOLEAN DEFAULT FALSE,
  added_to_dashboard_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE budget_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own budget goals" ON budget_goals;
CREATE POLICY "Users can view their own budget goals"
  ON budget_goals FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own budget goals" ON budget_goals;
CREATE POLICY "Users can insert their own budget goals"
  ON budget_goals FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own budget goals" ON budget_goals;
CREATE POLICY "Users can update their own budget goals"
  ON budget_goals FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own budget goals" ON budget_goals;
CREATE POLICY "Users can delete their own budget goals"
  ON budget_goals FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_budget_goals_user_id ON budget_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_budget_goals_status ON budget_goals(status);
CREATE INDEX IF NOT EXISTS idx_budget_goals_category ON budget_goals(goal_category);
CREATE INDEX IF NOT EXISTS idx_budget_goals_added_to_dashboard ON budget_goals(is_added_to_dashboard);

DROP TRIGGER IF EXISTS update_budget_goals_updated_at ON budget_goals;
CREATE TRIGGER update_budget_goals_updated_at
  BEFORE UPDATE ON budget_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Legacy column upgrades (no-op when table was just created)
ALTER TABLE budget_goals DROP CONSTRAINT IF EXISTS budget_goals_status_check;
ALTER TABLE budget_goals DROP CONSTRAINT IF EXISTS budget_goals_priority_check;
ALTER TABLE budget_goals DROP CONSTRAINT IF EXISTS budget_goals_goal_type_check;
ALTER TABLE budget_goals DROP CONSTRAINT IF EXISTS budget_goals_goal_category_check;
ALTER TABLE budget_goals DROP CONSTRAINT IF EXISTS budget_goals_priority_level_check;

ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS goal_type VARCHAR(20);
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS goal_category VARCHAR(50);
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS target_value DECIMAL(15, 2);
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS target_unit VARCHAR(50) DEFAULT 'dollars';
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 3;
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS is_added_to_dashboard BOOLEAN DEFAULT FALSE;
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS added_to_dashboard_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'budget_goals' AND column_name = 'name'
  ) THEN
    EXECUTE 'UPDATE budget_goals SET title = name WHERE title IS NULL AND name IS NOT NULL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'budget_goals' AND column_name = 'target_amount'
  ) THEN
    EXECUTE 'UPDATE budget_goals SET target_value = target_amount WHERE target_value IS NULL AND target_amount IS NOT NULL';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'budget_goals' AND column_name = 'priority'
  ) THEN
    EXECUTE $sql$
      UPDATE budget_goals SET priority_level = COALESCE(
        priority_level,
        CASE priority WHEN 'high' THEN 1 WHEN 'low' THEN 5 ELSE 3 END,
        3
      ) WHERE priority_level IS NULL
    $sql$;
  END IF;
END $$;

UPDATE budget_goals SET goal_type = COALESCE(goal_type, 'monthly') WHERE goal_type IS NULL;
UPDATE budget_goals SET goal_category = COALESCE(goal_category, 'budget_reduction') WHERE goal_category IS NULL;
UPDATE budget_goals SET target_unit = COALESCE(target_unit, 'dollars') WHERE target_unit IS NULL;
UPDATE budget_goals SET priority_level = COALESCE(priority_level, 3) WHERE priority_level IS NULL;
UPDATE budget_goals SET status = COALESCE(NULLIF(status, 'paused'), 'pending')
  WHERE status IS NULL OR status = 'paused';
UPDATE budget_goals SET is_added_to_dashboard = COALESCE(is_added_to_dashboard, FALSE)
  WHERE is_added_to_dashboard IS NULL;
UPDATE budget_goals SET title = 'Budget goal' WHERE title IS NULL;

ALTER TABLE budget_goals DROP COLUMN IF EXISTS name;
ALTER TABLE budget_goals DROP COLUMN IF EXISTS target_amount;
ALTER TABLE budget_goals DROP COLUMN IF EXISTS current_amount;
ALTER TABLE budget_goals DROP COLUMN IF EXISTS category_id;
ALTER TABLE budget_goals DROP COLUMN IF EXISTS priority;

ALTER TABLE budget_goals ALTER COLUMN title SET NOT NULL;
ALTER TABLE budget_goals ALTER COLUMN goal_type SET NOT NULL;
ALTER TABLE budget_goals ALTER COLUMN goal_category SET NOT NULL;
ALTER TABLE budget_goals ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE budget_goals ADD CONSTRAINT budget_goals_goal_type_check
  CHECK (goal_type IN ('weekly', 'monthly', 'quarterly', 'yearly'));
ALTER TABLE budget_goals ADD CONSTRAINT budget_goals_goal_category_check
  CHECK (goal_category IN ('income', 'budget_reduction'));
ALTER TABLE budget_goals ADD CONSTRAINT budget_goals_priority_level_check
  CHECK (priority_level BETWEEN 1 AND 5);
ALTER TABLE budget_goals ADD CONSTRAINT budget_goals_status_check
  CHECK (status IN ('pending', 'active', 'completed', 'cancelled'));
