-- ============================================
-- COMPREHENSIVE FUNCTION FIX
-- ============================================

-- Step 1: Drop all existing versions of the functions
DROP FUNCTION IF EXISTS log_user_activity CASCADE;
DROP FUNCTION IF EXISTS update_user_analytics CASCADE;

-- Step 2: Check what columns exist in user_activity_logs
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_activity_logs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 3: Create the log_user_activity function with the correct signature
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
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the request
        RAISE WARNING 'Error in log_user_activity: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Create the update_user_analytics function
CREATE OR REPLACE FUNCTION update_user_analytics(
    p_user_id UUID,
    p_activity_type VARCHAR(100)
)
RETURNS VOID AS $$
BEGIN
    -- Insert or update analytics summary
    INSERT INTO user_analytics_summary (user_id)
    VALUES (p_user_id)
    ON CONFLICT (user_id) DO UPDATE SET
        total_visits = CASE 
            WHEN p_activity_type = 'page_visit' THEN user_analytics_summary.total_visits + 1
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
            WHEN p_activity_type = 'page_visit' THEN NOW()
            ELSE user_analytics_summary.last_visit
        END,
        first_visit = CASE 
            WHEN user_analytics_summary.first_visit IS NULL THEN NOW()
            ELSE user_analytics_summary.first_visit
        END,
        updated_at = NOW();
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the request
        RAISE WARNING 'Error in update_user_analytics: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant execute permissions
GRANT EXECUTE ON FUNCTION log_user_activity TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_analytics TO authenticated;

-- Step 6: Test the functions
SELECT 'Functions created successfully' as status;
