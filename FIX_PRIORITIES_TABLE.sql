-- FIX PRIORITIES TABLE - Add missing source_type column
-- Run this in your Supabase SQL Editor to fix the recurring error

-- Add source_type column to priorities table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'priorities' AND column_name = 'source_type') THEN
        ALTER TABLE priorities ADD COLUMN source_type TEXT;
    END IF;
END $$;

-- Success message
SELECT 'PRIORITIES TABLE FIXED! The source_type column has been added.' as result;

