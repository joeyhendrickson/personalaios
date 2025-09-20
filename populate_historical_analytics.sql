-- Populate user_analytics_summary with historical data from existing tables

-- First, let's see what data we have
SELECT 'Tasks count:' as info, COUNT(*) as count FROM tasks
UNION ALL
SELECT 'Goals count:', COUNT(*) FROM weekly_goals  
UNION ALL
SELECT 'Points count:', COUNT(*) FROM points_ledger
UNION ALL
SELECT 'Users count:', COUNT(*) FROM auth.users;

-- Insert/update analytics for all existing users
INSERT INTO user_analytics_summary (user_id, total_tasks_created, total_goals_created, total_tasks_completed, total_goals_completed, first_visit, last_visit)
SELECT 
    u.id as user_id,
    COALESCE(task_stats.total_created, 0) as total_tasks_created,
    COALESCE(goal_stats.total_created, 0) as total_goals_created,
    COALESCE(task_stats.total_completed, 0) as total_tasks_completed,
    COALESCE(goal_stats.total_completed, 0) as total_goals_completed,
    u.created_at as first_visit,
    GREATEST(
        COALESCE(task_stats.last_activity, u.created_at),
        COALESCE(goal_stats.last_activity, u.created_at),
        COALESCE(points_stats.last_activity, u.created_at)
    ) as last_visit
FROM auth.users u
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_created,
        COUNT(*) FILTER (WHERE status = 'completed') as total_completed,
        MAX(updated_at) as last_activity
    FROM tasks 
    GROUP BY user_id
) task_stats ON u.id = task_stats.user_id
LEFT JOIN (
    SELECT 
        user_id,
        COUNT(*) as total_created,
        COUNT(*) FILTER (WHERE is_completed = true) as total_completed,
        MAX(updated_at) as last_activity
    FROM weekly_goals 
    GROUP BY user_id
) goal_stats ON u.id = goal_stats.user_id
LEFT JOIN (
    SELECT 
        user_id,
        MAX(created_at) as last_activity
    FROM points_ledger 
    GROUP BY user_id
) points_stats ON u.id = points_stats.user_id
ON CONFLICT (user_id) DO UPDATE SET
    total_tasks_created = EXCLUDED.total_tasks_created,
    total_goals_created = EXCLUDED.total_goals_created,
    total_tasks_completed = EXCLUDED.total_tasks_completed,
    total_goals_completed = EXCLUDED.total_goals_completed,
    last_visit = EXCLUDED.last_visit,
    updated_at = NOW();

-- Show the results
SELECT 'Updated analytics for users:' as info, COUNT(*) as count FROM user_analytics_summary;
