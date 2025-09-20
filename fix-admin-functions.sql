-- ============================================
-- FIX ADMIN FUNCTIONS
-- ============================================
-- This script fixes the column reference issues in admin functions
-- ============================================

-- Fix the get_admin_dashboard_data function
CREATE OR REPLACE FUNCTION get_admin_dashboard_data()
RETURNS TABLE (
    total_users INTEGER,
    active_users_today INTEGER,
    total_tasks_created INTEGER,
    total_goals_created INTEGER,
    total_tasks_completed INTEGER,
    total_goals_completed INTEGER,
    average_session_duration NUMERIC,
    top_active_users JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM auth.users) as total_users,
        (SELECT COUNT(DISTINCT user_id)::INTEGER FROM user_activity_logs WHERE created_at >= CURRENT_DATE) as active_users_today,
        (SELECT COALESCE(SUM(ua.total_tasks_created), 0)::INTEGER FROM user_analytics_summary ua) as total_tasks_created,
        (SELECT COALESCE(SUM(ua.total_goals_created), 0)::INTEGER FROM user_analytics_summary ua) as total_goals_created,
        (SELECT COALESCE(SUM(ua.total_tasks_completed), 0)::INTEGER FROM user_analytics_summary ua) as total_tasks_completed,
        (SELECT COALESCE(SUM(ua.total_goals_completed), 0)::INTEGER FROM user_analytics_summary ua) as total_goals_completed,
        (SELECT COALESCE(AVG(us.total_duration), 0) FROM user_sessions us WHERE us.session_end IS NOT NULL) as average_session_duration,
        (SELECT jsonb_agg(
            jsonb_build_object(
                'email', u.email,
                'total_visits', COALESCE(ua.total_visits, 0),
                'total_time_spent', COALESCE(ua.total_time_spent, 0),
                'last_visit', ua.last_visit,
                'tasks_created', COALESCE(ua.total_tasks_created, 0),
                'goals_created', COALESCE(ua.total_goals_created, 0)
            )
        ) FROM auth.users u
        LEFT JOIN user_analytics_summary ua ON u.id = ua.user_id
        ORDER BY COALESCE(ua.total_visits, 0) DESC
        LIMIT 10) as top_active_users;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_admin_dashboard_data() TO authenticated;

-- Test the function
SELECT * FROM get_admin_dashboard_data();

-- ============================================
-- NEXT STEPS:
-- ============================================
-- 1. Run this script to fix the function
-- 2. Try accessing the admin dashboard again
-- 3. The admin analytics should now work properly
-- ============================================
