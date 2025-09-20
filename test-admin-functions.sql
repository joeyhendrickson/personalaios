-- Test if the admin functions exist and work
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name IN ('get_admin_dashboard_data', 'get_all_users_with_analytics')
ORDER BY routine_name;

-- Test the functions
SELECT get_admin_dashboard_data() as dashboard_data;
SELECT get_all_users_with_analytics() as users_data;
