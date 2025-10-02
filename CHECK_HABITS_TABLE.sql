-- CHECK HABITS TABLE STRUCTURE
-- Run this in your Supabase SQL Editor to check the daily_habits table

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'daily_habits'
ORDER BY ordinal_position;

