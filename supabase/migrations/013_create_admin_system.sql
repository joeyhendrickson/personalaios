-- Migration: Create admin system with user analytics
-- This migration adds admin functionality and user activity tracking

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user activity tracking table
CREATE TABLE IF NOT EXISTS user_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type VARCHAR(100) NOT NULL, -- 'login', 'task_created', 'goal_created', 'task_completed', 'goal_completed', 'page_visit'
    activity_data JSONB, -- Additional data about the activity
    page_url VARCHAR(500), -- For page visits
    session_id VARCHAR(255), -- To track sessions
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user sessions table for tracking time spent
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    total_duration INTEGER DEFAULT 0, -- in seconds
    page_views INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true
);

-- Create user analytics summary table (for performance)
CREATE TABLE IF NOT EXISTS user_analytics_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_visits INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- in seconds
    total_tasks_created INTEGER DEFAULT 0,
    total_goals_created INTEGER DEFAULT 0,
    total_tasks_completed INTEGER DEFAULT 0,
    total_goals_completed INTEGER DEFAULT 0,
    last_visit TIMESTAMP WITH TIME ZONE,
    first_visit TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_created_at ON user_activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_summary_user_id ON user_analytics_summary(user_id);

-- Enable RLS on all tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics_summary ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users (only admins can access)
CREATE POLICY "Only admins can view admin users" ON admin_users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE email = auth.jwt() ->> 'email' 
            AND is_active = true
        )
    );

CREATE POLICY "Only super admins can insert admin users" ON admin_users
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE email = auth.jwt() ->> 'email' 
            AND role = 'super_admin' 
            AND is_active = true
        )
    );

-- RLS Policies for user_activity_logs (admins can view all, users can view their own)
CREATE POLICY "Admins can view all activity logs" ON user_activity_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE email = auth.jwt() ->> 'email' 
            AND is_active = true
        )
    );

CREATE POLICY "Users can view their own activity logs" ON user_activity_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert activity logs" ON user_activity_logs
    FOR INSERT WITH CHECK (true); -- Allow system to insert logs

-- RLS Policies for user_sessions (admins can view all, users can view their own)
CREATE POLICY "Admins can view all user sessions" ON user_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE email = auth.jwt() ->> 'email' 
            AND is_active = true
        )
    );

CREATE POLICY "Users can view their own sessions" ON user_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage user sessions" ON user_sessions
    FOR ALL USING (true); -- Allow system to manage sessions

-- RLS Policies for user_analytics_summary (admins can view all, users can view their own)
CREATE POLICY "Admins can view all analytics" ON user_analytics_summary
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE email = auth.jwt() ->> 'email' 
            AND is_active = true
        )
    );

CREATE POLICY "Users can view their own analytics" ON user_analytics_summary
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage analytics" ON user_analytics_summary
    FOR ALL USING (true); -- Allow system to manage analytics

