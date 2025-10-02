-- FITNESS WEEKLY STRUCTURE FIX - Add weekly_structure column to workout_plans
-- Run this in your Supabase SQL Editor to support detailed weekly workout plans

-- Add weekly_structure column to workout_plans table
DO $$ 
BEGIN
    -- Add weekly_structure column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workout_plans' AND column_name = 'weekly_structure') THEN
        ALTER TABLE workout_plans ADD COLUMN weekly_structure JSONB;
    END IF;
    
    -- Add progression_strategy column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'workout_plans' AND column_name = 'progression_strategy') THEN
        ALTER TABLE workout_plans ADD COLUMN progression_strategy JSONB;
    END IF;
END $$;

-- Success message
SELECT 'WEEKLY STRUCTURE FIX COMPLETED! The workout_plans table now supports detailed weekly structure and progression strategy.' as result;
