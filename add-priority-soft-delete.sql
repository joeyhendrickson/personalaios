-- Add soft delete columns to priorities table
ALTER TABLE priorities ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE;
ALTER TABLE priorities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance on filtering
CREATE INDEX IF NOT EXISTS idx_priorities_user_deleted ON priorities(user_id, is_deleted, deleted_at);

-- Add comment to document the columns
COMMENT ON COLUMN priorities.is_deleted IS 'Soft delete flag - true when priority is deleted';
COMMENT ON COLUMN priorities.deleted_at IS 'Timestamp when priority was soft deleted';

-- Update existing priorities to ensure they are not marked as deleted
UPDATE priorities SET is_deleted = FALSE WHERE is_deleted IS NULL;
