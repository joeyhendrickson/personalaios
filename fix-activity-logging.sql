-- ============================================
-- FIX ACTIVITY LOGGING FUNCTIONS
-- ============================================
-- This script fixes the broken activity logging functions
-- ============================================

-- Check if the function exists
SELECT 
  'Function Check:' as status,
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name = 'log_user_activity';

-- Create or replace the log_user_activity function
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_activity_type VARCHAR(100),
    p_activity_data JSONB DEFAULT NULL,
    p_page_url VARCHAR(500) DEFAULT NULL,
    p_session_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_activity_logs (
        user_id,
        activity_type,
        activity_data,
        page_url,
        session_id
    ) VALUES (
        p_user_id,
        p_activity_type,
        p_activity_data,
        p_page_url,
        p_session_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create or replace the update_user_analytics function
CREATE OR REPLACE FUNCTION update_user_analytics(
    p_user_id UUID,
    p_activity_type VARCHAR(100)
)
RETURNS VOID AS $$
BEGIN
    -- Update analytics summary based on activity type
    IF p_activity_type = 'task_created' THEN
        UPDATE user_analytics_summary 
        SET total_tasks_created = total_tasks_created + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSIF p_activity_type = 'goal_created' THEN
        UPDATE user_analytics_summary 
        SET total_goals_created = total_goals_created + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSIF p_activity_type = 'task_completed' THEN
        UPDATE user_analytics_summary 
        SET total_tasks_completed = total_tasks_completed + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSIF p_activity_type = 'goal_completed' THEN
        UPDATE user_analytics_summary 
        SET total_goals_completed = total_goals_completed + 1,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    ELSIF p_activity_type = 'page_visit' THEN
        UPDATE user_analytics_summary 
        SET total_visits = total_visits + 1,
            last_visit = NOW(),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION log_user_activity TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_analytics TO authenticated;

-- Test the functions
SELECT 'Testing log_user_activity function...' as status;
SELECT log_user_activity(
    (SELECT id FROM auth.users WHERE email = 'josephgregoryhendrickson@gmail.com' LIMIT 1),
    'page_visit',
    '{"test": true}'::jsonb,
    '/test',
    NULL
);

-- Test the analytics function
SELECT 'Testing update_user_analytics function...' as status;
SELECT update_user_analytics(
    (SELECT id FROM auth.users WHERE email = 'josephgregoryhendrickson@gmail.com' LIMIT 1),
    'page_visit'
);

-- Clean up test data
DELETE FROM user_activity_logs WHERE activity_data->>'test' = 'true';

-- ============================================
-- NEXT STEPS:
-- ============================================
-- 1. Run this script to fix the activity logging functions
-- 2. Test the admin API again
-- 3. The 500 errors should be resolved
-- ============================================
