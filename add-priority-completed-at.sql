-- Add completed_at column to priorities table
-- This migration adds the missing completed_at column that the API expects

-- Add the completed_at column
ALTER TABLE priorities ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_priorities_completed_at ON priorities(completed_at);

-- Update existing completed priorities to have a completed_at timestamp
-- (This is optional - you can leave them as NULL if you prefer)
UPDATE priorities 
SET completed_at = updated_at 
WHERE is_completed = true AND completed_at IS NULL;