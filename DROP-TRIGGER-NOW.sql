-- EMERGENCY FIX: Drop the trigger so signup works
-- We can add it back later after fixing the underlying issue

DROP TRIGGER IF EXISTS trigger_create_user_analytics ON auth.users;

SELECT 'Trigger dropped. Signup should work now!' as status;
