-- Get table structures for all key tables
-- Run these queries one at a time in Supabase SQL Editor

-- 1. Goals table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'goals' 
ORDER BY ordinal_position;

-- 2. Tasks table structure  
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'tasks' 
ORDER BY ordinal_position;

-- 3. Points_ledger table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'points_ledger' 
ORDER BY ordinal_position;

-- 4. User_activity_logs table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'user_activity_logs' 
ORDER BY ordinal_position;

-- 5. Sample data from goals table
SELECT * FROM goals LIMIT 3;

-- 6. Sample data from tasks table
SELECT * FROM tasks LIMIT 3;

-- 7. Sample data from points_ledger table
SELECT * FROM points_ledger LIMIT 3;
