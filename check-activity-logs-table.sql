-- Check the structure of user_activity_logs table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'user_activity_logs' 
  AND table_schema = 'public'
ORDER BY ordinal_position;
