-- FIX DAILY HABITS TABLE - Ensure all required columns exist
-- Run this in your Supabase SQL Editor to fix the daily_habits table

-- Create the daily_habits table if it doesn't exist
CREATE TABLE IF NOT EXISTS daily_habits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    points_per_completion INTEGER NOT NULL DEFAULT 25,
    is_active BOOLEAN DEFAULT TRUE,
    weekly_completion_count INTEGER DEFAULT 0,
    last_completed TIMESTAMP WITH TIME ZONE,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add weekly_completion_count if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_habits' AND column_name = 'weekly_completion_count') THEN
        ALTER TABLE daily_habits ADD COLUMN weekly_completion_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add last_completed if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_habits' AND column_name = 'last_completed') THEN
        ALTER TABLE daily_habits ADD COLUMN last_completed TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add order_index if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_habits' AND column_name = 'order_index') THEN
        ALTER TABLE daily_habits ADD COLUMN order_index INTEGER DEFAULT 0;
    END IF;
    
    -- Add description if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_habits' AND column_name = 'description') THEN
        ALTER TABLE daily_habits ADD COLUMN description TEXT DEFAULT '';
    END IF;
END $$;

-- Enable RLS
ALTER TABLE daily_habits ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own habits" ON daily_habits;
DROP POLICY IF EXISTS "Users can insert their own habits" ON daily_habits;
DROP POLICY IF EXISTS "Users can update their own habits" ON daily_habits;
DROP POLICY IF EXISTS "Users can delete their own habits" ON daily_habits;

-- Create RLS policies
CREATE POLICY "Users can view their own habits" 
    ON daily_habits FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own habits" 
    ON daily_habits FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own habits" 
    ON daily_habits FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own habits" 
    ON daily_habits FOR DELETE 
    USING (auth.uid() = user_id);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_daily_habits_user_id ON daily_habits(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_habits_order_index ON daily_habits(order_index);

-- Success message
SELECT 'DAILY HABITS TABLE FIXED! All required columns and policies have been created.' as result;

