-- Check what tables actually exist in the database
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname IN ('public', 'auth')
ORDER BY schemaname, tablename;

-- Check what views exist
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views 
WHERE schemaname IN ('public', 'auth')
ORDER BY schemaname, viewname;

-- Check the structure of key tables
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('admin_users', 'user_analytics_summary', 'user_activity_logs', 'user_sessions')
ORDER BY table_name, ordinal_position;

-- Check auth.users structure (if accessible)
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'auth' 
  AND table_name = 'users'
ORDER BY ordinal_position;
