-- Fitness Goals: allow marking a goal as completed and keep a record of it.
-- A goal is "completed" when completed_at IS NOT NULL.

ALTER TABLE fitness_goals
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_fitness_goals_completed_at
  ON fitness_goals(user_id, completed_at);
