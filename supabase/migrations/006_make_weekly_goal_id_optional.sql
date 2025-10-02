-- Migration: Make weekly_goal_id optional in tasks table
-- This allows tasks to exist without being associated with a specific goal

-- Remove the NOT NULL constraint from weekly_goal_id
ALTER TABLE tasks ALTER COLUMN weekly_goal_id DROP NOT NULL;

-- Remove the constraint that requires weekly_goal_id to be not null
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_must_have_goal;

-- Update the foreign key constraint to allow NULL values
-- (The existing foreign key constraint should already allow NULL, but let's be explicit)
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_weekly_goal_id_fkey;
ALTER TABLE tasks ADD CONSTRAINT tasks_weekly_goal_id_fkey 
    FOREIGN KEY (weekly_goal_id) REFERENCES weekly_goals(id) ON DELETE CASCADE;



