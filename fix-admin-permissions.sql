-- Fix admin permissions for analytics tables
-- This ensures super_admin users can access all analytics data

-- First, check current RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('user_analytics_summary', 'user_activity_logs', 'user_sessions')
ORDER BY tablename, policyname;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view own analytics" ON user_analytics_summary;
DROP POLICY IF EXISTS "Users can insert own analytics" ON user_analytics_summary;
DROP POLICY IF EXISTS "Users can update own analytics" ON user_analytics_summary;

DROP POLICY IF EXISTS "Users can view own activity logs" ON user_activity_logs;
DROP POLICY IF EXISTS "Users can insert own activity logs" ON user_activity_logs;

DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON user_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON user_sessions;

-- Create new policies that allow admins to access all data
-- user_analytics_summary policies
CREATE POLICY "Admins can view all analytics" ON user_analytics_summary
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.email = auth.jwt() ->> 'email'
            AND admin_users.role = 'super_admin'
        )
        OR user_id = auth.uid()
    );

CREATE POLICY "Admins can insert all analytics" ON user_analytics_summary
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.email = auth.jwt() ->> 'email'
            AND admin_users.role = 'super_admin'
        )
        OR user_id = auth.uid()
    );

CREATE POLICY "Admins can update all analytics" ON user_analytics_summary
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.email = auth.jwt() ->> 'email'
            AND admin_users.role = 'super_admin'
        )
        OR user_id = auth.uid()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.email = auth.jwt() ->> 'email'
            AND admin_users.role = 'super_admin'
        )
        OR user_id = auth.uid()
    );

-- user_activity_logs policies
CREATE POLICY "Admins can view all activity logs" ON user_activity_logs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.email = auth.jwt() ->> 'email'
            AND admin_users.role = 'super_admin'
        )
        OR user_id = auth.uid()
    );

CREATE POLICY "Admins can insert all activity logs" ON user_activity_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.email = auth.jwt() ->> 'email'
            AND admin_users.role = 'super_admin'
        )
        OR user_id = auth.uid()
    );

-- user_sessions policies
CREATE POLICY "Admins can view all sessions" ON user_sessions
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.email = auth.jwt() ->> 'email'
            AND admin_users.role = 'super_admin'
        )
        OR user_id = auth.uid()
    );

CREATE POLICY "Admins can insert all sessions" ON user_sessions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.email = auth.jwt() ->> 'email'
            AND admin_users.role = 'super_admin'
        )
        OR user_id = auth.uid()
    );

CREATE POLICY "Admins can update all sessions" ON user_sessions
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.email = auth.jwt() ->> 'email'
            AND admin_users.role = 'super_admin'
        )
        OR user_id = auth.uid()
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.email = auth.jwt() ->> 'email'
            AND admin_users.role = 'super_admin'
        )
        OR user_id = auth.uid()
    );

-- Also ensure admins can access auth.users (this might be the main issue)
-- Note: auth.users is in the auth schema, so we need to be careful
-- Let's create a view that admins can access
CREATE OR REPLACE VIEW admin_users_view AS
SELECT 
    u.id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    u.email_confirmed_at
FROM auth.users u;

-- Grant access to the view for authenticated users
GRANT SELECT ON admin_users_view TO authenticated;

-- Create a policy for the view
CREATE POLICY "Admins can view all users" ON admin_users_view
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM admin_users 
            WHERE admin_users.email = auth.jwt() ->> 'email'
            AND admin_users.role = 'super_admin'
        )
    );
