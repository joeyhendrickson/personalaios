-- Fix RLS policy for rewards table to allow users to create custom rewards
-- This adds the missing INSERT policy that was causing the "Failed to create reward" error

-- Add INSERT policy for users to create custom rewards
CREATE POLICY "Users can create custom rewards" ON rewards 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  is_custom = true
);

-- Grant necessary permissions
GRANT INSERT ON rewards TO authenticated;