-- Create function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
    p_user_id UUID,
    p_activity_type VARCHAR(100),
    p_activity_data JSONB DEFAULT NULL,
    p_page_url VARCHAR(500) DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_activity_logs (
        user_id, 
        activity_type, 
        activity_data, 
        page_url, 
        session_id,
        ip_address,
        user_agent
    ) VALUES (
        p_user_id,
        p_activity_type,
        p_activity_data,
        p_page_url,
        p_session_id,
        inet_client_addr(),
        current_setting('request.headers', true)::json->>'user-agent'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update user analytics summary
CREATE OR REPLACE FUNCTION update_user_analytics(
    p_user_id UUID,
    p_activity_type VARCHAR(100)
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_analytics_summary (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO UPDATE SET
        total_visits = CASE 
            WHEN p_activity_type = 'login' THEN user_analytics_summary.total_visits + 1
            ELSE user_analytics_summary.total_visits
        END,
        total_tasks_created = CASE 
            WHEN p_activity_type = 'task_created' THEN user_analytics_summary.total_tasks_created + 1
            ELSE user_analytics_summary.total_tasks_created
        END,
        total_goals_created = CASE 
            WHEN p_activity_type = 'goal_created' THEN user_analytics_summary.total_goals_created + 1
            ELSE user_analytics_summary.total_goals_created
        END,
        total_tasks_completed = CASE 
            WHEN p_activity_type = 'task_completed' THEN user_analytics_summary.total_tasks_completed + 1
            ELSE user_analytics_summary.total_tasks_completed
        END,
        total_goals_completed = CASE 
            WHEN p_activity_type = 'goal_completed' THEN user_analytics_summary.total_goals_completed + 1
            ELSE user_analytics_summary.total_goals_completed
        END,
        last_visit = CASE 
            WHEN p_activity_type = 'login' THEN NOW()
            ELSE user_analytics_summary.last_visit
        END,
        first_visit = CASE 
            WHEN user_analytics_summary.first_visit IS NULL THEN NOW()
            ELSE user_analytics_summary.first_visit
        END,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get admin dashboard data
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
        (SELECT COALESCE(SUM(total_tasks_created), 0)::INTEGER FROM user_analytics_summary) as total_tasks_created,
        (SELECT COALESCE(SUM(total_goals_created), 0)::INTEGER FROM user_analytics_summary) as total_goals_created,
        (SELECT COALESCE(SUM(total_tasks_completed), 0)::INTEGER FROM user_analytics_summary) as total_tasks_completed,
        (SELECT COALESCE(SUM(total_goals_completed), 0)::INTEGER FROM user_analytics_summary) as total_goals_completed,
        (SELECT COALESCE(AVG(total_duration), 0) FROM user_sessions WHERE ended_at IS NOT NULL) as average_session_duration,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION log_user_activity(UUID, VARCHAR, JSONB, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_analytics(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_dashboard_data() TO authenticated;

-- Insert default admin user (you'll need to replace with actual admin email)
-- INSERT INTO admin_users (email, name, role) VALUES ('admin@personalaios.com', 'Admin User', 'super_admin');

-- Create trigger to automatically create analytics record for new users
CREATE OR REPLACE FUNCTION create_user_analytics_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert initial analytics record for new user
    INSERT INTO user_analytics_summary (user_id, first_visit)
    VALUES (NEW.id, NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Log the signup activity
    INSERT INTO user_activity_logs (user_id, activity_type, activity_data)
    VALUES (NEW.id, 'login', jsonb_build_object('signup', true, 'email', NEW.email));
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS trigger_create_user_analytics ON auth.users;
CREATE TRIGGER trigger_create_user_analytics
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_analytics_on_signup();

-- Create function to get all users with their analytics (for admin dashboard)
CREATE OR REPLACE FUNCTION get_all_users_with_analytics()
RETURNS TABLE (
    user_id UUID,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    last_sign_in_at TIMESTAMP WITH TIME ZONE,
    total_visits INTEGER,
    total_time_spent INTEGER,
    total_tasks_created INTEGER,
    total_goals_created INTEGER,
    total_tasks_completed INTEGER,
    total_goals_completed INTEGER,
    last_visit TIMESTAMP WITH TIME ZONE,
    first_visit TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        u.created_at,
        u.last_sign_in_at,
        COALESCE(ua.total_visits, 0) as total_visits,
        COALESCE(ua.total_time_spent, 0) as total_time_spent,
        COALESCE(ua.total_tasks_created, 0) as total_tasks_created,
        COALESCE(ua.total_goals_created, 0) as total_goals_created,
        COALESCE(ua.total_tasks_completed, 0) as total_tasks_completed,
        COALESCE(ua.total_goals_completed, 0) as total_goals_completed,
        ua.last_visit,
        ua.first_visit
    FROM auth.users u
    LEFT JOIN user_analytics_summary ua ON u.id = ua.user_id
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_all_users_with_analytics() TO authenticated;

-- Add comments
COMMENT ON TABLE admin_users IS 'Admin users with special privileges';
COMMENT ON TABLE user_activity_logs IS 'Detailed log of all user activities';
COMMENT ON TABLE user_sessions IS 'User session tracking for time spent analysis';
COMMENT ON TABLE user_analytics_summary IS 'Aggregated user analytics for performance';
COMMENT ON FUNCTION log_user_activity IS 'Logs user activity for analytics';
COMMENT ON FUNCTION update_user_analytics IS 'Updates user analytics summary';
COMMENT ON FUNCTION get_admin_dashboard_data IS 'Returns aggregated data for admin dashboard';
COMMENT ON FUNCTION create_user_analytics_on_signup IS 'Automatically creates analytics record for new users';
COMMENT ON FUNCTION get_all_users_with_analytics IS 'Returns all users with their analytics data';
