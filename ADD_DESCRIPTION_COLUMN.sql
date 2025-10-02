-- Add missing description column to fitness_goals table
-- Run this in your Supabase SQL Editor

ALTER TABLE fitness_goals 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'fitness_goals' 
AND table_schema = 'public'
ORDER BY ordinal_position;
