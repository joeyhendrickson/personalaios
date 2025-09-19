-- Fix weekly_goals table to match API expectations
-- Run this in Supabase SQL Editor

-- Add missing columns if they don't exist
ALTER TABLE weekly_goals 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';

ALTER TABLE weekly_goals 
ADD COLUMN IF NOT EXISTS deadline DATE;

-- Update the priority column to use the correct enum if needed
-- (This might already be handled by the goal_category enum)

-- Verify the table structure
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'weekly_goals' 
ORDER BY ordinal_position;

