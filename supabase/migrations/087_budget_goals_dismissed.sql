-- Allow users to dismiss budget goal dashboard recommendations without deleting the source goal.

ALTER TABLE budget_goals
  ADD COLUMN IF NOT EXISTS dismissed_from_dashboard_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_budget_goals_dismissed_from_dashboard
  ON budget_goals(user_id, dismissed_from_dashboard_at);
