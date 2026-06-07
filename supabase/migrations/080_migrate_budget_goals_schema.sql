-- Upgrade budget_goals from legacy schema (015) to Budget Advisor schema (030).
-- Migration 030 used CREATE TABLE IF NOT EXISTS, so existing DBs kept the old columns.

ALTER TABLE budget_goals DROP CONSTRAINT IF EXISTS budget_goals_status_check;
ALTER TABLE budget_goals DROP CONSTRAINT IF EXISTS budget_goals_priority_check;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'budget_goals' AND column_name = 'name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'budget_goals' AND column_name = 'title'
  ) THEN
    ALTER TABLE budget_goals ADD COLUMN title VARCHAR(255);
    ALTER TABLE budget_goals ADD COLUMN goal_type VARCHAR(20);
    ALTER TABLE budget_goals ADD COLUMN goal_category VARCHAR(50);
    ALTER TABLE budget_goals ADD COLUMN target_value DECIMAL(15, 2);
    ALTER TABLE budget_goals ADD COLUMN target_unit VARCHAR(50) DEFAULT 'dollars';
    ALTER TABLE budget_goals ADD COLUMN priority_level INTEGER DEFAULT 3;
    ALTER TABLE budget_goals ADD COLUMN start_date DATE;
    ALTER TABLE budget_goals ADD COLUMN is_added_to_dashboard BOOLEAN DEFAULT FALSE;
    ALTER TABLE budget_goals ADD COLUMN added_to_dashboard_at TIMESTAMPTZ;

    UPDATE budget_goals SET
      title = name,
      target_value = target_amount,
      goal_type = COALESCE(goal_type, 'monthly'),
      goal_category = COALESCE(goal_category, 'budget_reduction'),
      target_unit = COALESCE(target_unit, 'dollars'),
      priority_level = CASE priority
        WHEN 'high' THEN 1
        WHEN 'low' THEN 5
        ELSE 3
      END,
      status = CASE status
        WHEN 'paused' THEN 'active'
        WHEN 'active' THEN 'active'
        WHEN 'completed' THEN 'completed'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE 'pending'
      END
    WHERE title IS NULL;

    ALTER TABLE budget_goals DROP COLUMN IF EXISTS name;
    ALTER TABLE budget_goals DROP COLUMN IF EXISTS target_amount;
    ALTER TABLE budget_goals DROP COLUMN IF EXISTS current_amount;
    ALTER TABLE budget_goals DROP COLUMN IF EXISTS category_id;
    ALTER TABLE budget_goals DROP COLUMN IF EXISTS priority;
  END IF;
END $$;

ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS title VARCHAR(255);
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS goal_type VARCHAR(20);
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS goal_category VARCHAR(50);
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS target_value DECIMAL(15, 2);
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS target_unit VARCHAR(50) DEFAULT 'dollars';
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS priority_level INTEGER DEFAULT 3;
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS is_added_to_dashboard BOOLEAN DEFAULT FALSE;
ALTER TABLE budget_goals ADD COLUMN IF NOT EXISTS added_to_dashboard_at TIMESTAMPTZ;

UPDATE budget_goals SET goal_type = 'monthly' WHERE goal_type IS NULL;
UPDATE budget_goals SET goal_category = 'budget_reduction' WHERE goal_category IS NULL;
UPDATE budget_goals SET target_unit = 'dollars' WHERE target_unit IS NULL;
UPDATE budget_goals SET priority_level = 3 WHERE priority_level IS NULL;
UPDATE budget_goals SET status = 'pending' WHERE status IS NULL;
UPDATE budget_goals SET is_added_to_dashboard = FALSE WHERE is_added_to_dashboard IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM budget_goals WHERE title IS NULL
  ) THEN
    UPDATE budget_goals SET title = 'Budget goal' WHERE title IS NULL;
  END IF;
END $$;

ALTER TABLE budget_goals ALTER COLUMN title SET NOT NULL;
ALTER TABLE budget_goals ALTER COLUMN goal_type SET NOT NULL;
ALTER TABLE budget_goals ALTER COLUMN goal_category SET NOT NULL;
ALTER TABLE budget_goals ALTER COLUMN status SET DEFAULT 'pending';

ALTER TABLE budget_goals DROP CONSTRAINT IF EXISTS budget_goals_goal_type_check;
ALTER TABLE budget_goals ADD CONSTRAINT budget_goals_goal_type_check
  CHECK (goal_type IN ('weekly', 'monthly', 'quarterly', 'yearly'));

ALTER TABLE budget_goals DROP CONSTRAINT IF EXISTS budget_goals_goal_category_check;
ALTER TABLE budget_goals ADD CONSTRAINT budget_goals_goal_category_check
  CHECK (goal_category IN ('income', 'budget_reduction'));

ALTER TABLE budget_goals DROP CONSTRAINT IF EXISTS budget_goals_priority_level_check;
ALTER TABLE budget_goals ADD CONSTRAINT budget_goals_priority_level_check
  CHECK (priority_level BETWEEN 1 AND 5);

ALTER TABLE budget_goals DROP CONSTRAINT IF EXISTS budget_goals_status_check;
ALTER TABLE budget_goals ADD CONSTRAINT budget_goals_status_check
  CHECK (status IN ('pending', 'active', 'completed', 'cancelled'));

CREATE INDEX IF NOT EXISTS idx_budget_goals_category ON budget_goals(goal_category);
CREATE INDEX IF NOT EXISTS idx_budget_goals_added_to_dashboard ON budget_goals(is_added_to_dashboard);
