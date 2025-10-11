-- Fix the user creation trigger to not fail silently
-- This prevents user signup from failing if analytics tables don't exist

CREATE OR REPLACE FUNCTION create_user_analytics_on_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Try to insert initial analytics record for new user
    BEGIN
        INSERT INTO user_analytics_summary (user_id, first_visit)
        VALUES (NEW.id, NOW())
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to create user analytics: %', SQLERRM;
    END;
    
    -- Try to log the signup activity
    BEGIN
        INSERT INTO user_activity_logs (user_id, activity_type, activity_data)
        VALUES (NEW.id, 'login', jsonb_build_object('signup', true, 'email', NEW.email));
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the user creation
        RAISE WARNING 'Failed to log signup activity: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS trigger_create_user_analytics ON auth.users;
CREATE TRIGGER trigger_create_user_analytics
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_analytics_on_signup();

