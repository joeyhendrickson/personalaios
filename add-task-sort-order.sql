-- Add sort_order column to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Set initial sort_order values based on created_at (newer tasks get lower sort_order for top priority)
UPDATE tasks 
SET sort_order = (
  SELECT COUNT(*) + 1 
  FROM tasks t2 
  WHERE t2.created_at > tasks.created_at 
  AND t2.user_id = tasks.user_id
)
WHERE sort_order = 0;

-- Create index for better performance on sorting
CREATE INDEX IF NOT EXISTS idx_tasks_user_sort_order ON tasks(user_id, sort_order);

-- Add comment to document the column
COMMENT ON COLUMN tasks.sort_order IS 'Order for manual task reordering. Lower numbers appear first.';
