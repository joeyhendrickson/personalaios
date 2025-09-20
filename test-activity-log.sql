-- Test if the log_user_activity function exists and works
-- First, let's see what functions exist
SELECT 
  routine_name,
  routine_type,
  data_type,
  specific_name
FROM information_schema.routines 
WHERE routine_name = 'log_user_activity';

-- If the function exists, test it with a simple call
-- (This will fail if the function doesn't exist, which is what we want to see)
SELECT log_user_activity(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test',
    '{"test": true}'::jsonb,
    '/test',
    NULL
);
