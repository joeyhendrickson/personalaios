-- Migration: Fix database schema for proper multi-user support
-- This migration adds missing columns and fixes schema inconsistencies

-- Add missing columns to weekly_goals table
ALTER TABLE weekly_goals 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';

ALTER TABLE weekly_goals 
ADD COLUMN IF NOT EXISTS deadline DATE;

-- Add missing columns to priorities table
ALTER TABLE priorities 
ADD COLUMN IF NOT EXISTS manual_order INTEGER;

ALTER TABLE priorities 
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES weekly_goals(id);

-- Add missing columns to tasks table (if needed)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Create indexes for better performance with multi-user queries
CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_priority ON weekly_goals(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_user_deadline ON weekly_goals(user_id, deadline);
CREATE INDEX IF NOT EXISTS idx_priorities_user_order ON priorities(user_id, manual_order);
CREATE INDEX IF NOT EXISTS idx_tasks_user_priority ON tasks(user_id, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_user_due_date ON tasks(user_id, due_date);

-- Update RLS policies to ensure proper user isolation
-- (These should already exist, but let's make sure they're comprehensive)

-- Ensure weekly_goals RLS policies
DROP POLICY IF EXISTS "Users can view their own goals" ON weekly_goals;
CREATE POLICY "Users can view their own goals" ON weekly_goals
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own goals" ON weekly_goals;
CREATE POLICY "Users can insert their own goals" ON weekly_goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own goals" ON weekly_goals;
CREATE POLICY "Users can update their own goals" ON weekly_goals
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own goals" ON weekly_goals;
CREATE POLICY "Users can delete their own goals" ON weekly_goals
    FOR DELETE USING (auth.uid() = user_id);

-- Ensure tasks RLS policies
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
CREATE POLICY "Users can view their own tasks" ON tasks
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
CREATE POLICY "Users can insert their own tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
CREATE POLICY "Users can update their own tasks" ON tasks
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;
CREATE POLICY "Users can delete their own tasks" ON tasks
    FOR DELETE USING (auth.uid() = user_id);

-- Ensure priorities RLS policies
DROP POLICY IF EXISTS "Users can view their own priorities" ON priorities;
CREATE POLICY "Users can view their own priorities" ON priorities
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own priorities" ON priorities;
CREATE POLICY "Users can insert their own priorities" ON priorities
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own priorities" ON priorities;
CREATE POLICY "Users can update their own priorities" ON priorities
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own priorities" ON priorities;
CREATE POLICY "Users can delete their own priorities" ON priorities
    FOR DELETE USING (auth.uid() = user_id);

-- Ensure points_ledger RLS policies
DROP POLICY IF EXISTS "Users can view their own points" ON points_ledger;
CREATE POLICY "Users can view their own points" ON points_ledger
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own points" ON points_ledger;
CREATE POLICY "Users can insert their own points" ON points_ledger
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create a function to get user statistics (useful for multi-user dashboards)
CREATE OR REPLACE FUNCTION get_user_stats(user_uuid UUID)
RETURNS TABLE (
    total_goals INTEGER,
    completed_goals INTEGER,
    total_tasks INTEGER,
    completed_tasks INTEGER,
    total_points INTEGER,
    weekly_points INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM weekly_goals WHERE user_id = user_uuid) as total_goals,
        (SELECT COUNT(*)::INTEGER FROM weekly_goals WHERE user_id = user_uuid AND is_completed = true) as completed_goals,
        (SELECT COUNT(*)::INTEGER FROM tasks WHERE user_id = user_uuid) as total_tasks,
        (SELECT COUNT(*)::INTEGER FROM tasks WHERE user_id = user_uuid AND status = 'completed') as completed_tasks,
        (SELECT COALESCE(SUM(points), 0)::INTEGER FROM points_ledger WHERE user_id = user_uuid) as total_points,
        (SELECT COALESCE(SUM(points), 0)::INTEGER FROM points_ledger WHERE user_id = user_uuid AND created_at >= date_trunc('week', NOW())) as weekly_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_stats(UUID) TO authenticated;

-- Create a view for user dashboard data (multi-user safe)
CREATE OR REPLACE VIEW user_dashboard_data AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(DISTINCT wg.id) as total_goals,
    COUNT(DISTINCT CASE WHEN wg.is_completed = true THEN wg.id END) as completed_goals,
    COUNT(DISTINCT t.id) as total_tasks,
    COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
    COUNT(DISTINCT dh.id) as total_habits,
    COUNT(DISTINCT ei.id) as total_education_items,
    COALESCE(SUM(pl.points), 0) as total_points,
    COALESCE(SUM(CASE WHEN pl.created_at >= date_trunc('week', NOW()) THEN pl.points ELSE 0 END), 0) as weekly_points
FROM auth.users u
LEFT JOIN weekly_goals wg ON u.id = wg.user_id
LEFT JOIN tasks t ON u.id = t.user_id
LEFT JOIN daily_habits dh ON u.id = dh.user_id
LEFT JOIN education_items ei ON u.id = ei.user_id
LEFT JOIN points_ledger pl ON u.id = pl.user_id
GROUP BY u.id, u.email;

-- Grant access to the view for authenticated users (they'll only see their own data due to RLS)
GRANT SELECT ON user_dashboard_data TO authenticated;

-- Add RLS to the view
ALTER VIEW user_dashboard_data SET (security_invoker = true);

-- Create a function to clean up old data (useful for multi-user maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_user_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- Delete completed tasks older than 90 days
    DELETE FROM tasks 
    WHERE status = 'completed' 
    AND completed_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- Delete old points ledger entries older than 1 year
    DELETE FROM points_ledger 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role only
GRANT EXECUTE ON FUNCTION cleanup_old_user_data() TO service_role;

-- Create a function to get user activity summary (for admin/monitoring)
CREATE OR REPLACE FUNCTION get_user_activity_summary()
RETURNS TABLE (
    user_id UUID,
    user_email TEXT,
    last_active TIMESTAMP WITH TIME ZONE,
    total_goals INTEGER,
    total_tasks INTEGER,
    total_points INTEGER,
    account_created TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email as user_email,
        GREATEST(
            COALESCE((SELECT MAX(updated_at) FROM weekly_goals WHERE user_id = u.id), u.created_at),
            COALESCE((SELECT MAX(updated_at) FROM tasks WHERE user_id = u.id), u.created_at),
            COALESCE((SELECT MAX(created_at) FROM points_ledger WHERE user_id = u.id), u.created_at)
        ) as last_active,
        (SELECT COUNT(*)::INTEGER FROM weekly_goals WHERE user_id = u.id) as total_goals,
        (SELECT COUNT(*)::INTEGER FROM tasks WHERE user_id = u.id) as total_tasks,
        (SELECT COALESCE(SUM(points), 0)::INTEGER FROM points_ledger WHERE user_id = u.id) as total_points,
        u.created_at as account_created
    FROM auth.users u
    ORDER BY last_active DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role only (for admin use)
GRANT EXECUTE ON FUNCTION get_user_activity_summary() TO service_role;

-- Add comments for documentation
COMMENT ON FUNCTION get_user_stats(UUID) IS 'Returns comprehensive statistics for a specific user';
COMMENT ON FUNCTION cleanup_old_user_data() IS 'Cleans up old completed tasks and points data to maintain performance';
COMMENT ON FUNCTION get_user_activity_summary() IS 'Returns activity summary for all users (admin function)';
COMMENT ON VIEW user_dashboard_data IS 'Aggregated dashboard data view with proper user isolation';
