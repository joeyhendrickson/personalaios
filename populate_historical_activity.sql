-- Populate user_activity_logs with historical data

-- Insert historical task activities
INSERT INTO user_activity_logs (user_id, activity_type, activity_data, created_at)
SELECT 
    user_id,
    'task_created' as activity_type,
    jsonb_build_object('task_id', id, 'title', title) as activity_data,
    created_at
FROM tasks
WHERE created_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- Insert historical goal activities  
INSERT INTO user_activity_logs (user_id, activity_type, activity_data, created_at)
SELECT 
    user_id,
    'goal_created' as activity_type,
    jsonb_build_object('goal_id', id, 'title', title) as activity_data,
    created_at
FROM weekly_goals
WHERE created_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- Insert historical task completion activities
INSERT INTO user_activity_logs (user_id, activity_type, activity_data, created_at)
SELECT 
    user_id,
    'task_completed' as activity_type,
    jsonb_build_object('task_id', id, 'title', title) as activity_data,
    completed_at
FROM tasks
WHERE status = 'completed' AND completed_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- Insert historical goal completion activities
INSERT INTO user_activity_logs (user_id, activity_type, activity_data, created_at)
SELECT 
    user_id,
    'goal_completed' as activity_type,
    jsonb_build_object('goal_id', id, 'title', title) as activity_data,
    updated_at
FROM weekly_goals
WHERE is_completed = true AND updated_at IS NOT NULL
ON CONFLICT DO NOTHING;

-- Show the results
SELECT 'Total activity logs:' as info, COUNT(*) as count FROM user_activity_logs;
