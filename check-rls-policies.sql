-- Check RLS policies on analytics tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('user_analytics_summary', 'user_activity_logs', 'user_sessions')
ORDER BY tablename, policyname;

-- Check if RLS is enabled on these tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('user_analytics_summary', 'user_activity_logs', 'user_sessions')
ORDER BY tablename;
