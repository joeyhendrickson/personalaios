-- Apply the rewards fix migration
-- Run this script to fix the rewards table and enable custom rewards

-- Add created_by column to rewards table
ALTER TABLE rewards 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Update RLS policies to handle created_by column
-- Drop existing policy
DROP POLICY IF EXISTS "Anyone can view rewards" ON rewards;

-- Create new policy that allows viewing default rewards and user's custom rewards
CREATE POLICY "Anyone can view rewards" ON rewards FOR SELECT 
USING (
  is_custom = false OR 
  (is_custom = true AND created_by = auth.uid())
);

-- Add policy for inserting custom rewards
CREATE POLICY "Users can create custom rewards" ON rewards FOR INSERT 
WITH CHECK (
  is_custom = true AND 
  created_by = auth.uid()
);

-- Add policy for updating custom rewards
CREATE POLICY "Users can update their custom rewards" ON rewards FOR UPDATE 
USING (
  is_custom = true AND 
  created_by = auth.uid()
);

-- Add policy for deleting custom rewards
CREATE POLICY "Users can delete their custom rewards" ON rewards FOR DELETE 
USING (
  is_custom = true AND 
  created_by = auth.uid()
);

-- Create index for better performance on created_by queries
CREATE INDEX IF NOT EXISTS idx_rewards_created_by ON rewards(created_by);
CREATE INDEX IF NOT EXISTS idx_rewards_is_custom ON rewards(is_custom);

-- Verify the changes
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'rewards' 
ORDER BY ordinal_position;
