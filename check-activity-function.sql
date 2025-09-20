-- Check if log_user_activity function exists
SELECT 
  routine_name,
  routine_type,
  data_type,
  specific_name
FROM information_schema.routines 
WHERE routine_name = 'log_user_activity';

-- Test the function if it exists
SELECT log_user_activity(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test',
    '{"test": true}'::jsonb,
    '/test',
    NULL
);
