-- ============================================
-- USER SIGNUP FIX SCRIPT
-- ============================================
-- This script fixes common user signup issues
-- ============================================

-- Step 1: Drop and recreate the trigger function (in case of syntax errors)
DROP FUNCTION IF EXISTS create_user_analytics_on_signup() CASCADE;

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

-- Step 2: Drop and recreate the trigger
DROP TRIGGER IF EXISTS trigger_create_user_analytics ON auth.users;

CREATE TRIGGER trigger_create_user_analytics
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_analytics_on_signup();

-- Step 3: Grant necessary permissions
GRANT EXECUTE ON FUNCTION create_user_analytics_on_signup() TO service_role;

-- Step 4: Ensure the tables have proper permissions
GRANT ALL ON user_analytics_summary TO service_role;
GRANT ALL ON user_activity_logs TO service_role;

-- Step 5: Test the function manually (optional)
-- This will help verify the function works
DO $$
DECLARE
    test_user_id UUID := gen_random_uuid();
BEGIN
    -- Test inserting analytics record
    INSERT INTO user_analytics_summary (user_id, first_visit)
    VALUES (test_user_id, NOW())
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Test inserting activity log
    INSERT INTO user_activity_logs (user_id, activity_type, activity_data)
    VALUES (test_user_id, 'test', jsonb_build_object('test', true));
    
    -- Clean up test data
    DELETE FROM user_activity_logs WHERE user_id = test_user_id;
    DELETE FROM user_analytics_summary WHERE user_id = test_user_id;
    
    RAISE NOTICE 'Function test completed successfully';
END;
$$;

-- ============================================
-- ALTERNATIVE: DISABLE TRIGGER TEMPORARILY
-- ============================================
-- If the above doesn't work, you can temporarily disable the trigger
-- and create analytics records manually

-- To disable trigger:
-- DROP TRIGGER IF EXISTS trigger_create_user_analytics ON auth.users;

-- To re-enable trigger:
-- CREATE TRIGGER trigger_create_user_analytics
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION create_user_analytics_on_signup();

-- ============================================
-- NEXT STEPS:
-- ============================================
-- 1. Run this script in Supabase SQL Editor
-- 2. Try creating a new user account
-- 3. If it still fails, check the Supabase logs for specific errors
-- 4. You can temporarily disable the trigger if needed
-- ============================================
