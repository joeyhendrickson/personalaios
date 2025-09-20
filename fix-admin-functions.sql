-- Fix admin dashboard functions
-- Drop existing functions
DROP FUNCTION IF EXISTS get_admin_dashboard_data CASCADE;
DROP FUNCTION IF EXISTS get_all_users_with_analytics CASCADE;

-- Create get_admin_dashboard_data function
CREATE OR REPLACE FUNCTION get_admin_dashboard_data()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'total_users', (SELECT COUNT(*) FROM auth.users),
        'active_users_today', (
            SELECT COUNT(DISTINCT user_id) 
            FROM user_analytics_summary 
            WHERE last_visit >= CURRENT_DATE
        ),
        'total_tasks_created', (
            SELECT COALESCE(SUM(total_tasks_created), 0) 
            FROM user_analytics_summary
        ),
        'total_goals_created', (
            SELECT COALESCE(SUM(total_goals_created), 0) 
            FROM user_analytics_summary
        ),
        'total_tasks_completed', (
            SELECT COALESCE(SUM(total_tasks_completed), 0) 
            FROM user_analytics_summary
        ),
        'total_goals_completed', (
            SELECT COALESCE(SUM(total_goals_completed), 0) 
            FROM user_analytics_summary
        ),
        'average_session_duration', 0,
        'top_active_users', (
            SELECT COALESCE(json_agg(
                json_build_object(
                    'email', u.email,
                    'total_visits', COALESCE(ua.total_visits, 0),
                    'total_time_spent', COALESCE(ua.total_time_spent, 0),
                    'last_visit', ua.last_visit,
                    'tasks_created', COALESCE(ua.total_tasks_created, 0),
                    'goals_created', COALESCE(ua.total_goals_created, 0)
                )
            ), '[]'::json)
            FROM auth.users u
            LEFT JOIN user_analytics_summary ua ON u.id = ua.user_id
            ORDER BY COALESCE(ua.total_visits, 0) DESC
            LIMIT 5
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create get_all_users_with_analytics function
CREATE OR REPLACE FUNCTION get_all_users_with_analytics()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT COALESCE(json_agg(
        json_build_object(
            'user_id', u.id,
            'email', u.email,
            'created_at', u.created_at,
            'last_sign_in_at', u.last_sign_in_at,
            'total_visits', COALESCE(ua.total_visits, 0),
            'total_time_spent', COALESCE(ua.total_time_spent, 0),
            'total_tasks_created', COALESCE(ua.total_tasks_created, 0),
            'total_goals_created', COALESCE(ua.total_goals_created, 0),
            'total_tasks_completed', COALESCE(ua.total_tasks_completed, 0),
            'total_goals_completed', COALESCE(ua.total_goals_completed, 0),
            'last_visit', ua.last_visit,
            'first_visit', ua.first_visit
        )
    ), '[]'::json)
    INTO result
    FROM auth.users u
    LEFT JOIN user_analytics_summary ua ON u.id = ua.user_id
    ORDER BY u.created_at DESC;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_admin_dashboard_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_with_analytics TO authenticated;