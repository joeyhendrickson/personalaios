-- Apply Habit Order Index Migration
-- This migration adds order_index column to daily_habits table for custom ordering

-- Add order_index column to daily_habits table
ALTER TABLE daily_habits ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

-- Create index for better performance on ordering
CREATE INDEX IF NOT EXISTS idx_daily_habits_order ON daily_habits(order_index);

-- Update existing habits to have sequential order_index values
-- This will set order_index based on created_at (newest first, so they appear in reverse creation order)
WITH ordered_habits AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as new_order
  FROM daily_habits
  WHERE order_index IS NULL OR order_index = 0
)
UPDATE daily_habits 
SET order_index = ordered_habits.new_order - 1
FROM ordered_habits 
WHERE daily_habits.id = ordered_habits.id;

-- Set NOT NULL constraint after populating existing data
ALTER TABLE daily_habits ALTER COLUMN order_index SET NOT NULL;

-- Verify the migration was successful
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'daily_habits' 
    AND column_name = 'order_index';

-- Show sample data with order_index
SELECT id, title, order_index, created_at 
FROM daily_habits 
ORDER BY user_id, order_index 
LIMIT 10;
