-- Fix category column to allow user-created categories
-- This changes the weekly_goals.category column from goal_category enum to VARCHAR

-- First, create a backup column to store the old category values
ALTER TABLE weekly_goals ADD COLUMN category_backup TEXT;

-- Copy existing category values to the backup column
UPDATE weekly_goals SET category_backup = category::TEXT;

-- Drop the existing column constraint
ALTER TABLE weekly_goals DROP CONSTRAINT IF EXISTS weekly_goals_category_check;

-- Change the column type from goal_category enum to VARCHAR
ALTER TABLE weekly_goals ALTER COLUMN category TYPE VARCHAR(100);

-- Copy data from backup column
UPDATE weekly_goals SET category = category_backup;

-- Drop the backup column
ALTER TABLE weekly_goals DROP COLUMN category_backup;

-- Also update the tasks table category column
ALTER TABLE tasks ADD COLUMN category_backup TEXT;
UPDATE tasks SET category_backup = category::TEXT;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_category_check;
ALTER TABLE tasks ALTER COLUMN category TYPE VARCHAR(100);
UPDATE tasks SET category = category_backup;
ALTER TABLE tasks DROP COLUMN category_backup;

-- Add comments for documentation
COMMENT ON COLUMN weekly_goals.category IS 'Category name - can be any string to support user-created categories';
COMMENT ON COLUMN tasks.category IS 'Category name - can be any string to support user-created categories';
