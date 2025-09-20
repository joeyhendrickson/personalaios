-- Check what functions exist and their signatures
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition,
  specific_name
FROM information_schema.routines 
WHERE routine_name IN ('log_user_activity', 'update_user_analytics')
ORDER BY routine_name, specific_name;
