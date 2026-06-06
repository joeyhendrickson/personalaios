-- Persist the full AI-generated plan content so plans render, can be edited,
-- and can power habit/task suggestions. These columns were referenced by the
-- generation code but never created in the base fitness schema (migration 016).

ALTER TABLE workout_plans
  ADD COLUMN IF NOT EXISTS weekly_structure JSONB,
  ADD COLUMN IF NOT EXISTS progression_strategy JSONB;

ALTER TABLE nutrition_plans
  ADD COLUMN IF NOT EXISTS diet_type TEXT,
  ADD COLUMN IF NOT EXISTS diet_modifications TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meal_plan JSONB,
  ADD COLUMN IF NOT EXISTS shopping_list JSONB,
  ADD COLUMN IF NOT EXISTS recommendations JSONB;
