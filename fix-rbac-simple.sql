-- Simple RBAC fix without complex views
-- First, let's see what we're working with

-- Check current admin users
SELECT 
  'Current Admin Users:' as info,
  email,
  role,
  is_active
FROM admin_users;

-- Clean up admin_users table
DELETE FROM admin_users WHERE role = 'admin';
UPDATE admin_users SET role = 'super_admin' WHERE role != 'super_admin';

-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Admins can view all analytics" ON user_analytics_summary;
DROP POLICY IF EXISTS "Admins can insert all analytics" ON user_analytics_summary;
DROP POLICY IF EXISTS "Admins can update all analytics" ON user_analytics_summary;
DROP POLICY IF EXISTS "Super admin or own analytics" ON user_analytics_summary;

DROP POLICY IF EXISTS "Admins can view all activity logs" ON user_activity_logs;
DROP POLICY IF EXISTS "Admins can insert all activity logs" ON user_activity_logs;
DROP POLICY IF EXISTS "Super admin or own activity logs" ON user_activity_logs;

DROP POLICY IF EXISTS "Admins can view all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can insert all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can update all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Super admin or own sessions" ON user_sessions;

-- Create simple policies for user_analytics_summary
CREATE POLICY "Super admin or own analytics" ON user_analytics_summary
    FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email')
        OR user_id = auth.uid()
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email')
        OR user_id = auth.uid()
    );

-- Create simple policies for user_activity_logs
CREATE POLICY "Super admin or own activity logs" ON user_activity_logs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email')
        OR user_id = auth.uid()
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email')
        OR user_id = auth.uid()
    );

-- Create simple policies for user_sessions
CREATE POLICY "Super admin or own sessions" ON user_sessions
    FOR ALL
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email')
        OR user_id = auth.uid()
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email')
        OR user_id = auth.uid()
    );

-- Verify the setup
SELECT 
  'Final Admin Users:' as info,
  email,
  role
FROM admin_users;
