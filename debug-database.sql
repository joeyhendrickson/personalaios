-- Debug queries to check what's in your database
-- Run these in Supabase SQL Editor

-- 1. Check if you have any weeks
SELECT id, week_start, week_end, created_at FROM weeks ORDER BY week_start DESC LIMIT 5;

-- 2. Check if you have any weekly_goals
SELECT id, title, category, target_points, current_points, week_id, user_id FROM weekly_goals LIMIT 10;

-- 3. Check if there's a current week
SELECT w.id, w.week_start, w.week_end, COUNT(wg.id) as goal_count 
FROM weeks w 
LEFT JOIN weekly_goals wg ON w.id = wg.week_id 
GROUP BY w.id, w.week_start, w.week_end 
ORDER BY w.week_start DESC 
LIMIT 3;

-- 4. Check user_id format (to see if it matches auth.users)
SELECT DISTINCT user_id FROM weekly_goals LIMIT 5;





