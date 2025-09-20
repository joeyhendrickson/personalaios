-- Check if required tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('user_analytics_summary', 'user_activity_logs', 'admin_users')
ORDER BY table_name;

-- Check if user_analytics_summary has data
SELECT COUNT(*) as user_analytics_count FROM user_analytics_summary;

-- Check if auth.users has data
SELECT COUNT(*) as auth_users_count FROM auth.users;
