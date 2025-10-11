-- Temporarily disable the problematic trigger
DROP TRIGGER IF EXISTS trigger_create_user_analytics ON auth.users;

-- Optionally, you can re-enable it later after fixing the analytics tables

