-- Check what user data exists in the database
-- Run this in your Supabase SQL editor

-- Check if you have any tasks
SELECT 'tasks' as table_name, COUNT(*) as count, 
       COUNT(DISTINCT user_id) as unique_users,
       MIN(created_at) as earliest_record,
       MAX(created_at) as latest_record
FROM tasks

UNION ALL

-- Check if you have any goals  
SELECT 'goals' as table_name, COUNT(*) as count,
       COUNT(DISTINCT user_id) as unique_users,
       MIN(created_at) as earliest_record,
       MAX(created_at) as latest_record
FROM goals

UNION ALL

-- Check if you have any points
SELECT 'points_ledger' as table_name, COUNT(*) as count,
       COUNT(DISTINCT user_id) as unique_users,
       MIN(created_at) as earliest_record,
       MAX(created_at) as latest_record
FROM points_ledger

UNION ALL

-- Check if you have any priorities
SELECT 'priorities' as table_name, COUNT(*) as count,
       COUNT(DISTINCT user_id) as unique_users,
       MIN(created_at) as earliest_record,
       MAX(created_at) as latest_record
FROM priorities

UNION ALL

-- Check if you have any habits
SELECT 'daily_habits' as table_name, COUNT(*) as count,
       COUNT(DISTINCT user_id) as unique_users,
       MIN(created_at) as earliest_record,
       MAX(created_at) as latest_record
FROM daily_habits

UNION ALL

-- Check if you have any activity logs
SELECT 'user_activity_logs' as table_name, COUNT(*) as count,
       COUNT(DISTINCT user_id) as unique_users,
       MIN(created_at) as earliest_record,
       MAX(created_at) as latest_record
FROM user_activity_logs

ORDER BY table_name;

-- Also check what user IDs exist
SELECT 'user_ids_from_tasks' as source, user_id, COUNT(*) as records
FROM tasks 
GROUP BY user_id
UNION ALL
SELECT 'user_ids_from_goals' as source, user_id, COUNT(*) as records
FROM goals
GROUP BY user_id
UNION ALL
SELECT 'user_ids_from_points' as source, user_id, COUNT(*) as records
FROM points_ledger
GROUP BY user_id
ORDER BY source, records DESC;
