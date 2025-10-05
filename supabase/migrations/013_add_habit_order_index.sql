-- Add order_index field to daily_habits table for custom ordering

-- Add order_index column to daily_habits table
ALTER TABLE daily_habits ADD COLUMN order_index INTEGER DEFAULT 0;

-- Create index for better performance on ordering
CREATE INDEX idx_daily_habits_order ON daily_habits(order_index);

-- Update existing habits to have sequential order_index values
-- This will set order_index based on created_at (newest first, so they appear in reverse creation order)
WITH ordered_habits AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as new_order
  FROM daily_habits
)
UPDATE daily_habits 
SET order_index = ordered_habits.new_order - 1
FROM ordered_habits 
WHERE daily_habits.id = ordered_habits.id;

-- Set NOT NULL constraint after populating existing data
ALTER TABLE daily_habits ALTER COLUMN order_index SET NOT NULL;



