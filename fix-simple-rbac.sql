-- Fix RBAC to be simple and secure
-- Only two roles: Super Admin and User

-- First, clean up the admin_users table
-- Remove any 'admin' role users (keep only 'super_admin')
DELETE FROM admin_users WHERE role = 'admin';

-- Update the table to only have super_admin role
UPDATE admin_users SET role = 'super_admin' WHERE role != 'super_admin';

-- Drop all existing complex policies
DROP POLICY IF EXISTS "Admins can view all analytics" ON user_analytics_summary;
DROP POLICY IF EXISTS "Admins can insert all analytics" ON user_analytics_summary;
DROP POLICY IF EXISTS "Admins can update all analytics" ON user_analytics_summary;

DROP POLICY IF EXISTS "Admins can view all activity logs" ON user_activity_logs;
DROP POLICY IF EXISTS "Admins can insert all activity logs" ON user_activity_logs;

DROP POLICY IF EXISTS "Admins can view all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can insert all sessions" ON user_sessions;
DROP POLICY IF EXISTS "Admins can update all sessions" ON user_sessions;

DROP POLICY IF EXISTS "Admins can view all users" ON admin_users_view;

-- Create SIMPLE policies: Super Admin OR own data only

-- user_analytics_summary: Super Admin sees all, users see own
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

-- user_activity_logs: Super Admin sees all, users see own
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

-- user_sessions: Super Admin sees all, users see own
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

-- admin_users_view: Only Super Admin can see all users
CREATE POLICY "Only super admin can view all users" ON admin_users_view
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (SELECT 1 FROM admin_users WHERE email = auth.jwt() ->> 'email')
    );

-- Verify the setup
SELECT 
    'Current Super Admins:' as info,
    email,
    role
FROM admin_users;
